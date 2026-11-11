import type { Locator, Page } from '@playwright/test';

/**
 * SauceDemo inventory (products) page, including the header cart link and badge.
 * Owns the catalog's UI knowledge. Assertions stay in the tests.
 */
export class InventoryPage {
  /** Every product card in the catalog. */
  readonly items: Locator;
  /** Number of items in the cart, shown on the header cart icon. */
  readonly cartBadge: Locator;
  private readonly cartLink: Locator;

  constructor(page: Page) {
    this.items = page.locator('.inventory_item');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.cartLink = page.locator('.shopping_cart_link');
  }

  /** The card of one product, found by its visible name. */
  productCard(productName: string): Locator {
    return this.items.filter({ hasText: productName });
  }

  async addToCart(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
