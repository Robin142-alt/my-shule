// Isolated browser QA of real shared components and the production stylesheet.
// The fixture never connects to a school or persists records.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const { webpack } = bundledWebpack;
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(web, '../../output/mobile-product');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'link.tsx'), 'export default function Link({children,...props}) {return <a {...props}>{children}</a>;}');

await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(web, 'tests/design/mobile-product.fixture.tsx'),
  plugins: [new webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
  output: { path: out, filename: 'bundle.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: { 'next/link': path.join(out, 'link.tsx'), '@': path.join(web, 'src') } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] }, optimization: { minimize: false },
}, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const globalsPath = path.join(web, 'src/app/globals.css');
const globals = fs.readFileSync(globalsPath, 'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web, 'src/components'))};\n@source ${source(path.join(web, 'tests/design/mobile-product.fixture.tsx'))};`);
const css = (await require('postcss')([require('@tailwindcss/postcss')()]).process(globals, { from: globalsPath })).css;
const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') {res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));}
  else if (req.url?.startsWith('/_next/image?') || req.url === '/brand/myshule-mark-512.png') {res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(path.join(web,'public/brand/myshule-mark-512.png')));}
  else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [width,height] of [[320,740],[390,844],[430,932],[768,1024],[1024,768],[1440,1000],[844,390]]) {
    const page = await browser.newPage({viewport:{width,height}, reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>{ errors.push(error.message); console.error(error.message); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('heading',{name:'Student directory'}).waitFor().catch(async error => {await page.screenshot({path:path.join(out,'failure.png')});throw error;});
    const fits = async label => assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),`${label}: page overflows ${width}x${height}`);
    const inside = async locator => {const b=await locator.boundingBox();assert.ok(b && b.x>=-1 && b.y>=-1 && b.x+b.width<=width+1 && b.y+b.height<=height+1,`Offscreen control at ${width}: ${JSON.stringify(b)}`);};
    await fits('Directory');
    await page.screenshot({path:path.join(out,`directory-${width}x${height}.png`),fullPage:true});
    await page.screenshot({path:path.join(out,`screen-${width}x${height}.png`)});
    if(width<1024){
      await page.getByRole('button',{name:'Open navigation',exact:true}).click();
      const sidebar=page.getByRole('dialog',{name:'MyShule navigation'});await sidebar.waitFor();
      await inside(sidebar.getByRole('button',{name:'Close',exact:true}));
      await page.keyboard.press('Escape');await sidebar.waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
      await page.getByRole('button',{name:'Open School workspace sidebar'}).click();
      const nav=page.getByRole('dialog',{name:'School workspace',exact:true});
      await nav.getByRole('searchbox').fill('reports');
      await page.screenshot({path:path.join(out,`navigation-${width}x${height}.png`)});
      await nav.getByRole('button',{name:'Reports',exact:true}).click();
      assert.match(await page.getByRole('button',{name:'Open School workspace sidebar'}).innerText(),/Reports/);
    }
    await page.getByRole('button',{name:'Add student',exact:true}).click();
    const modal=page.getByRole('dialog',{name:'Add student',exact:true});
    await modal.getByLabel('Full name',{exact:true}).fill('A learner with a long name');
    await inside(modal.getByRole('button',{name:'Save student'}));
    await modal.getByLabel('Notes',{exact:true}).fill('Last field remains reachable');
    await fits('Admission');
    await page.screenshot({path:path.join(out,`form-${width}x${height}.png`)});
    await modal.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Report preview',exact:true}).click();
    const preview=page.getByRole('dialog',{name:'Report preview'});
    await inside(preview.getByRole('button',{name:'Close dialog'}));
    await preview.getByRole('button',{name:'Done'}).click();
    await page.getByRole('button',{name:'Details',exact:true}).click();
    await page.getByRole('button',{name:'Edit student',exact:true}).click();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog',{name:'Add student',exact:true}).waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden','Nested close must keep drawer locked');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog',{name:'Student details'}).waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
    await page.getByRole('tab',{name:'Students',exact:true}).focus();await page.keyboard.press('End');
    await page.getByRole('tab',{name:'Settings',exact:true}).waitFor();
    assert.equal(await page.getByRole('tab',{name:'Settings',exact:true}).getAttribute('aria-selected'),'true');
    await fits('Tabs');assert.deepEqual(errors,[]);
    results.push({width,height,passed:true});await page.close();
    console.log(`Mobile product ${width}x${height}: passed`);
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
