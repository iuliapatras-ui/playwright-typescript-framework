import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';
import { LoginResponseSchema, type User, UserSchema } from './schemas';

/**
 * Service object for the user endpoints: POST /users/login and GET /users/me.
 *
 * Like a page object for the UI: tests call these methods and never build URLs,
 * headers or bodies themselves.
 */
export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  /** POST /users/login. Returns the raw response, so negative tests can check the status. */
  async login(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/users/login', { data: { email, password } });
  }

  /** Logs in and returns just the access token (a JWT). Fails the test if the login fails. */
  async getAccessToken(email: string, password: string): Promise<string> {
    const response = await this.login(email, password);
    await expect(response, 'login should succeed').toBeOK();
    // parse() checks the body against the schema and returns it typed.
    return LoginResponseSchema.parse(await response.json()).access_token;
  }

  /** GET /users/me. Without a token the API answers 401. */
  async me(token?: string): Promise<APIResponse> {
    return this.request.get('/users/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  /** GET /users/me for a token that must be valid; returns the user. */
  async getCurrentUser(token: string): Promise<User> {
    const response = await this.me(token);
    await expect(response).toBeOK();
    return UserSchema.parse(await response.json());
  }
}
