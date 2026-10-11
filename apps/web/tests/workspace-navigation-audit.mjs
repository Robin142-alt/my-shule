/* Production-build browser audit. All API replies are explicit test fixtures;
 * unavailable data stays unavailable. Never connects to a school's backend. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.NAVIGATION_BASE_URL || 'http://127.0.0.1:3017';
const output = process.argv[2] || '../../tmp/workspace-navigation-audit.json';
const roles = (process.env.NAVIGATION_ROLES || 'principal,deputy-principal,teacher,accountant,bursar,dean-academics,exams-manager,hod,hos,class-teacher,grade-master,admissions,secretary,librarian,storekeeper,nurse,guidance-counselling,discipline-master,laboratory-technician,ict-manager,security-officer,transport-manager,boarding-master,procurement-officer,admin,student,portal-parent,portal-student,superadmin,system-monitor').split(',');
const widths = (process.env.NAVIGATION_WIDTHS || '1440,390').split(',').map(Number);
const modules = ['principal_dashboard','students','admissions','academics','exams','attendance','finance','reports','library','health','clinic','discipline','counselling','transport','boarding','inventory','laboratory','security','communication','parent_portal','student_portal','staff','timetable','documents','notifications','analytics','offline_sync','system_monitoring'];
const results = [];
const clean = text => text?.replace(/\s+/g, ' ').trim();
function roleContext(role) {
  return { primaryRole: role, activeRole: role, primaryAuthorizationRoleCode: role, activeAuthorizationRoleCode: role, assignedRoles: [role], assignedAuthorizationRoleCodes: [role], availableRoles: [{ roleCode: role, authorizationRoleCode: role, roleName: role, isPrimary: true, isTeacherMode: false, sources: ['primary_membership'] }], teacherDashboardEligible: false };
}
async function fixture(context, key) {
  const portal = key.startsWith('portal-'); const role = portal ? key.slice(7) : key;
  const audience = portal ? 'portal' : ['superadmin','system-monitor'].includes(role) ? 'superadmin' : 'school';
  const home = portal ? `/portal/${role}` : audience === 'superadmin' ? `/${role}` : `/school/${role}`;
  const user = { user_id: 'navigation-test', tenant_id: 'navigation-school', role, display_name: 'Navigation Test', email: 'test@example.test', session_id: 'test-session', permissions: ['*:*'] };
  const session = { audience, tenantSlug: user.tenant_id, userLabel: user.display_name, user, role, viewer: role, roleContext: roleContext(role), homePath: home, redirectTo: home };
  // Routing-only cookies select the server route. Client authentication is
  // independently verified by the mocked gateway, with no real credentials.
  await context.addCookies([{ name: `myshule.${audience}.session`, value: encodeURIComponent(JSON.stringify({ experience: audience, role, viewer: role, tenantSlug: user.tenant_id, userLabel: user.display_name, homePath: home })), url: base }]);
  const calls = { auth: 0, legal: 0, data: 0 };
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if ((path === '/api/legal/access' || path === '/api/legal/status')) { calls.legal++; await new Promise(r => setTimeout(r,250)); return route.fulfill({ json: { ready: true, user_id: user.user_id, school_id: user.tenant_id } }); }
    if (path === '/api/auth/me') { calls.auth++; return route.fulfill({ json: { session, user } }); }
    if (path === '/api/permissions/me') return route.fulfill({ json: { data: ['*:*'] } });
    if (path === '/api/school/modules/me') return route.fulfill({ json: modules });
    calls.data++;
    await new Promise(r => setTimeout(r, Number(process.env.NAVIGATION_DATA_DELAY_MS || 350)));
    return route.fulfill({ status: 503, json: { message: 'Controlled test: data service unavailable' } });
  });
  return { home, calls };
}
async function installProbe(page) {
  await page.addInitScript(() => {
    window.__navigationSamples = [];
    window.__longTasks = [];
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => {
      window.__longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })));
    }).observe({type:'longtask',buffered:true});
    document.addEventListener('click', event => {
      const control = event.target.closest('button,a');
      if (!control || !control.closest('nav') || control.hasAttribute('aria-expanded')) return;
      const label = (control.querySelector('.dashboard-nav-label')?.textContent || control.textContent).replace(/\s+/g,' ').trim().replace(/(?:Active|Urgent)$/,'');
      const shell = document.querySelector('.authenticated-app');
      const sample = { label, phase: window.__navPhase || "cold", start: performance.now(), feedbackMs: null, selectionMs: null, removed: false, splash: false, paths: [] };
      window.__navigationSamples.push(sample);
      const observe = () => {
        sample.removed ||= !!shell && !shell.isConnected;
        sample.splash ||= !!document.querySelector('[data-testid="workspace-loading"],.legal-page');
        const selected = [...document.querySelectorAll('nav [aria-current="page"]')].some(n => n.textContent.replace(/\s+/g,' ').trim().replace(/(?:Active|Urgent)$/,'') === label);
        if (selected) sample.selectionMs ??= performance.now() - sample.start;
        if (sample.feedbackMs === null && selected) requestAnimationFrame(() => { sample.feedbackMs ??= performance.now() - sample.start; });
        if (sample.paths.at(-1) !== location.pathname + location.search) sample.paths.push(location.pathname + location.search);
      };
      const observer = new MutationObserver(observe);
      observer.observe(document.body,{ childList:true, subtree:true, attributes:true, attributeFilter:['aria-current'] });
      requestAnimationFrame(observe);
      setTimeout(() => { observe(); observer.disconnect(); }, 600);
    }, true);
  });
}
async function openNav(page, width) {
  if (width < 1000) {
    const trigger = page.getByRole('button', { name: /^Open (?:.* )?(sidebar|navigation|menu)$/ }).filter({ visible: true }).first();
    if (await trigger.count() && await trigger.getAttribute('aria-expanded') !== 'true' && !await page.locator('[role="dialog"]:visible nav.dashboard-navigation').count()) await trigger.click();
  }
  const nav = page.locator('nav.dashboard-navigation:visible').last();
  await nav.locator('button:not([aria-expanded]),a').first().waitFor();
  return nav;
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const width of widths) for (const role of roles) {
    const row = { role, width, samples: [], errors: [] };
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: width < 1000 ? 'allow' : 'block', isMobile: width < 1000, hasTouch: width < 1000 });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(error.message));
    try {
      const { home, calls } = await fixture(context, role);
      await installProbe(page);
      const trace = process.env.NAVIGATION_TRACE === '1' ? await context.newCDPSession(page) : null;
      if (trace) await trace.send('Tracing.start', { categories: 'devtools.timeline,v8.execute,blink.user_timing', transferMode: 'ReturnAsStream' });
      if (process.env.NAVIGATION_SLOW === '1') {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 1_000_000, uploadThroughput: 500_000 });
        row.network = '120ms latency, 8Mbps download, delayed fixture APIs';
      }
      if (process.env.NAVIGATION_STANDALONE === '1') {
        await page.addInitScript(() => {
          const original = window.matchMedia.bind(window);
          window.matchMedia = query => { const media = original(query); if(query === '(display-mode: standalone)') Object.defineProperty(media,'matches',{value:true}); return media; };
          Object.defineProperty(navigator,'standalone',{value:true});
        });
        row.standaloneEmulation = true;
      }
      const start = Date.now();
      await page.goto(base + home);
      await page.locator('.authenticated-app').first().waitFor({ timeout: 30000 });
      row.coldShellMs = Date.now() - start;
      let nav = await openNav(page, width);
      if (!await nav.count()) throw new Error('No accessible navigation');
      const groups = await nav.locator('button[aria-expanded]').all();
      for (const group of groups) if (await group.getAttribute('aria-expanded') === 'false') await group.click();
      const labels = await nav.locator('button:not([aria-expanded]),a').evaluateAll(nodes => nodes.filter(n => !n.disabled).map(n => n.textContent.replace(/\s+/g,' ').trim().replace(/(?:Active|Urgent)$/,'')));
      const targets = width < 1000 ? labels.slice(0,4) : labels;
      for (const [phase, label] of [...targets.map(label=>['cold',label]), ...targets.slice(-3).map(label=>['warm',label])]) {
        await page.evaluate(phase => { window.__navPhase = phase; }, phase);
        if (width < 1000 || !await nav.isVisible()) nav = await openNav(page, width);
        const target = nav.locator('button:not([aria-expanded]),a').filter({ hasText: label }).first();
        if (!await target.count() || !await target.isVisible()) throw new Error('Workspace disappeared: '+label);
        await target.click();
        await page.waitForTimeout(80);
        row.samples.push({ phase, label, selected: clean(await page.locator('nav [aria-current="page"]').first().textContent().catch(() => '')), path: new URL(page.url()).pathname + new URL(page.url()).search });
      }
      await page.waitForTimeout(650);
      row.observations = await page.evaluate(() => window.__navigationSamples);
      row.longTasks = await page.evaluate(() => window.__longTasks);
      if (trace) {
        const complete = new Promise(resolve => trace.once('Tracing.tracingComplete', resolve));
        await trace.send('Tracing.end');
        const { stream } = await complete;
        let data = '';
        for (;;) { const part = await trace.send('IO.read', { handle: stream }); data += part.data; if (part.eof) break; }
        await trace.send('IO.close', { handle: stream });
        fs.writeFileSync(`../../tmp/navigation-trace-${role}-${width}.json`, data);
      }
      // Native history must restore a workspace and its shell, not just its URL.
      if (row.samples.length > 1) {
        const finalPath = page.url();
        const node = await page.locator('.authenticated-app').first().elementHandle();
        await page.goBack(); await page.waitForTimeout(100);
        row.back = { path: page.url(), selected: clean(await page.locator('nav [aria-current="page"]').first().textContent().catch(() => '')) };
        await page.goForward(); await page.waitForTimeout(100);
        row.forwardRestored = page.url() === finalPath;
        row.historyShellPreserved = await node.evaluate(n => n.isConnected);
        row.backCorrect = new URL(row.back.path).pathname + new URL(row.back.path).search === row.samples.at(-2).path && row.back.selected.startsWith(row.samples.at(-2).label);
      }
      if (width >= 1000 && targets.length > 3) {
        const burst = targets.slice(-3);
        await page.evaluate(labels => {
          window.__navPhase = 'rapid';
          const nav = document.querySelector('nav.dashboard-navigation');
          for (const label of labels) [...nav.querySelectorAll('button:not([aria-expanded]),a')].find(n=>n.textContent.replace(/\s+/g,' ').trim().replace(/(?:Active|Urgent)$/,'') === label)?.click();
        }, burst);
        await page.waitForTimeout(100);
        row.rapidCorrect = clean(await page.locator('nav [aria-current="page"]').first().textContent().catch(()=>''))?.startsWith(burst.at(-1));
      }
      row.serviceWorkerControlled = await page.evaluate(()=>!!navigator.serviceWorker?.controller);
      if (row.standaloneEmulation) row.privateCacheEntries = await page.evaluate(async()=>{
        const requests = (await Promise.all((await caches.keys()).map(async name=>(await caches.open(name)).keys()))).flat();
        return requests.map(request=>new URL(request.url).pathname).filter(path=>/^\/(api|school|portal|superadmin)(\/|$)/.test(path));
      });
      row.calls = { ...calls };
      const final = row.samples.at(-1);
      if (final) {
        await page.goto(base + final.path);
        await page.locator('.authenticated-app').first().waitFor({ timeout: 15000 });
        row.direct = { path: new URL(page.url()).pathname + new URL(page.url()).search, selected: clean(await page.locator('nav [aria-current="page"]').first().textContent().catch(() => '')) };
      }
      row.noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      if (['teacher','nurse','principal','superadmin','portal-parent'].includes(role)) { await page.waitForTimeout(2200); await page.screenshot({ path: `../../tmp/navigation-${role}-${width}.png`, fullPage: false }); }
    } catch (error) { row.failure = error.message; row.url = page.url(); row.body = (await page.locator('body').innerText().catch(() => '')).slice(0,1500); }
    row.issues = [row.privateCacheEntries?.length ? 'Private data found in service worker cache' : null, row.noHorizontalOverflow === false ? 'Horizontal page overflow' : null, row.failure, ...row.errors, ...(row.samples.filter(s => !s.selected.startsWith(s.label)).map(s => 'Wrong workspace: '+s.label+' -> '+s.selected)), ...(row.observations || []).filter(s=>s.removed || s.splash).map(s=>'Shell replaced or splash: '+s.label), row.rapidCorrect === false ? 'Rapid click mismatch' : null, row.backCorrect === false ? 'Back workspace mismatch' : null, row.forwardRestored === false ? 'Forward URL mismatch' : null, row.historyShellPreserved === false ? 'History shell replaced' : null, row.direct && !row.direct.selected.startsWith(row.samples.at(-1).label) ? 'Direct workspace mismatch' : null, row.samples.length === 0 ? 'No transitions exercised' : null].filter(Boolean);
    results.push(row);
    fs.writeFileSync(output, JSON.stringify(results,null,2));
    console.log(JSON.stringify({ role, width, transitions: row.samples.length, failures: row.issues, remounts: row.observations?.filter(s=>s.removed).length, flashes: row.observations?.filter(s=>s.splash).length, maxMs: Math.max(...(row.observations || []).map(s=>s.feedbackMs || 0)), direct: row.direct, calls: row.calls }));
    await context.close();
  }
  await browser.close();
  if (results.some(row => row.issues.length)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exit(1); });
