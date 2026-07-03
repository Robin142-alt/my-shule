import { Locator, Page, expect } from '@playwright/test';

export const RoleCredentials = {
  Principal: { email: 'principal@kisumuboys.demo', password: 'password123' },
  Teacher: { email: 'teacher@kisumuboys.demo', password: 'password123' },
  Librarian: { email: 'librarian@kisumuboys.demo', password: 'password123' },
  Accountant: { email: 'accountant@kisumuboys.demo', password: 'password123' },
  Secretary: { email: 'secretary@kisumuboys.demo', password: 'password123' },
  SuperAdmin: { email: 'admin@myshule.io', password: 'password123' },
};

export type Role = keyof typeof RoleCredentials;

export async function loginAs(page: Page, role: Role, options?: { redirectTo?: string; expectedUrl?: RegExp }) {
  const credentials = RoleCredentials[role];
  if (!credentials) {
    throw new Error(`Credentials for role ${role} not found.`);
  }

  const csrfResponse = await page.context().request.get('/api/auth/csrf');
  if (!csrfResponse.ok()) {
    throw new Error(`Unable to fetch CSRF token for ${role}: ${csrfResponse.status()} ${await csrfResponse.text()}`);
  }

  const csrfPayload = (await csrfResponse.json()) as { token?: string };
  if (!csrfPayload.token) {
    throw new Error(`CSRF token response for ${role} did not include a token.`);
  }

  const loginResponse = await page.context().request.post('/api/auth/login', {
    data: {
      audience: role === 'SuperAdmin' ? 'superadmin' : 'school',
      identifier: credentials.email,
      password: credentials.password,
      tenantSlug: null,
    },
    headers: {
      'x-myshule-csrf': csrfPayload.token,
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(`Login failed for ${role}: ${loginResponse.status()} ${await loginResponse.text()}`);
  }

  const loginPayload = (await loginResponse.json()) as { redirectTo?: string };
  await page.goto(options?.redirectTo ?? loginPayload.redirectTo ?? '/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(options?.expectedUrl ?? /.*(\/dashboard|\/school\/[a-z0-9-]+).*/, { timeout: 45000 });
}

export async function setFormInputValue(locator: Locator, value: string) {
  await locator.scrollIntoViewIfNeeded();
  await locator.fill(value, { force: true });
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    valueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
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
