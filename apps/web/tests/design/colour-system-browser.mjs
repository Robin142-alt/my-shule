// Exercise real components with the production CSS and an isolated query response.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
import { auditWorkspaceContrast } from './contrast-audit.mjs';
const require = createRequire(import.meta.url);
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(web, '../../output/colour-system');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'link.tsx'), 'export default function Link({children,...props}) {return <a {...props}>{children}</a>;}');
fs.writeFileSync(path.join(out, 'session.ts'), 'export const useLiveTenantSession = () => ({session: {tenantId: "visual-fixture"}, isLoading: false});');
fs.writeFileSync(path.join(out, 'api.ts'), `export const requestDashboardApi = async () => ({metrics: {on_track: 0, behind: 1}, items: [{id: "fixture", subject: "Mathematics", class_name: "Form 4", topic: "No lesson plan yet", coverage: 0, target: 100, status: "Behind"}]});`);
await new Promise((resolve, reject) => bundledWebpack.webpack({
  mode: 'development', devtool: false, entry: path.join(web, 'tests/design/colour-system.fixture.tsx'),
  plugins: [new bundledWebpack.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
  output: { path: out, filename: 'bundle.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
    'next/link': path.join(out, 'link.tsx'),
    '@/hooks/use-live-tenant-session': path.join(out, 'session.ts'),
    '@/lib/dashboard/api-client': path.join(out, 'api.ts'),
    '@': path.join(web, 'src'),
  } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] },
}, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const globalsPath = path.join(web, 'src/app/globals.css');
const globals = fs.readFileSync(globalsPath, 'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web, 'src/components'))};\n@source ${source(path.join(web, 'tests/design/colour-system.fixture.tsx'))};`);
const css = (await require('postcss')([require('@tailwindcss/postcss')()]).process(globals, { from: globalsPath })).css;
const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
  else if (req.url === '/fonts/InterVariable.woff2') { res.setHeader('Content-Type', 'font/woff2'); res.end(fs.readFileSync(path.join(web, 'public/fonts/InterVariable.woff2'))); }
  else if (req.url?.startsWith('/_next/image?') || req.url === '/brand/myshule-mark-512.png') { res.setHeader('Content-Type', 'image/png'); res.end(fs.readFileSync(path.join(web, 'public/brand/myshule-mark-512.png'))); }
  else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1440, 1000]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('Mathematics', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual((await auditWorkspaceContrast(page)).failures, [], 'Metric copy and shared actions must meet WCAG AA');
    for (const name of ['Dark outline', 'Dark ghost', 'Dark archive', 'Nested light outline', 'Nested light ghost', 'Light archive']) {
      await page.getByRole('button', { name, exact: true }).hover();
      await page.getByRole('button', { name, exact: true }).evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      assert.deepEqual((await auditWorkspaceContrast(page)).failures, [], `${name} must retain contrast on hover`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    const fill = locator => locator.evaluate(el => getComputedStyle(el).backgroundColor);
    assert.notEqual(await fill(page.locator('[data-tone="success"]')), await fill(page.locator('[data-tone="warning"]')), 'On Track and Behind need distinct semantic fills');
    assert.notEqual(await fill(page.locator('.app-workspace-panel > div').first()), 'rgb(255, 255, 255)', 'Section header must have a visible tint');
    const status = page.locator('.app-record-table').getByText('Behind', { exact: true });
    assert.equal(await fill(status), 'rgb(255, 246, 229)', 'Behind must use the warning badge');
    if (width < 640) assert.equal(await fill(page.locator('.app-record-table td').first()), 'rgb(237, 243, 251)', 'Mobile record heading must retain colour');
    await page.screenshot({ path: path.join(out, `syllabus-${width}.png`), fullPage: true });
    const workspacePrimary = await fill(page.getByRole('button', { name: 'Primary action', exact: true }));
    await page.getByRole('button', { name: 'Open form', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit details' });
    assert.deepEqual((await auditWorkspaceContrast(page)).failures, [], 'Portalled actions retain their light surface palette');
    assert.equal(await fill(dialog.getByRole('button', { name: 'Save details' })), workspacePrimary, 'Portals must share the workspace action colour');
    const field = dialog.getByLabel('Dialog input');
    await field.focus();
    await field.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    assert.equal(await field.evaluate(el => getComputedStyle(el).borderColor), 'rgb(40, 98, 187)', 'Dialog focus colour must match the shared token');
    await page.keyboard.press('Escape');
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open School workspace sidebar' }).click();
      const navigation = page.getByRole('dialog', { name: 'School workspace', exact: true });
      await navigation.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      assert.match(await navigation.evaluate(el => getComputedStyle(el).backgroundImage), /linear-gradient/, 'Mobile sidebar must have the navy treatment');
      assert.equal(await navigation.locator('[aria-current="page"]').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
      await page.screenshot({ path: path.join(out, `sidebar-${width}.png`) });
      await navigation.getByRole('searchbox').fill('Reports');
      await navigation.getByRole('button', { name: 'Reports', exact: true }).click();
      await navigation.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    results.push({ width, height, passed: true });
    console.log(`Colour system ${width}x${height}: passed`);
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
