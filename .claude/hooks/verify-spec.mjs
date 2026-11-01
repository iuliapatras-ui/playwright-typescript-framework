/**
 * PostToolUse hook: runs the one spec Claude just edited and reports the result.
 *
 *  - tests/api/** runs in the api project, tests/ui/** in chromium; any other file is ignored silently
 *  - pass or not verified: a note for Claude and the user
 *  - fail: {"decision":"block"} with the error, so Claude has to deal with it
 *
 * Always exits 0 and speaks through JSON on stdout. "Not verified" (time limit, no tests, all skipped,
 * a broken hook) is kept apart from a test failure and is never reported as a pass.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

// Below the 300 s hook timeout in settings.json, so the script can still report "not verified".
const RUN_LIMIT_MS = Number(process.env.AUTO_VERIFY_LIMIT_MS) || 270_000;
const MAX_FAILURES_SHOWN = 5;
const MAX_ERROR_LINES = 15;
const MAX_DETAIL_CHARS = 3_400;

const PROJECT_BY_FOLDER = { 'tests/api/': 'api', 'tests/ui/': 'chromium' };

const FIX_INSTRUCTIONS =
  'Fix the root cause, in the test or in the code it uses. Do not weaken the test: no deleted or loosened ' +
  'assertions, no skips, no raised timeouts. The CLAUDE.md rule to ask before editing files in tests/ still applies.';

/** Prints the hook's answer and ends the process; the write callback keeps a piped stdout from being cut off. */
function finish(output) {
  process.stdout.write(JSON.stringify(output), () => process.exit(0));
}

/** A message for both Claude and the user, without blocking anything. */
function note(message) {
  finish({
    systemMessage: message,
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message },
  });
}

function notVerified(file, why) {
  note(`${file} NOT verified: ${why}. This is not a test failure, and not a pass.`);
}

async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

/** Accepts D:\a\b, D:/a/b, Git Bash's /d/a/b and paths relative to cwd. */
function toAbsolutePath(rawPath, cwd) {
  const slashed = rawPath.replaceAll('\\', '/');
  const gitBash = process.platform === 'win32' ? /^\/([a-zA-Z])(\/.*)?$/.exec(slashed) : null;
  return path.resolve(cwd, gitBash ? `${gitBash[1]}:${gitBash[2] ?? '/'}` : slashed);
}

/** Returns { relative, project } for a spec that a project runs, otherwise null. */
function resolveSpec(rawPath, cwd, root) {
  if (!rawPath.toLowerCase().endsWith('.spec.ts')) return null;
  let realPath;
  try {
    // The real path also settles any difference in drive letter or folder case.
    realPath = realpathSync.native(toAbsolutePath(rawPath, cwd));
  } catch {
    return null;
  }
  const relative = path.relative(root, realPath).split(path.sep).join('/');
  const folder = Object.keys(PROJECT_BY_FOLDER).find((prefix) => relative.startsWith(prefix));
  return folder && relative.endsWith('.spec.ts') ? { relative, project: PROJECT_BY_FOLDER[folder] } : null;
}

/** Stops Playwright with its workers and browsers; on Windows child.kill() would only stop the top process. */
function killTree(child) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 15_000 });
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

