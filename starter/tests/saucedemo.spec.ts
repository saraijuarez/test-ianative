import { test, expect } from '@playwright/test';

test('standard user can log in and see the product inventory', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');

  // Log in with the public demo account listed on the SauceDemo login page.
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  // Expect to land on the inventory page with the product catalog visible.
  await expect(page).toHaveURL(/\/inventory\.html$/);
  await expect(page.getByText('Products', { exact: true })).toBeVisible();
  await expect(page.locator('.inventory_item')).toHaveCount(6);
});
