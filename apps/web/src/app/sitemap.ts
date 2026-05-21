import type { MetadataRoute } from "next";

import { absoluteUrl, publicSeoRoutes, SITE_URL } from "@/lib/seo/public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    ...publicSeoRoutes.map((route) => ({
      url: route.path === "/" ? `${SITE_URL}/` : absoluteUrl(route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    {
      url: absoluteUrl("/parent/login"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/school/login"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