/** Runs Playwright for one file. Resolves with { exitCode, timedOut, spawnError, stderr }, never rejects. */
function runPlaywright(cli, root, spec, reportFile) {
  // Playwright reads this argument as a regex; an absolute D:\ path would not work as one.
  const filter = `${spec.relative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
  const outputName = `${spec.project}-${path.basename(spec.relative, '.spec.ts')}`;
  const args = [
    cli,
    'test',
    filter,
    `--project=${spec.project}`,
    '--reporter=json',
    '--retries=0',
    // Otherwise a stray test.only would run one test and look like a pass.
    '--forbid-only',
    // Makes "no tests" an empty report rather than an error, so it isn't read as a test failure.
    '--pass-with-no-tests',
    // Keeps the user's own test-results/ from being wiped by this run.
    `--output=test-results/auto-verify/${outputName}`,
  ];

  return new Promise((resolve) => {
    let stderr = '';
    let timedOut = false;
    let exitCode = null;
    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(limit);
      resolve({ exitCode, timedOut, stderr, ...result });
    };

    const child = spawn(process.execPath, args, {
      cwd: root, // src/config/env.ts loads .env relative to the working directory
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile, FORCE_COLOR: '0' },
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32',
    });

    const limit = setTimeout(() => {
      timedOut = true;
      killTree(child);
      settle({});
    }, RUN_LIMIT_MS);

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-4_000);
    });
    child.on('error', (error) => settle({ spawnError: error.message }));
    child.on('exit', (code) => {
      exitCode = code;
      // 'close' waits for stderr, but a leftover process holding it open must not hang the hook.
      setTimeout(() => settle({}), 2_000).unref();
    });
    child.on('close', () => settle({}));
  });
}

function readReport(reportFile) {
  try {
    return JSON.parse(readFileSync(reportFile, 'utf8'));
  } catch {
    return null;
  }
}

function collectFailures(suites = [], titles = []) {
  return suites.flatMap((suite) => {
    const titlePath = suite.title ? [...titles, suite.title] : titles;
    const fromSpecs = (suite.specs ?? []).flatMap((spec) =>
      (spec.tests ?? [])
        .filter((test) => test.status === 'unexpected')
        .map((test) => {
          const result = test.results?.at(-1);
          const errors = result?.errors?.length ? result.errors : [result?.error ?? {}];
          // The first title is the file name, which the message already shows.
          return { title: [...titlePath.slice(1), spec.title].join(' > '), errors };
        }),
    );
    return [...fromSpecs, ...collectFailures(suite.suites, titlePath)];
  });
}

function duration(seconds) {
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

function errorText(error) {
  return (error.message ?? error.value ?? 'No error message in the report.').replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
}

function lastLines(text) {
  return text.trimEnd().split('\n').slice(-MAX_ERROR_LINES).join('\n');
}

function reportFailure(file, passed, skipped, failures, runErrors, seconds) {
  const total = passed + failures.length + skipped;
  const counts = `${failures.length} of ${total} failed${skipped ? `, ${skipped} skipped` : ''}`;
  const summary = failures.length ? counts : 'the file could not run';
  const first = failures[0]?.title ?? lastLines(errorText(runErrors[0])).split('\n')[0];

  const sections = [
    ...runErrors.map((error) => lastLines(errorText(error))),
    ...failures
      .slice(0, MAX_FAILURES_SHOWN)
      .map(({ title, errors }) => `${title}\n${lastLines(errors.map(errorText).join('\n'))}`),
  ];
  const hidden = failures.length - MAX_FAILURES_SHOWN;
  if (hidden > 0) sections.push(`...and ${hidden} more failed test(s).`);

  finish({
    decision: 'block',
    reason: `${file}: ${summary} after ${duration(seconds)}.\n\n${sections.join('\n\n').slice(0, MAX_DETAIL_CHARS)}\n\n${FIX_INSTRUCTIONS}`,
    systemMessage: `${file}: ${summary} (${duration(seconds)}). First: ${first}`,
  });
}

/** Decides the outcome. Order matters: a run only counts as a pass once everything else is ruled out. */
function report(file, run, parsed, seconds) {
  if (run.timedOut) return notVerified(file, `the run hit the ${RUN_LIMIT_MS / 1000}-second limit and was stopped`);
  if (run.spawnError) return notVerified(file, `Playwright could not start (${run.spawnError})`);
  if (!parsed) {
    const detail = run.stderr.trim().split('\n').slice(-3).join(' ');
    return notVerified(file, `Playwright produced no report${detail ? ` (${detail})` : ''}`);
  }

  const failures = collectFailures(parsed.suites);
  const runErrors = parsed.errors ?? [];
  const allErrors = [...runErrors, ...failures.flatMap(({ errors }) => errors)];
  if (allErrors.some((error) => errorText(error).includes("Executable doesn't exist"))) {
    return notVerified(file, 'the browser is not installed (run npx playwright install)');
  }

  const { expected = 0, flaky = 0, skipped = 0 } = parsed.stats ?? {};
  const passed = expected + flaky;
  if (failures.length || runErrors.length) return reportFailure(file, passed, skipped, failures, runErrors, seconds);
  if (run.exitCode !== 0)
    return notVerified(file, `Playwright exited with code ${run.exitCode} but recorded no failure`);
  if (passed > 0) {
    const skips = skipped ? ` (${passed} passed, ${skipped} skipped)` : '';
    return note(`${file} passed in ${duration(seconds)}${skips}.`);
  }
  return notVerified(file, skipped ? `all ${skipped} tests were skipped` : 'no tests ran');
}

async function main() {
  const input = JSON.parse(await readStdin());
  const rawPath = input.tool_input?.file_path;
  if (typeof rawPath !== 'string' || !rawPath) return process.exit(0);

  const scriptDir = import.meta.dirname;
  const root = realpathSync.native(process.env.CLAUDE_PROJECT_DIR || path.resolve(scriptDir, '..', '..'));
  const spec = resolveSpec(rawPath, input.cwd ?? root, root);
  if (!spec) return process.exit(0);

  const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  if (!existsSync(cli)) return notVerified(spec.relative, 'Playwright is not installed (run npm ci)');

  const reportFile = path.join(tmpdir(), `verify-spec-${randomUUID()}.json`);
  const startedAt = Date.now();
  const run = await runPlaywright(cli, root, spec, reportFile);
  const seconds = Math.round((Date.now() - startedAt) / 1000);
  const parsed = readReport(reportFile);
  rmSync(reportFile, { force: true });
  return report(spec.relative, run, parsed, seconds);
}

const hookError = (error) => notVerified('The edited file', `the hook itself failed (${error?.message ?? error})`);
process.on('uncaughtException', hookError);
main().catch(hookError);
