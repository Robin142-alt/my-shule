// Isolated browser fixture for the production keyboard helper. No API or school writes.
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
const out = path.resolve(web, '../../output/keyboard-navigation');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {useState} from 'react';import {onFormNavigationKeyDown,onGridNavigationKeyDown} from ${source(path.join(web,'src/lib/accessibility/keyboard-navigation'))};
function Fixture(){const [scans,setScans]=useState(0);const [saved,setSaved]=useState(0);return <main><h1>Keyboard navigation verification</h1><p>Isolated fixture using the production keyboard helper. No school data.</p><form onKeyDown={onFormNavigationKeyDown} onSubmit={e=>{e.preventDefault();setSaved(n=>n+1)}}><label>Name<input aria-label="Name" defaultValue="Asha"/></label><label hidden>Hidden<input/></label><input aria-label="Disabled" disabled/><label>Phone<input aria-label="Phone"/></label><label>Class<select aria-label="Class"><option>Form 1</option><option>Form 2</option></select></label><label>Copies<input aria-label="Copies" type="number" defaultValue="2"/></label><label>Notes<textarea aria-label="Notes"/></label><label>Date<input type="date" aria-label="Date"/></label><label>Last field<input aria-label="Last field"/></label><button>Save</button><output aria-label="Saved count">{saved}</output><label>Barcode<input data-keyboard-navigation="off" aria-label="Barcode" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setScans(n=>n+1);e.currentTarget.value=''}}}/></label><output aria-label="Scan count">{scans}</output></form><h2>Editable scores</h2><p>Arrows navigate. Type or F2 to edit. Escape returns to navigation; Enter moves down.</p><div onKeyDown={onGridNavigationKeyDown} className="scores">{[0,1,2].map(row=><div key={row}>{[0,1].map(col=><input aria-label={'Score '+row+' '+col} key={col} data-grid-row={row} data-grid-column={col} disabled={row===1&&col===0}/>)}</div>)}</div></main>};createRoot(document.getElementById('root')).render(<Fixture/>);`);
await new Promise((resolve,reject)=>bundledWebpack.webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const css='body{font:16px system-ui;background:#f8fafc;color:#0f172a;margin:0}main{max-width:700px;padding:20px;margin:auto}h1{font-size:24px}label{display:grid;gap:4px;margin:10px 0}input,select,textarea,button{font:inherit;border:1px solid #94a3b8;border-radius:6px;padding:8px;min-width:0}input:focus,select:focus,textarea:focus{outline:2px solid #2563eb;outline-offset:2px}label[hidden]{display:none}input:disabled{background:#e2e8f0}.scores>div{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}output{margin:10px}';
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')))}else{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`)} });
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const results=[];
try {
  for(const width of [375,1280]){
    const page=await browser.newPage({viewport:{width,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const focused=async(label)=>assert.equal(await page.getByLabel(label,{exact:true}).evaluate(el=>el===document.activeElement),true,`${label} should have focus`);
    await page.getByLabel('Name',{exact:true}).focus();await page.keyboard.press('ArrowDown');await focused('Phone');await page.keyboard.press('ArrowUp');await focused('Name');
    await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');assert.equal(await page.getByLabel('Name',{exact:true}).evaluate(el=>el.selectionStart),3);
    await page.keyboard.press('Enter');await focused('Phone');await page.keyboard.press('Tab');await focused('Class');await page.keyboard.press('ArrowDown');assert.equal(await page.getByLabel('Class',{exact:true}).inputValue(),'Form 2');
    await page.getByLabel('Copies',{exact:true}).focus();await page.keyboard.press('ArrowUp');assert.equal(await page.getByLabel('Copies',{exact:true}).inputValue(),'3');await page.keyboard.press('Enter');await focused('Notes');assert.equal(await page.getByLabel('Saved count').innerText(),'0');
    await page.getByLabel('Notes',{exact:true}).fill('line one\nline two');await page.keyboard.press('ArrowUp');await focused('Notes');
    await page.getByLabel('Date',{exact:true}).focus();await page.keyboard.press('ArrowDown');await focused('Date');
    await page.getByLabel('Last field',{exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.getByLabel('Saved count').innerText(),'0');
    const barcode=page.getByLabel('Barcode',{exact:true});await barcode.focus();for(let i=0;i<7;i++){await page.keyboard.type('COPY-'+i);await page.keyboard.press('Enter');}await focused('Barcode');assert.equal(await page.getByLabel('Scan count').innerText(),'7');assert.equal(await page.getByLabel('Saved count').innerText(),'0');
    await page.getByLabel('Score 0 0').focus();await page.keyboard.press('ArrowDown');await focused('Score 2 0');await page.keyboard.press('Shift+Enter');await focused('Score 0 0');await page.keyboard.press('ArrowRight');await focused('Score 0 1');
    await page.keyboard.type('42');await page.keyboard.press('ArrowDown');await focused('Score 0 1');await page.keyboard.press('ArrowLeft');assert.equal(await page.getByLabel('Score 0 1').evaluate(el=>el.selectionStart),1);
    await page.keyboard.press('Escape');await page.keyboard.press('ArrowDown');await focused('Score 1 1');await page.keyboard.press('F2');await page.keyboard.press('ArrowDown');await focused('Score 1 1');await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await focused('Score 1 1');await page.keyboard.press('ArrowDown');await focused('Score 2 1');await page.keyboard.press('Shift+Enter');await focused('Score 1 1');await page.keyboard.press('F2');await page.keyboard.press('Enter');await focused('Score 2 1');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(out,`keyboard-${width}.png`),fullPage:true});results.push({width,status:'passed',consoleErrors:errors.length,scanCount:7,savedCount:0});await page.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({fixture:true,checks:'Form arrows, native caret/Tab/select/number/textarea/date, 7 scanner Enter suffixes, no implicit save, grid arrows, edit mode, reverse Enter, mobile overflow',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
