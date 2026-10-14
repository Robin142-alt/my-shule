// Real components and styles with isolated QA data; never connects to a school.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(web, '../../output/exam-release-ui');
fs.mkdirSync(out, { recursive: true });
const source = value => JSON.stringify(value.replaceAll('\\', '/'));
fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
const workflow = { metrics: { active_series: 1, marks_awaiting_moderation: 0, report_cards_to_generate: 0, report_cards_awaiting_principal: 11 }, series: [{
  id: 'exam-1', name: 'QA Term 3', term_name: 'Term 3', status: 'reviewed', stage: 'principal_release', next_owner: 'Principal',
  blockers: ['11 report cards await Principal release'], counts: { subjects: 9, learners: 11, locked_marks: 99, published_marks: 0, marks: 99, report_cards: 11, published_report_cards: 0 },
}] };
const entries = [{ id: 'sheet-1', window_id: 'window-1', exam_id: 'exam-1', exam_name: 'QA Published Exam',
  teacher_id: 'teacher-1', teacher: 'QA Teacher', class_section_id: 'class-1', class_name: 'Grade 8', status: 'Locked' }];
fs.writeFileSync(path.join(out, 'hooks.ts'), `export function useSchoolQuery(){return {data:${JSON.stringify(workflow)},isLoading:false,error:null,isFetching:false,refetch:async()=>({})};}`);
fs.writeFileSync(path.join(out, 'api.ts'), `export async function openMarksEntry(input){window.__opened=input;return {success:true,message:'Mark entry opened for 1 subject/class windows.',window_count:1};}`);
fs.writeFileSync(path.join(out, 'entry.tsx'), `import {createRoot} from 'react-dom/client';
import {ExamWorkflowTracker} from ${source(path.join(web, 'src/components/school/exam-workflow-tracker'))};
import {OpenMarkEntryPanel} from ${source(path.join(web, 'src/components/school/exams-manager/open-mark-entry-panel'))};
createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-6xl space-y-4 p-3"><ExamWorkflowTracker compact/><OpenMarkEntryPanel entries={${JSON.stringify(entries)}} unavailable={false} onOpened={async()=>({})}/></main>);`);

await new Promise((resolve, reject) => bundledWebpack.webpack({ mode: 'development', devtool: false, entry: path.join(out, 'entry.tsx'),
  output: { path: out, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(web, 'node_modules'), 'node_modules'],
    alias: { '@/lib/data/school-hooks': path.join(out, 'hooks.ts'), '@': path.join(web, 'src') } },
  plugins: [new bundledWebpack.webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }),
    new bundledWebpack.webpack.NormalModuleReplacementPlugin(/^\.\/api-client$/, path.join(out, 'api.ts'))],
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: [path.join(out, 'loader.cjs')] }] }, optimization: { minimize: false },
}, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const globalsPath = path.join(web, 'src/app/globals.css');
const globals = fs.readFileSync(globalsPath, 'utf8').replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source ${source(path.join(web, 'src'))};`);
const css = (await require('postcss')([require('@tailwindcss/postcss')()]).process(globals, { from: globalsPath })).css;
const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(path.join(out, 'bundle.js'))); }
  else { res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('Next: Principal', { exact: true }).waitFor();
    assert.equal(await page.getByRole('list', { name: 'QA Term 3 progress' }).getByRole('listitem').count(), 7);
    assert.equal(await page.getByText('Approve cards', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Submit cards', { exact: true }).count(), 0);
    await page.getByRole('combobox', { name: 'Exam to open' }).selectOption('exam-1');
    await page.getByRole('combobox', { name: 'Teacher to open' }).selectOption('teacher-1');
    await page.getByLabel('Mark entry deadline').fill('2099-10-20T18:00');
    await page.getByRole('button', { name: 'Open mark entry', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Mark entry opened' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__opened), { exam_series_id: 'exam-1', scope: 'teacher', teacher_user_id: 'teacher-1', closes_at: '2099-10-20T15:00:00.000Z' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(out, `exam-release-${width}.png`), fullPage: true });
    await page.close();
    console.log(`${width}px: seven stages, Principal handoff, reopen action, timezone and layout passed`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
