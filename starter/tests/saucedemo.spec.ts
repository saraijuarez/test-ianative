import { test, expect } from '@playwright/test';

// Public demo account listed on the SauceDemo login page (not a real credential).
// `as const` makes the values read-only so a test cannot change them by accident.
const standardUser = {
  username: 'standard_user',
  password: 'secret_sauce',
} as const;

test('standard user can log in and see the product inventory', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');

  await page.getByPlaceholder('Username').fill(standardUser.username);
  await page.getByPlaceholder('Password').fill(standardUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Expect to land on the inventory page with the product catalog visible.
  await expect(page).toHaveURL(/\/inventory\.html$/);
  await expect(page.getByText('Products', { exact: true })).toBeVisible();
  await expect(page.locator('.inventory_item')).toHaveCount(6);
});
