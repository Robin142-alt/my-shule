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
const unassigned = process.argv.includes('--unassigned');
const assisted = process.argv.includes('--assisted') || unassigned;
const papers = process.argv.includes('--papers');
const out = path.resolve(web, papers ? '../../output/flexible-exam-papers-ui' : assisted ? '../../output/exams-manager-marks-ui' : '../../output/teacher-marks-ui');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const exam = { id: 'window-1', examSeriesId: 'exam-1', academicTermId: 'term-3', examName: 'End Term Exams', className: 'Form 4 Blue', classSectionId: 'form-4', subjectId: 'agriculture', subjectName: 'Agriculture', assessmentId: 'paper-1', paperName: 'Main Paper', outOf: 100, deadline: '20 Sep 2026', enteredCount: 4, totalStudents: 6, savedCount: 4, status: 'Draft', canEnter: true, entryState: 'Open' };
const names = ['Asha Njeri', 'Brian Otieno', 'Faith Wanjiku', 'James Kamau', 'Mercy Akinyi', 'Samuel Kiptoo'];
const roster = names.map((name, index) => ({ id: index < 2 ? null : `mark-${index}`, student_id: `student-${index}`, student_name: name, admission_number: `ADM-00${index + 1}`, score: index < 2 ? null : 70 + index, score_status: 'entered', status: 'draft', remarks: null }));
fs.writeFileSync(path.join(out, 'session.ts'), `export function useLiveTenantSession(){return {isLoading:false,session:{tenantId:'qa-school',user:{user_id:'qa-teacher'}}};}`);
fs.writeFileSync(path.join(out, 'live.ts'), `let submitted=false;let rows=${JSON.stringify(roster)};const exam=${JSON.stringify(exam)};const extras=[{...exam,id:'bio4',subjectId:'biology',subjectName:'Biology',status:'Pending',savedCount:0},{...exam,id:'agri3',className:'Form 3 Blue',classSectionId:'form-3',status:'Draft',savedCount:2},{...exam,id:'bio3',subjectId:'biology',subjectName:'Biology',className:'Form 3 Blue',classSectionId:'form-3',status:'Pending',savedCount:0}];
export async function fetchPendingMarksLive(){return {stats:{totalWindows:1,nearingDeadline:0},windows:[{...exam,id:'old',examName:'Completed old exam',status:'Completed',canEnter:false},submitted?{...exam,status:'Submitted',canEnter:false,submittedAt:new Date().toISOString()}:exam,...extras]};}
export async function fetchTeacherMarkSheetLive(){return rows;}
export async function saveExamMarksLive(session,payload){window.__payload=payload; if(payload.action==='submit'){submitted=true;rows=rows.map(row=>({...row,...payload.marks[row.student_id],status:'submitted'}));}else rows=rows.map(row=>({...row,...payload.marks[row.student_id],id:row.id||row.student_id}));return {success:true};}
export async function fetchPaperConfiguration(){return {version:1,papers:[{id:'paper-1',name:'Main Paper',max_score:100,weight:null,categories:[]}]};}
export async function savePaperConfiguration(session,id,data){window.__config=data;exam.outOf=data.papers[0].max_score;exam.paperName=data.papers[0].name;exam.paperConfigVersion=2;rows=rows.map(row=>({...row,id:null,score:null,score_status:'not_assessed',category_scores:{},categories:data.papers[0].categories.map((c,i)=>({...c,id:'category-'+i})),paper_config_version:2}));return {...data,version:2};}`);
fs.writeFileSync(path.join(out, 'api-client.ts'), `export async function requestDashboardApi(){throw new Error('Unexpected API request in isolated browser QA');}`);
fs.writeFileSync(path.join(out, 'school-hooks.ts'), `export function useSchoolQuery(path){return {data:path.endsWith('/assignments')?{assignments:[{exam_id:'exam-1',exam_name:'End Term Exams',class_section_id:'form-4',class_name:'Form 4 Blue',subject_id:'agriculture',subject_name:'Agriculture',assessment_id:'paper-1',paper_name:'Main Paper',window_id:'window-1',teacher_user_id:${unassigned ? 'null' : "'teacher-1'"},teacher_name:${unassigned ? "'Unassigned'" : "'Ms Achieng'"}}]}:{entries:[]},refetch:async()=>{},isLoading:false,isFetching:false};}`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {${assisted ? 'MarksEntryWorkspace' : 'ExamsMarksWorkspace'} as Workspace} from ${source(path.join(web, assisted ? 'src/components/school/exams-manager/marks-entry-workspace' : 'src/components/school/teacher-dashboard/exams-marks-workspace'))};createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><main className="mx-auto max-w-5xl p-3 sm:p-6"><Workspace onStartAction={()=>{}} onOpenSetup={()=>{}}/></main></QueryClientProvider>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'),
    output: { path: out, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
      '@/lib/dashboard/api-client': path.join(out, 'api-client.ts'), '@/lib/data/school-hooks': path.join(out, 'school-hooks.ts'), '@/hooks/use-live-tenant-session': path.join(out, 'session.ts'), '@/lib/modules/teacher-live': path.join(out, 'live.ts'), '@': path.join(web, 'src'),
    } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] },
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const postcss = require('postcss');
  const tailwind = require('@tailwindcss/postcss');
  const globalsPath = path.join(web, 'src/app/globals.css');
  const globals = fs.readFileSync(globalsPath, 'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web, 'src/components/school/teacher-dashboard/exams-marks-workspace.tsx'))};\n@source ${source(path.join(web, 'src/components/school/teacher-dashboard/markbook-list.tsx'))};\n@source ${source(path.join(web, 'src/components/school/exams-manager'))};\n@source ${source(path.join(out, 'entry.tsx'))};`);
  const css = (await postcss([tailwind()]).process(globals+`\n@source ${source(path.join(web,'src/components/school/teacher-dashboard/paper-settings.tsx'))};`, { from: globalsPath })).css;
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
      const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
      page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      if (assisted) {
        await page.getByRole('heading', { name: 'Enter Marks' }).waitFor();
        await page.getByLabel('Exam', { exact: true }).selectOption('exam-1');
        await page.getByLabel('Class / grade', { exact: true }).selectOption('form-4');
        await page.getByLabel('Subject', { exact: true }).selectOption('agriculture');
        if (await page.getByLabel('Paper', { exact: true }).count()) await page.getByLabel('Paper', { exact: true }).selectOption('paper-1');
        if (unassigned) await page.getByLabel('Assigned teacher', { exact: true }).selectOption('unassigned');
        if (!unassigned) await page.getByLabel('Assigned teacher', { exact: true }).selectOption('teacher-1');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Selectors overflow at ${width}px`);
        await page.screenshot({ path: path.join(out, `selection-${width}.png`), fullPage: true });
        await page.getByRole('button', { name: 'Open markbook', exact: true }).click();
      }
      if (!assisted) await page.getByRole('button', { name: 'To do (4)', exact: true }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `List overflows at ${width}px`);
      await page.screenshot({ path: path.join(out, `markbooks-${width}.png`), fullPage: true });
      if (!assisted) await page.getByRole('button', { name: /Open Agriculture Form 4 Blue/ }).click();
      const asha = page.getByLabel('Asha Njeri score', { exact: true });
      await asha.waitFor();
      if(papers) {
        await page.getByText('Papers & maximum marks').click();
        await page.getByLabel('Paper 1 name',{exact:true}).fill('Paper 1');
        await page.getByLabel('Paper 1 maximum',{exact:true}).fill('20');
        await page.getByText('Categories / sections (optional)').click();
        await page.getByRole('button',{name:'Add category',exact:true}).click();
        await page.getByLabel('Paper 1 category 1 name').fill('Reading');
        await page.getByLabel('Paper 1 category 1 maximum').fill('12');
        await page.getByRole('button',{name:'Add category',exact:true}).click();
        await page.getByLabel('Paper 1 category 2 name').fill('Writing');
        await page.getByLabel('Paper 1 category 2 maximum').fill('8');
        assert.equal(await page.getByLabel('Paper 1 maximum',{exact:true}).inputValue(),'20');
        await page.getByRole('button',{name:'Add paper',exact:true}).click();
        await page.getByLabel('Paper 2 name',{exact:true}).fill('Practical');
        await page.getByLabel('Paper 2 maximum',{exact:true}).fill('80');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Paper settings overflow at ${width}px`);
        await page.screenshot({path:path.join(out,`settings-${width}.png`),fullPage:true});
        await page.getByRole('button',{name:'Save paper settings',exact:true}).click();
        await page.getByRole('button',{name:/Open Agriculture Form 4 Blue/}).click();
        await page.getByLabel('Asha Njeri Reading score').fill('12');
        assert.equal(await asha.inputValue(),'X');
        await page.getByLabel('Asha Njeri Writing score').fill('8');
        assert.equal(await asha.inputValue(),'20');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Categories overflow at ${width}px`);
        await page.getByRole('button',{name:'Save draft',exact:true}).click();
        await page.getByText(/draft saved. You can continue editing/).waitFor();
        assert.deepEqual(await page.evaluate(()=>window.__payload.marks['student-0'].category_scores),{'category-0':12,'category-1':8});
        await page.getByLabel('Asha Njeri Writing score').fill('Y');
        await page.getByRole('button',{name:'Save draft',exact:true}).click();
        await page.getByText(/draft saved. You can continue editing/).waitFor();
        assert.equal(await page.evaluate(()=>window.__payload.marks['student-0'].score_status),'Y');
        assert.equal(await page.evaluate(()=>window.__payload.marks['student-0'].score),null);
        await page.screenshot({path:path.join(out,`categories-${width}.png`),fullPage:true});
        assert.deepEqual(errors,[]);await page.close();console.log(`Paper configuration, categories and Y ${width}px: passed`);continue;
      }
      assert.equal(await page.getByRole('option', { name: /Completed old exam/ }).count(), 0);
      assert.equal(await page.getByText(/Main Paper/i).count(), 0);
      assert.equal(await page.getByRole('option', { name: /End Term Exams.*Agriculture/ }).count(), 1);
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
      await page.getByText(/draft saved. You can continue editing/).waitFor();
      assert.equal(await page.getByText('Reasons for missing scores').count(), 0);
      assert.equal(await page.evaluate(() => window.__payload.marks['student-0'].score), 0);
      if (assisted) assert.equal(await page.evaluate(() => window.__payload.teacherUserId), unassigned ? null : 'teacher-1');
      if (unassigned) assert.deepEqual(await page.evaluate(() => window.__payload.streamIds), ['']);
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
      await page.getByRole('button', { name: assisted ? 'To do (0)' : 'To do (3)', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__payload.marks['student-1'].score_status), 'absent');
      assert.equal(await page.getByLabel('Asha Njeri score', { exact: true }).count(), 0);
      await page.getByRole('button', { name: assisted ? 'Submitted (1)' : 'Submitted (2)', exact: true }).click();
      await page.getByRole('button', { name: /Open Agriculture.*End Term Exams/ }).click();
      await asha.waitFor();
      assert.equal(await asha.isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Save draft', exact: true }).count(), 0);
      await page.screenshot({ path: path.join(out, `history-${width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Marks entry and submission ${width}px: passed`);
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
