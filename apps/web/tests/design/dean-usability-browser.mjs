/* Local component QA: real Dean UI and styles, isolated API/auth fixtures. Never connects to a school. */
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
const out = path.join(repo, "output/dean-usability");
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
fs.writeFileSync(
  path.join(out, "hooks.ts"),
  `
import {useState} from 'react';
const coverage=[{id:'math',subject:'Mathematics',class_name:'Grade 8 · East',planned_topics:20,covered_topics:12,coverage:'60'}, {id:'eng',subject:'English',class_name:'Grade 9 · West',planned_topics:20,covered_topics:17,coverage:'85'}, {id:'bio',subject:'Biology',class_name:'Form 2 · North',planned_topics:10,covered_topics:3,coverage:'30'}];
let rows=[{id:'a1',title:'End Term 3',subject:'Mathematics',class_name:'Grade 8 · East',date:'2026-09-12',total_marks:100,submissions:32,status:'submitted',mark_ids:['m1']}, {id:'a2',title:'End Term 3',subject:'English',class_name:'Grade 9 · West',date:'2026-09-13',total_marks:100,submissions:30,status:'submitted',mark_ids:['m2']}, {id:'a3',title:'End Term 3',subject:'Biology',class_name:'Form 2 · North',date:'2026-09-11',total_marks:100,submissions:28,status:'reviewed',mark_ids:['m3']}];
const state={isLoading:false,isFetching:false,error:null,mutationError:null,refetch:()=>{},pendingIds:new Set()};
export function useSchoolQuery(url){const [version,setVersion]=useState(0);const refetch=()=>setVersion(version+1);const scenario=sessionStorage.getItem('scenario');let data=[];
  if(url==='/school/identity')data={schoolName:'Mwangaza School · QA'};
  else if(url?.endsWith('/overview'))data={metrics:{totalSubjects:12,totalTeachers:24}};
  else if(url?.includes('/assessments'))data={assessmentsList:scenario==='empty'?[]:rows,metrics:{}};
  else if(url?.includes('/curriculum-coverage'))data=coverage;
  else if(url?.includes('/teacher-workload'))data=[{id:'s1',teacher_name:'A. Kamau',classes:3,subjects:2,lessons_per_week:24},{id:'s2',teacher_name:'J. Otieno',classes:0,subjects:0,lessons_per_week:0}];
  else if(url?.includes('/workflow'))data={metrics:{marks_awaiting_moderation:62,marks_awaiting_lock:28,report_cards_awaiting_dean:0,report_cards_awaiting_principal:0,active_series:1},series:[{id:'e1',name:'End Term 3',term_name:'Term 3',academic_year_name:'2026',stage:'dean_review',next_owner:'Dean of Academics',blockers:['62 submitted marks await Dean review.'],counts:{subjects:8,classes:3,learners:90,marks:90,submitted_marks:62,reviewed_marks:28,locked_marks:0,published_marks:0,report_cards:0,review_report_cards:0,approved_report_cards:0,published_report_cards:0}}]};
  return {...state,data,isLoading:scenario==='loading'&&url!=='/school/identity',error:scenario==='error'&&url?.includes('/assessments')?new Error('Test connection unavailable'):null,refetch};
}
export function useSchoolMutation(){return {isPending:false,mutateAsync:async()=>({success:true})};}
export function useDashboardTasks(){return {...state,tasks:[],completeTask:async()=>{}};}
export function useApprovals(){return {...state,approvals:[],approve:async()=>{},reject:async()=>{}};}
export function useNotifications(){return {...state,notifications:[],unreadCount:0,markAsRead:async()=>{}};}
export function useOptionalSchoolDashboardRole(){return {liveDataEnabled:true,userLabel:'QA Dean',availableRoles:[{authorizationRoleCode:'dean-academics',roleName:'Dean of Academics',isPrimary:true},{authorizationRoleCode:'teacher',roleName:'Teacher',isTeacherMode:true}],activeAuthorizationRoleCode:'dean-academics',switchDashboardRole:async()=>{}};}
export async function requestDashboardApi(url,options){window.__request={url,options};if(sessionStorage.getItem('scenario')==='mutation-error')throw new Error('Test action unavailable');if(options?.body?.action==='approve')rows=rows.map(r=>options.body.mark_ids.includes(r.mark_ids[0])?{...r,status:'reviewed'}:r);if(url.endsWith('/lock-batch'))rows=rows.filter(r=>!options.body.markIds.includes(r.mark_ids[0]));return {success:true,updated_count:1,locked_count:1};}
`,
);
fs.writeFileSync(
  path.join(out, "entry.tsx"),
  `
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {DeanAcademicsCommandCenter} from ${source(path.join(web, "src/components/school/dean-academics-command-center"))};
import {SchoolCommandIdentityProvider} from ${source(path.join(web, "src/components/school/integrated-school-command-header"))};
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><SchoolCommandIdentityProvider tenantSlug="qa-only" userLabel="QA Dean"><DeanAcademicsCommandCenter activeSection={location.pathname.split('/').pop()}/></SchoolCommandIdentityProvider></QueryClientProvider>);
`,
);

