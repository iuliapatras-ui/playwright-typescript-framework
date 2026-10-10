import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';
import { type Product, type ProductPage, ProductPageSchema, ProductSchema } from './schemas';

/** Query options of GET /products. */
export type ProductQuery = {
  page?: number;
  /** e.g. "price,asc" or "name,desc" */
  sort?: `${'name' | 'price'},${'asc' | 'desc'}`;
  /** Category id (a ULID) */
  byCategory?: string;
};

/** Service object for the product endpoints (/products...). */
export class ProductsApi {
  constructor(private readonly request: APIRequestContext) {}

  /** GET /products with paging, sorting and filtering. Returns one page, checked against the schema. */
  async list(query: ProductQuery = {}): Promise<ProductPage> {
    const params: Record<string, string | number> = {};
    if (query.page) params.page = query.page;
    if (query.sort) params.sort = query.sort;
    if (query.byCategory) params.by_category = query.byCategory;

    const response = await this.request.get('/products', { params });
    await expect(response).toBeOK();
    return ProductPageSchema.parse(await response.json());
  }

  /** GET /products/{id}. Returns the raw response, so a 404 can be checked too. */
  async getById(id: string): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  /** GET /products/{id} for an id that must exist. */
  async getProduct(id: string): Promise<Product> {
    const response = await this.getById(id);
    await expect(response).toBeOK();
    return ProductSchema.parse(await response.json());
  }

  /** GET /products/search?q=... */
  async search(term: string): Promise<ProductPage> {
    const response = await this.request.get('/products/search', { params: { q: term } });
    await expect(response).toBeOK();
    return ProductPageSchema.parse(await response.json());
  }

  /** Finds a product by its exact name through the search endpoint. */
  async findByName(name: string): Promise<Product> {
    const match = (await this.search(name)).data.find((product) => product.name === name);
    if (!match) {
      throw new Error(`No product named "${name}"`);
    }
    return match;
  }
}
