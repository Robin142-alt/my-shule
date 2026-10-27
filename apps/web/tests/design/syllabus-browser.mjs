// Component browser verification. Fixtures stay in this local test server, never in a school database.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const webRequire = createRequire(path.join(root,'apps/web/package.json'));
const rootRequire = createRequire(path.join(root,'package.json'));
const { build } = webRequire('esbuild');
const { chromium } = webRequire('@playwright/test');
rootRequire('ts-node').register({transpileOnly:true,project:path.join(root,'tsconfig.json')});
const { syllabusProgress } = rootRequire(path.join(root,'apps/api/src/modules/academics/syllabus-policy.ts'));
const out = path.join(root,'tmp/syllabus-browser');
await fs.mkdir(out,{recursive:true});
const data = { school_id:'browser-fixture',generated_at:new Date().toISOString(),can_monitor:true,rights:[{subject_id:'math',academic_year_id:null}],subjects:[{id:'math',name:'Mathematics'}],
  years:[{id:'year',name:'2026',status:'active'}],terms:[{id:'term',academic_year_id:'year',name:'Term 1',starts_on:'2026-01-01',ends_on:'2026-12-31',status:'active'}],grades:[{grade_level:'Form 2',academic_year_id:'year'}],
  syllabi:[{id:'plan',subject_id:'math',subject:'Mathematics',academic_year_id:'year',academic_term_id:'term',grade_level:'Form 2',version:1,can_manage:true,
    topics:[{id:'numbers',title:'Numbers',expected_on:'2026-10-15',archived:false,subtopics:[{id:'integers',title:'Integers',required:true,archived:false},{id:'fractions',title:'Fractions',required:true,archived:false},{id:'extension',title:'Extension practice',required:false,archived:false}]}],
    milestones:[{id:'checkpoint',title:'Number skills checkpoint',due_on:'2026-10-01',subtopic_ids:['integers']}]}],
  items:[['east','Ms Achieng',true],['west','Mr Otieno',false]].map(([stream,teacher,writable])=>({id:stream,teacher_user_id:teacher,teacher_name:teacher,subject_id:'math',subject:'Mathematics',class_section_id:'class',class_name:'Form 2',stream_id:stream,stream_name:stream==='east'?'East':'West',grade_level:'Form 2',academic_year_id:'year',year_name:'2026',academic_term_id:'term',term_name:'Term 1',can_record:writable,syllabus_id:'plan',records:stream==='east'?[{subtopic_id:'integers',completed:true,completed_at:'2026-09-30T08:00:00Z',teacher_user_id:teacher,note:'Number line exercises completed.',version:1}]:[],progress:null})) };
