import { expect, test } from '@playwright/test';
import { LEGAL_DOCUMENTS } from '../../../../shared/legal/documents';

const pending = { user_id: 'test-staff', school_id: 'test-school', school_name: 'Amani School', display_name: 'Amina', ready: false,
  required_documents: LEGAL_DOCUMENTS.filter(doc => doc.kind !== 'dpa'), documents: LEGAL_DOCUMENTS, blockers: [],
  school_accepted: false, school_authority_verified: false, guardian_required: false, dpa_active: false,
  incorporated_documents: [], guardian_children: [], can_verify_school_authority: false, can_verify_guardians: false,
  statements: { school: '', guardian: '' }, receipts: [] };

for (const width of [320, 390, 768, 1440]) test(`branded agreement loading and transition at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let finish!: () => void;
  const hold = new Promise<void>(resolve => { finish = resolve; });
  let requests = 0;
  await page.route('**/api/legal/status', async route => {
    requests++;
    await hold;
    await route.fulfill({ json: pending });
  });
  await page.goto('/legal/accept');
  const loader = page.getByRole('status', { name: 'Loading MyShule' });
  await expect(loader).toBeVisible();
  await expect(page.getByText('Verifying your agreements')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => requests).toBe(1);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.getByTestId('workspace-loading').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath(`legal-loading-${width}.png`), fullPage: true });
  const started = Date.now();
  finish();
  await expect(page.getByRole('heading', { name: 'A moment before you begin' })).toBeVisible();
  const transitionMs = Date.now() - started;
  // Allows CI rendering variance while guarding against artificial splash delays.
  expect(transitionMs).toBeLessThan(1500);
  expect(requests).toBe(1);
  await expect(loader).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /Privacy Policy/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Terms of Use/ })).not.toBeChecked();
  expect(errors).toEqual([]);
  await testInfo.attach('verification-timing', { body: JSON.stringify({ width, requests, responseToFormMs: transitionMs }), contentType: 'application/json' });
});

test('the branded screen is server rendered before JavaScript starts', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3011/legal/accept');
    await expect(page.getByRole('status', { name: 'Loading MyShule' })).toBeVisible();
    await expect(page.locator('[data-myshule-brand-mark] img')).toBeVisible();
  } finally { await context.close(); }
});
