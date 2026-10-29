// Actual component/browser checks using isolated fixture responses; never a live school.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(web, '../../output/exam-class-configuration');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const subjects = ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Business Studies', 'Integrated Science', 'Social Studies', 'Agriculture', 'Computer Studies', 'Creative Arts'].map((label,i) => ({id:`subject-${i}`,label}));
const classes = [{id:'f4',label:'Form 4',subject_ids:subjects.slice(0,9).map(s=>s.id)}, {id:'g9',label:'Grade 9',subject_ids:subjects.slice(4,11).map(s=>s.id)}, {id:'g10',label:'Grade 10',subject_ids:subjects.slice(8,14).map(s=>s.id),streams:[{id:'east',label:'East'},{id:'west',label:'West'}]}];
const options = {subjects,classes,terms:[{id:'term',label:'Term 3'}],gradingSystems:[{id:'grading',label:'School grading'}]};
const exam = {id:'exam',name:'End Term Examination',type:'End Term',academic_term_id:'term',grading_system_id:'grading',status:'draft',starts_on:'2026-10-01',ends_on:'2026-10-31',max_marks:100,configuration_version:4,class_section_ids:classes.map(c=>c.id),class_subjects:classes.map(c=>({class_section_id:c.id,subject_ids:c.subject_ids})),marks_count:0,can_delete:true};
fs.writeFileSync(path.join(out,'hooks.ts'), `const options=${JSON.stringify(options)};const data={exams:[${JSON.stringify(exam)}],can_manage:true,metrics:{}};export function useSchoolQuery(url){return {data:url.endsWith('/options')?options:data,isLoading:false,error:null,refetch:async()=>({data})};}`);
fs.writeFileSync(path.join(out,'client.ts'), `export async function configureExam(id,body){const response=await fetch('/fixture/configure',{method:'POST',body:JSON.stringify(body)});if(!response.ok)throw new Error('Concurrent change: refresh the exam.');return response.json();}export const createExam=configureExam;export async function deleteExam(){throw new Error('Deletion is outside this fixture.');}`);
fs.writeFileSync(path.join(out,'entry.tsx'), `import {createRoot} from 'react-dom/client';import {ExamSetupWorkspace} from ${source(path.join(web,'src/components/school/exams-manager/exam-setup-workspace'))};createRoot(document.getElementById('root')).render(<ExamSetupWorkspace/>);`);
await new Promise((resolve,reject)=>bundledWebpack.webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{'@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@':path.join(web,'src')}},plugins:[new bundledWebpack.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})}),new bundledWebpack.webpack.NormalModuleReplacementPlugin(/exams-manager[\\/]api-client$|^\.\/api-client$/,path.join(out,'client.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const globalsPath=path.join(web,'src/app/globals.css');
const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/school/exams-manager'))};\n@source ${source(path.join(web,'src/components/ui'))};`);
const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
let saved;
const server=http.createServer((req,res)=>{
  if(req.url==='/fixture/configure'){let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{saved=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end('{"success":true}');});}
  else if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}
  else{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="p-4"><div id="root"></div></main><script src="/bundle.js"></script></body></html>`);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const width of [320,390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:960}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(()=>history.pushState({},'', '/configuration'));
    await page.getByRole('button',{name:'Configure',exact:true}).click();
    await page.getByRole('button',{name:/Grade 9.*7 subjects/}).click();
    await page.getByLabel('Chemistry',{exact:true}).uncheck();
    await page.getByRole('button',{name:/Grade 10.*6 subjects/}).click();
    await page.getByRole('button',{name:/Grade 9.*6 subjects/}).click();
    assert.equal(await page.getByLabel('Chemistry',{exact:true}).isChecked(),false);
    const dialog=page.waitForEvent('dialog');
    await page.evaluate(()=>history.back());
    await (await dialog).dismiss();
    assert.equal(new URL(page.url()).pathname,'/configuration');
    assert.equal(await page.getByLabel('Chemistry',{exact:true}).isChecked(),false);
    assert.equal(await page.getByLabel('Mathematics',{exact:true}).count(),0);
    assert.ok(await page.getByRole('button',{name:/Form 4.*9 subjects/}).isVisible());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
    assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),`Dialog overflow at ${width}`);
    await page.screenshot({path:path.join(out,`configuration-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Save configuration',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.deepEqual(saved.class_subjects.map(s=>s.subject_ids.length),[9,6,6]);
    assert.equal(saved.configuration_version,4);
    assert.equal('subject_ids' in saved,false);
    assert.deepEqual(errors,[]);
    results.push({width,classCounts:[9,6,6],version:4,overflow:false,consoleErrors:0});
    await page.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'Browser component fixture, no production verification',results},null,2));
  console.log(JSON.stringify(results));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