const refresh = () => data.items.forEach(item=>{item.progress=syllabusProgress(data.syllabi[0],item.records,'2026-10-27');});
refresh();
const hooks = path.join(out,'hooks.tsx');
await fs.writeFile(hooks,`import {useState,useEffect} from 'react';
const listeners=new Set();
export function useSchoolQuery(){const [data,setData]=useState(null);const [error,setError]=useState(null);const refetch=async()=>{try{const response=await fetch('/fixture');setData(await response.json());setError(null);}catch(error){setError(error);}};useEffect(()=>{void refetch();listeners.add(refetch);return()=>listeners.delete(refetch);},[]);return {data,error,isPending:!data&&!error,isFetching:false,refetch};}
export function useSchoolMutation(path,method){const [isPending,setPending]=useState(false);const [error,setError]=useState(null);return {isPending,error,mutateAsync:async(body)=>{setPending(true);setError(null);try{const response=await fetch('/command'+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.message);await Promise.all([...listeners].map(read=>read()));return result;}catch(error){setError(error);throw error;}finally{setPending(false);}}};}`);
await fs.writeFile(path.join(out,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {SyllabusWorkspace} from '${path.join(root,'apps/web/src/components/school/syllabus-workspace').replaceAll('\\','/')}';createRoot(document.getElementById('root')).render(<SyllabusWorkspace/>);`);
await build({entryPoints:[path.join(out,'entry.tsx')],bundle:true,outfile:path.join(out,'bundle.js'),platform:'browser',format:'iife',jsx:'automatic',
  alias:{'@/lib/data/school-hooks':hooks,'@':path.join(root,'apps/web/src'),'react':path.dirname(webRequire.resolve('react/package.json')),'react-dom/client':webRequire.resolve('react-dom/client')},nodePaths:[path.join(root,'apps/web/node_modules')],define:{'process.env.NODE_ENV':'"development"'},logLevel:'silent'});
const staticRoot=path.join(root,'apps/web/.next/static');
const cssFiles=(await fs.readdir(path.join(staticRoot,'chunks'))).filter(name=>name.endsWith('.css'));
assert(cssFiles.length,'Build the web app once to supply its actual CSS.');
let rejectNext=false;
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/fixture'){res.setHeader('content-type','application/json');res.end(JSON.stringify(data));return;}
    if(url.pathname.startsWith('/command/')){
      let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);
      if(rejectNext){rejectNext=false;res.statusCode=503;res.end(JSON.stringify({message:'Fixture service unavailable'}));return;}
      if(url.pathname.includes('/coverage')){
        const id=decodeURIComponent(url.pathname.split('/').at(-2));const item=data.items.find(item=>item.id===input.assignment_id);
        const previous=item.records.find(record=>record.subtopic_id===id);
        const record={subtopic_id:id,completed:input.completed,completed_at:input.completed?(previous?.completed_at||new Date().toISOString()):null,note:input.note,teacher_user_id:item.teacher_user_id,version:(previous?.version??0)+1};
        item.records=item.records.filter(record=>record.subtopic_id!==id).concat(record);refresh();res.end(JSON.stringify(record));return;
      }
      res.end('{}');return;
    }
    if(url.pathname==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(await fs.readFile(path.join(out,'bundle.js')));return;}
    if(url.pathname==='/bundle.css'){res.setHeader('content-type','text/css');res.end(await fs.readFile(path.join(out,'bundle.css')));return;}
    if(url.pathname.startsWith('/static/')){
      const filename=path.resolve(staticRoot,url.pathname.slice('/static/'.length));assert(filename.startsWith(staticRoot+path.sep));
      res.setHeader('content-type',filename.endsWith('.css')?'text/css':'font/woff2');res.end(await fs.readFile(filename));return;
    }
    if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
    res.setHeader('content-type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${cssFiles.map(file=>`<link rel="stylesheet" href="/static/chunks/${file}">`).join('')}<link rel="stylesheet" href="/bundle.css"><title>MyShule syllabus browser verification</title><style>body{margin:0;background:#f5f7fa;font-family:Arial,sans-serif}main{max-width:1400px;margin:auto;padding:16px;color:#172b4d}button,input,select,textarea{font:inherit}</style></head><body><main><h1 class="mb-4 text-2xl font-bold">MyShule · Academics & Teaching</h1><div id="root"></div></main><script src="/bundle.js"></script></body></html>`);
  } catch(error){res.statusCode=500;res.end(JSON.stringify({message:error.message}));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
const errors=[];
try {
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('503'))errors.push(message.text());});
  await page.goto(base);await page.getByRole('button',{name:/Record coverage for/}).waitFor();
  for(const width of [320,768,1024,1440]){
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Page overflows at ${width}px`);
    await page.screenshot({path:path.join(out,`coverage-${width}.png`),fullPage:true});
  }
  await page.getByRole('button',{name:'Define syllabus'}).click();
  await page.getByRole('dialog').getByRole('combobox',{name:/^Term/}).selectOption('term');
  await page.getByRole('dialog').getByRole('combobox',{name:/^Grade\/Form/}).selectOption('Form 2');
  await page.getByRole('button',{name:'Add topic',exact:true}).click();
  await page.getByLabel('Topic 1 title',{exact:true}).fill('Algebra');
  await page.getByRole('button',{name:'Add subtopic to topic 1'}).click();
  await page.getByLabel('Topic 1, subtopic 1',{exact:true}).fill('Linear equations');
  await page.setViewportSize({width:390,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Syllabus editor overflows on mobile');
  await page.screenshot({path:path.join(out,'editor-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:/View coverage for/}).click();
  assert(await page.getByRole('checkbox',{name:/^Integers/}).isDisabled());
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:/Record coverage for/}).click();
  await page.getByRole('checkbox',{name:/^Fractions/}).check();
  await page.getByText('100% covered',{exact:true}).waitFor();
  await page.getByText('Teaching note (optional)',{exact:true}).first().click();
  await page.getByLabel('Note for Fractions').fill('Practical examples completed.');
  await page.getByRole('button',{name:'Save note'}).click();
  await page.getByText('Teaching note (saved)',{exact:true}).nth(1).waitFor();
  await page.setViewportSize({width:320,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Checklist overflows on mobile');
  await page.screenshot({path:path.join(out,'checklist-mobile.png'),fullPage:true});
  rejectNext=true;await page.getByRole('checkbox',{name:/^Integers/}).click();
  await page.getByRole('alert').filter({hasText:'Your change has not been saved'}).waitFor();
  assert(await page.getByRole('checkbox',{name:/^Integers/}).isChecked(),'Failed mutation changed the displayed completion');
  assert.equal(data.items[1].progress.percentage,0,'One stream inherited another stream completion');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({viewports:[320,768,1024,1440],consoleErrors:errors,coverage:data.items.map(item=>({stream:item.stream_name,percentage:item.progress.percentage})),checks:['checkbox persistence','notes','independent streams','read-only monitoring','truthful failed write','mobile overflow']},null,2));
  console.log(`Syllabus browser checks passed. Evidence: ${out}`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
