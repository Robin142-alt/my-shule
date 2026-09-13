// Browser QA uses the real workspace and compiled styles with isolated fixtures.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const { webpack } = bundledWebpack;
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(web, '../../output/teacher-marks-ui');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const exam = { id: 'window-1', examSeriesId: 'exam-1', academicTermId: 'term-3', examName: 'End Term Exams', className: 'Form 4 Blue', classSectionId: 'form-4', subjectId: 'agriculture', subjectName: 'Agriculture', assessmentId: 'paper-1', paperName: 'Main Paper', outOf: 100, deadline: '20 Sep 2026', enteredCount: 4, totalStudents: 6, status: 'Draft', canEnter: true, entryState: 'Open' };
const names = ['Asha Njeri', 'Brian Otieno', 'Faith Wanjiku', 'James Kamau', 'Mercy Akinyi', 'Samuel Kiptoo'];
const roster = names.map((name, index) => ({ id: index < 2 ? null : `mark-${index}`, student_id: `student-${index}`, student_name: name, admission_number: `ADM-00${index + 1}`, score: index < 2 ? null : 70 + index, score_status: 'entered', status: 'draft', remarks: null }));
fs.writeFileSync(path.join(out, 'session.ts'), `export function useLiveTenantSession(){return {isLoading:false,session:{tenantId:'qa-school',user:{user_id:'qa-teacher'}}};}`);
fs.writeFileSync(path.join(out, 'live.ts'), `let submitted=false;let rows=${JSON.stringify(roster)};const exam=${JSON.stringify(exam)};
export async function fetchPendingMarksLive(){return {stats:{totalWindows:1,nearingDeadline:0},windows:submitted?[]:[{...exam,id:'old',examName:'Completed old exam',status:'Completed'},exam]};}
export async function fetchTeacherMarkSheetLive(){return rows;}
export async function saveExamMarksLive(session,payload){window.__payload=payload; if(payload.action==='submit')submitted=true;else rows=rows.map(row=>({...row,...payload.marks[row.student_id],id:row.id||row.student_id}));return {success:true};}`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {ExamsMarksWorkspace} from ${source(path.join(web, 'src/components/school/teacher-dashboard/exams-marks-workspace'))};createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><main className="mx-auto max-w-5xl p-3 sm:p-6"><ExamsMarksWorkspace onStartAction={()=>{}}/></main></QueryClientProvider>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'),
    output: { path: out, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
      '@/hooks/use-live-tenant-session': path.join(out, 'session.ts'), '@/lib/modules/teacher-live': path.join(out, 'live.ts'), '@': path.join(web, 'src'),
    } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] },
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const postcss = require('postcss');
  const tailwind = require('@tailwindcss/postcss');
  const globalsPath = path.join(web, 'src/app/globals.css');
  const globals = fs.readFileSync(globalsPath, 'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web, 'src/components/school/teacher-dashboard/exams-marks-workspace.tsx'))};\n@source ${source(path.join(out, 'entry.tsx'))};`);
  const css = (await postcss([tailwind()]).process(globals, { from: globalsPath })).css;
  fs.writeFileSync(path.join(out, 'styles.css'), css);
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="background:#f1f5f9"><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const asha = page.getByLabel('Asha Njeri score', { exact: true });
      await asha.waitFor();
      assert.equal(await page.getByRole('option', { name: /Completed old exam/ }).count(), 0);
      assert.equal(await page.getByText(/evidence|remarks|policy result|validation/i).count(), 0);
      const bounds = await asha.boundingBox();
      assert.ok(bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width, `Input does not fit at ${width}px`);
      await asha.fill('0');
      await asha.press('Enter');
      assert.equal(await page.getByLabel('Brian Otieno score', { exact: true }).evaluate(element => element === document.activeElement), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Entry overflows at ${width}px`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(out, `entry-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await page.getByText('Draft saved.', { exact: true }).waitFor();
      assert.equal(await page.getByText('Reasons for missing scores').count(), 0);
      assert.equal(await page.evaluate(() => window.__payload.marks['student-0'].score), 0);
      await page.getByRole('button', { name: 'Submit results', exact: true }).click();
      const reason = page.getByLabel('Brian Otieno missing score reason', { exact: true });
      await reason.waitFor();
      assert.equal(await page.locator('select[aria-label$="missing score reason"]').count(), 1);
      await page.getByRole('button', { name: 'Confirm submission', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Select a reason for every student' }).waitFor();
      assert.equal(await page.evaluate(() => window.__payload.action), 'draft');
      await reason.selectOption('absent');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Submission overflows at ${width}px`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(out, `submission-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Back to scores', exact: true }).click();
      assert.equal(await page.getByText(/evidence/i).count(), 0);
      assert.equal(await asha.inputValue(), '0');
      await page.getByRole('button', { name: 'Submit results', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm submission', exact: true }).click();
      await page.getByText('No exams awaiting marks', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__payload.marks['student-1'].score_status), 'absent');
      assert.equal(await page.getByLabel('Asha Njeri score', { exact: true }).count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Marks entry and submission ${width}px: passed`);
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
