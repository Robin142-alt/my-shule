/* Isolated UI verification of real components. Fixtures never reach school APIs. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';

const require = createRequire(import.meta.url);
const { webpack } = bundledWebpack;
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(web, '../../output/student-progression-browser');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
const learner = { id: 'student-one', name: 'Amina Otieno', admission_number: 'SH001', version: 'version-one', academic_year_id: 'year-2026', academic_year_name: '2026', class_section_id: 'class-seven', class_name: 'Grade 7', stream_id: 'east-seven', stream_name: 'East', curriculum_model: 'CBC', status: 'upcoming', student_status: 'active', next_class_name: 'Grade 8 East', message: null, latest_transition_id: 'transition-one' };
const fixture = {
  timezone: 'Africa/Nairobi', selected_year_id: 'year-2026', automation: { status: 'scheduled', message: 'Learners move automatically after 20 November 2026.', next_run_at: '2026-11-21T00:00:00+03:00' },
  permissions: { manage: true, approve: true }, counts: { upcoming: 128, promoted: 0, repeating: 2, held: 1, exceptions: 1 },
  students: [learner, { ...learner, id: 'student-two', name: 'Brian Kamau', admission_number: 'SH002', status: 'held', next_class_name: null, message: 'Awaiting authorised placement review' }], total: 2,
  years: [{ id: 'year-2026', name: '2026', starts_on: '2026-01-01', ends_on: '2026-11-20', status: 'active', is_current: true }, { id: 'year-2027', name: '2027', starts_on: '2027-01-01', ends_on: '2027-11-20', status: 'active', is_current: false }],
  classes: [{ id: 'class-seven', name: 'Grade 7', academic_year_id: 'year-2026', curriculum_model: 'CBC', grade_level: '7' }, { id: 'class-eight', name: 'Grade 8', academic_year_id: 'year-2027', curriculum_model: 'CBC', grade_level: '8' }],
  streams: [{ id: 'east-seven', name: 'East', class_section_id: 'class-seven' }, { id: 'east-eight', name: 'East', class_section_id: 'class-eight' }], runs: [], approvals: [],
};
const detail = { student: learner, subjects: [{ id: 'math', name: 'Mathematics', code: 'MAT', compulsory: true, selected: true }, { id: 'art', name: 'Art', code: 'ART', compulsory: false, selected: false }], timeline: [{ id: 'transition-one', action: 'promotion', outcome: 'promoted', reason: 'Annual progression', actor: 'School automation', created_at: '2026-01-01T00:00:00Z', from_class: 'Grade 6', from_year: '2025', to_class: 'Grade 7', to_year: '2026', reversible: true }] };
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'css-loader.cjs'), `module.exports=function(source){const names={};const css=source.replace(/\\.([a-zA-Z][\\w-]*)/g,(_,name)=>'.'+(names[name]='progression_'+name));return 'const style=document.createElement("style");style.textContent='+JSON.stringify(css)+';document.head.appendChild(style);export default '+JSON.stringify(names)+';';};`);
fs.writeFileSync(path.join(out, 'hooks.ts'), `const overview=${JSON.stringify(fixture)};const detail=${JSON.stringify(detail)};export function useSchoolQuery(path){return {data:!path?undefined:path.includes('/students/')?detail:overview,isLoading:false,isFetching:false,error:null,refetch:async()=>({data:overview})};}`);
fs.writeFileSync(path.join(out, 'query.ts'), 'export function useQueryClient(){return {invalidateQueries:async()=>{}};}');
fs.writeFileSync(path.join(out, 'tenant.ts'), 'export function useOptionalSchoolTenantId(){return "qa-school";}');
fs.writeFileSync(path.join(out, 'api.ts'), `export async function submitProgressionCommand(command){window.__lastCommand=command;return {status:'completed',affected:command.students.length,message:'School decision saved.'};}export async function runProgression(year,id){window.__lastRun={year,id};return {status:'running',message:'Progression processing has started.'};}export async function decideProgressionApproval(){return {status:'completed',affected:1,message:'Decision saved.'};}`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {StudentProgressionWorkspace} from ${source(path.join(web, 'src/components/school/student-progression/workspace'))};createRoot(document.getElementById('root')).render(<main className="authenticated-app" style={{padding:12,maxWidth:1400,margin:'auto'}}><StudentProgressionWorkspace onOpenCalendar={()=>{window.__calendarOpened=true}}/></main>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'), output: { path: out, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
      '@/lib/data/school-hooks': path.join(out, 'hooks.ts'), '@/lib/data/school-tenant-scope': path.join(out, 'tenant.ts'), '@/lib/modules/student-progression': path.join(out, 'api.ts'), '@tanstack/react-query': path.join(out, 'query.ts'), '@': path.join(web, 'src'),
    } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }, { test: /\.module\.css$/, use: [path.join(out, 'css-loader.cjs')] }] }, optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const globalFile = path.join(web, 'src/app/globals.css');
  const css = (await postcss([tailwind({ base: web })]).process(fs.readFileSync(globalFile, 'utf8'), { from: globalFile })).css;
  fs.writeFileSync(path.join(out, 'styles.css'), css);
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
    else { res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="background:#eef2f8"><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.getByRole('heading', { name: 'Student Progression & Transitions' }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Roster overflows at ${width}px`);
      await page.screenshot({ path: path.join(out, `workspace-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Amina Otieno', exact: true }).click();
      await page.getByRole('button', { name: 'Change subjects', exact: true }).click();
      const dialog = page.getByRole('dialog');
      assert.ok(await dialog.getByRole('checkbox', { name: /Mathematics/ }).isDisabled());
      await dialog.getByRole('checkbox', { name: /Art/ }).check();
      await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Approved elective change');
      await page.screenshot({ path: path.join(out, `subjects-${width}.png`) });
      const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `Dialog overflows at ${width}px`);
      await dialog.getByRole('button', { name: 'Save subject selections' }).click();
      await page.getByRole('status').filter({ hasText: 'School decision saved.' }).waitFor();
      assert.deepEqual(await page.evaluate(() => window.__lastCommand.subject_ids), ['math', 'art']);
      await page.getByRole('checkbox', { name: 'Select Amina Otieno', exact: true }).check();
      await page.getByRole('combobox', { name: 'Action for selected learners' }).selectOption('hold');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm hold', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Enter a reason' }).waitFor();
      await page.getByRole('textbox', { name: 'Reason', exact: true }).fill('Placement review pending');
      await page.getByRole('button', { name: 'Confirm hold', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => window.__lastCommand.action), 'hold');
      assert.equal(await page.evaluate(() => window.__lastCommand.students[0].expected_version), 'version-one');
      assert.deepEqual(errors, []);
      await page.close(); console.log(`Student progression ${width}px: passed`);
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
