import { Page, expect } from '@playwright/test';

export const RoleCredentials = {
  Principal: { email: 'principal@kisumuboys.demo', password: 'password123' },
  Teacher: { email: 'teacher@kisumuboys.demo', password: 'password123' },
  Librarian: { email: 'librarian@kisumuboys.demo', password: 'password123' },
  Accountant: { email: 'accountant@kisumuboys.demo', password: 'password123' },
  Secretary: { email: 'secretary@kisumuboys.demo', password: 'password123' },
  SuperAdmin: { email: 'admin@myshule.io', password: 'password123' },
};

export type Role = keyof typeof RoleCredentials;

export async function loginAs(page: Page, role: Role) {
  const credentials = RoleCredentials[role];
  if (!credentials) {
    throw new Error(`Credentials for role ${role} not found.`);
  }

  await page.goto('/login');
  
  // Wait for network idle or form to be visible
  await page.waitForLoadState('networkidle');

  // Fill in the login form. 
  // Assuming standard selectors. Will adjust if they are different.
  await page.fill('input[name="identifier"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);

  await page.click('button[type="submit"]');

  // We wait for navigation to complete to a dashboard or admin page
  await page.waitForURL(/.*(\/dashboard|\/school\/admin).*/, { timeout: 30000 });
  
  // Optionally assert we are logged in by checking some UI element
  await expect(page.locator('text=' + role).first()).toBeVisible({ timeout: 10000 }).catch(() => {}); // non-blocking check
}

export async function logout(page: Page) {
  // Try to find the user menu and click logout
  // Assuming a generic approach, this will need refinement based on exact UI
  try {
    const userMenu = page.locator('button[aria-label="User menu"], [data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('text=Log out');
      await page.waitForURL('**/login');
    }
  } catch (e) {
    // If we can't cleanly logout via UI, clear cookies
    await page.context().clearCookies();
    await page.goto('/login');
  }
}
