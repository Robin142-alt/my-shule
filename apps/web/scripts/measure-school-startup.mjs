import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";

// Run after `npm run build`. Measure the production JS required to mount the
// school entry, before session verification loads the selected dashboard.
const root = fileURLToPath(new URL("../", import.meta.url));
const context = {};
runInNewContext(readFileSync(resolve(root, ".next/server/app/school/[role]/page_client-reference-manifest.js"), "utf8"), context);
const manifest = context.__RSC_MANIFEST["/school/[role]/page"];
const chunks = [...new Set(Object.values(manifest.clientModules).flatMap((entry) => entry.chunks))]
  .filter((chunk) => typeof chunk === "string" && chunk.endsWith(".js"));
const files = chunks.map((chunk) => resolve(root, ".next", chunk.replace(/^\/_next\//, "")));
const result = {
  chunks: files.length,
  bytes: files.reduce((sum, file) => sum + statSync(file).size, 0),
  gzipBytes: files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0),
};
console.log(JSON.stringify(result, null, 2));
const maxGzipKiB = Number(process.argv[2]);
if (maxGzipKiB > 0 && result.gzipBytes > maxGzipKiB * 1024) {
  console.error(`School startup exceeds the ${maxGzipKiB} KiB gzip budget.`);
  process.exitCode = 1;
}