async function run() {
  const hookAliases = [
    "@/lib/data/school-hooks",
    "@/hooks/useDashboardTasks",
    "@/hooks/useApprovals",
    "@/hooks/useNotifications",
    "@/lib/auth/school-dashboard-role-context",
    "@/lib/dashboard/api-client",
  ];
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
  const moduleCss = fs
    .readFileSync(
      path.join(
        web,
        "src/components/school/dean-academics/dean-workspace.module.css",
      ),
      "utf8",
    )
    .replaceAll(".workspace", ".dean-workspace")
    .replaceAll(".table", ".dean-table")
    .replace(/:global\(([^)]+)\)/g, "$1");
  fs.writeFileSync(
    path.join(out, "style.css"),
    cssResult.css + "\n" + moduleCss,
  );
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
  const results = [];
  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", (error) => { errors.push(error.message); console.error(error.message); });
      await page.goto(base + "/school/dean-academics/overview");
      await page
        .getByRole("heading", { name: "Academic overview", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "Overview overflows",
      );
      await page.screenshot({
        path: path.join(out, `overview-${viewport.width}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: /62 Review submitted marks/ })
        .click();
      await page
        .getByRole("heading", { name: "Teacher submissions", exact: true })
        .waitFor();
      if (viewport.width >= 1024) {
        const bounds = await page
          .getByText("Mathematics", { exact: true })
          .boundingBox();
        assert.ok(
          bounds.y < viewport.height - 100,
          "Review work is below the fold",
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "Assessment queue overflows",
      );
      await page.screenshot({
        path: path.join(out, `assessments-${viewport.width}.png`),
        fullPage: true,
      });
      await page
        .getByLabel("Search submissions", { exact: true })
        .fill("Biology");
      assert.equal(
        await page.getByText("Mathematics", { exact: true }).count(),
        0,
      );
      await page
        .getByRole("button", { name: "Lock reviewed batch", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page
          .getByRole("dialog")
          .getByText("1 reviewed marks", { exact: true })
          .count(),
        1,
      );
      await page
        .getByRole("button", { name: "Confirm lock", exact: true })
        .click();
      await page.waitForFunction(() =>
        window.__request?.url.endsWith("/lock-batch"),
      );
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page
        .getByLabel("Search submissions", { exact: true })
        .fill("Mathematics");
      await page.getByRole("button", { name: "Return", exact: true }).click();
      assert.equal(
        await page
          .getByRole("button", { name: "Confirm return", exact: true })
          .isDisabled(),
        true,
      );
      await page
        .getByLabel("Required correction reason")
        .fill("Check the missing scores");
      await page
        .getByRole("button", { name: "Confirm return", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          window.__request?.options?.body?.action === "return_for_correction",
      );
      await page
        .getByRole("button", { name: "Exam progress", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Exam cycle progress", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "Progress overflows",
      );
      await page.screenshot({
        path: path.join(out, `progress-${viewport.width}.png`),
        fullPage: true,
      });
      await page.goBack();
      await page
        .getByRole("heading", { name: "Academic overview", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "View all coverage", exact: true })
        .click();
      await page.getByRole("progressbar").first().waitFor();
      await page.screenshot({
        path: path.join(out, `coverage-${viewport.width}.png`),
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "Coverage overflows",
      );
      for (const scenario of ["empty", "error", "loading", "mutation-error"]) {
        await page.evaluate(
          (value) => sessionStorage.setItem("scenario", value),
          scenario,
        );
        await page.goto(base + "/school/dean-academics/assessments");
        if (scenario === "empty")
          await page.getByText(/No assessment records found yet/).waitFor();
        if (scenario === "error")
          await page
            .getByRole("alert")
            .filter({ hasText: "Test connection unavailable" })
            .waitFor();
        if (scenario === "loading")
          await page
            .getByText("Loading submissions…", { exact: true })
            .waitFor();
        if (scenario === "mutation-error") {
          await page
            .getByRole("button", { name: "Moderate & approve", exact: true })
            .first()
            .click();
          await page
            .getByRole("alert")
            .filter({ hasText: "Test action unavailable" })
            .waitFor();
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${scenario} overflows`,
        );
      }
      assert.deepEqual(errors, []);
      results.push({ viewport, passed: true });
      await page.close();
    }
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
