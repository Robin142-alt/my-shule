// Exercise the shipped workspaces with isolated browser fixtures, never school data.
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
const out=path.resolve(web,'../../output/smart-library-ui');
fs.mkdirSync(out,{recursive:true});
const source=v=>JSON.stringify(v.replaceAll('\\','/'));
fs.writeFileSync(path.join(out,'loader.cjs'),`const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out,'identity.ts'),`export function useSchoolCommandIdentity(){return {schoolName:'Library QA School',userLabel:'QA Librarian',logoUrl:null};}`);
fs.writeFileSync(path.join(out,'permissions.ts'),`export function usePermissions(){return {hasPermission:()=>true};}`);
fs.writeFileSync(path.join(out,'api.ts'),`
const books=['000001','000002','000003'].map((barcode,i)=>({id:barcode,barcode,title:['Mathematics','English','Biology'][i],status:'available',condition:'good'}));
const person={subject_id:'student-1',borrower_type:'student',name:'Brian Otieno',identifier:'2451',class_name:'Form 2'};
const seen=new Set();window.__libraryCommands=[];
export async function requestDashboardApi(path,options={}){
 await new Promise(resolve=>setTimeout(resolve,35));
 const u=new URL(path,location.origin),route=u.pathname.replace('/api/library/smart/','');
 if(options.method==='POST'){
  window.__libraryCommands.push({route,body:options.body});
  if(route==='issue'){options.body.barcodes.forEach(code=>{const b=books.find(b=>b.barcode===code);b.status='issued';b.loan={borrower_name:person.name,borrower_number:'2451',due_on:options.body.due_on};});return {transaction_id:'issue-1',loans:options.body.barcodes.map(id=>({id,due_on:options.body.due_on}))};}
  if(route==='return'){options.body.barcodes.forEach(code=>{const b=books.find(b=>b.barcode===code);b.status='available';b.loan=null;});return {transaction_id:'return-1',returns:options.body.barcodes.map(id=>({id,returned_at:'2026-10-20'}))};}
  if(route==='register')return {id:options.body.barcode,catalog_item_id:'title-1',title:'Mathematics'};
  if(route==='stocktakes/stock-1/scan'){const duplicate=seen.has(options.body.barcode);seen.add(options.body.barcode);return {duplicate,outcome:'verified'};}
 }
 if(route==='borrowers')return [person];
 if(route==='history')return {person,outstanding:books.filter(b=>b.loan).length,overdue:0,max_active_loans:5,loans:books.filter(b=>b.loan)};
 if(route==='scan'){const b=books.find(b=>b.barcode===u.searchParams.get('barcode'));if(!b)throw Error('Barcode not found in this school.');return structuredClone(b);}
 if(route==='catalogue')return [{id:'title-1',title:'Mathematics',total_copies:3,available_copies:2}];
 if(route==='barcodes')return [{barcode:'000004',copy_id:null}];
 if(route==='batches')return [];
 if(route==='inventory')return books;
 if(route==='stocktakes')return [{id:'stock-1',name:'Term 3 shelf check',status:'open',expected:3,verified:seen.size}];
 if(route==='stocktakes/stock-1')return {session:{id:'stock-1',name:'Term 3 shelf check',status:'open'},total:3,verified:seen.size,issued:1,missing:Math.max(0,2-seen.size),items:[],exceptions:[]};
 return {};
}`);
fs.writeFileSync(path.join(out,'entry.tsx'),`
import {createRoot} from 'react-dom/client';import {useState} from 'react';
import {SmartCirculation,SmartCatalogue,SmartBarcodeWorkspace,SmartStocktake,SmartScannerSettings} from ${source(path.join(web,'src/components/library/smart-library-workspaces'))};
function App(){const [page,setPage]=useState('issue');return <main className="mx-auto max-w-7xl space-y-5 p-3 sm:p-6"><nav className="flex flex-wrap gap-2">{['issue','return','register','labels','stocktake','scanner'].map(v=><button key={v} className="rounded-lg border p-2" onClick={()=>setPage(v)}>{v}</button>)}</nav>
{page==='issue'&&<SmartCirculation key="issue" mode="issue"/>}{page==='return'&&<SmartCirculation key="return" mode="return"/>}{page==='register'&&<SmartCatalogue registration/>}{page==='labels'&&<SmartBarcodeWorkspace/>}{page==='stocktake'&&<SmartStocktake/>}{page==='scanner'&&<SmartScannerSettings/>}</main>}createRoot(document.getElementById('root')).render(<App/>);
`);
async function run(){
 await new Promise((resolve,reject)=>bundledWebpack.webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{
  '@/components/school/integrated-school-command-header':path.join(out,'identity.ts'),
  '@/components/providers/permission-context':path.join(out,'permissions.ts'),
  '@/lib/dashboard/api-client':path.join(out,'api.ts'),'@':path.join(web,'src')
 }},plugins:[new bundledWebpack.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString({all:false,errors:true}))):resolve()));
 const globalsPath=path.join(web,'src/app/globals.css');
 const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/library'))};\n@source ${source(path.join(web,'src/components/ui'))};\n@source ${source(path.join(out,'entry.tsx'))};`);
 const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}else{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   const check=async name=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflows ${width}px`);await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});};
   const scan=async code=>{await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a book');await page.keyboard.type(code);await page.keyboard.press('Enter');};
   await page.getByRole('button',{name:/Brian Otieno/}).click();
   await scan('000001');await scan('000002');await scan('000003');
   await page.getByText('Biology',{exact:true}).waitFor();await check('issue');
   await page.getByRole('button',{name:'Confirm issue of 3 book(s)'}).click();
   await page.getByText('3 book(s) issued successfully.',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.__libraryCommands.filter(c=>c.route==='issue'))).length,1);
   await page.getByRole('button',{name:'return',exact:true}).click();
   await scan('000001');await scan('000002');await page.getByText('English',{exact:true}).waitFor();
   await check('return');await page.getByRole('button',{name:'Confirm return of 2 book(s)'}).click();
   await page.getByText('2 book(s) returned successfully.',{exact:true}).waitFor();
   assert.deepEqual((await page.evaluate(()=>window.__libraryCommands.find(c=>c.route==='return').body.barcodes)),['000001','000002']);
   await page.getByRole('button',{name:'register',exact:true}).click();
   await page.getByRole('button',{name:/Mathematics/}).click();
   const registration=page.getByLabel('Scan a sticker to register',{exact:true});
   await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a sticker to register');
   await page.keyboard.type('000004');await page.keyboard.press('Enter');
   await page.getByText(/Physical copy registered/).waitFor();
   assert.equal(await registration.evaluate(e=>e===document.activeElement),true);
   await check('registration');
   await page.getByRole('button',{name:'labels',exact:true}).click();
   await page.getByLabel('Custom quantity').fill('1000');await page.getByText(/11 sheet\(s\) · 56 empty/).waitFor();await check('labels');
   await page.getByRole('button',{name:'stocktake',exact:true}).click();
   await page.getByLabel('Open or previous session').selectOption('stock-1');
   const field=page.getByLabel('Scan barcode',{exact:true});
   await field.fill('000001');await field.press('Enter');await page.getByText('000001: verified',{exact:true}).waitFor();
   await page.waitForTimeout(250);assert.equal(await field.evaluate(e=>e===document.activeElement),true,'Refresh must preserve scanner focus');
   await field.fill('000002');await field.press('Enter');await page.getByText('000002: verified',{exact:true}).waitFor();await check('stocktake');
   await page.getByRole('button',{name:'scanner',exact:true}).click();
   await page.getByLabel('Test your scanner',{exact:true}).fill('000001');
   await page.getByLabel('Test your scanner',{exact:true}).press('Enter');
   await page.getByText(/Received exactly/).waitFor();await check('scanner');
   assert.deepEqual(errors,[]);await page.close();console.log(`Smart library ${width}px: multi-issue, partial return, registration, labels, stocktake focus and scanner passed`);
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
