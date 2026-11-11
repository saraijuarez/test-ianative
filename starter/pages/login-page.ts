import type { Page } from '@playwright/test';

/** What `LoginPage.login()` needs: the account to sign in with. */
export type Credentials = {
  readonly username: string;
  readonly password: string;
};

/**
 * SauceDemo login page.
 * Owns the login form's UI knowledge (field placeholders, submit button).
 * The environment URL comes from `baseURL` in playwright.config.ts.
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async login(credentials: Credentials): Promise<void> {
    await this.page.getByPlaceholder('Username').fill(credentials.username);
    await this.page.getByPlaceholder('Password').fill(credentials.password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
