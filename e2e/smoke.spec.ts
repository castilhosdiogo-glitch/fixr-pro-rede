import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  // Configured to point to the local dev server in playwright.config.ts
  await page.goto('/');
  
  // Verify basic page title
  await expect(page).toHaveTitle(/PROFIX/i);

  // Take a screenshot for visual regression or artifact purposes
  await page.screenshot({ path: 'e2e-results/smoke-homepage.png' });
});
