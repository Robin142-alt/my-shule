/* Isolated browser QA of the real workspace; fixtures never reach a school API. */
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
const out = path.resolve(web, '../../output/academic-setup-browser');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const fixture = {
  years: [{ id: 'year', name: '2026', status: 'active' }], terms: [], calendarPeriods: [],
  classes: [{ id: 'form4', name: 'Form 4', academic_year_id: 'year', status: 'active' }, { id: 'grade10', name: 'Grade 10', academic_year_id: 'year', status: 'active' }],
  streams: [{ id: 'yellow', name: 'Yellow', class_section_id: 'form4', status: 'active' }, { id: 'red', name: 'Red', class_section_id: 'grade10', status: 'active' }],
  subjects: [{ id: 'math', name: 'Mathematics', department_id: 'science', curriculum_model: 'CBC', status: 'active' }],
  departments: [{ id: 'science', name: 'Sciences', status: 'active' }],
  teachers: [{ user_id: 'teacher', label: 'Alex Teacher', role_code: 'teacher' }],
  classTeachers: [], teacherAssignments: [], classSubjectAssignments: [], gradingSystems: [], attendanceSettings: [], reportCardSettings: [], roleAppointments: [], curriculumConfigurations: [],
};
fs.writeFileSync(path.join(out, 'hooks.ts'), `const data=${JSON.stringify(fixture)};export function useSchoolQuery(){return {data,isLoading:false,error:null,refetch:async()=>({data,error:null})};}export function useSchoolMutation(){return {isPending:false,mutateAsync:async()=>({})};}`);
fs.writeFileSync(path.join(out, 'api.ts'), `export async function requestDashboardApi(path,options){window.__lastRequest={path,...options};return {id:'saved'};}`);
fs.writeFileSync(path.join(out, 'role.ts'), 'export function useOptionalSchoolDashboardRole(){return null;}');
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {AcademicFoundationWorkspace} from ${source(path.join(web, 'src/components/school/academic-foundation-workspace'))};createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-7xl p-4"><AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="QA School" tenantId="qa-school" initialTab="allocations"/></main>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'),
    output: { path: out, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
      '@/lib/data/school-hooks': path.join(out, 'hooks.ts'), '@/lib/dashboard/api-client': path.join(out, 'api.ts'),
      '@/lib/auth/school-dashboard-role-context': path.join(out, 'role.ts'), '@': path.join(web, 'src'),
    } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] },
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const cssRoot = path.join(web, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(file => String(file).endsWith('.css')).map(file => fs.readFileSync(path.join(cssRoot, String(file)), 'utf8')).join('\n');
  assert.ok(css, 'Build the web app first to verify actual styles.');
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="background:#071D49"><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const form = page.getByRole('form', { name: 'Assign subject teacher' });
      await form.getByLabel('Class/form/grade').selectOption('form4');
      assert.equal(await form.getByLabel('Stream').locator('option').count(), 2);
      await form.getByLabel('Stream').selectOption('yellow');
      await form.getByLabel('Class/form/grade').selectOption('grade10');
      assert.equal(await form.getByLabel('Stream').inputValue(), '');
      assert.equal(await form.getByLabel('Stream').locator('option[value="yellow"]').count(), 0);
      await form.getByLabel('Stream').selectOption('red');
      await form.getByLabel('Subject / learning area').selectOption('math');
      await form.getByRole('combobox', { name: 'Teacher', exact: true }).selectOption('teacher');
      assert.equal(await form.locator('input[type="date"],select[name="department_id"],select[name="curriculum_model"]').count(), 0);
      await form.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `allocations-${width}.png`), fullPage: true });
      await form.getByRole('button', { name: 'Assign Subject Teacher', exact: true }).click();
      await page.waitForFunction(() => window.__lastRequest?.path === '/academics/teacher-assignments');
      const body = await page.evaluate(() => window.__lastRequest.body);
      assert.equal(body.stream_id, 'red'); assert.equal(body.subject_id, 'math');
      for (const field of ['effective_from', 'effective_to', 'department_id', 'curriculum_model']) assert.equal(field in body, false);
      for (const tab of ['Classes & Streams', 'Subjects & Departments', 'Roles & Curriculum', 'Grading & Policies']) {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        assert.equal(await page.locator('input[name="code"],input[name="abbreviation"],input[name="effective_from"],input[name="effective_to"]').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tab} overflows at ${width}px`);
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Academic setup ${width}px: passed`);
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
