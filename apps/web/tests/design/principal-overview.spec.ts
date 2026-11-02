import { expect as playwrightExpect, test } from '@playwright/test';
import { normalizeDashboardRoleContext } from '@/lib/auth/dashboard-role-context';
import { SCHOOL_SESSION_COOKIE, serializeExperienceSession } from '@/lib/auth/experience-routing';
const expect = playwrightExpect.configure({ timeout: 30_000 });
// Gateway fixtures must stay intercepted after reload; the PWA worker has its own suites.
test.use({ serviceWorkers: 'block' });

// Isolated gateway fixtures exercise the actual application shell and Overview.
// They are never seeded into school data or imported by application code.
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`Principal overview and original navigation work at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    const user = { user_id: 'overview-test-principal', tenant_id: 'overview-test-school', role: 'principal',
      display_name: 'Test Principal', email: 'principal@example.test', session_id: 'overview-test-session', permissions: ['*:*'] };
    const session = { audience: 'school', tenantSlug: user.tenant_id, userLabel: user.display_name,
      user, role: 'principal', roleContext: normalizeDashboardRoleContext(null, 'principal'),
      homePath: '/school/principal', redirectTo: '/school/principal' };
    await page.context().addCookies([
      { name: SCHOOL_SESSION_COOKIE, value: serializeExperienceSession({ experience: 'school', role: 'principal',
        tenantSlug: session.tenantSlug, userLabel: session.userLabel, homePath: session.homePath }), url: 'http://127.0.0.1:3005' },
    ]);
    let financeEnabled = true;
    const overview = { totalStudents: 412, totalStaff: 32, pendingApprovals: 2, activeIssues: 0 };
    const visitors = Array.from({ length: 5 }, (_, index) => ({ id: `visit-${index}`, visitor_name: `Test Visitor ${index + 1}`,
      role_relationship: ['Parent (Class A)', 'Teacher', 'Bursar', 'Visitor', 'Parent'][index],
      purpose: ['Academic support discussion', 'Teaching resources', 'Accounts review', 'School partnership meeting', 'Student attendance'][index],
      arrival_time: new Date(Date.now() - (20 - index * 3) * 60_000).toISOString(), person_to_see: 'Principal', ticket_number: `R-${index}`, status: 'Waiting' }));
    const details = () => ({ generatedAt: new Date().toISOString(), calendar: { state: 'ready', data: { name: 'Term 3', year: '2026', week: 4, weeks: 12, days_left: 58 } },
      lessons: { state: 'ready', data: { taught: 34, recorded: 39 } }, health: { state: 'ready', data: { cases: 2 } },
      visitors: { state: 'ready', data: visitors }, finance: financeEnabled ? { state: 'ready', data: { collectedTodayMinor: '1250000', arrearsMinor: '42500000', currency: 'KES' } } : { state: 'hidden' } });
    const executive = { tenant_id: user.tenant_id, generated_at: new Date().toISOString(), enabled_modules: ['finance', 'academics'],
      alerts: [{ id: 'syllabus', module_code: 'academics', title: 'Syllabus coverage', message: 'Two subjects require follow-up', severity: 'warning' }], notifications: [], realtime_channels: [] };
    const consoleErrors: string[] = [];
    page.on('pageerror', error => consoleErrors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); const path = url.pathname;
      if (path === '/api/auth/me') return route.fulfill({ json: { session, user } });
      if (path === '/api/legal/access') return route.fulfill({ json: { ready: true } });
      if (path === '/api/school/modules/me') return route.fulfill({ json: ['principal_dashboard', 'students', 'admissions', 'academics', 'finance', 'reports', 'exams'] });
      if (path.includes('/permissions/me')) return route.fulfill({ json: { data: ['*:*'] } });
      if (path.endsWith('/dashboard/stream')) return route.fulfill({ contentType: 'text/event-stream', body: `event: principal.dashboard\ndata: ${JSON.stringify(executive)}\n\n` });
      let data: unknown = {};
      if (path.endsWith('/principal/overview')) data = overview;
      if (path.endsWith('/principal/dashboard')) data = executive;
      if (path.endsWith('/principal/overview-details')) data = details();
      if (path.endsWith('/principal/school-profile')) data = { schoolName: 'MyShule Test School', logoUrl: null };
      if (path.endsWith('/principal/settings')) data = { dashboard: { defaultView: 'overview', theme: 'light' } };
      if (path.endsWith('/collection-channel-summary')) data = { total: 0, pending_approval: 0 };
      if (path.includes('/exams/analytics')) {
        const previous = url.searchParams.get('exam_series_id') === 'old';
        data = { filters: { exam_series_id: previous ? 'old' : 'new' },
          options: { exams: [{ id: 'new', name: 'Term assessment' }, { id: 'old', name: 'Previous assessment' }] },
          kpis: { school_average: previous ? 60 : 73 }, previous: { mean: 68 },
          comparisons: [65, 71, 82, 70, 77].map((score, index) => ({ dimension: 'class', id: `class-${index}`,
            label: `Class ${String.fromCharCode(65 + index)}`, mean: previous ? score - 10 : score,
            learners_examined: 25, expected_learners: 28, marks_completion: 91 })) };
      }
      if (path.endsWith('/principal/students')) data = { totalStudents: 412, boys: 200, girls: 212, populationTrend: [], recentAdmissions: [] };
      return route.fulfill({ json: { data, meta: {} } });
    });
    await page.goto('/school/principal', { waitUntil: 'domcontentloaded' });
    const content = page.getByTestId('principal-overview');
    await expect(content.getByRole('heading', { name: 'Academic Performance' })).toBeVisible({ timeout: 30_000 });
    await expect(content.getByText('73%', { exact: true })).toBeVisible();
    await expect(content.getByText('Test Visitor 1')).toBeVisible();
    await expect(content.getByText('Fee Collection Today')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await content.boundingBox())!.height).toBeLessThan(width < 768 ? 800 : 640);
    const metricTops = await content.getByLabel('School key figures').getByRole('button').evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(metricTops).size).toBe(1);
    console.log(`Overview ${width}px: ${Math.round((await content.boundingBox())!.height)}px high; no horizontal overflow`);
    await page.screenshot({ path: `../../output/principal-overview-${width}.png`, fullPage: true });
    await content.screenshot({ path: `../../output/principal-overview-content-${width}.png` });

    const menu = page.getByRole('button', { name: 'Open principal navigation', exact: true });
    if (width < 1024) {
      await expect(menu).toHaveClass('app-side-menu-tab');
      const bounds = await menu.boundingBox(); expect(bounds!.x).toBeLessThanOrEqual(1);
      expect(bounds!.y).toBeGreaterThan(300); expect(bounds!.y).toBeLessThan(700);
      await menu.click(); await expect(page.getByRole('navigation', { name: 'Principal dashboard sidebar' })).toBeVisible();
      await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    } else { await expect(page.getByRole('navigation', { name: 'Principal dashboard sidebar' })).toBeVisible(); }

    await content.getByRole('combobox', { name: 'Academic performance exam' }).selectOption('old');
    await expect(content.getByRole('group', { name: 'School average summary' })).toContainText('60%');
    await content.getByRole('button', { name: /Class A: 55%/ }).click();
    await expect(page.getByRole('dialog', { name: 'Class A results' })).toBeVisible();
    await page.keyboard.press('Escape');
    await content.getByRole('button', { name: 'View All' }).click();
    await expect(page.getByRole('dialog', { name: 'All waiting visitors' }).getByText('Test Visitor 5')).toBeVisible();
    await page.getByRole('dialog', { name: 'All waiting visitors' }).getByRole('button', { name: 'View details for Test Visitor 1' }).click();
    await expect(page.getByRole('dialog')).toContainText('Academic support discussion');
    await page.keyboard.press('Escape');
    financeEnabled = false; await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(content.getByText('Test Visitor 1')).toBeVisible();
    await expect(content.getByText('Fee Collection Today')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await content.getByRole('button', { name: 'View students' }).click();
    await expect(page).toHaveURL(/\/school\/principal\/students$/);
    expect(consoleErrors).toEqual([]);
  });
}
