import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('Finance - Fee Structures Contract', () => {
  test('Accountant can create a fee structure and it persists', async ({ page }) => {
    // 1. Authenticate as Accountant
    await loginAs(page, 'Accountant');

    // 2. Navigate to Fee Structures workspace
    await page.goto('/school/admin/fee-structures');
    await page.waitForLoadState('networkidle');

    // 3. Fill in the fee structure form
    const uniqueFeeName = `End to End Test Fee ${Date.now()}`;
    await page.fill('input[aria-label="Fee structure name"]', uniqueFeeName);
    await page.selectOption('select[aria-label="Grade level"]', { label: 'Form 1' });
    await page.selectOption('select[aria-label="Term"]', { label: 'Term 1' });
    await page.selectOption('select[aria-label="Academic year"]', { label: '2026' });
    await page.fill('input[aria-label="Due days (from invoice)"]', '14');

    // Add a line item
    await page.click('button:has-text("Add line item")');
    const nameInputs = page.locator('input[placeholder="e.g. Tuition"]');
    await nameInputs.first().fill('Test Tuition');
    const amountInputs = page.locator('input[placeholder="e.g. 15000"]');
    await amountInputs.first().fill('5000');

    // 4. Save the fee structure
    await page.click('button:has-text("Save fee structure")');

    // 5. Verify it appears in the data table or a success message is shown
    // Let's assume the table refreshes and shows the new fee structure
    const feeStructureRow = page.locator(`text=${uniqueFeeName}`);
    await expect(feeStructureRow).toBeVisible({ timeout: 10000 });
  });
});
