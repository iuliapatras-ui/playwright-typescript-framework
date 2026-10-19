import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';
import { type Cart, CartSchema } from './schemas';

/**
 * Service object for the cart endpoints (/carts...).
 * Carts are anonymous: whoever knows the cart id can use it, no token needed.
 */
export class CartsApi {
  /** request is Playwright's API client with the API base URL from the config. */
  constructor(private readonly request: APIRequestContext) {}

  /** POST /carts. Returns the id of a new, empty cart. */
  async create(): Promise<string> {
    const response = await this.request.post('/carts');
    expect(response.status(), 'a new cart should be created').toBe(201);
    return ((await response.json()) as { id: string }).id;
  }

  /** POST /carts/{id}: adds a product (or raises its quantity). Raw response for negative tests. */
  async addItem(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.request.post(`/carts/${cartId}`, { data: { product_id: productId, quantity } });
  }

  /** PUT /carts/{id}/product/quantity: sets the quantity of a product already in the cart. */
  async updateQuantity(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.request.put(`/carts/${cartId}/product/quantity`, { data: { product_id: productId, quantity } });
  }

  /** DELETE /carts/{id}/product/{productId} */
  async removeItem(cartId: string, productId: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${cartId}/product/${productId}`);
  }

  /** GET /carts/{id}. Raw response, so a 404 for an unknown cart can be checked. */
  async getById(cartId: string): Promise<APIResponse> {
    return this.request.get(`/carts/${cartId}`);
  }

  /** GET /carts/{id} for a cart that must exist; returns it checked against the schema. */
  async getCart(cartId: string): Promise<Cart> {
    const response = await this.getById(cartId);
    await expect(response).toBeOK();
    return CartSchema.parse(await response.json());
  }
}
