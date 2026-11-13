import { defineConfig } from '@playwright/test';

/**
 * Unit tests for the observability module (no browser, no network).
 * Kept separate from the product suite so their results never mix with the
 * SauceDemo/DummyJSON metrics, and so they never overwrite results/playwright-results.json.
 * Run: npm run obs:test
 */
export default defineConfig({
  testDir: './tests',
  reporter: 'list',
  outputDir: '../test-results/observability-unit',
});
