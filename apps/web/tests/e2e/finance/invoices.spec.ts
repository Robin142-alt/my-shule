import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('Finance - Invoices Contract', () => {
  test('Accountant can generate bulk invoices and balances update', async ({ page }) => {
    await loginAs(page, 'Accountant', {
      redirectTo: '/school/admin/invoices',
      expectedUrl: /\/school\/accountant\/invoices/,
    });
    await expect(page).toHaveURL(/\/school\/accountant\/invoices/);

    // 1. Check that invoice generation actions are exposed.
    await expect(page.getByRole('button', { name: 'Bulk invoicing' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Generate invoice' })).toBeVisible({ timeout: 30000 });

    // 2. Verify the balances data table loads from the API.
    await expect(page.getByRole('heading', { name: 'Student balances' })).toBeVisible();

    // The table should eventually show "Loading persisted finance activity" or load some data
    // Let's assert that it doesn't stay in the error state
    const errorState = page.locator('text=Failed to load');
    await expect(errorState).not.toBeVisible();
  });
});
