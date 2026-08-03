import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F3F4F6",
    theme_color: "#071D49",
    categories: ["education", "business", "productivity"],
    icons: [
      {
        src: "/brand/myshule-mark-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/myshule-mark-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/myshule-mark-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
