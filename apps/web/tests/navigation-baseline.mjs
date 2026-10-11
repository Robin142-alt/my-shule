import { chromium } from '@playwright/test';
import fs from 'node:fs';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const role of ['deputy-principal', 'teacher', 'accountant', 'nurse', 'admissions']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const base = process.env.NAVIGATION_BASE_URL || 'http://127.0.0.1:3015';
    const user = { user_id: 'navigation-test', tenant_id: 'navigation-school', role, display_name: 'Navigation Test', email: 'test@example.test', session_id: 'test-session', permissions: ['*:*'] };
    const roleContext = { primaryRole: role, activeRole: role, primaryAuthorizationRoleCode: role, activeAuthorizationRoleCode: role, assignedRoles: [role], assignedAuthorizationRoleCodes: [role], availableRoles: [{ roleCode: role, authorizationRoleCode: role, roleName: role, isPrimary: true, isTeacherMode: false, sources: ['primary_membership'] }], teacherDashboardEligible: false };
    const session = { audience: 'school', tenantSlug: user.tenant_id, userLabel: user.display_name, user, role, roleContext, homePath: `/school/${role}`, redirectTo: `/school/${role}` };
    await context.addCookies([{ name: 'myshule.school.session', value: encodeURIComponent(JSON.stringify({ experience: 'school', role, tenantSlug: user.tenant_id, userLabel: user.display_name, homePath: `/school/${role}` })), url: base }]);
    let legal = 0; let auth = 0;
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if ((path === '/api/legal/access' || path === '/api/legal/status')) { legal++; await new Promise(r => setTimeout(r, 250)); return route.fulfill({ json: { ready: true, user_id: user.user_id, school_id: user.tenant_id } }); }
      if (path === '/api/auth/me') { auth++; return route.fulfill({ json: { session, user } }); }
      if (path === '/api/permissions/me') return route.fulfill({ json: { data: ['*:*'] } });
      if (path === '/api/school/modules/me') return route.fulfill({ json: ['principal_dashboard','students','academics','finance','admissions','reports','health'] });
      return route.fulfill({ status: 503, json: { message: 'Controlled navigation test: data unavailable' } });
    });
    await page.goto(`${base}/school/${role}`);
    await page.locator('.authenticated-app').first().waitFor({ timeout: 30000 }).catch(async error => { console.log(page.url(), await page.locator('body').innerText()); throw error; });
    const nav = page.locator('nav.dashboard-navigation').first();
    const targets = await nav.locator('button, a').evaluateAll(nodes => nodes.filter(n => !n.hasAttribute('disabled') && n.getAttribute('aria-current') !== 'page').slice(0,3).map(n => n.textContent.trim()));
    for (const label of targets) {
      await page.evaluate(() => {
        const shell = document.querySelector('.authenticated-app');
        window.__nav = { start: performance.now(), shell, removed: false, splash: false };
        window.__observer = new MutationObserver(() => {
          window.__nav.removed ||= !shell.isConnected;
          window.__nav.splash ||= !!document.querySelector('[data-testid="workspace-loading"], .legal-page');
        });
        window.__observer.observe(document.body,{childList:true,subtree:true});
      });
      const target = nav.locator('button, a').filter({ hasText: label }).first();
      await target.click();
      await page.waitForTimeout(800);
      const result = await page.evaluate(() => { window.__observer.disconnect(); return { removed: window.__nav.removed, splash: window.__nav.splash, path: location.pathname, selected: document.querySelector('nav [aria-current="page"]')?.textContent.trim() }; });
      results.push({ role, label, ...result, legal, auth });
    }
    await context.close();
  }
  fs.writeFileSync(process.argv[2] || 'navigation-baseline.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
