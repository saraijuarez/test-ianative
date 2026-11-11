import type { Locator, Page } from '@playwright/test';

/**
 * SauceDemo cart page.
 * Owns the cart's UI knowledge. Assertions stay in the tests.
 */
export class CartPage {
  /** Every line item currently in the cart. */
  readonly items: Locator;

  constructor(page: Page) {
    this.items = page.locator('.cart_item');
  }
}
