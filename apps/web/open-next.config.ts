import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Only public build-time pages use this store. Authenticated data is no-store.
// Introduce explicit cache/revalidation bindings before adding ISR to the app.
const config = defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: false,
});

// Measured Worker gzip: 3,164 KiB vs 4,007 KiB with Turbopack, same routes.
config.buildCommand = "npm run build -- --webpack";
export default config;
