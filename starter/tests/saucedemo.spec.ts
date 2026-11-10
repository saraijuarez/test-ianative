import { test, expect } from '@playwright/test';

// Public demo account listed on the SauceDemo login page (not a real credential).
// `as const` makes the values read-only so a test cannot change them by accident.
const standardUser = {
  username: 'standard_user',
  password: 'secret_sauce',
} as const;

const backpackName = 'Sauce Labs Backpack';

test.describe('SauceDemo as a standard user', () => {
  // Every test starts from a fresh browser context, so each one logs in on its own.
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');

    await page.getByPlaceholder('Username').fill(standardUser.username);
    await page.getByPlaceholder('Password').fill(standardUser.password);
    await page.getByRole('button', { name: 'Login' }).click();
  });

  test('standard user can log in and see the product inventory', async ({ page }) => {
    // Expect to land on the inventory page with the product catalog visible.
    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(page.getByText('Products', { exact: true })).toBeVisible();
    await expect(page.locator('.inventory_item')).toHaveCount(6);
  });

  test('standard user can add Sauce Labs Backpack to the cart', async ({ page }) => {
    // Select the backpack's product card, then add it to the cart from that card.
    const backpackCard = page.locator('.inventory_item').filter({ hasText: backpackName });
    await backpackCard.getByRole('button', { name: 'Add to cart' }).click();

    // The card's button switches to "Remove" and the cart badge counts one item.
    await expect(backpackCard.getByRole('button', { name: 'Remove' })).toBeVisible();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    // Open the cart and expect exactly one item: the backpack.
    await page.locator('.shopping_cart_link').click();
    await expect(page).toHaveURL(/\/cart\.html$/);
    const cartItems = page.locator('.cart_item');
    await expect(cartItems).toHaveCount(1);
    await expect(cartItems).toContainText(backpackName);
  });
});
