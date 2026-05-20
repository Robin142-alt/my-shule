import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/support/status"],
      disallow: [
        "/api/",
        "/dashboard/",
        "/internal/",
        "/school/",
        "/portal/",
        "/superadmin/",
        "/inventory/",
        "/library/",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/accountant/",
        "/teacher/",
        "/student/",
        "/parent/",
        "/support/login",
        "/tenant-selection",
        "/mfa",
        "/otp",
        "/magic-link",
        "/new-password",
        "/verify-email",
        "/device-verification",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
