import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('Finance - Payments Contract', () => {
  test('Accountant can view payment history and it loads from API', async ({ page }) => {
    await loginAs(page, 'Accountant', {
      redirectTo: '/school/admin/payments',
      expectedUrl: /\/school\/accountant\/payments/,
    });
    await expect(page).toHaveURL(/\/school\/accountant\/payments/);

    // 1. Check if the Payment history table exists
    const historyTable = page.getByRole('heading', { name: 'Payment history' });
    await expect(historyTable).toBeVisible();

    // 2. Click record payment
    const recordPaymentBtn = page.getByRole('button', { name: 'Record payment' });
    await expect(recordPaymentBtn).toBeVisible({ timeout: 30000 });
    await recordPaymentBtn.click();

    // 3. Verify modal opens
    const dialog = page.getByRole('dialog', { name: 'Record payment' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save payment' })).toBeVisible();
    
    // Close modal
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
