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

const out = path.resolve(web, '../../output/teacher-workflows-ui');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);

const assignment = { id:'assignment-1', title:'Fractions homework', className:'Grade 7 Blue', subject:'Mathematics', dueDate:'19/10/2026', createdAt:'2026-10-18', status:'Published', maxScore:20, total:2, submitted:1, graded:0 };
const learner = { studentId:'learner-1', admissionNo:'ADM001', name:'Asha Njeri', id:'submission-1', status:'completed', submittedAt:'2026-10-18', updatedAt:'2026-10-18', score:null, feedback:null, completionMode:'student_marked_done' };
const concern = { id:'concern-1', reference:'DIS-001', title:'Classroom follow-up', description:'Observed a concern in class.', learner:'Asha Njeri', className:'Grade 7 Blue', type:'Behaviour', severity:'medium', status:'reported', sentTo:'Discipline team' };
fs.writeFileSync(path.join(out,'session.ts'), 'export function useLiveTenantSession(){return {isLoading:false,session:{tenantId:"qa-school",user:{user_id:"qa-teacher"}}};}');
fs.writeFileSync(path.join(out,'permissions.ts'), 'export function usePermissions(){return {hasPermission:()=>true};}');
fs.writeFileSync(path.join(out,'live.ts'), `const assignment=${JSON.stringify(assignment)};let learner=${JSON.stringify(learner)};const concern=${JSON.stringify(concern)};
export async function fetchLessonLogsLive(){return [];}
export async function createLessonLogLive(session,payload){window.__lesson=payload;return {success:true};}
export async function fetchAssignmentsLive(){return [assignment];}
export async function fetchTeacherClassesLive(){return {classes:[{id:'allocation',classSectionId:'class',subjectId:'subject',streamId:'blue',className:'Grade 7 Blue',subjectName:'Mathematics'}]};}
export async function createAssignmentLive(session,payload){window.__assignment=payload;return {success:true};}
export async function fetchTeacherSubmissions(){return {assignment,students:[learner]};}
export async function reviewTeacherSubmission(session,id,payload){window.__review=payload;learner={...learner,...payload};return {success:true};}
export async function fetchDisciplineConcernsLive(){return [concern];}
export async function fetchTeacherConcernOptions(){return {students:[{id:'learner-1',name:'Asha Njeri',admissionNo:'ADM001',className:'Grade 7 Blue'}],categories:[{id:'category-1',name:'Behaviour',defaultSeverity:'medium'}]};}
export async function raiseDisciplineConcernLive(session,payload){window.__concern=payload;return {success:true,reference:'DIS-002'};}
export async function fetchTeacherConcernDetail(){return {incident:{...concern,status:'resolved',action_taken:'School support meeting completed.'},actions:[],comments:[]};}`);
fs.writeFileSync(path.join(out,'entry.tsx'), `import {createRoot} from 'react-dom/client';import {useState} from 'react';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {LessonLogWorkspace} from '@/components/school/teacher-dashboard/lesson-log-workspace';import {AssignmentsWorkspace} from '@/components/school/teacher-dashboard/assignments-workspace';import {DisciplineWelfareWorkspace} from '@/components/school/teacher-dashboard/discipline-welfare-workspace';function App(){const [view,setView]=useState('assignments');return <main className="mx-auto max-w-6xl p-3 sm:p-6"><nav className="mb-4 flex gap-3"><button onClick={()=>setView('assignments')}>Assignments</button><button onClick={()=>setView('discipline')}>Discipline</button><button onClick={()=>setView('lessons')}>Lessons</button></nav>{view==='assignments'?<AssignmentsWorkspace onStartAction={()=>{}}/>:view==='discipline'?<DisciplineWelfareWorkspace onStartAction={()=>{}}/>:<LessonLogWorkspace/>}</main>;}createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'),
    output: { path: out, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
      '@/components/providers/permission-context': path.join(out, 'permissions.ts'), '@/hooks/use-live-tenant-session': path.join(out, 'session.ts'), '@/lib/modules/teacher-live': path.join(out, 'live.ts'), '@': path.join(web, 'src'),
    } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] },
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const postcss = require('postcss');
  const tailwind = require('@tailwindcss/postcss');
  const globalsPath = path.join(web, 'src/app/globals.css');
  const globals = fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/school/teacher-dashboard'))};\n@source ${source(path.join(web,'src/components/ui'))};\n@source ${source(path.join(out,'entry.tsx'))};`);
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
      const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
      page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
      await page.goto(`http://127.0.0.1:${server.address().port}`);

      const fits = async label => assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), label+' overflows at '+width+'px');
      await page.getByRole('button',{name:'Create Assignment',exact:true}).click();
      await page.getByLabel('Title',{exact:true}).fill('Fractions practice');
      await page.getByLabel('Assigned class and subject').selectOption('allocation');
      await page.getByLabel('Due date').fill('2026-10-19');
      await page.getByLabel('Total marks').fill('20');
      await fits('Assignment form');
      await page.screenshot({path:path.join(out,'assignment-form-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Publish Assignment',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Assignment published'}).waitFor();
      assert.equal(await page.evaluate(()=>window.__assignment.streamId),'blue');
      await page.getByRole('button',{name:'View / Grade'}).click();
      await page.getByRole('button',{name:'Review Work'}).click();
      await page.getByLabel('Score out of 20').fill('0');
      await page.getByLabel('Feedback',{exact:true}).fill('Review fraction addition.');
      await fits('Grading form');
      await page.screenshot({path:path.join(out,'grading-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Save Grade',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Submission updated'}).waitFor();
      assert.equal(await page.evaluate(()=>window.__review.score),0);
      await page.getByRole('button',{name:'Close dialog'}).click();
      await page.getByRole('button',{name:'Discipline',exact:true}).click();
      await page.getByRole('button',{name:'Raise Concern',exact:true}).click();
      await page.getByLabel('Learner').selectOption('learner-1');
      await page.getByLabel('Concern type').selectOption('category-1');
      await page.getByLabel('Title',{exact:true}).fill('Needs school follow-up');
      await page.getByLabel('Description',{exact:true}).fill('Observed a concern during class.');
      await fits('Concern form');
      await page.screenshot({path:path.join(out,'concern-form-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Submit Concern',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Concern DIS-002 recorded'}).waitFor();
      await page.getByRole('button',{name:'View Status',exact:true}).click();
      await page.getByText('School support meeting completed.').waitFor();
      await fits('Concern status');
      await page.screenshot({path:path.join(out,'concern-status-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Close dialog'}).click();
      await page.getByRole('button',{name:'Lessons',exact:true}).click();
      await page.getByRole('button',{name:'Record Lesson',exact:true}).click();
      await page.getByLabel('Assigned class and subject').selectOption('allocation');
      await page.getByLabel('Was the lesson taught?').selectOption('not_taught');
      await page.getByLabel('Reason not taught').fill('School assembly');
      await fits('Lesson delivery');
      await page.screenshot({path:path.join(out,'lesson-delivery-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Save Lesson',exact:true}).click();
      await page.getByText('Lesson delivery recorded.').waitFor();
      assert.equal(await page.evaluate(()=>window.__lesson.lessonStatus),'not_taught');
      assert.deepEqual(errors,[]);
      await page.close();
      console.log('PASS teacher assignments and discipline at '+width+'px');
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
