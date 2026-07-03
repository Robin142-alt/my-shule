import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs, logout, setFormInputValue } from '../fixtures/auth.fixture';

test.describe('Authentication Contract', () => {
  
  test('Successful login and redirect for Principal', async ({ page }) => {
    await loginAs(page, 'Principal');
    
    // Ensure we are redirected to a dashboard or role-scoped school page.
    await expect(page).toHaveURL(/.*(\/dashboard|\/school\/[a-z0-9-]+).*/);
    
    await expect(page.getByRole('navigation', { name: /principal dashboard sidebar/i })).toBeVisible();
    await logout(page);
  });

  test('Invalid credentials show clear error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const identifierInput = page.getByLabel('Email address');
    const passwordInput = page.getByRole('textbox', { name: 'Password' });
    await expect(identifierInput).toBeVisible({ timeout: 15000 });

    await setFormInputValue(identifierInput, 'wrong@kisumuboys.demo.test');
    await setFormInputValue(passwordInput, 'badpassword');
    await page.getByRole('button', { name: /sign in securely/i }).click();

    // Should see an error message toaster or alert
    const errorMessage = page.locator('text=Invalid credentials').or(page.locator('text=Authentication failed'));
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('Logged-out users cannot access dashboards', async ({ page }) => {
    await page.goto('/dashboard');
    // We expect the middleware to redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

});
