import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs, logout, RoleCredentials } from '../fixtures/auth.fixture';

test.describe('Authentication Contract', () => {
  
  test('Successful login and redirect for Principal', async ({ page }) => {
    await loginAs(page, 'Principal');
    
    // Ensure we are redirected to a dashboard or school admin page
    await expect(page).toHaveURL(/.*(\/dashboard|\/school\/admin).*/);
    
    // Check for a generic dashboard or principal specific element
    // Assuming navigation sidebar has a known structure
    await expect(page.locator('nav')).toBeVisible();
    await logout(page);
  });

  test('Invalid credentials show clear error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="identifier"]', 'wrong@kisumuboys.demo');
    await page.fill('input[name="password"]', 'badpassword');
    await page.click('button[type="submit"]');

    // Should see an error message toaster or alert
    const errorMessage = page.locator('text=Invalid credentials').or(page.locator('text=Authentication failed'));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Logged-out users cannot access dashboards', async ({ page }) => {
    await page.goto('/dashboard');
    // We expect the middleware to redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

});
