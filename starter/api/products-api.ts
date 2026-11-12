import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * The DummyJSON product fields this project relies on.
 * Compile-time help only: a type does NOT validate the response at runtime,
 * so the tests still assert on the actual values.
 */
export type Product = {
  readonly id: number;
  readonly title: string;
  readonly category: string;
  readonly price: number;
  readonly stock: number;
};

/**
 * DummyJSON Products endpoint.
 * Owns the endpoint knowledge (paths). Assertions stay in the tests.
 * The environment URL comes from the `api` project's `baseURL` in playwright.config.ts.
 */
export class ProductsApi {
  constructor(private readonly request: APIRequestContext) {}

  /** GET /products/{id}. Returns the raw response so the test can see the HTTP outcome. */
  async getProduct(productId: number): Promise<APIResponse> {
    return this.request.get(`/products/${productId}`);
  }
}
