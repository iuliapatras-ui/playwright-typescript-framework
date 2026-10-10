import { type Product, ProductPageSchema } from '../api/schemas';

/**
 * Builders for fake API responses used by the network-mocking tests.
 *
 * Every mock is checked with the same zod schema as the real responses, so a mock can
 * never drift away from the real contract: if the API shape changes and the schema is
 * updated, outdated mocks fail loudly instead of testing a shape that no longer exists.
 */

/** A product as the front end needs it: the schema fields plus display-only extras. */
export type MockProduct = Product & {
  co2_rating: string;
  is_eco_friendly: boolean;
  product_image: { file_name: string; title: string };
};

let sequence = 0;

/** A ULID-shaped id (26 characters) that is unique within the run. */
function mockId(): string {
  sequence += 1;
  return `01MOCK${String(sequence).padStart(20, '0')}`;
}

/** A complete product with sensible defaults; pass only what the test cares about. */
export function buildProduct(overrides: Partial<MockProduct> = {}): MockProduct {
  return {
    id: mockId(),
    name: 'Mocked Product',
    description: 'Served by page.route(), not by the real API.',
    price: 9.99,
    in_stock: true,
    is_rental: false,
    is_location_offer: false,
    is_eco_friendly: false,
    co2_rating: 'B',
    category: { id: mockId(), name: 'Hammer', slug: 'hammer' },
    brand: { id: mockId(), name: 'Mock Tools' },
    // An image that exists on the shop, so the card renders like a real one.
    product_image: { file_name: 'hammer01.avif', title: 'Hammer' },
    ...overrides,
  };
}

/** One page of products in the API's paging envelope (Laravel style). */
export function buildProductPage(products: MockProduct[]) {
  const page = {
    current_page: 1,
    from: products.length ? 1 : null,
    to: products.length ? products.length : null,
    last_page: 1,
    per_page: 9,
    total: products.length,
    data: products,
  };
  // Throws if the mock does not match the contract the real API is tested against.
  ProductPageSchema.parse(page);
  // Return the full object: the front end also reads fields the schema doesn't check.
  return page;
}
