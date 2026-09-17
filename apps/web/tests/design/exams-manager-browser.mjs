// Render the actual dashboard with isolated QA records; never writes to a school.
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
const out = path.resolve(web, '../../output/exams-manager-ui');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const base = { window_id:'window-1', exam_id:'exam-1', exam_name:'Term 3 End Term', subject:'Mathematics', paper:'Paper 1', class_name:'Form 4', stream:'Blue', total_students:36, entered:0, recorded:0, submitted:0, missing:36, status:'Not started', overdue:true, deadline:'2026-09-12T14:00:00Z', window_closed:false, last_activity:null };
const entries = [
 { ...base, id:'sheet-1', teacher_id:'teacher-1', teacher:'Amina Otieno' },
 { ...base, id:'sheet-2', teacher_id:'teacher-2', teacher:'Brian Kamau', subject:'English', stream:'Red', entered:24, recorded:24, missing:12, status:'In progress' },
 { ...base, id:'sheet-3', teacher_id:'teacher-3', teacher:'Grace Wanjiku', subject:'Chemistry', paper:'Practical', entered:35, recorded:36, missing:0, status:'Awaiting submission', overdue:false, deadline:'2026-09-18T14:00:00Z' },
 { ...base, id:'sheet-4', teacher_id:'teacher-4', teacher:'Peter Mwangi', class_name:'Form 3', subject:'Physics', stream:'East', overdue:false, deadline:'2026-09-19T14:00:00Z' },
 { ...base, id:'sheet-5', teacher_id:null, teacher:'Unassigned', subject:'Agriculture', stream:'Green', status:'Unassigned', overdue:false, deadline:'2026-09-19T14:00:00Z' },
 { ...base, id:'sheet-6', teacher_id:'teacher-5', teacher:'Completed Teacher', status:'Completed', entered:36, recorded:36, submitted:36, missing:0, overdue:false },
 { ...base, id:'sheet-7', teacher_id:'teacher-6', teacher:'=1+1', status:'Completed', entered:36, recorded:36, submitted:36, missing:0, overdue:false },
];
const data = {
 '/school/identity': {schoolName:'Preview School'},
 '/admin-command/exams-manager/teacher-mark-progress': {entries},
 '/admin-command/exams-manager/overview': {metrics:{active_exams:2,pending_moderation:36,published_results:120,total_report_cards:156}, recent_exams:[{id:'exam-1',name:'Term 3 End Term',term:'14 Sep – 25 Sep 2026',status:'submitted'},{id:'exam-2',name:'Term 3 CAT',term:'1 Sep – 8 Sep 2026',status:'published'}]},
 '/exams/workflow': {series:[],metrics:{}},
};
fs.writeFileSync(path.join(out, 'hooks.ts'), `import {useState} from 'react';const initial=${JSON.stringify(data)};window.__qaData=initial;export function useSchoolQuery(path){const [,rerender]=useState(0);return {data:window.__qaData[path]||{},isLoading:false,isFetching:false,error:window.__progressError&&path.includes('teacher-mark-progress')?new Error('Progress service unavailable'):null,refetch:async()=>{rerender(n=>n+1);return {};}};}export function useSchoolMutation(){return {mutateAsync:async()=>({})};}`);
fs.writeFileSync(path.join(out, 'header-hooks.ts'), `export function useDashboardTasks(){return {tasks:[],pendingIds:new Set(),refetch:async()=>{}};}export function useApprovals(){return {approvals:[],pendingIds:new Set(),refetch:async()=>{}};}export function useNotifications(){return {notifications:[],unreadCount:0,pendingIds:new Set(),refetch:async()=>{}};}`);
fs.writeFileSync(path.join(out, 'routes.ts'), `export function buildSchoolSectionHref(role,view){return '/school/'+role+'/'+view;}`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {ExamsManagerCommandCenter} from ${source(path.join(web,'src/components/school/exams-manager-command-center'))};import {SchoolCommandIdentityProvider} from ${source(path.join(web,'src/components/school/integrated-school-command-header'))};createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><SchoolCommandIdentityProvider tenantSlug="qa-only" userLabel="Exams Manager"><ExamsManagerCommandCenter activeSection="overview" /></SchoolCommandIdentityProvider></QueryClientProvider>);`);

async function run() {
 await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{'@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@/hooks/useDashboardTasks':path.join(out,'header-hooks.ts'),'@/hooks/useApprovals':path.join(out,'header-hooks.ts'),'@/hooks/useNotifications':path.join(out,'header-hooks.ts'),'@':path.join(web,'src')}},plugins:[new bundledWebpack.webpack.DefinePlugin({"process.env":JSON.stringify({NODE_ENV:"development"})}),new bundledWebpack.webpack.NormalModuleReplacementPlugin(/(?:^|\/)school-pages$/,path.join(out,'routes.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
 const globalsPath=path.join(web,'src/app/globals.css');
 const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src'))};`);
 const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
 fs.writeFileSync(path.join(out,'styles.css'),css);
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}else{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [320,390,768,1440]) {
   const page=await browser.newPage({viewport:{width,height:960}});
   const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.route('**/api/admin-command/exams-manager/teacher-mark-progress',route=>route.fulfill({json:{entries}}));
   try { await page.getByText('Amina Otieno',{exact:true}).waitFor(); }
   catch(error) { await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}); console.error(await page.locator('body').innerText()); throw error; }
   assert.equal(await page.getByText('Completed Teacher',{exact:true}).count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Dashboard overflows at ${width}px`);
   await page.screenshot({path:path.join(out,`overview-${width}.png`),fullPage:true});
   const search=page.getByRole('textbox',{name:'Search teachers, classes or subjects'});
   await search.fill('Brian');
   assert.equal(await page.getByText('Amina Otieno',{exact:true}).count(),0);
   await page.getByRole('button',{name:/Details for Brian/}).click();
   await page.getByText('36 awaiting submission.',{exact:true}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Details overflow at ${width}px`);
   await search.fill('');
   await page.getByRole('button',{name:'All sheets',exact:true}).click();
   await page.getByText('Completed Teacher',{exact:true}).waitFor();
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'Export progress',exact:true}).click();
   const download=await downloadPromise;
   const csv=fs.readFileSync(await download.path(),'utf8');
   assert.match(csv,/exam_name,subject,paper,class_name,stream,teacher/);
   assert.match(csv,/Amina Otieno,36,0,0,0,36/);
   assert.match(csv,/'=1\+1/);
   assert.match(download.suggestedFilename(),/^teacher-mark-progress-/);
   await page.evaluate(()=>{window.__progressError=true;});
   await page.getByRole('button',{name:'Refresh teacher mark entry'}).click();
   await page.getByRole('alert').filter({hasText:'Teacher progress could not be loaded'}).waitFor();
   assert.equal(await page.getByText('No outstanding mark-entry sheets',{exact:true}).count(),0);
   await page.screenshot({path:path.join(out,`error-${width}.png`),fullPage:true});
   await page.evaluate(()=>{window.__progressError=false;window.__qaData['/admin-command/exams-manager/teacher-mark-progress']={entries:[]};});
   await page.getByRole('button',{name:'Refresh teacher mark entry'}).click();
   await page.getByText('No mark-entry sheets yet',{exact:true}).waitFor();
   await page.screenshot({path:path.join(out,`empty-${width}.png`),fullPage:true});
   await page.getByRole('button',{name:'Open exam setup',exact:true}).click();
   assert.ok(page.url().endsWith('/school/exams-manager/exam-setup'));
   await page.getByRole('heading',{name:'Exam Setup',exact:true}).waitFor();
   assert.deepEqual(errors,[]);
   await page.close();
   console.log(`Exams dashboard ${width}px: layout, search, details, filters, CSV export, error recovery, empty-state navigation passed`);
  }
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
