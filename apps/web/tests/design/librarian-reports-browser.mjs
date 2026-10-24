// Isolated fixture: real report UI and stylesheet, local test responses, no school connections.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const web = path.resolve('apps/web'), req = createRequire(path.join(web, 'package.json'));
const { webpack } = req('next/dist/compiled/webpack/webpack.js');
const { chromium } = req('@playwright/test');
const out = path.resolve('tmp/library-report-browser');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(req.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'hooks.tsx'), `import {useEffect,useState} from 'react';
export function useSchoolQuery(){const [data,setData]=useState(null);const refetch=async()=>{const r=await fetch('/qa/reports');setData(await r.json());};useEffect(()=>{void refetch();},[]);return {data,isLoading:!data,error:null,refetch};}
export function useSchoolMutation(path){return {mutateAsync:async(body)=>{const r=await fetch(typeof path==='string'?'/qa/generate':'/qa/download',{method:'POST',body:JSON.stringify(body)});return r.json();}};}`);
fs.writeFileSync(path.join(out, 'permissions.ts'), `export const usePermissions=()=>({isLoading:false,hasPermission:()=>true});`);
fs.writeFileSync(path.join(out, 'fixture.tsx'), `import {createRoot} from 'react-dom/client';import {ReportsWorkspace} from '@/components/school/librarian/reports-workspace';import {Toaster} from 'sonner';createRoot(document.getElementById('root')).render(<main style={{padding:16,maxWidth:1400,margin:'auto'}}><ReportsWorkspace/><Toaster/></main>);`);
(async()=>{
await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.join(out,'fixture.tsx'),
 output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{
 '@/lib/data/school-hooks':path.join(out,'hooks.tsx'),'@/components/providers/permission-context':path.join(out,'permissions.ts'),'@':path.join(web,'src')}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},
 (err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
const globalsPath=path.join(web,'src/app/globals.css');
const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components'))};`);
const css=(await req('postcss')([req('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css;
let reports=[];
const artifact={filename:'library.csv',content_type:'text/csv; charset=utf-8',content_base64:Buffer.from('Book,Times borrowed\nMathematics,2').toString('base64')};
const server=http.createServer(async(request,response)=>{
 response.setHeader('Cache-Control','no-store');
 if(request.url==='/bundle.js'){response.setHeader('Content-Type','application/javascript');return response.end(fs.readFileSync(path.join(out,'bundle.js')));}
 if(request.url==='/fonts/InterVariable.woff2')return response.end(fs.readFileSync(path.join(web,'public/fonts/InterVariable.woff2')));
 if(request.url.startsWith('/qa/')){
  response.setHeader('Content-Type','application/json');
  if(request.url==='/qa/reports')return response.end(JSON.stringify({metrics:{total_reports:reports.length,this_month:reports.length,pending:0},reports}));
  if(request.url==='/qa/generate'){
   let input='';for await(const chunk of request)input+=chunk;
   const body=JSON.parse(input);reports=[{id:'qa',report_name:'Most Borrowed Books',report_type:body.report_type,period:body.period,generated_by:'QA Librarian',generated_at:'2026-10-24T07:00:00Z',status:'Ready',file_format:body.format}];
   return response.end(JSON.stringify({success:true,snapshotId:'qa',artifact}));
  }
  return response.end(JSON.stringify({report:{snapshotId:'LIB-QA',title:'Most Borrowed Books',generatedDate:'2026-10-24T07:00:00Z',artifact,manifest:{sections:{school:{name:'Isolated QA School',generated_by:'QA Librarian'},records:[{book_title:'Mathematics',times_borrowed:2}]},filters:{period:'this_month'}}}}));
 }
 response.setHeader('Content-Type','text/html; charset=utf-8');response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const width of [390,1440]){
  reports=[];const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByText('No reports generated yet.',{exact:false}).waitFor();
  await page.getByLabel('Report type').selectOption('most_borrowed');await page.getByLabel('Report period').selectOption('this_month');await page.getByLabel('Report format').selectOption('csv');
  await page.getByRole('button',{name:'Generate Report',exact:true}).click();await page.getByRole('button',{name:'Download',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow at ${width}`);
  await page.screenshot({path:path.join(out,`reports-${width}.png`),fullPage:true});
  await page.reload();await page.getByRole('button',{name:'Download',exact:true}).waitFor();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();assert.equal((await downloaded).suggestedFilename(),'library.csv');
  await page.getByRole('button',{name:'Preview / Print',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Most Borrowed Books print preview'});await dialog.waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Print',exact:true}).count(),1);
  assert.equal(await page.frameLocator('iframe').getByText('Mathematics',{exact:true}).count(),1);
  await page.screenshot({path:path.join(out,`preview-${width}.png`),fullPage:true});assert.deepEqual(errors,[]);
  results.push({width,generated:true,persistedOnReload:true,download:true,preview:true,printControl:true,pageErrors:errors});await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
