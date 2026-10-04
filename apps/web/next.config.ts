import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // OpenNext supplies its standalone package root for the webpack build.
    // Other builds need the repository root for shared browser-safe contracts.
    root: process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT || path.resolve(__dirname, "../.."),
  },
  async headers() {
    return [
      {
        source: "/service-worker.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; script-src 'self'; connect-src 'self'",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
