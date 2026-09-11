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
const out = path.join(repo, 'output/academic-intelligence-browser');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'hooks.ts'), `
import {useState} from 'react';
import {buildAcademicIntelligence} from ${source(path.join(repo, 'apps/api/src/modules/exams/analytics/analytics-engine'))};
import {evidence} from ${source(path.join(repo, 'apps/api/src/modules/exams/analytics/testing/evidence.fixture'))};
export function useSchoolQuery(url:string){
  const params=Object.fromEntries(new URLSearchParams(url.split('?')[1]??''));
  const scope=params.scope??new URLSearchParams(location.search).get('scope')??'school';
  let rows=[evidence({average:45}),evidence({student_id:'learner-2',student_name:'Brian Otieno',average:85}),evidence({average:20,subject_id:'bio',subject_name:'Biology'}),evidence({exam_series_id:'exam-2',exam_date:'2026-06-01',average:25})];
  const scenario=new URLSearchParams(location.search).get('scenario');
  if(scenario==='empty')rows=[];
  const data=buildAcademicIntelligence(rows,{level:scope,role:'teacher',actor_user_id:'teacher-1'},{page:1,page_size:25,...params},['school','department','subject','grade','class','assignment']);
  return {data:{...data,capabilities:{can_start_intervention:true}},isLoading:scenario==='loading',isFetching:false,error:scenario==='error'?new Error('Test service unavailable'):null,refetch:()=>{}};
}
export function useSchoolMutation(){const [isPending,setPending]=useState(false);return {isPending,mutateAsync:async(body:unknown)=>{setPending(true);window.__lastIntervention=body;await new Promise(r=>setTimeout(r,30));setPending(false);return {success:true};}};}
`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `
import {createRoot} from 'react-dom/client';
import {AcademicIntelligenceWorkspace} from ${source(path.join(web, 'src/components/school/academic-intelligence-workspace'))};
createRoot(document.getElementById('root')!).render(<main style={{padding:16,maxWidth:1440,margin:'auto'}}><AcademicIntelligenceWorkspace audience="principal" onOpenMarks={()=>{window.__lastAction='marks'}} onOpenReportCards={()=>{window.__lastAction='reports'}} /></main>);
`);

async function run() {
  await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(out,'entry.tsx'),devtool:false,
    output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],
      alias:{'@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@':path.join(web,'src')}},
    module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},
    optimization:{minimize:false}},(error,stats)=>{if(error||stats.hasErrors())reject(error||new Error(stats.toString({all:false,errors:true})));else resolve();}));
  const cssRoot=path.join(web,'.next/static/chunks');
  const css=fs.existsSync(cssRoot)?fs.readdirSync(cssRoot).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(cssRoot,f),'utf8')).join('\n'):'';
  if(!css)throw new Error('Build the web app first so browser QA uses the generated Tailwind styles.');
  const server=http.createServer((req,res)=>{
    if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}
    else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;background:#f8fafc"><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  const base=`http://127.0.0.1:${server.address().port}`;
  const results=[];
  try {
    for(const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
      const page=await browser.newPage({viewport}); const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+'/?scope=subject');
      await page.getByRole('heading',{name:'Subject Academic Intelligence'}).waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overview overflows viewport');
      await page.screenshot({path:path.join(out,`overview-${viewport.width}.png`),fullPage:true});
      await page.getByRole('button',{name:'At Risk',exact:true}).click();
      await page.getByRole('button',{name:'View Learner',exact:true}).first().click();
      await page.getByRole('button',{name:'Start Intervention',exact:true}).click();
      await page.getByLabel('Responsible staff').selectOption('teacher-1');
      await page.getByLabel('Review date').fill('2026-12-01');
      await page.getByLabel('Plan and notes').fill('Weekly revision with a measured review.');
      await page.getByRole('button',{name:'Save intervention',exact:true}).click();
      await page.getByRole('dialog').getByText('Intervention saved and assigned.',{exact:true}).waitFor();
      assert.equal((await page.evaluate(()=>window.__lastIntervention)).analytics_scope,'subject');
      await page.screenshot({path:path.join(out,`learner-${viewport.width}.png`),fullPage:true});
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Exam Operations',exact:true}).click();
      await page.getByRole('button',{name:'Open marks workflow',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__lastAction),'marks');
      for(const scenario of ['empty','error','loading']) {
        await page.goto(base+`/?scenario=${scenario}`);
        await (scenario==='empty'?page.getByRole('heading',{name:'No approved academic results yet'}):scenario==='error'?page.getByRole('alert'):page.getByLabel('Loading academic intelligence')).waitFor();
      }
      assert.deepEqual(errors,[]);results.push({viewport,passed:true});await page.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
