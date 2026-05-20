import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/parent/login", "/school/login", "/portal/login", "/login"],
      disallow: [
        "/api/",
        "/dashboard/",
        "/internal/",
        "/school/",
        "/portal/",
        "/superadmin/",
        "/inventory/",
        "/library/",
        "/forgot-password",
        "/reset-password",
        "/accountant/",
        "/teacher/",
        "/student/",
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
