import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after next build. These are uncompressed filesystem/trace sizes, not
// Vercel's compressed, region-specific, retained-deployment billing metric.
const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps/web'));
const output = path.join(root, '.next');
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : entry.isFile() ? [file] : [];
  });
}
const files = filesIn(output);
const size = (file) => fs.statSync(file).size;
const sum = (list) => list.reduce((total, file) => total + size(file), 0);
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const traceFiles = files.filter((file) => file.endsWith('.nft.json'));
const traced = new Set();
const missing = new Set();
const traces = traceFiles.map((file) => {
  const dependencies = JSON.parse(fs.readFileSync(file, 'utf8')).files.map((dependency) => path.resolve(path.dirname(file), dependency));
  for (const dependency of dependencies) {
    if (fs.existsSync(dependency)) traced.add(dependency);
    else missing.add(relative(dependency));
  }
  return { trace: relative(file), files: dependencies.length, bytes: sum(dependencies.filter(fs.existsSync)) };
});
const packages = {};
for (const file of traced) {
  const match = relative(file).match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  const name = match?.[1] ?? '(application output)';
  packages[name] = (packages[name] ?? 0) + size(file);
}
const routes = JSON.parse(fs.readFileSync(path.join(output, 'server/app-paths-manifest.json'), 'utf8'));
const prerender = JSON.parse(fs.readFileSync(path.join(output, 'prerender-manifest.json'), 'utf8'));
console.log(JSON.stringify({
  schemaVersion: 1,
  node: process.version,
  next: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/next/package.json'), 'utf8')).version,
  bytes: {
    total: sum(files),
    server: sum(files.filter((file) => relative(file).startsWith('.next/server/'))),
    static: sum(files.filter((file) => relative(file).startsWith('.next/static/'))),
    cache: sum(files.filter((file) => relative(file).startsWith('.next/cache/'))),
    tracedUnique: sum([...traced]),
  },
  traceCount: traces.length,
  largestTraces: traces.sort((a, b) => b.bytes - a.bytes).slice(0, 10),
  tracedPackages: Object.fromEntries(Object.entries(packages).sort((a, b) => b[1] - a[1])),
  largestTracedFiles: [...traced].map((file) => ({ file: relative(file), bytes: size(file) })).sort((a, b) => b.bytes - a.bytes).slice(0, 15),
  missingTracedFiles: [...missing],
  routes: Object.keys(routes).sort(),
  prerenderedRoutes: Object.keys(prerender.routes).sort(),
}, null, 2));
