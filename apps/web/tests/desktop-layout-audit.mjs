// Exercise the real compiled routes with the same isolated API fixture as the navigation audit.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {fixture, roleKeys} from './workspace-browser-fixture.mjs';

const base = process.env.NAVIGATION_BASE_URL || 'http://127.0.0.1:3017';
if (!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname)) throw new Error('Use a local preview');
const output = process.argv[2];
if (!output) throw new Error('Supply an output JSON path');
fs.mkdirSync(path.dirname(output), {recursive:true});
const roles = process.env.NAVIGATION_ROLES?.split(',') ?? roleKeys;
const widths = (process.env.NAVIGATION_WIDTHS || '1280,1366,1440,1536,1093,1024,768,390').split(',').map(Number);
const screenshotRoles = (process.env.NAVIGATION_SCREENSHOTS || '').split(',');
const browser = await chromium.launch({headless:true});
const rows = [];
const failures = [];

function measure() {
  const rect = node => {
    if (!node || !node.checkVisibility()) return null;
    const {x,y,width,height} = node.getBoundingClientRect();
    return width && height ? [x,y,width,height].map(Math.round) : null;
  };
  const onscreen = r => r && r[0] < innerWidth && r[0] + r[2] > 0 && r[1] < innerHeight && r[1]+r[3] > 0;
  const rails = [...document.querySelectorAll('aside')].filter(el => el.querySelector('nav.dashboard-navigation'));
  const rail = rails.find(el => onscreen(rect(el)));
  const content = [...document.querySelectorAll('main, .app-content, header')].find(el => !el.contains(rail) && !rail?.contains(el) && onscreen(rect(el)) && (!rail || rect(el)[0] >= rect(rail)[0]+rect(rail)[2]-1));
  const header = document.querySelector('.authenticated-app header');
  const nav = rail?.querySelector('.dashboard-nav-item');
  const card = document.querySelector('.app-metric-grid > *, .dashboard-card, .enterprise-card');
  const triggers = [...document.querySelectorAll('.app-side-menu-tab, .app-top-menu-trigger')].filter(el=>onscreen(rect(el)));
  const overflow = document.documentElement.scrollWidth - innerWidth;
  return {rail:rect(rail), content:rect(content), header:rect(header), card:rect(card), navHeight:rect(nav)?.[3],
    railPosition:rail ? getComputedStyle(rail).position : null,
    menu:triggers.length, overflow, overflowNodes:overflow > 1 ? [...document.querySelectorAll('main *')].filter(el=>rect(el)?.[0]+rect(el)?.[2]>innerWidth+1).slice(0,4).map(el=>el.tagName+'.'+el.className) : []};
}

async function record(page, role, workspace, measurements) {
  for (const width of widths) {
    await page.setViewportSize({width,height:850});
    // Wait for the existing 200ms mobile rail transition to settle before measuring.
    await page.waitForTimeout(220);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const sample = await page.evaluate(measure);
    measurements.push({workspace,width,...sample});
    const issues = [];
    if (sample.overflow > 1) issues.push('horizontal page overflow');
    if (width >= 1024) {
      if (!sample.rail) issues.push('desktop sidebar missing');
      if (!sample.content) issues.push('no workspace beside sidebar');
      if (sample.menu) issues.push('mobile navigation on desktop');
    } else if (sample.rail) issues.push('sidebar covers closed mobile workspace');
    if (issues.length) failures.push({role,workspace,width,issues});
    if (workspace === 'home' && screenshotRoles.includes(role)) {
      await page.screenshot({path:path.join(path.dirname(output),`${role}-${width}.png`)});
    }
    if (width === 1440 && sample.rail) {
      await page.mouse.move(1000,700);
      await page.mouse.wheel(0,650);
      await page.waitForTimeout(120);
      const scrolled = await page.evaluate(measure);
      // A sticky rail may move from its initial document offset to its sticky top.
      if (!scrolled.rail || scrolled.rail[1]<-1 || scrolled.rail[1]>sample.rail[1]+2) failures.push({role,workspace,width,issues:['desktop sidebar moved out of place while scrolling']});
      await page.mouse.wheel(0,-10000);
      await page.waitForTimeout(120);
    }
  }
}

try {
  for (const role of roles) {
    const context = await browser.newContext({viewport:{width:1440,height:850},serviceWorkers:'block',reducedMotion:'reduce'});
    const row = {role,measurements:[],errors:[]};
    rows.push(row);
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      page.on('pageerror', err=>row.errors.push(err.message));
      const {home} = await fixture(context,role,base);
      await page.goto(base+home);
      const nav = page.locator('aside nav.dashboard-navigation:visible').first();
      await nav.waitFor();
      await documentFontsReady(page);
      const groups = nav.locator('button[aria-expanded]');
      for (const group of await groups.all()) {
        if (await group.getAttribute('aria-expanded') === 'false') await group.click();
      }
      const links = nav.locator('button:not([aria-expanded]), a');
      const labels = await links.evaluateAll(nodes=>nodes.map((n,index)=>({index,label:n.textContent.replace(/\s+/g,' ').trim(),disabled:n.disabled})).filter(n=>!n.disabled));
      await record(page,role,'home',row.measurements);
      const limit = Number(process.env.NAVIGATION_LIMIT ?? labels.length);
      for (const {index,label} of labels.slice(0,limit)) {
        await page.setViewportSize({width:1440,height:850});
        const item = links.nth(index);
        await item.click();
        await item.evaluate(n=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        if (await item.getAttribute('aria-current') !== 'page') throw new Error('Workspace did not select '+label);
        await record(page,role,label,row.measurements);
        fs.writeFileSync(output, JSON.stringify({rows,failures},null,2));
        console.log(JSON.stringify({role,workspace:label,samples:row.measurements.length}));
      }
      if (widths.includes(390)) {
        await page.setViewportSize({width:390,height:850});
        const trigger = page.getByRole('button',{name:/^Open (?:.* )?(sidebar|navigation|menu)$/}).filter({visible:true}).first();
        await trigger.click();
        const drawer = page.locator('nav.dashboard-navigation:visible').last();
        await drawer.locator('a, button:not([aria-expanded])').first().click();
        row.mobileNavigation = !(await page.locator('[role=dialog]:visible nav.dashboard-navigation').count());
        if (!row.mobileNavigation) throw new Error('Mobile menu did not close after choosing a workspace');
      }
    } catch (error) { row.errors.push(error.message); }
    await context.close();
    fs.writeFileSync(output, JSON.stringify({rows,failures},null,2));
    console.log(JSON.stringify({role,samples:row.measurements.length,errors:row.errors,failures:failures.filter(f=>f.role===role).length}));
  }
} finally { await browser.close(); }
if (failures.length || rows.some(row=>row.errors.length)) process.exitCode = 1;

async function documentFontsReady(page) {
  await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
}
