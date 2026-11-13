import { test, expect } from '@playwright/test';
import { ProductsApi, type Product } from '../../api/products-api';

// A known, stable product in the public DummyJSON catalog.
// `as const` makes the values read-only so a test cannot change them by accident.
const mascara = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
} as const;

// An id far outside the DummyJSON catalog (verified to return 404).
const missingProductId = 999999;

test.describe('DummyJSON Products API', () => {
  test('returns the requested product with valid business data', async ({ request }) => {
    const productsApi = new ProductsApi(request);

    const response = await productsApi.getProduct(mascara.id);

    // Protocol + representation: the request succeeded and returned JSON.
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    // The cast only helps the compiler; the assertions below check the real data.
    const product = (await response.json()) as Product;

    // Identity: we got the product we asked for, not another one.
    expect(product.id).toBe(mascara.id);
    expect(product.title).toBe(mascara.title);

    // Contract: the fields the business relies on exist with the expected runtime types.
    expect(typeof product.title).toBe('string');
    expect(typeof product.category).toBe('string');
    expect(product.category.length).toBeGreaterThan(0);

    // Business data: a sellable product has a positive price and a non-negative whole stock.
    expect(typeof product.price).toBe('number');
    expect(product.price).toBeGreaterThan(0);
    expect(Number.isInteger(product.stock)).toBe(true);
    expect(product.stock).toBeGreaterThanOrEqual(0);
  });

  test('returns 404 with an error message for a product that does not exist', async ({ request }) => {
    const productsApi = new ProductsApi(request);

    const response = await productsApi.getProduct(missingProductId);

    // Error contract: not found, still JSON, with a message naming the requested id.
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = (await response.json()) as { message: string };
    expect(body.message).toBe(`Product with id '${missingProductId}' not found`);
  });
});
