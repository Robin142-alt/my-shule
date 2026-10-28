// Production components with an isolated fixture HTTP API; never a real school.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require=createRequire(import.meta.url);
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(web,'../../output/library-desk');fs.mkdirSync(out,{recursive:true});
const source=v=>JSON.stringify(v.replaceAll('\\','/'));
fs.writeFileSync(path.join(out,'loader.cjs'),`const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const borrowers=[{id:'borrower-a',subject_id:'borrower-a',identifier:'ADM001',name:'Amina Otieno',admission_no:'ADM001',class_name:'Grade 9',stream_name:'East',borrower_type:'student'}];
let books=Array.from({length:75},(_,i)=>({id:`title-${i}`,title:`Book Title ${String(i+1).padStart(2,'0')}`,author:'School author',category:'Languages',isbn:`isbn-${i}`,total_copies:0,available_copies:0,subjects:[],classes:[]}));
let saved,conditionSaved=null,registrations=[];
function report(count,group=20){return {type:'outstanding',title:'OUTSTANDING LIBRARY BOOKS',document_number:'LIB-FIXTURE',generated_at:'2026-10-28T08:00:00Z',generated_by:'Library Staff',school:{name:'Library Verification School',logo_url:null},scope:'Whole school',totals:{copies:count,outstanding:count,students:Math.ceil(count/group),overdue:count},records:Array.from({length:count},(_,i)=>({id:`loan-${i}`,copy_id:`copy-${i}`,borrower_id:`student-${Math.floor(i/group)}`,book_title:i%3===0?'A very long school library title about environmental conservation, integrated science and sustainable community development':'The River and the Source',barcode:`LIBRARY-COPY-${String(i).padStart(5,'0')}`,issue_date:'2026-08-01',due_date:'2026-09-01',status:'Overdue',student_name:`Learner ${Math.floor(i/group)+1} Akinyi Otieno`,admission_no:`ADM${Math.floor(i/group)+1}`,class_name:'Grade 9',stream_name:'East',borrower_type:'student'}))};}
fs.writeFileSync(path.join(out,'hooks.ts'),`import{useEffect,useState}from'react';export function useSchoolQuery(url){const[data,setData]=useState();const[error,setError]=useState(null);async function refetch(){try{const value=await(await fetch(url)).json();setData(value);return{data:value};}catch(error){setError(error);throw error;}}useEffect(()=>{void refetch();},[url]);return{data,error,isLoading:!data,refetch};}`);
fs.writeFileSync(path.join(out,'permission.ts'),`export function usePermissions(){return{hasPermission:()=>true};}`);
fs.writeFileSync(path.join(out,'client.ts'),`export async function requestDashboardApi(url,options={}){const response=await fetch(url,{method:options.method||'GET',body:options.body?JSON.stringify(options.body):undefined});if(!response.ok)throw new Error('Request failed: '+response.status);return response.json();}`);
fs.writeFileSync(path.join(out,'identity.ts'),`export function useSchoolCommandIdentity(){return {schoolName:'Library Verification School',userLabel:'Library Staff',logoUrl:null};}`);
fs.writeFileSync(path.join(out,'entry.tsx'),`import{createRoot}from'react-dom/client';import{SmartCatalogue}from${source(path.join(web,'src/components/library/smart-library-catalogue'))};import{SmartCirculation,SmartBorrowerRecords}from${source(path.join(web,'src/components/library/smart-library-workspaces'))};import{borrowerReportHtml}from${source(path.join(web,'src/lib/library/borrower-report'))};window.reportHtml=borrowerReportHtml;createRoot(document.getElementById('root')).render(location.pathname==='/books'?<SmartCatalogue registration/>:location.pathname==='/borrowers'?<SmartBorrowerRecords/>:location.pathname==='/condition'?<SmartCirculation mode="return"/>:<SmartCirculation mode="issue"/>);`);
await new Promise((resolve,reject)=>bundledWebpack.webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{'@/components/school/integrated-school-command-header':path.join(out,'identity.ts'),'@/lib/data/school-hooks':path.join(out,'hooks.ts'),'@/components/providers/permission-context':path.join(out,'permission.ts'),'@/lib/dashboard/api-client':path.join(out,'client.ts'),'@':path.join(web,'src')}},plugins:[new bundledWebpack.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const globalsPath=path.join(web,'src/app/globals.css');
const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/library'))};\n@source ${source(path.join(web,'src/components/ui'))};`);
const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture');let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
 function json(value){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));}
 const route=url.pathname.replace('/api/library/smart/','');
 if(route==='scan'){const code=url.searchParams.get('barcode');json({id:code,title:'Same title, distinct copy',barcode:code,status:code==='LOST-COPY'?'issued':'available',loan:{borrower_name:'Amina Otieno',borrower_number:'ADM001',due_on:'2026-09-01'}});}
 else if(route==='issue'){saved=body;json({transaction_id:body.request_id,loans:body.barcodes.map(id=>({id,due_on:body.due_on}))});}
 else if(route==='return'){conditionSaved=body;json({transaction_id:body.request_id,returns:[{id:'condition-fixture',condition:body.condition,returned_at:null}]});}
 else if(route==='register'){registrations.push(body);const book=books.find(book=>book.id===body.catalog_item_id);book.total_copies++;book.available_copies++;json({id:body.barcode,catalog_item_id:book.id,catalogue:book});}
 else if(url.pathname.endsWith('/borrowers/report'))json(report(300));
 else if(route==='borrowers')json(borrowers);
 else if(route==='history')json({loans:[],outstanding:0,overdue:0});
 else if(route==='classifications')json({subjects:[],classes:[]});
 else if(route==='batches')json([]);
 else if(route==='catalogue'){const filtered=books.filter(book=>book.title.toLowerCase().includes((url.searchParams.get('search')||'').toLowerCase()));const offset=Number(url.searchParams.get('offset')||0);json(filtered.slice(offset,offset+50));}
 else if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(fs.readFileSync(path.join(out,'bundle.js')));}
 else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="p-3"><div id="root"></div></main><script src="/bundle.js"></script></body></html>`);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(origin+'/books');await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:/Book Title 60/}).click();
  const registration=page.getByLabel('Scan a sticker to register',{exact:true});
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a sticker to register');
  await page.getByRole('button',{name:'Previous',exact:true}).click();
  assert.match(await page.getByLabel('Selected title').innerText(),/Book Title 60/);
  assert.equal(await page.getByRole('button',{name:/Book Title 60/}).count(),0);
  await page.getByLabel('Find an existing title').fill('Title 01');
  assert.match(await page.getByLabel('Selected title').innerText(),/Book Title 60/);
  for(let i=0;i<10;i++){await registration.fill(`REGISTER-${width}-${i}`);await registration.press('Enter');}
  await page.getByText('10 registered this session',{exact:true}).waitFor();
  assert.equal(registrations.filter(r=>r.barcode.startsWith(`REGISTER-${width}`)).length,10);
  assert.match(await page.getByLabel('Selected title').innerText(),new RegExp(`${width===390?10:20} available`));
  await page.screenshot({path:path.join(out,`register-${width}.png`),fullPage:true});
  await page.goto(origin+'/issue');await page.getByRole('button',{name:/Amina Otieno/}).click();
  const scanner=page.getByLabel('Scan a book',{exact:true});
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a book');
  for(let i=1;i<=55;i++){await scanner.fill(`SCAN-${i}`);await scanner.press('Enter');}
  await page.getByRole('button',{name:'Confirm issue of 55 book(s)',exact:true}).waitFor();
  const list=page.getByRole('list',{name:'Queued books'});assert.match(await list.getByRole('listitem').first().innerText(),/SCAN-55/);
  await list.evaluate(el=>el.scrollTop=el.scrollHeight);await scanner.fill('SCAN-56');await scanner.press('Enter');
  await page.getByRole('button',{name:'Confirm issue of 56 book(s)',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Queued books"]').scrollTop===0);
  assert.equal(await scanner.evaluate(el=>el===document.activeElement),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,`issue-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Confirm issue of 56 book(s)',exact:true}).click();
  await page.getByText('56 book(s) issued successfully.',{exact:true}).waitFor();assert.equal(saved.barcodes.length,56);assert.equal(saved.barcodes[0],'SCAN-56');
  conditionSaved=null;await page.goto(origin+'/condition');
  const returned=page.getByLabel('Scan a book',{exact:true});await returned.fill('LOST-COPY');await returned.press('Enter');
  await page.getByText('Same title, distinct copy',{exact:true}).waitFor();assert.equal(conditionSaved,null);
  await page.getByLabel('Condition of selected returned books').selectOption('lost');
  await page.getByLabel('Incident notes (required)').fill('Reported missing');
  await page.getByRole('button',{name:'Confirm return of 1 book(s)',exact:true}).click();
  await page.getByText('1 book(s) recorded as lost; loans remain outstanding successfully.',{exact:true}).waitFor();
  assert.equal(conditionSaved.condition,'lost');assert.deepEqual(conditionSaved.barcodes,['LOST-COPY']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,`condition-${width}.png`),fullPage:true});
  await page.goto(origin+'/borrowers');await page.getByText('Export / print this report',{exact:true}).click();
  await page.getByRole('button',{name:'Prepare report preview',exact:true}).click();
  const frame=page.frameLocator('iframe');await frame.getByRole('heading',{name:'Library Verification School'}).waitFor();assert.equal(await frame.locator('tbody tr').count(),300);
  assert.equal(await page.getByRole('button',{name:'Print / Save as PDF',exact:true}).isEnabled(),true);
  await page.locator('iframe').evaluate(el=>{window.printCalls=0;el.contentWindow.print=()=>window.printCalls++;});
  await page.getByRole('button',{name:'Print / Save as PDF',exact:true}).click();
  await page.waitForFunction(()=>window.printCalls===1);
  assert.equal(await page.locator('.app-modal-body').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true);
  await page.screenshot({path:path.join(out,`preview-${width}.png`),fullPage:true});
  if(width===1440){for(const variant of [{count:3},{count:60},{count:300},{count:3,logo:true},{count:60,landscape:true},{count:60,individual:true},{count:60,classScope:true},{count:0,individual:true}]){
   const {count}=variant;
   const html=await page.evaluate(({data,variant})=>{
    let logo=null;
    if(variant.logo){const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle='#153b67';ctx.fillRect(0,0,80,80);ctx.fillStyle='#fff';ctx.font='bold 32px Arial';ctx.fillText('LV',18,52);logo=canvas.toDataURL('image/png');}
    if(variant.individual || variant.count===3)data.scope='Individual borrower';
    if(variant.classScope)data.scope='Grade 9 / East';
    if(variant.count===0)data.selected_borrower={borrower_id:'empty-fixture',student_name:'Amina Otieno',admission_no:'ADM001',class_name:'Grade 9',stream_name:'East',borrower_type:'student'};
    return window.reportHtml(data,logo,!!variant.landscape);
   },{data:report(count,variant.individual?Math.max(count,1):count===3?3:20),variant});
   const printable=await browser.newPage();await printable.setContent(html);await printable.emulateMedia({media:'print'});
   assert.equal(await printable.locator('tbody tr').count(),count);
   await printable.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));});
   assert.equal(await printable.locator('.crest img').count(),variant.logo?1:0);
   assert.doesNotMatch(await printable.locator('body').innerText(),/[\u00c2\u00e2]/);
   const suffix=variant.logo?'-logo':variant.landscape?'-landscape':variant.individual?'-individual':variant.classScope?'-class':'';
   await printable.pdf({path:path.join(out,`outstanding-${count}${suffix}.pdf`),preferCSSPageSize:true,printBackground:true});
   await printable.screenshot({path:path.join(out,`outstanding-${count}${suffix}.png`),fullPage:count===3});await printable.close();
  }}
  assert.deepEqual(errors,[]);results.push({width,registered:10,issued:56,printRows:300,consoleErrors:0});await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'Isolated browser component fixture; no production or physical scanner verification',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
