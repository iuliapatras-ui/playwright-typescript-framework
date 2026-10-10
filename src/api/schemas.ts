import { z } from 'zod';

/**
 * The shape of the Toolshop API responses, written once with zod.
 *
 * Each schema does two jobs:
 *  - contract check: `Schema.parse(body)` fails with the exact field path when the API
 *    sends something else (a missing field, a string instead of a number, ...)
 *  - TypeScript type: `z.infer<typeof Schema>` is derived from it, so types and checks
 *    can never drift apart.
 * Unknown extra fields are allowed (zod drops them), so new API fields don't break tests.
 */

// Ids are ULIDs: 26 characters of Crockford base32 (upper case for most entities).
const Ulid = z.string().regex(/^[0-9A-Za-z]{26}$/, 'expected a 26-character ULID');

/** The product fields every endpoint returns (products inside a cart have only these). */
export const ProductSummarySchema = z.object({
  id: Ulid,
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  in_stock: z.boolean(),
  is_rental: z.boolean(),
  is_location_offer: z.boolean(),
});

/**
 * A product as /products and /products/search return it: with category and brand.
 * Found by these schemas: /products sends category.slug, /products/search leaves it out,
 * so slug is optional.
 */
export const ProductSchema = ProductSummarySchema.extend({
  category: z.object({ id: Ulid, name: z.string(), slug: z.string().optional() }),
  brand: z.object({ id: Ulid, name: z.string() }),
});
export type Product = z.infer<typeof ProductSchema>;

/** Laravel-style paging envelope around a list of products. */
export const ProductPageSchema = z.object({
  current_page: z.number().int(),
  last_page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int().nonnegative(),
  data: z.array(ProductSchema),
});
export type ProductPage = z.infer<typeof ProductPageSchema>;

export const LoginResponseSchema = z.object({
  access_token: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'expected a JWT (header.payload.signature)'),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserSchema = z.object({
  id: Ulid,
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
});
export type User = z.infer<typeof UserSchema>;

export const CartSchema = z.object({
  id: Ulid,
  cart_items: z.array(
    z.object({
      id: Ulid,
      quantity: z.number().int().positive(),
      product_id: Ulid,
      // The cart embeds the product without category and brand.
      product: ProductSummarySchema,
    }),
  ),
});
export type Cart = z.infer<typeof CartSchema>;

/** 422 validation error: a message plus the messages per field. */
export const ValidationErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string())),
});
