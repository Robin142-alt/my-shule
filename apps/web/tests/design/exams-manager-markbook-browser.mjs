// Real components and styles, isolated synthetic API responses. No production writes.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require=createRequire(import.meta.url);
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(process.env.MARKS_UI_QA_OUTPUT ?? path.join(web,'../../output/marks-hub-ui'));
fs.mkdirSync(out,{recursive:true});
const source=value=>JSON.stringify(value.replaceAll('\\','/'));
const base={window_id:'window-1',exam_id:'exam-1',exam_name:'End Term Exams',class_section_id:'grade-10',class_name:'Grade 10',
  subject_id:'math',subject:'Mathematics',assessment_id:'paper-1',paper:'Main Paper',stream_id:'blue',stream:'Blue',
  total_students:30,entered:30,recorded:30,submitted:0,missing:0,deadline:'2026-01-01',overdue:true,window_closed:true,last_activity:null,revision:'revision-1'};
const rows=[{...base,id:'submitted',teacher_id:'teacher-1',teacher:'Amina Otieno',status:'Submitted',submission_state:'submitted',submitted:30,overdue:false},
  {...base,id:'pending',teacher_id:'teacher-1',teacher:'Amina Otieno',subject_id:'english',subject:'English',status:'In Progress',submission_state:'in_progress'},
  {...base,id:'correction',teacher_id:null,teacher:'Unassigned',subject_id:'science',subject:'Science',status:'Resubmission Required',submission_state:'resubmission_required',stream_id:null,stream:null}];
fs.writeFileSync(path.join(out,'loader.cjs'),`const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out,'hooks.ts'),`import {useState} from 'react';window.__rows=${JSON.stringify(rows)};export function useSchoolQuery(){const [,render]=useState(0);return {data:{entries:window.__rows},isLoading:false,isFetching:false,error:null,refetch:async()=>render(x=>x+1)};}`);
fs.writeFileSync(path.join(out,'api.ts'),`export async function submitAssistedMarkbook(data){window.__submissions=(window.__submissions||[]).concat(data);if(data.teacher_user_id===null)throw new Error('1 learner needs a score or missing-mark reason.');await new Promise(resolve=>setTimeout(resolve,100));window.__rows=window.__rows.map(row=>row.id==='pending'?{...row,status:'Submitted',submission_state:'submitted',submitted:30,overdue:false}:row);return {success:true};}export async function lockMarksEntry(){}export async function openMarksEntry(){}`);
fs.writeFileSync(path.join(out,'entry.tsx'),`import {createRoot} from 'react-dom/client';import {TeacherMarksProgress} from ${source(path.join(web,'src/components/school/exams-manager/teacher-marks-progress'))};createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-6xl p-3 sm:p-6"><TeacherMarksProgress onOpenMarkbook={sheet=>{window.__opened=sheet}}/></main>);`);

await new Promise((resolve,reject)=>bundledWebpack.webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},
  resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{
    '@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@':path.join(web,'src')}},
  plugins:[new bundledWebpack.webpack.NormalModuleReplacementPlugin(/exams-manager[\\/]api-client$|^\.\/api-client$/,path.join(out,'api.ts'))],
  module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},
  (error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const globalsPath=path.join(web,'src/app/globals.css');
const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/school/exams-manager'))};\n@source ${source(path.join(out,'entry.tsx'))};`);
const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}else{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const width of [320,390,768,1024,1440]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button',{name:'All sheets',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Enter / Edit Marks',exact:true}).count(),3);
    assert.equal(await page.getByRole('button',{name:'Submit Marks',exact:true}).count(),2);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Hub overflow at ${width}`);
    await page.screenshot({path:path.join(out,`hub-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Enter / Edit Marks',exact:true}).first().click();
    assert.equal(await page.evaluate(()=>window.__opened.id),'submitted');
    await page.getByRole('button',{name:'Submit Marks',exact:true}).first().click();
    await page.getByRole('button',{name:'Confirm submission',exact:true}).click();
    await page.getByRole('button',{name:'Confirm submission',exact:true}).waitFor({state:'detached'});
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].filter(button=>button.textContent==='Submit Marks').length===1);
    assert.equal(await page.getByRole('button',{name:'Submit Marks',exact:true}).count(),1);
    await page.getByRole('button',{name:'Submit Marks',exact:true}).click();
    await page.getByRole('button',{name:'Confirm submission',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'1 learner needs a score'}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Error overflow at ${width}`);
    await page.screenshot({path:path.join(out,`validation-${width}.png`),fullPage:true});
    assert.deepEqual(errors,[]);
    results.push({width,overflow:false,consoleErrors:0,actions:3,submitted:1,validationFailure:true});
    await page.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
