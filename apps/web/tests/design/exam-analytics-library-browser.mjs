/* Isolated browser QA: real workspace + engine + PDF/CSV renderers; fixture hooks never enter production. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require=createRequire(import.meta.url),{webpack}=bundledWebpack;
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),repo=path.resolve(web,'../..');
const out=path.join(repo,'output/exam-analytics-browser');fs.mkdirSync(out,{recursive:true});
require('ts-node').register({transpileOnly:true,project:path.join(repo,'tsconfig.json')});
const api=path.join(repo,'apps/api/src/modules/exams/analytics');
const {buildAcademicIntelligence}=require(path.join(api,'analytics-engine.ts'));
const {parseAnalyticsFilters}=require(path.join(api,'analytics-scope.ts'));
const {buildAnalyticsPrintReport}=require(path.join(api,'analytics-report-model.ts'));
const {createAnalyticsReportPdf}=require(path.join(api,'analytics-report-pdf.ts'));
const {createAnalyticsReportCsv}=require(path.join(api,'analytics-report-csv.ts'));
const {evidence}=require(path.join(api,'testing/evidence.fixture.ts'));
const source=value=>JSON.stringify(value.replaceAll('\\','/'));
const fixture=`Array.from({length:30},(_,i)=>Array.from({length:4},(_,exam)=>['Mathematics','English','Biology'].map((subject,j)=>evidence({student_id:'s'+i,student_name:['Amina','Brian','Faith','David'][i%4]+' Learner '+(i+1),admission_number:'QA'+(i+1),class_section_id:i<15?'c1':'c2',class_name:i<15?'Form 1':'Form 2',subject_id:'subject-'+j,subject_name:subject,stream_id:i%2?'blue':'green',stream_name:i%2?'Blue':'Green',exam_series_id:'e'+exam,exam_name:['Opener','Mid term','End term','Revision'][exam],exam_date:'2026-0'+(exam+1)+'-01',average:Math.min(100,Math.max(0,37+i+(j===0?10:j===1?-8:0)+exam*3)),ranking_enabled:true}))).flat()).flat()`;
const rows=Function('evidence',`return ${fixture}`)(evidence);
const scope={level:'school',role:'exams_manager',actor_user_id:'qa-manager'};
fs.writeFileSync(path.join(out,'loader.cjs'),`const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out,'css-loader.cjs'),`module.exports=function(source){return 'export default '+JSON.stringify(Object.fromEntries([...source.matchAll(/\\.([A-Za-z_][\\w-]*)/g)].map(m=>[m[1],m[1]])))+';';};`);
fs.writeFileSync(path.join(out,'hooks.ts'),`
import {useState} from 'react';
import {buildAcademicIntelligence} from ${source(path.join(api,'analytics-engine'))};
import {evidence} from ${source(path.join(api,'testing/evidence.fixture'))};
export function useSchoolQuery(url:string){const params=Object.fromEntries(new URLSearchParams(url.split('?')[1]));const scenario=new URLSearchParams(location.search).get('scenario');const data=buildAcademicIntelligence(scenario==='empty'?[]:${fixture},{level:'school',role:'exams_manager',actor_user_id:'qa-manager'},{page:1,page_size:25,...params,analytic_page:Number(params.analytic_page??1),history_limit:Number(params.history_limit??24)},['school']);return {data,isLoading:scenario==='loading',isFetching:false,error:scenario==='error'?new Error('QA service unavailable'):null,refetch:()=>{}};}
export function useSchoolMutation(){const [isPending,setPending]=useState(false);return {isPending,mutateAsync:async(body:unknown)=>{setPending(true);try{const response=await fetch('/qa-report',{method:'POST',body:JSON.stringify(body)});if(!response.ok)throw new Error('QA report failed');return response.json();}finally{setPending(false);}}};}
`);
fs.writeFileSync(path.join(out,'entry.tsx'),`import {createRoot} from 'react-dom/client';import {ExamAnalyticsWorkspace} from ${source(path.join(web,'src/components/school/exams-manager/exam-analytics-workspace'))};createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1500,margin:'auto',padding:16}}><ExamAnalyticsWorkspace onOpenMarks={()=>{window.__action='marks'}} onOpenReportCards={()=>{window.__action='reports'}}/></main>);`);
await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(out,'entry.tsx'),devtool:false,output:{path:out,filename:'bundle.js'},
  resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{'@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@':path.join(web,'src')}},
  module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]},{test:/\.css$/,use:[path.join(out,'css-loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const cssRoot=path.join(web,'.next/static');
const baseCss=fs.existsSync(cssRoot)?fs.readdirSync(cssRoot,{recursive:true}).filter(f=>String(f).endsWith('.css')).map(f=>fs.readFileSync(path.join(cssRoot,String(f)),'utf8')).join('\n'):'';
const css=baseCss+'\n'+fs.readFileSync(path.join(web,'src/components/school/exams-manager/exam-analytics.module.css'),'utf8');
const server=http.createServer(async(req,res)=>{
  if(req.url==='/qa-report'){
    try{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
      const data=buildAcademicIntelligence(rows,scope,parseAnalyticsFilters(body.filters),['school'],undefined,true);
      const report=buildAnalyticsPrintReport(data,'library',{school_name:'QA School · Analytics verification',school_address:'Nairobi, Kenya',school_motto:'Learning with purpose',generated_by:'QA Exam Manager'},'AI-LIBRARY-BROWSER','2026-10-07T12:00:00Z');
      const pdf=body.format==='csv'?null:await createAnalyticsReportPdf(report),csv=createAnalyticsReportCsv(report);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({report,filename:pdf?.filename??csv.filename,pdf_base64:pdf?.content.toString('base64')??'',csv_filename:csv.filename,csv_base64:csv.content.toString('base64')}));
    }catch(error){res.statusCode=500;res.end(String(error));}return;
  }
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
  else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;background:#f7faf8;font-family:Arial,sans-serif"><div id="root"></div><script src="/bundle.js"></script></body></html>');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true}),results=[];
try{
  for(const width of [320,768,1024,1440]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    await page.getByRole('heading',{name:'Exam Analytics',exact:true}).waitFor();
    assert.equal(await page.locator('article').count(),6);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(out,`overview-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Download Average score',exact:true}).click();await page.getByRole('button',{name:'Prepare preview',exact:true}).click();
    await page.getByRole('link',{name:'Download PDF',exact:true}).waitFor();
    for(const type of ['PDF','CSV']){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:`Download ${type}`,exact:true}).click()]);await download.saveAs(path.join(out,`metric-${width}.${type.toLowerCase()}`));}
    const frame=page.frames().find(f=>f!==page.mainFrame());await frame.evaluate(()=>window.print=()=>window.__printed=true);await page.getByRole('button',{name:'Print report',exact:true}).click();assert.equal(await frame.evaluate(()=>window.__printed),true);await page.keyboard.press('Escape');
    if(width<760)await page.getByLabel('Analytics section',{exact:true}).selectOption('Comparisons');else await page.getByRole('button',{name:'Comparisons',exact:true}).click();
    await page.getByRole('heading',{name:'Compare any two',exact:true}).waitFor();await page.getByLabel('Comparison dimension').selectOption('student');await page.getByLabel('Left selection').selectOption('s0');await page.getByLabel('Right selection').selectOption('s1');
    await page.screenshot({path:path.join(out,`comparison-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('searchbox',{name:'Search analytics library'}).fill('Student performance profiles');await page.getByRole('button',{name:/Student performance profiles/}).click();
    await page.getByRole('button',{name:'Next analytics page',exact:true}).click();assert.match(page.url(),/ea_analytic_page=2/);
    await page.getByRole('button',{name:'Explore Brian Learner 10',exact:true}).count();
    await page.getByRole('button',{name:/^Explore /}).first().click();await page.getByRole('heading',{name:'Student subject profiles',exact:true}).waitFor();assert.match(page.url(),/ea_student_id=/);
    await page.getByRole('button',{name:'Back to previous analysis',exact:true}).click();assert.doesNotMatch(page.url(),/ea_student_id=/);
    await page.getByRole('button',{name:'Download Student performance profiles',exact:true}).click();await page.getByRole('button',{name:'Prepare preview',exact:true}).click();await page.getByRole('link',{name:'Download PDF',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download PDF',exact:true}).click()]);await download.saveAs(path.join(out,`students-${width}.pdf`));
    await page.screenshot({path:path.join(out,`print-preview-${width}.png`),fullPage:true});await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Download / print view',exact:true}).click();await page.getByLabel('Export format').selectOption('csv');await page.getByRole('button',{name:'Prepare data export',exact:true}).click();await page.getByRole('link',{name:'Download CSV',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Download PDF',exact:true}).count(),0);await page.keyboard.press('Escape');
    await page.goto(base+'/?scenario=empty');await page.getByRole('button',{name:'Open marks workflow',exact:true}).click();assert.equal(await page.evaluate(()=>window.__action),'marks');
    await page.goto(base+'/?scenario=error');await page.getByRole('alert').waitFor();assert.equal(await page.locator('article').count(),0);
    assert.deepEqual(errors,[]);results.push({width,passed:true});await page.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
