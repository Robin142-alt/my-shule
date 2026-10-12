/* Local component QA: real Accountant UI and styles, isolated API/auth fixtures. Never connects to a school. */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import bundledWebpack from "next/dist/compiled/webpack/webpack.js";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.url);
const { webpack } = bundledWebpack;
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repo = path.resolve(web, "../..");
const out = path.join(repo, "output/accountant-usability");
fs.mkdirSync(out, { recursive: true });
const source = (value) => JSON.stringify(value.replaceAll("\\", "/"));
fs.writeFileSync(
  path.join(out, "loader.cjs"),
  `const ts=require(${source(require.resolve("typescript"))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`,
);
fs.writeFileSync(
  path.join(out, "css-loader.cjs"),
  `module.exports=function(){return 'export default {workspace:"dean-workspace",table:"dean-table"};'};`,
);
fs.writeFileSync(
  path.join(out, "routes.ts"),
  `export function buildSchoolSectionHref(role,section){return '/school/'+role+'/'+section;}`,
);
fs.writeFileSync(path.join(out,"hooks.ts"), `
import {useState} from 'react';
const plan={id:'plan',name:'Term 3 day school fees',academic_year:'2026',term:'Term 3',grade_level:'Grade 7',grade_levels:['Grade 7','Grade 8'],class_name:null,status:'active',total_amount_minor:'1250000',due_days:14,line_items:[{code:'tuition',label:'Tuition',amount_minor:'1000000'},{code:'meals',label:'Meals',amount_minor:'250000'}]};
const learners=[{student_id:'one',student_name:'Amina Test',admission_number:'QA001',grade_level:'Grade 7',class_name:'East'},{student_id:'two',student_name:'Baraka Test',admission_number:'QA002',grade_level:'Grade 7',class_name:'West'},{student_id:'three',student_name:'Chao Test',admission_number:'QA003',grade_level:'Grade 8',class_name:'East'}];
export function useSchoolQuery(url){const [v,setV]=useState(0);const scenario=sessionStorage.getItem('scenario');let data=[];
if(url?.includes('billable-students'))data=learners;
else if(url==='/billing/fee-structures')data=[plan];
else if(url?.includes('roster-options'))data=[{grade_level:'Grade 7',class_name:'East',student_count:1},{grade_level:'Grade 7',class_name:'West',student_count:1},{grade_level:'Grade 8',class_name:'East',student_count:1}];
return {data:scenario==='empty'?[]:data,error:scenario==='error'?new Error('School records temporarily unavailable'):null,isLoading:false,isFetching:false,refetch:async()=>{setV(v+1);return {data,error:null};}};}
export function usePermissions(){return {hasPermission:()=>true};}
export function useOptionalSchoolTenantId(){return 'qa-only';}
export function useSchoolCommandIdentity(){return {schoolName:'Local QA School',userLabel:'QA Accountant'};}
export async function requestDashboardApi(url,options){window.__request={url,options};if(sessionStorage.getItem('scenario')==='mutation-error')throw new Error('Connection interrupted');return url.endsWith('generate-invoices')?{generated_count:options.body.target_students.length,skipped_count:0}:{...plan,...options.body};}
`);
fs.writeFileSync(path.join(out,"entry.tsx"), `
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {FeeStructuresWorkspace} from ${source(path.join(web,'src/components/school/accountant/fee-structures-workspace'))};
import {ReportsWorkspace} from ${source(path.join(web,'src/components/school/accountant/reports-workspace'))};
import {WaiversDiscountsWorkspace} from ${source(path.join(web,'src/components/school/accountant/waivers-discounts-workspace'))};
window.fetch=async(url)=>{window.__fetch=String(url);return {ok:true,json:async()=>String(url).includes('/waivers')?{data:[]}:{data:{filename:'reconciliation.csv',content_type:'text/csv',csv:'Learner,Amount\\nAmina Test,10.00',row_count:1}}};};
const current=location.pathname.split('/').pop();
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><main className="mx-auto max-w-7xl p-4 sm:p-6"><nav className="mb-5 flex flex-wrap gap-4 text-sm"><a href="/fees">Fee structures</a><a href="/reports">Reports</a><a href="/waivers">Waivers</a></nav>{current==='reports'?<ReportsWorkspace role="accountant" tenantSlug="qa-only"/>:current==='waivers'?<WaiversDiscountsWorkspace role="accountant" tenantSlug="qa-only"/>:<FeeStructuresWorkspace role="accountant" routeMode="public" onNavigate={section=>{window.__navigate=section;}}/>}</main></QueryClientProvider>);
`);
async function run(){
  const hookAliases=['@/lib/data/school-hooks','@/components/providers/permission-context','@/lib/data/school-tenant-scope','@/lib/dashboard/api-client','@/components/school/integrated-school-command-header'];
  await new Promise((resolve, reject) =>
    webpack(
      {
        mode: "development",
        entry: path.join(out, "entry.tsx"),
        devtool: false,
        output: { path: out, filename: "bundle.js" },
        resolve: {
          extensions: [".tsx", ".ts", ".js"],
          modules: [path.join(web, "node_modules"), "node_modules"],
          alias: {
            ...Object.fromEntries(
              hookAliases.map((key) => [key, path.join(out, "hooks.ts")]),
            ),
            "@": path.join(web, "src"),
          },
        },
        plugins: [
          new webpack.DefinePlugin({ "process.env": JSON.stringify({ NODE_ENV: "development" }) }),
          new webpack.NormalModuleReplacementPlugin(
            /(^|\/)school-pages$/,
            path.join(out, "routes.ts"),
          ),
        ],
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              exclude: /node_modules/,
              use: [path.join(out, "loader.cjs")],
            },
            { test: /\.css$/, use: [path.join(out, "css-loader.cjs")] },
          ],
        },
        optimization: { minimize: false },
      },
      (error, stats) =>
        error || stats.hasErrors()
          ? reject(
              error || new Error(stats.toString({ all: false, errors: true })),
            )
          : resolve(),
    ),
  );
  const globalFile = path.join(web, "src/app/globals.css");
  const cssResult = await postcss([tailwind({ base: web })]).process(
    fs.readFileSync(globalFile, "utf8"),
    { from: globalFile },
  );
  fs.writeFileSync(path.join(out,'style.css'),cssResult.css);
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync(path.join(out, "bundle.js")));
    } else if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(fs.readFileSync(path.join(out, "style.css")));
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="font-family:Arial,sans-serif;margin:0"><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${server.address().port}`;
  const results=[];
  try {
    for(const viewport of [{width:1440,height:1000},{width:1024,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
      const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
      async function capture(name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' page overflow');await page.screenshot({path:path.join(out,name+'-'+viewport.width+'.png'),fullPage:true});}
      await page.goto(base+'/fees');await page.getByRole('button',{name:'Create fee structure',exact:true}).waitFor();await capture('fees');
      await page.getByRole('button',{name:'Open invoices & statements'}).click();assert.equal(await page.evaluate(()=>window.__navigate),'invoices');
      await page.getByRole('button',{name:'Create fee structure',exact:true}).click();
      await page.getByLabel('Fee name',{exact:true}).fill('Term 3 boarding fees');
      await page.getByRole('checkbox',{name:/Grade 7/}).check();await page.getByRole('checkbox',{name:/Grade 8/}).check();
      await page.getByLabel('Charge 1',{exact:true}).fill('Tuition');await page.getByLabel('Amount (KES)',{exact:true}).fill('2500.50');
      await capture('create-fees');await page.getByRole('button',{name:'Save fee structure'}).click();
      await page.waitForFunction(()=>window.__request?.options.body.grade_levels.length===2);
      await page.getByRole('button',{name:'Choose learners to bill'}).click();
      await page.getByLabel('Selected classes / streams').check();
      await page.getByLabel('Grade 7 · East (1)',{exact:true}).check();await page.getByLabel('Grade 8 · East (1)',{exact:true}).check();await capture('choose-classes');
      await page.getByRole('button',{name:'Review 2 invoices'}).click();await capture('review-invoices');
      await page.getByRole('button',{name:'Issue 2 invoices'}).click();await page.getByText(/2 invoices issued/).waitFor();
      assert.equal(await page.evaluate(()=>window.__request.options.body.target_students.length),2);
      await page.goto(base+'/reports');await page.getByRole('heading',{name:'Finance reconciliation',exact:true}).waitFor();
      await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByLabel('To',{exact:true}).fill('2026-10-12');await page.getByLabel('Payment method').selectOption('cash');await capture('reports');
      await page.getByRole('button',{name:'Preview & print'}).nth(1).click();await page.getByRole('dialog',{name:'Finance reconciliation print preview'}).waitFor();await page.frameLocator('iframe[title="Finance reconciliation document preview"]').getByText('Amina Test',{exact:true}).waitFor();await capture('report-preview');await page.getByRole('button',{name:'Close',exact:true}).click();
      assert.ok((await page.evaluate(()=>window.__fetch)).includes('method=cash'));
      await page.goto(base+'/waivers');await page.getByRole('button',{name:'Request fee waiver'}).waitFor();await capture('waivers');
      await page.getByRole('button',{name:'Request fee waiver'}).click();await capture('request-waiver');await page.getByRole('button',{name:'Cancel',exact:true}).click();
      await page.goto(base+'/fees');await page.evaluate(()=>sessionStorage.setItem('scenario','error'));await page.reload();await page.getByRole('button',{name:'Retry fee structures'}).waitFor();await capture('fee-error');
      assert.deepEqual(errors,[]);results.push({width:viewport.width,status:'passed'});await page.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
