/* Local browser QA: real role workspace, isolated data/header fixtures, no production requests. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const { webpack } = bundledWebpack;
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.resolve(web, '../..');
const out = path.join(repo, 'output/head-of-subject-browser');
fs.mkdirSync(out, { recursive: true });
require('ts-node').register({ transpileOnly: true, project: path.join(repo, 'tsconfig.json') });
const { buildAcademicIntelligence } = require(path.join(repo, 'apps/api/src/modules/exams/analytics/analytics-engine.ts'));
const { buildAnalyticsPrintReport } = require(path.join(repo, 'apps/api/src/modules/exams/analytics/analytics-report-model.ts'));
const { createAnalyticsReportPdf } = require(path.join(repo, 'apps/api/src/modules/exams/analytics/analytics-report-pdf.ts'));
const { evidence } = require(path.join(repo, 'apps/api/src/modules/exams/analytics/testing/evidence.fixture.ts'));
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out, 'header.tsx'), `export const IntegratedSchoolCommandHeader=({roleTitle})=><h1 className="text-2xl font-bold">{roleTitle}</h1>;export const SchoolCommandSidebarIdentity=()=> <p className="mb-4 font-bold">QA School · sample data</p>;`);
fs.writeFileSync(path.join(out, 'routes.ts'), `export const buildSchoolSectionHref=(_role,section)=>'/?view='+section;`);
fs.writeFileSync(path.join(out, 'link.tsx'), `export default function Link(props){return <a {...props}/>;}`);
fs.writeFileSync(path.join(out, 'hooks.ts'), `
import {useState} from 'react';
import {buildAcademicIntelligence} from ${source(path.join(repo, 'apps/api/src/modules/exams/analytics/analytics-engine'))};
import {evidence} from ${source(path.join(repo, 'apps/api/src/modules/exams/analytics/testing/evidence.fixture'))};
export function useSchoolQuery(url:string){
  const scenario=new URLSearchParams(location.search).get('scenario');
  const params=Object.fromEntries(new URLSearchParams(url.split('?')[1]??''));
  const data=url==='/academics/my-subject-appointments' ? (scenario==='empty'?[]:[{id:'qa-ap',subject_name:'Mathematics',status:'active',appointment_type:'acting',effective_from:'2026-01-01',effective_to:'2026-12-31',academic_year_name:'2026'}]) : {...buildAcademicIntelligence([evidence({average:45}),evidence({student_id:'learner-2',student_name:'Brian Otieno',average:85})],{level:'subject',role:'head_of_subject',actor_user_id:'hos'},{page:1,page_size:25,...params},['subject','assignment']),capabilities:{can_start_intervention:true}};
  return {data,isLoading:scenario==='loading',error:scenario==='error'?new Error('Test service unavailable'):null,refetch:()=>{},isFetching:false};
}
export function useSchoolMutation(endpoint:string){const [isPending,setPending]=useState(false);return {isPending,mutateAsync:async(body)=>{window.__endpoint=endpoint;setPending(true);try{const response=await fetch('/qa-report',{method:'POST',body:JSON.stringify(body)});if(!response.ok)throw new Error('QA report failed');return response.json();}finally{setPending(false);}}};}
`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';import {HosCommandCenter} from ${source(path.join(web, 'src/components/school/hos-command-center'))};createRoot(document.getElementById('root')!).render(<HosCommandCenter routeMode="public" activeSection={new URLSearchParams(location.search).get('view')??undefined}/>);`);

async function run() {
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry: path.join(out, 'entry.tsx'), devtool: false,
    output: { path: out, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'],
      alias: { '@/lib/data/school-hooks': path.join(out, 'hooks.ts'), 'next/link': path.join(out, 'link.tsx'), '@': path.join(web, 'src') } },
    plugins: [{ apply(compiler) { compiler.hooks.normalModuleFactory.tap('SubjectQaFixtures', factory => {
      factory.hooks.beforeResolve.tap('SubjectQaFixtures', resource => {
        if (resource?.request.endsWith('integrated-school-command-header')) resource.request = path.join(out, 'header.tsx');
        if (resource?.request.endsWith('school-pages')) resource.request = path.join(out, 'routes.ts');
      });
    }); } }],
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] }, optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const cssRoot = path.join(web, '.next/static');
  const css = fs.readdirSync(cssRoot, { recursive: true }).filter(f => String(f).endsWith('.css')).map(f => fs.readFileSync(path.join(cssRoot, String(f)), 'utf8')).join('\n');
  assert.ok(css, 'Build the web app first to verify the actual styles.');
  const server = http.createServer(async (req, res) => {
    if (req.url === '/qa-report') {
      try {
        let raw = ''; for await (const part of req) raw += part;
        const body = JSON.parse(raw);
        assert.equal(body.filters.scope, 'subject');
        const data = buildAcademicIntelligence([evidence()], { level: 'subject', role: 'head_of_subject', actor_user_id: 'hos' }, { page: 1, page_size: 25 }, ['subject']);
        const report = buildAnalyticsPrintReport(data, body.section, { school_name: 'QA School - sample document', school_address: null, school_motto: null, generated_by: 'QA Subject Leader' }, 'AI-HOS-QA', new Date().toISOString());
        const pdf = await createAnalyticsReportPdf(report);
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ report, pdf_base64: pdf.content.toString('base64'), filename: pdf.filename }));
      } catch (error) { res.statusCode = 500; res.end(String(error)); }
    } else if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
    else if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0"><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.getByRole('heading', { name: 'Subject Academic Intelligence' }).waitFor();
      assert.equal(await page.getByLabel('Responsibility').locator('option').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(out, `analytics-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Print / PDF', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare preview', exact: true }).click();
      await page.getByRole('link', { name: 'Download PDF', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__endpoint), '/exams/analytics/reports/subject');
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download PDF', exact: true }).click()]);
      await download.saveAs(path.join(out, `subject-summary-${width}.pdf`));
      assert.equal(fs.readFileSync(path.join(out, `subject-summary-${width}.pdf`)).subarray(0, 5).toString(), '%PDF-');
      const preview = page.frames().find(frame => frame !== page.mainFrame());
      await preview.evaluate(() => { window.print = () => { window.__printed = true; }; });
      await page.getByRole('button', { name: 'Print report', exact: true }).click();
      assert.equal(await preview.evaluate(() => window.__printed), true);
      await page.keyboard.press('Escape');
      await page.getByRole('link', { name: 'My Subject Appointments', exact: true }).click();
      await page.getByRole('heading', { name: 'My Subject Appointments', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Mathematics', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(out, `appointments-${width}.png`), fullPage: true });
      for (const scenario of ['empty', 'error', 'loading']) {
        await page.goto(base + `/?view=subjects&scenario=${scenario}`);
        await (scenario === 'empty' ? page.getByRole('heading', { name: 'No subject appointment yet' }) : scenario === 'error' ? page.getByRole('alert') : page.getByRole('status')).waitFor();
      }
      assert.deepEqual(errors, []); results.push({ width, passed: true, verified: ['subject scope', 'preview', 'PDF download', 'print handler', 'appointments', 'empty/error/loading', 'no page overflow'] });
      await page.close();
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
