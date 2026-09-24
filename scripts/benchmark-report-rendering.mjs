// Synthetic, local-only renderer capacity probe. No credentials, school data or network providers.
// Run after npm run build. The HTTP probe is deliberately a separate process from PDF workers.
import { fork } from 'node:child_process';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mode = process.argv[2];
if (mode === 'worker') {
  const {
    createBulkReportCardPdfFile,
  } = require('../dist/apps/api/src/modules/exams/services/report-card-pdf-artifact.js');
  const {
    ReportCardTemplateService,
  } = require('../dist/apps/api/src/modules/exams/services/report-card-template.service.js');
  const count = Number(process.argv[3] ?? 1000);
  let peak = process.memoryUsage().rss;
  const monitor = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 20);
  const payload = new ReportCardTemplateService().buildPayload(
    {
      school: { name: 'Synthetic load test school' },
      student: { full_name: 'Synthetic learner' },
      subjects: Array.from({ length: 9 }, (_, index) => ({
        subject_id: `s${index}`,
        subject_name: `Subject ${index + 1}`,
        score: 80,
        max_score: 100,
      })),
    },
    '2026-09-23T12:00:00Z',
  );
  async function* entries() {
    for (let i = 0; i < count; i++)
      yield { payload, verificationCode: `TEST${i}` };
  }
  const start = performance.now();
  const pdf = await createBulkReportCardPdfFile(entries());
  const size = (await stat(pdf.path)).size;
  await pdf.cleanup();
  clearInterval(monitor);
  process.send?.({
    cards: count,
    elapsed_ms: Math.round(performance.now() - start),
    bytes: size,
    peak_rss_mb: Math.round(peak / 1024 / 1024),
  });
} else {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end('{"status":"ok"}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const timings = [];
  let finished = false;
  const probe = (async () => {
    while (!finished) {
      const start = performance.now();
      await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.text());
      timings.push(performance.now() - start);
      await new Promise((r) => setTimeout(r, 20));
    }
  })();
  const workers = await Promise.all(
    Array.from(
      { length: 2 },
      () =>
        new Promise((resolve, reject) => {
          const child = fork(
            new URL(import.meta.url),
            ['worker', process.env.REPORT_BENCHMARK_CARDS ?? '1000'],
            {
              windowsHide: true,
              stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
            },
          );
          let result;
          child.on('message', (value) => {
            result = value;
          });
          child.on('error', reject);
          child.on('exit', (code) =>
            code === 0
              ? resolve(result)
              : reject(new Error(`Renderer exited ${code}`)),
          );
        }),
    ),
  );
  finished = true;
  await probe;
  await new Promise((resolve) => server.close(resolve));
  timings.sort((a, b) => a - b);
  const result = {
    scope:
      'Two compiled PDF workers and a separate local synthetic HTTP probe; excludes Nest API, database and R2 latency',
    workers,
    http_samples: timings.length,
    http_p95_ms: Number(timings[Math.floor(timings.length * 0.95)].toFixed(2)),
    http_max_ms: Number(timings.at(-1).toFixed(2)),
  };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.REPORT_BENCHMARK_OUTPUT)
    await writeFile(
      process.env.REPORT_BENCHMARK_OUTPUT,
      JSON.stringify(result, null, 2),
    );
}
