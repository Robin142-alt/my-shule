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
const PDFDocument=require('pdfkit');
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(web,'../../output/smart-library-ui');
fs.mkdirSync(out,{recursive:true});
const source=v=>JSON.stringify(v.replaceAll('\\','/'));
fs.writeFileSync(path.join(out,'loader.cjs'),`const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out,'identity.tsx'),`
export function useSchoolCommandIdentity(){return {schoolName:'Library QA School',userLabel:'QA Librarian',logoUrl:null};}
export function IntegratedSchoolCommandHeader({actions}){return <header className="flex flex-wrap items-center justify-between gap-3 p-3"><strong>Library QA School</strong>{actions}</header>;}
export function SchoolCommandSidebarIdentity({title,subtitle}){return <div className="mb-5 p-3"><strong>{title}</strong><p className="mt-2 text-sm">{subtitle}</p></div>;}
`);
fs.writeFileSync(path.join(out,'routes.ts'),`export function buildSchoolSectionHref(role,section,mode){return mode==='public'?'/school/'+role+'/'+section:'/'+section;}`);
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
 if(route==='summary')return {total_copies:3,available_copies:books.filter(b=>!b.loan).length,issued_copies:books.filter(b=>b.loan).length};
 if(route==='history')return {person,outstanding:books.filter(b=>b.loan).length,overdue:0,max_active_loans:5,loans:books.filter(b=>b.loan)};
 if(route==='scan'){const b=books.find(b=>b.barcode===u.searchParams.get('barcode'));if(!b)throw Error('Barcode not found in this school.');return structuredClone(b);}
 if(route==='catalogue')return [{id:'title-1',title:'Mathematics',total_copies:3,available_copies:2}];
 if(route==='barcodes')return [{barcode:'000004',copy_id:null}];
 if(route==='batches')return [{id:'batch-1',quantity:1000,pages:11,source:'generated',created_at:'2026-10-20'}];
 if(route==='inventory')return books;
 if(route==='stocktakes')return [{id:'stock-1',name:'Term 3 shelf check',status:'open',expected:3,verified:seen.size}];
 if(route==='stocktakes/stock-1')return {session:{id:'stock-1',name:'Term 3 shelf check',status:'open'},total:3,verified:seen.size,issued:1,missing:Math.max(0,2-seen.size),items:[],exceptions:[]};
 return {};
}`);
fs.writeFileSync(path.join(out,'entry.tsx'),`
import {createRoot} from 'react-dom/client';
import {LiveRoleCommandCenter} from ${source(path.join(web,'src/components/school/live-role-command-center'))};
createRoot(document.getElementById('root')).render(<LiveRoleCommandCenter role="librarian" routeMode="public" activeSection={location.pathname.split('/').pop()||'overview'}/>);
`);
async function run(){
 await new Promise((resolve,reject)=>bundledWebpack.webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{
  '@/components/school/integrated-school-command-header':path.join(out,'identity.tsx'),
  './school-pages$':path.join(out,'routes.ts'),
  '@/components/school/school-pages':path.join(out,'routes.ts'),
  '@/components/providers/permission-context':path.join(out,'permissions.ts'),
  '@/lib/dashboard/api-client':path.join(out,'api.ts'),'@':path.join(web,'src')
 }},plugins:[{apply(compiler){compiler.hooks.compilation.tap('LibraryBrowserStyles',compilation=>{bundledWebpack.webpack.NormalModule.getCompilationHooks(compilation).loader.tap('LibraryBrowserStyles',context=>{context.currentTraceSpan=require('next/dist/trace').trace('library-browser-styles');});});}},new bundledWebpack.webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]},{test:/\.css$/,use:[require.resolve('next/dist/build/webpack/loaders/next-style-loader'),{loader:require.resolve('next/dist/build/webpack/loaders/css-loader/src'),options:{modules:{auto:true,getLocalIdent:require('next/dist/build/webpack/config/blocks/css/loaders/getCssModuleLocalIdent').getCssModuleLocalIdent},postcss:async()=>({postcss:require('postcss')})}}]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString({all:false,errors:true}))):resolve()));
 const globalsPath=path.join(web,'src/app/globals.css');
 const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/library'))};\n@source ${source(path.join(web,'src/components/ui'))};\n@source ${source(path.join(web,'src/components/shared'))};\n@source ${source(path.join(web,'src/components/school/live-role-command-center.tsx'))};\n@source ${source(path.join(out,'entry.tsx'))};`);
 const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
 // Exercise production policy, not a permissive dev server. Missing frame-src
 // previously passed every UI check but blocked generated blob PDFs in Chrome.
 const policySource=fs.readFileSync(path.join(web,'src/middleware.ts'),'utf8').match(/const csp = `([\s\S]*?)`/);
 assert.ok(policySource,'Production CSP is available to the browser fixture');
 let csp=policySource[1].replace(/\s{2,}/g,' ').trim();
 if(process.env.LIBRARY_CSP_URL){
  const response=await fetch(process.env.LIBRARY_CSP_URL);
  csp=response.headers.get('content-security-policy');await response.body?.cancel();
  assert.ok(csp,'Published page sends its security policy');
  assert.equal(response.headers.get('x-frame-options'),'DENY');
 }
 assert.match(csp,/frame-ancestors 'none'/,'Other sites must not embed school pages');
 const document=new PDFDocument({size:'A4'}),chunks=[];
 document.on('data',chunk=>chunks.push(chunk));
 const finished=new Promise(resolve=>document.on('end',resolve));
 document.text('Library PDF preview fixture');document.addPage().text('Second sheet');document.end();
 await finished;const pdf=Buffer.concat(chunks),pdfRequests=[];
 const server=http.createServer((req,res)=>{
  res.setHeader('Content-Security-Policy',csp);res.setHeader('X-Frame-Options','DENY');
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/library/smart/barcodes/')){
   pdfRequests.push({method:req.method,path:url.pathname,query:Object.fromEntries(url.searchParams)});
   res.setHeader('Content-Type','application/pdf');res.setHeader('Cache-Control','private, no-store');res.end(pdf);return;
  }
  const file=path.basename(url.pathname);
  if(file.endsWith('.js')&&fs.existsSync(path.join(out,file))){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,file)));}
  else{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 // Full Chromium includes the native PDF viewer; headless-shell does not.
 const browser=await chromium.launch({headless:true,channel:'chromium'});
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>window.__cspViolations.push(event.effectiveDirective));});
   await page.goto(`http://127.0.0.1:${server.address().port}/school/librarian/overview`);
   const navigate=async label=>{
    if(width<1280){await page.getByRole('button',{name:'Open Librarian workspace sidebar'}).click();await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();}
    else await page.getByRole('navigation',{name:'Librarian workspace navigation'}).getByRole('button',{name:label,exact:true}).click();
   };
   const check=async name=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflows ${width}px`);await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});};
   const scan=async code=>{await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a book');await page.keyboard.type(code);await page.keyboard.press('Enter');};
   await page.getByRole('heading',{name:'Library overview',exact:true}).waitFor();
   await page.getByRole('button',{name:'Registered copies 3',exact:true}).waitFor();await check('overview');
   await navigate('Issue Books');
   await page.getByRole('button',{name:/Brian Otieno/}).click();
   await scan('000001');await scan('000002');await scan('000003');
   await page.getByText('Biology',{exact:true}).waitFor();await check('issue');
   await page.getByRole('button',{name:'Confirm issue of 3 book(s)'}).click();
   await page.getByText('3 book(s) issued successfully.',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.__libraryCommands.filter(c=>c.route==='issue'))).length,1);
   await navigate('Return Books');
   await scan('000001');await scan('000002');await page.getByText('English',{exact:true}).waitFor();
   await check('return');await page.getByRole('button',{name:'Confirm return of 2 book(s)'}).click();
   await page.getByText('2 book(s) returned successfully.',{exact:true}).waitFor();
   assert.deepEqual((await page.evaluate(()=>window.__libraryCommands.find(c=>c.route==='return').body.barcodes)),['000001','000002']);
   await navigate('Register Books');
   await page.getByRole('button',{name:/Mathematics/}).click();
   const registration=page.getByLabel('Scan a sticker to register',{exact:true});
   await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a sticker to register');
   await page.keyboard.type('000004');await page.keyboard.press('Enter');
   await page.getByText(/Physical copy registered/).waitFor();
   assert.equal(await registration.evaluate(e=>e===document.activeElement),true);
   await check('registration');
   await navigate('Barcode Generator & Printing');
   await page.getByLabel('Custom quantity').fill('1000');await page.getByText(/11 sheet\(s\) · 56 empty/).waitFor();
   await page.getByRole('button',{name:/1,000 barcodes/}).click();await check('labels');
   const verifyPdf=async target=>{
    let viewer;
    for(let attempt=0;attempt<100&&!viewer;attempt++){
     viewer=target.frames().find(frame=>frame.url().startsWith('chrome-extension://'));
     if(!viewer)await target.waitForTimeout(100);
    }
    assert.ok(viewer,'Native PDF viewer must load under production CSP');
    try {await viewer.waitForFunction(()=>document.querySelector('pdf-viewer')?.documentDimensions?.pageDimensions.length===2);}
    catch(error){
     await target.screenshot({path:path.join(out,`pdf-render-failure-${width}.png`),fullPage:true});
     console.error('PDF renderer state',await viewer.evaluate(()=>({dimensions:document.querySelector('pdf-viewer')?.documentDimensions,body:document.body.innerText})));
     throw error;
    }
   };
   const previewPdf=async button=>{
    await page.getByRole('button',{name:button,exact:true}).click();
    await page.getByTitle('A4 barcode sheet preview').waitFor();
    await page.getByTitle('A4 barcode sheet preview').scrollIntoViewIfNeeded();
    await verifyPdf(page);
    assert.deepEqual(await page.evaluate(()=>window.__cspViolations),[],'PDF preview must not violate production policy');
   };
   await previewPdf('Preview / reprint batch');
   assert.equal(pdfRequests.at(-1).query.batch_id,'batch-1');
   const downloadReady=page.waitForEvent('download');await page.getByRole('link',{name:'Download PDF',exact:true}).click();
   const download=await downloadReady;assert.equal(download.suggestedFilename(),'myshule-library-barcodes.pdf');
   assert.deepEqual(fs.readFileSync(await download.path()),pdf,'Download retains the original PDF bytes');
   const popupReady=page.waitForEvent('popup');await page.getByRole('link',{name:'Open PDF & print barcodes',exact:true}).click();
   const popup=await popupReady;await verifyPdf(popup);await popup.close();
   await check('pdf-preview');await page.getByRole('button',{name:'Close preview',exact:true}).click();
   await previewPdf('Print test sheet');assert.equal(pdfRequests.at(-1).path,'/api/library/smart/barcodes/calibration');
   await page.getByRole('button',{name:'Close preview',exact:true}).click();
   await navigate('Barcode Management');
   await page.getByRole('checkbox',{name:/000004/}).check();await previewPdf('Print 1 selected');
   assert.deepEqual(JSON.parse(pdfRequests.at(-1).query.selected),['000004']);
   assert.ok(pdfRequests.every(request=>request.method==='GET'),'Reprints and calibration must not allocate barcodes');
   assert.equal(await page.evaluate(()=>window.__libraryCommands.filter(command=>command.route==='batches').length),0);
   await page.getByRole('button',{name:'Close preview',exact:true}).click();
   await navigate('Inventory & Stocktaking');
   await page.getByLabel('Open or previous session').selectOption('stock-1');
   const field=page.getByLabel('Scan barcode',{exact:true});
   await field.fill('000001');await field.press('Enter');await page.getByText('000001: verified',{exact:true}).waitFor();
   await page.waitForTimeout(250);assert.equal(await field.evaluate(e=>e===document.activeElement),true,'Refresh must preserve scanner focus');
   await field.fill('000002');await field.press('Enter');await page.getByText('000002: verified',{exact:true}).waitFor();await check('stocktake');
   await navigate('Scanner Settings');
   const commandsBeforeTest=await page.evaluate(()=>window.__libraryCommands.length);
   const testField=page.getByLabel('Test your scanner',{exact:true});
   await page.getByText(/Ready for scanner input/).waitFor();
   assert.equal(await testField.evaluate(e=>e===document.activeElement),true);
   await page.keyboard.type('000001');
   await page.getByText(/6 characters received/).waitFor();
   await page.getByText(/No completed tests yet/).waitFor();
   await page.keyboard.press('Enter');
   await page.getByText('Completed tests: 1 · Enter received.',{exact:true}).waitFor();
   assert.match(await page.getByText(/Received exactly/).innerText(),/000001 \(6 characters\)/);
   await page.getByRole('checkbox',{name:/Optional sound/}).check();
   await page.getByText(/Scanner input is not focused/).waitFor();
   assert.equal(await page.evaluate(()=>localStorage.getItem('myshule-library-scanner-sound')),'true');
   await page.getByRole('button',{name:'Test sound',exact:true}).click();
   await page.getByText(/Test tone started/).waitFor();
   await page.getByRole('button',{name:'Start scanner test',exact:true}).click();
   assert.equal(await testField.evaluate(e=>e===document.activeElement),true);
   await page.keyboard.type('000001');
   await page.getByRole('button',{name:'Complete test',exact:true}).click();
   await page.getByText(/Completed tests: 2 · Completed with button/).waitFor();
   assert.equal(await testField.evaluate(e=>e===document.activeElement),true);
   await page.getByLabel('Scanner completion key').selectOption('tab');
   await page.getByRole('button',{name:'Start scanner test',exact:true}).click();
   await page.keyboard.type('000001');await page.keyboard.press('Tab');
   await page.getByText('Completed tests: 3 · Tab received.',{exact:true}).waitFor();
   assert.equal(await testField.evaluate(e=>e===document.activeElement),true);
   assert.equal(await page.evaluate(()=>window.__libraryCommands.length),commandsBeforeTest,'Scanner diagnostics must not write library data');
   await page.getByText(/Notepad/).waitFor();await check('scanner');
   await navigate('Issue Books');
   await page.getByRole('button',{name:/Brian Otieno/}).click();
   await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Scan a book');
   await page.keyboard.type('000001');await page.keyboard.press('Tab');
   await page.getByText('Mathematics',{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Scan a book',{exact:true}).evaluate(e=>e===document.activeElement),true,'Saved Tab preference applies at the issue desk');
   assert.equal(await page.evaluate(()=>window.__libraryCommands.length),commandsBeforeTest,'Scanning a pending issue is not a confirmed issue');
   assert.deepEqual(errors,[]);
   await page.evaluate(()=>{
    const frame=document.createElement('iframe');frame.src='https://external.invalid/';document.body.append(frame);
    const object=document.createElement('object');object.data=URL.createObjectURL(new Blob(['blocked plugin'],{type:'text/plain'}));document.body.append(object);
   });
   await page.waitForFunction(()=>window.__cspViolations.includes('frame-src')&&window.__cspViolations.includes('object-src'));
   await page.close();console.log(`Smart library ${width}px: circulation, scanner, PDF preview/download/print view, calibration, reprint and security restrictions passed`);
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
