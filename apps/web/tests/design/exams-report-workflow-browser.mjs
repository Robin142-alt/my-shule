// Exercise the actual Exams Manager views and PDF.js renderer with isolated school API fixtures.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const web = path.resolve("apps/web"),
  req = createRequire(path.join(web, "package.json"));
const out = path.resolve("output/exams-report-workflow");
fs.mkdirSync(out, { recursive: true });
const src = (value) => JSON.stringify(value.replaceAll("\\", "/"));
fs.writeFileSync(
  path.join(out, "loader.cjs"),
  "const ts=require(" +
    src(req.resolve("typescript")) +
    ");module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText};",
);
fs.writeFileSync(
  path.join(out, "hooks.tsx"),
  "import {useState,useEffect} from 'react';export function useSchoolQuery(path){const [data,setData]=useState(null);const refetch=async()=>setData(await (await fetch('/api'+path)).json());useEffect(()=>{void refetch();},[path]);return {data,isLoading:!data,error:null,refetch};}",
);
fs.writeFileSync(
  path.join(out, "entry.tsx"),
  "import {createRoot} from 'react-dom/client';import {ReportsWorkspace} from '@/components/school/exams-manager/reports-workspace';import {ModerationWorkspace} from '@/components/school/exams-manager/moderation-workspace';createRoot(document.querySelector('main')).render(location.pathname==='/validation'?<ModerationWorkspace/>:<ReportsWorkspace/>);",
);
const { webpack } = req("next/dist/compiled/webpack/webpack.js");
await new Promise((resolve, reject) =>
  webpack(
    {
      mode: "development",
      devtool: false,
      entry: path.join(out, "entry.tsx"),
      output: { path: out, filename: "bundle.js" },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".mjs"],
        modules: [path.join(web, "node_modules"), "node_modules"],
        alias: {
          "@/lib/data/school-hooks": path.join(out, "hooks.tsx"),
          "@": path.join(web, "src"),
        },
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: [path.join(out, "loader.cjs")],
          },
        ],
      },
      optimization: { minimize: false },
    },
    (error, stats) =>
      error || stats.hasErrors()
        ? reject(error || Error(stats.toString({ all: false, errors: true })))
        : resolve(),
  ),
);
const globalsPath = path.join(web, "src/app/globals.css"),
  globals = fs
    .readFileSync(globalsPath, "utf8")
    .replace(
      '@import "tailwindcss";',
      '@import "tailwindcss" source(none);\n@source ' +
        src(path.join(web, "src/components")) +
        ";",
    );
const css = (
  await req("postcss")([req("@tailwindcss/postcss")()]).process(globals, {
    from: globalsPath,
  })
).css;
const PDFDocument = req("pdfkit");
const pdf = await new Promise((resolve) => {
  const chunks = [];
  const doc = new PDFDocument({ size: "A4" });
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.text("Exam operations page one");
  doc.addPage().text("Exam operations page two");
  doc.end();
});
const saved = {
  id: "saved",
  title: "End-term audit",
  status: "Ready",
  type: "pdf",
  generated_at: "2026-11-01T12:05:00Z",
};
let reports = [saved],
  polls = 0,
  allowCompletion = false,
  submissions = 0;
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const json = (value) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(value));
  };
  if (url.pathname === "/api/auth/csrf")
    return json({ token: "fixture-token" });
  if (url.pathname.endsWith("/reports/generate")) {
    submissions++;
    polls = 0;
    return json({ job_id: "job", state: "queued" });
  }
  if (url.pathname.endsWith("/jobs/job")) {
    polls++;
    if (!allowCompletion)
      return json({
        job_id: "job",
        state: "running",
        progress: { stage: "rendering" },
      });
    reports = [{ ...saved, id: "new", title: "New operations report" }, saved];
    return json({
      job_id: "job",
      state: "completed",
      result: { snapshotId: "new" },
    });
  }
  if (url.pathname.endsWith("/moderation"))
    return json({
      metrics: {
        total_submissions: 1,
        pending_review: 1,
        ready_for_review: 1,
        requires_correction: 0,
      },
      total: 1,
      submissions: [
        {
          id: "mark",
          student_name: "Fixture learner",
          class_name: "Form 4",
          subject: "Maths",
          exam_name: "Term exam",
          original_mean: "74.50",
          max_score: 100,
          status: "submitted",
          submitted_at: saved.generated_at,
          validation_issues: [],
        },
      ],
    });
  if (url.pathname === "/api/admin-command/exams-manager/reports")
    return json({
      reportsList: reports,
      metrics: { reports_generated: reports.length },
      jobs: [],
    });
  if (url.pathname.endsWith("/file")) {
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      url.search ? "inline" : 'attachment; filename="end-term.pdf"',
    );
    return response.end(pdf);
  }
  const name = path.basename(url.pathname);
  if (/\.(js|mjs)$/.test(name) && fs.existsSync(path.join(out, name))) {
    response.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return response.end(fs.readFileSync(path.join(out, name)));
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
      css +
      '</style></head><body><main style="max-width:1400px;margin:auto;padding:12px"></main><script src="/bundle.js"></script></body></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { chromium } = req("@playwright/test");
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    reports = [saved];
    allowCompletion = false;
    submissions = 0;
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/validation",
    );
    await page.getByText("Fixture learner", { exact: true }).waitFor();
    assert.match(await page.getByText(/74\.5/).innerText(), /74\.5 \/ 100/);
    await page.goto("http://127.0.0.1:" + server.address().port + "/reports");
    await page
      .getByRole("button", { name: "Generate report", exact: true })
      .click();
    await page.getByText("Queued", { exact: true }).waitFor();
    await page.getByText(/Processing · Rendering/).waitFor({timeout:10000}).catch(async error => {
      throw new Error(JSON.stringify({polls, errors, screen:await page.locator('main').innerText(), cause:error.message}));
    });
    allowCompletion = true;
    await page
      .getByRole("button", { name: "New operations report", exact: true })
      .waitFor();
    assert.equal(submissions, 1);
    await page
      .getByRole("button", { name: "End-term audit", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByText("Exam operations page one", { exact: true })
      .waitFor();
    await dialog.getByRole("button", { name: "Zoom in" }).click();
    await dialog.getByText("125%").waitFor();
    await dialog.getByRole("button", { name: "Next page" }).click();
    await dialog
      .getByText("Exam operations page two", { exact: true })
      .waitFor();
    const downloaded = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download", exact: true }).click();
    assert.equal((await downloaded).suggestedFilename(), "end-term.pdf");
    await dialog.getByRole("button", { name: "Print", exact: true }).click();
    await page
      .locator('iframe[title="Report print document"]')
      .waitFor({ state: "attached" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      JSON.stringify({
        width,
        validation: true,
        queuedProcessingReady: true,
        multipagePreview: true,
        zoom: true,
        download: true,
        printDocument: true,
      }),
    );
  }
} finally {
  await browser.close();
  server.close();
}
