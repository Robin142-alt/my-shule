import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('Finance - Fee Structures Contract', () => {
  test('Accountant can create a fee structure and it persists', async ({ page }) => {
    const initialFeeStructuresLoad = page.waitForResponse((response) => {
      return response.url().includes('/api/billing/fee-structures') && response.request().method() === 'GET';
    });
    await loginAs(page, 'Accountant', {
      redirectTo: '/school/admin/fee-structures',
      expectedUrl: /\/school\/accountant\/fee-structures/,
    });
    await expect(page).toHaveURL(/\/school\/accountant\/fee-structures/);
    await expect(page.locator('input[aria-label="Fee structure name"]')).toBeVisible();
    expect((await initialFeeStructuresLoad).status()).toBe(200);
    await expect(page.getByText('Fee structures could not be loaded.')).toBeHidden({ timeout: 15000 });

    // 3. Fill in the fee structure form
    const uniqueFeeName = `End to End Test Fee ${Date.now()}`;
    const uniqueClassName = `E2E ${Date.now()}`;
    await page.fill('input[aria-label="Fee structure name"]', uniqueFeeName);
    await page.selectOption('select[aria-label="Grade level"]', { label: 'Form 1' });
    await page.selectOption('select[aria-label="Term"]', { label: 'Term 1' });
    await page.selectOption('select[aria-label="Academic year"]', { label: '2026' });
    await page.fill('input[aria-label="Fee structure class"]', uniqueClassName);
    await page.fill('input[aria-label="Due days (from invoice)"]', '14');
    await expect(page.locator('input[aria-label="Fee structure name"]')).toHaveValue(uniqueFeeName);
    await expect(page.locator('input[aria-label="Fee structure class"]')).toHaveValue(uniqueClassName);

    // Add a line item
    await page.click('button:has-text("Add line item")');
    const nameInputs = page.locator('input[placeholder="e.g. Tuition"]');
    await nameInputs.first().fill('Test Tuition');
    const amountInputs = page.locator('input[placeholder="e.g. 15000"]');
    await amountInputs.first().fill('5000');

    // 4. Save the fee structure through the real billing API
    const saveResponsePromise = page.waitForResponse((response) => {
      return response.url().includes('/api/billing/fee-structures') && response.request().method() === 'POST';
    });
    await page.getByRole('button', { name: 'Save fee structure' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(201);

    // 5. Verify the saved record appears after the workspace refreshes
    await expect(page.getByText(`saved for Form 1`)).toBeVisible({ timeout: 15000 });
    const feeStructureRow = page.locator(`text=${uniqueFeeName}`);
    await expect(feeStructureRow).toBeVisible({ timeout: 20000 });
  });
});
