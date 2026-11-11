import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InventoryPage } from '../pages/inventory-page';
import { CartPage } from '../pages/cart-page';

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
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(standardUser);
  });

  test('standard user can log in and see the product inventory', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Expect to land on the inventory page with the product catalog visible.
    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(page.getByText('Products', { exact: true })).toBeVisible();
    await expect(inventoryPage.items).toHaveCount(6);
  });

  test('standard user can add Sauce Labs Backpack to the cart', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    // Select the backpack's product card, then add it to the cart from that card.
    await inventoryPage.addToCart(backpackName);

    // The card's button switches to "Remove" and the cart badge counts one item.
    await expect(
      inventoryPage.productCard(backpackName).getByRole('button', { name: 'Remove' }),
    ).toBeVisible();
    await expect(inventoryPage.cartBadge).toHaveText('1');

    // Open the cart and expect exactly one item: the backpack.
    await inventoryPage.openCart();
    await expect(page).toHaveURL(/\/cart\.html$/);
    await expect(cartPage.items).toHaveCount(1);
    await expect(cartPage.items).toContainText(backpackName);
  });
});
