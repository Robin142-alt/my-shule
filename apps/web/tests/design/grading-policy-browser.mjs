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
const out = path.resolve(web, '../../output/grading-policy-browser');
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
  hosStaff: [{ user_id: 'librarian', label: 'Alex Librarian', role_code: 'librarian' }],
  classTeachers: [], teacherAssignments: [], classSubjectAssignments: [], gradingSystems: [], attendanceSettings: [], reportCardSettings: [], roleAppointments: [], curriculumConfigurations: [],
};
fs.writeFileSync(path.join(out, 'hooks.ts'), `export const data=${JSON.stringify(fixture)};
const saved=localStorage.getItem('myshule-grading-qa');if(saved)data.gradingSystems=[JSON.parse(saved)];
export function useSchoolQuery(){return {data,isLoading:false,error:null,refetch:async()=>({data,error:null})};}
export function useSchoolMutation(){return {isPending:false,mutateAsync:async()=>({})};}`);
fs.writeFileSync(path.join(out, 'api.ts'), `import {data} from './hooks';
export async function requestDashboardApi(path,options){window.__lastRequest={path,...options};
if(options?.method==='POST'||options?.method==='PATCH'){const record={...data.gradingSystems[0],id:'saved',status:'draft',version:1,...options.body};data.gradingSystems=[record];localStorage.setItem('myshule-grading-qa',JSON.stringify(record));return record;}
return {record:data.gradingSystems[0],dependencies:[],total:0,history:[]};}`);
fs.writeFileSync(path.join(out, 'role.ts'), 'export function useOptionalSchoolDashboardRole(){return null;}');
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {AcademicFoundationWorkspace} from ${source(path.join(web, 'src/components/school/academic-foundation-workspace'))};createRoot(document.getElementById('root')).render(<main className="authenticated-app mx-auto max-w-7xl p-3"><div className="app-workspace-surface bg-[#071D49] p-3"><AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="QA School" tenantId="qa-school" initialTab="policies"/></div></main>);`);

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
  const cssRoot = process.env.MYSHULE_QA_CSS_ROOT || path.join(web, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(file => String(file).endsWith('.css')).map(file => fs.readFileSync(path.join(cssRoot, String(file)), 'utf8')).join('\n');
  assert.ok(css, 'Build the web app first to verify actual styles.');
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="background:#071D49"><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      assert.equal(await page.getByRole('button', {name:'8-4-4',exact:true}).count(),0);
      assert.equal(await page.getByRole('button', {name:'CBC',exact:true}).count(),0);
      await page.getByLabel('Policy name',{exact:true}).fill('Independent QA policy');
      await page.getByRole('checkbox',{name:'CBC',exact:true}).check();
      const legacy=page.getByRole('group',{name:'8-4-4 grade bands',exact:true});
      const cbc=page.getByRole('group',{name:'CBC grade bands',exact:true});
      await legacy.getByLabel('Report remark',{exact:true}).first().fill('Legacy distinction');
      await cbc.getByLabel('Report remark',{exact:true}).first().fill('CBC distinction');
      await cbc.getByLabel('Points',{exact:true}).first().fill('9');
      await cbc.getByRole('button',{name:'Add grade band',exact:true}).click();
      assert.equal(await cbc.getByLabel('Grade label',{exact:true}).count(),9);
      await cbc.getByRole('button',{name:'Remove grade band 9',exact:true}).click();
      await page.getByRole('checkbox',{name:'CBC',exact:true}).uncheck();
      await page.getByRole('checkbox',{name:'CBC',exact:true}).check();
      assert.equal(await cbc.getByLabel('Points',{exact:true}).first().inputValue(),'9');
      const row=legacy.locator('input').first().locator('..').locator('..');
      const rowInputs=await row.locator('input:not([type="checkbox"])').evaluateAll(elements=>elements.map(el=>({top:el.getBoundingClientRect().top,width:el.getBoundingClientRect().width})));
      assert.ok(rowInputs.every(input=>Math.abs(input.top-rowInputs[0].top)<2),`Fields must stay horizontal at ${width}px`);
      assert.ok(rowInputs.every(input=>input.width>=60),`Fields must remain readable at ${width}px`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Grading overflows at ${width}px`);
      await legacy.scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out,`grading-${width}.png`),fullPage:true});
      await page.getByRole('button',{name:'Save grading system',exact:true}).click();
      await page.waitForFunction(()=>window.__lastRequest?.path==='/academics/grading-systems');
      const body=await page.evaluate(()=>window.__lastRequest.body);
      assert.equal(body.rules_by_curriculum['8-4-4'][0].remark,'Legacy distinction');
      assert.equal(body.rules_by_curriculum.CBC[0].remark,'CBC distinction');
      assert.equal(body.rules_by_curriculum.CBC[0].points,9);
      await page.reload();
      await page.getByRole('button',{name:'Manage',exact:true}).first().click();
      const modal=page.getByRole('dialog');
      assert.equal(await modal.getByRole('group',{name:'CBC grade bands',exact:true}).getByLabel('Points',{exact:true}).first().inputValue(),'9');
      const edit=modal.getByRole('group',{name:'8-4-4 grade bands',exact:true}).getByLabel('Report remark',{exact:true}).first();
      assert.equal(await edit.inputValue(),'Legacy distinction');
      await edit.fill('Revised legacy remark');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Edit modal overflows at ${width}px`);
      await page.screenshot({path:path.join(out,`grading-edit-${width}.png`),fullPage:true});
      const save=modal.getByRole('button',{name:/Save changes/i});
      await save.click();
      await page.waitForFunction(()=>window.__lastRequest?.method==='PATCH');
      const updated=await page.evaluate(()=>window.__lastRequest.body);
      assert.equal(updated.rules_by_curriculum['8-4-4'][0].remark,'Revised legacy remark');
      assert.equal(updated.rules_by_curriculum.CBC[0].remark,'CBC distinction');
      assert.deepEqual(errors,[]);
      await page.close();
      console.log(`Grading create/edit/save/reload: ${width}px passed`);
    }
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
await run();
