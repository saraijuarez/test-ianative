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

  /** The price shown on one product's card, e.g. "$29.99". */
  productPrice(productName: string): Locator {
    return this.productCard(productName).locator('[data-test="inventory-item-price"]');
  }

  async addToCart(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
