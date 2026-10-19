// Real editor and styles; isolated test records never reach a school database.
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
const out = path.resolve(web, '../../output/student-record');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'scope.ts'), 'export function useOptionalSchoolTenantId(){return "qa-school";}');
fs.writeFileSync(path.join(out, 'link.tsx'), 'export default function Link(props){return <a {...props}/>;}');
fs.writeFileSync(path.join(out, 'hooks.ts'), `import {useQuery,useMutation} from '@tanstack/react-query';import {record,options} from ${source(path.join(web,'tests/design/student-record.fixture.ts'))};
export function useSchoolQuery(path){return useQuery({queryKey:['school','qa-school','actor','admissions',path],enabled:!!path,queryFn:async()=>path.endsWith('/options')?options:record});}
export function useSchoolMutation(){return useMutation({mutationFn:async(body)=>{window.__saved=body;return {...record,student:{...record.student,...body}};}});}`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {StudentRecordWorkspace} from '@/components/school/student-record-workspace';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><main className="mx-auto max-w-6xl p-3 sm:p-6"><StudentRecordWorkspace studentId="student-1" backHref="/school/admissions/enrolment" guardiansHref="/school/admissions/parents"/></main></QueryClientProvider>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'),
    output: { path: out, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'], alias: {
      '@/lib/data/school-hooks': path.join(out, 'hooks.ts'), '@/lib/data/school-tenant-scope': path.join(out, 'scope.ts'), 'next/link': path.join(out, 'link.tsx'), '@': path.join(web, 'src'),
    } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] }, optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const globalsPath = path.join(web, 'src/app/globals.css');
  const globals = fs.readFileSync(globalsPath, 'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components/school/student-record-workspace.tsx'))};\n@source ${source(path.join(out,'entry.tsx'))};`);
  const css = (await require('postcss')([require('@tailwindcss/postcss')()]).process(globals, { from: globalsPath })).css;
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
    else { res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.getByRole('heading', { name: 'Actual Learner' }).waitFor();
      await page.getByRole('button', { name: 'Edit student' }).click();
      await page.getByLabel('Guardian phone (optional)').fill('0712345678');
      await page.getByLabel('Class', { exact: true }).selectOption('class-2');
      await page.getByLabel('Reason for changes').fill('Parent confirmed updated details');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Editor overflows at ${width}px`);
      await page.screenshot({ path: path.join(out, `editor-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByRole('status').filter({ hasText: 'Student record saved' }).waitFor();
      assert.deepEqual(await page.evaluate(() => window.__saved.subject_ids), ['mat']);
      assert.equal(await page.evaluate(() => window.__saved.guardian_phone), '0712345678');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS student record editor at ${width}px`);
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
