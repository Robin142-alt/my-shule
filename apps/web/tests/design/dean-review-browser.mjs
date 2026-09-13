/* Browser QA of the real shared workspace. Fixtures and hook substitutes stay in the test output directory. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const { webpack } = bundledWebpack;
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.resolve(web, '../..');
const out = path.join(repo, 'output/dean-review-browser');
fs.mkdirSync(out, { recursive: true });
require('ts-node').register({transpileOnly:true,project:path.join(repo,'tsconfig.json')});
const {buildAcademicIntelligence}=require(path.join(repo,'apps/api/src/modules/exams/analytics/analytics-engine.ts'));
const {buildAnalyticsPrintReport}=require(path.join(repo,'apps/api/src/modules/exams/analytics/analytics-report-model.ts'));
const {createAnalyticsReportPdf}=require(path.join(repo,'apps/api/src/modules/exams/analytics/analytics-report-pdf.ts'));
const {evidence}=require(path.join(repo,'apps/api/src/modules/exams/analytics/testing/evidence.fixture.ts'));
const qaRows=()=>[evidence({average:45}),evidence({student_id:'learner-2',student_name:'Brian Otieno',average:85}),evidence({average:20,subject_id:'bio',subject_name:'Biology'}),evidence({exam_series_id:'exam-2',exam_date:'2026-06-01',average:25})];

const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'hooks.ts'), `
import {useState} from 'react';
import {buildAcademicIntelligence} from ${source(path.join(repo, 'apps/api/src/modules/exams/analytics/analytics-engine'))};
import {evidence} from ${source(path.join(repo, 'apps/api/src/modules/exams/analytics/testing/evidence.fixture'))};
export function useSchoolQuery(url:string){
  if(url.includes('/assessments')) return {data:{assessmentsList:[{id:'batch-1',title:'Term exam',subject:'Maths',mark_ids:['mark-1'],status:'submitted',submissions:1}],metrics:{}},isLoading:false,error:null,refetch:()=>{}};
  if(url.includes('/report-cards'))return {data:[],isLoading:false,error:null,refetch:()=>{}};
  if(url.includes('/workflow'))return {data:{series:[],moderation_batches:[],metrics:{}},isLoading:false,error:null,refetch:()=>{}};
  const params=Object.fromEntries(new URLSearchParams(url.split('?')[1]??''));
  const scope=params.scope??new URLSearchParams(location.search).get('scope')??'school';
  let rows=[evidence({average:45}),evidence({student_id:'learner-2',student_name:'Brian Otieno',average:85}),evidence({average:20,subject_id:'bio',subject_name:'Biology'}),evidence({exam_series_id:'exam-2',exam_date:'2026-06-01',average:25})];
  const scenario=new URLSearchParams(location.search).get('scenario');
  if(scenario==='empty')rows=[];
  const data=buildAcademicIntelligence(rows,{level:scope,role:'teacher',actor_user_id:'teacher-1'},{page:1,page_size:25,...params},['school','department','subject','grade','class','assignment']);
  return {data:{...data,capabilities:{can_start_intervention:true}},isLoading:scenario==='loading',isFetching:false,error:scenario==='error'?new Error('Test service unavailable'):null,refetch:()=>{}};
}
export function useSchoolMutation(path:string){const [isPending,setPending]=useState(false);return {isPending,mutateAsync:async(body:unknown)=>{setPending(true);try{if(path.endsWith('/reports')){const response=await fetch('/qa-report',{method:'POST',body:JSON.stringify(body)});if(!response.ok)throw new Error('QA report failed');return response.json();}window.__lastIntervention=body;await new Promise(r=>setTimeout(r,30));return {success:true};}finally{setPending(false);}}};}
`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `
import {createRoot} from 'react-dom/client';
import {AcademicIntelligenceWorkspace} from ${source(path.join(web, 'src/components/school/academic-intelligence-workspace'))};
import {AssessmentsWorkspace} from ${source(path.join(web, 'src/components/school/dean-academics/assessments-workspace'))};
const audience=new URLSearchParams(location.search).get('audience')??'hod';
createRoot(document.getElementById('root')!).render(<main style={{padding:16,maxWidth:1440,margin:'auto'}}>{audience==='dean'?<AssessmentsWorkspace/>:<AcademicIntelligenceWorkspace audience={audience as 'hod'|'hos'} />}</main>);
`);

fs.writeFileSync(path.join(out,'api.ts'), `export async function requestDashboardApi(url:string,options:unknown){window.__lastRequest={url,options};return {success:true,updated_count:1};}`);
async function run() {
  await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(out,'entry.tsx'),devtool:false,
    output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],
      alias:{'@/lib/dashboard/api-client':path.join(out,'api.ts'),'@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@':path.join(web,'src')}},
    module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},
    optimization:{minimize:false}},(error,stats)=>{if(error||stats.hasErrors())reject(error||new Error(stats.toString({all:false,errors:true})));else resolve();}));
  const cssRoot=process.env.DEAN_QA_CSS_ROOT??path.join(web,'.next/static');
  const css=fs.existsSync(cssRoot)?fs.readdirSync(cssRoot,{recursive:true}).filter(f=>String(f).endsWith('.css')).map(f=>fs.readFileSync(path.join(cssRoot,String(f)),'utf8')).join('\n'):'';
  if(!css)throw new Error('Build the web app first so browser QA uses the generated Tailwind styles.');
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/qa-report'){
      try {
        let raw='';for await(const part of req)raw+=part;
        const body=JSON.parse(raw);const data=buildAcademicIntelligence(qaRows(),{level:body.filters.scope??'school',role:'principal',actor_user_id:'teacher-1'},{page:1,page_size:25,...body.filters},['school','subject']);
        const report=buildAnalyticsPrintReport(data,body.section,{school_name:'QA School - sample document',school_address:'Nairobi, Kenya',school_motto:'Learning with purpose',generated_by:'QA Teacher'},'AI-BROWSER-QA',new Date().toISOString());
        const pdf=await createAnalyticsReportPdf(report);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({report,pdf_base64:pdf.content.toString('base64'),filename:pdf.filename}));
      }catch(error){res.statusCode=500;res.end(String(error));}
      return;
    }
    if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(fs.readFileSync(path.join(out,'bundle.js')));}
    else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;background:#f8fafc"><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  const base=`http://127.0.0.1:${server.address().port}`;
  const results=[];
  try {
    for(const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
      const page=await browser.newPage({viewport}); const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      for(const audience of ['hod','hos']) {
        await page.goto(base+`/?audience=${audience}&scope=${audience==='hod'?'department':'subject'}&scenario=empty`);
        await page.getByRole('heading',{name:'No published exam results yet'}).waitFor();
        assert.equal(await page.getByRole('button',{name:'Open marks workflow',exact:true}).count(),0);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Empty analytics overflows');
        await page.screenshot({path:path.join(out,`${audience}-empty-${viewport.width}.png`),fullPage:true});
        await page.goto(base+`/?audience=${audience}&scope=${audience==='hod'?'department':'subject'}`);
        await page.getByRole('heading',{name:audience==='hos'?'Subject Academic Intelligence':'Academic Intelligence',exact:true}).waitFor();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Published analytics overflows');
        await page.getByText('More Filters',{exact:false}).click();
        assert.equal(await page.getByLabel('Publication Status',{exact:true}).locator('option').count(),2);
        await page.screenshot({path:path.join(out,`${audience}-published-${viewport.width}.png`),fullPage:true});
      }
      await page.goto(base+'/?audience=dean');
      await page.getByRole('button',{name:'Moderate & approve',exact:true}).waitFor();
      await page.getByRole('button',{name:'Moderate & approve',exact:true}).click();
      await page.waitForFunction(()=>window.__lastRequest?.options?.body?.action==='approve');
      assert.equal((await page.evaluate(()=>window.__lastRequest)).url,'/exams/marks/moderate');
      await page.getByRole('button',{name:'Return',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Confirm return',exact:true}).isDisabled(),true);
      await page.getByLabel('Required correction reason',{exact:true}).fill('Check question two');
      await page.getByRole('button',{name:'Confirm return',exact:true}).click();
      await page.waitForFunction(()=>window.__lastRequest?.options?.body?.action==='return_for_correction');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Dean review overflows');
      await page.screenshot({path:path.join(out,`dean-review-${viewport.width}.png`),fullPage:true});
      assert.deepEqual(errors,[]);results.push({viewport,passed:true});await page.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
