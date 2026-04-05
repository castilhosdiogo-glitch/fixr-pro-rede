import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should navigate to registration via header', async ({ page }) => {
    await page.goto('/');
    await page.click('header >> text=Cadastre-se');
    await expect(page).toHaveURL(/.*auth\?tab=register/);
    await expect(page.locator('h1')).toContainText(/ENTRAR|CADASTRO/i);
  });

  test('should navigate to registration via hero', async ({ page }) => {
    await page.goto('/');
    await page.click('section >> text=Começar agora');
    await expect(page).toHaveURL(/.*auth\?tab=register/);
    await expect(page.locator('h1')).toContainText(/ENTRAR|CADASTRO/i);
  });
});

test.describe('Search Availability', () => {
  test('public search should be accessible via hero button', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Explorar Profissionais');
    await expect(page).toHaveURL(/.*buscar/);
    await expect(page.locator('h1')).toContainText(/BUSCAR/i);
  });

  test('direct access to search should work for guests', async ({ page }) => {
    await page.goto('/buscar');
    await expect(page.locator('h1')).toContainText(/BUSCAR/i);
    // Use regex to be case-insensitive for the placeholder
    await expect(page.locator('input[placeholder]')).toHaveAttribute('placeholder', /NOME, SERVIÇO OU CIDADE/i);
  });
});
