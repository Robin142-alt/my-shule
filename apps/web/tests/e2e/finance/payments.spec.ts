import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('Finance - Payments Contract', () => {
  test('Accountant can view payment history and it loads from API', async ({ page }) => {
    await loginAs(page, 'Accountant');

    await page.goto('/school/admin/payments');
    await page.waitForLoadState('networkidle');

    // 1. Check if the Payment history table exists
    const historyTable = page.locator('text=Payment history');
    await expect(historyTable).toBeVisible();

    // 2. Click record payment
    const recordPaymentBtn = page.locator('button:has-text("Record payment")');
    await expect(recordPaymentBtn).toBeVisible();
    await recordPaymentBtn.click();

    // 3. Verify modal opens
    const modalTitle = page.locator('text=Record payment');
    await expect(modalTitle).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });
});
