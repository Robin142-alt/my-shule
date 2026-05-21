import type { Metadata } from "next";

import {
  absoluteUrl,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  type PublicSeoRoute,
} from "@/lib/seo/public-routes";

export function createPublicMetadata(route: PublicSeoRoute): Metadata {
  const canonical = absoluteUrl(route.path);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      absolute: route.title,
    },
    description: route.description,
    keywords: SEO_KEYWORDS,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "en_KE",
      url: canonical,
      siteName: SITE_NAME,
      title: route.title,
      description: route.description,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "MyShule Parent Portal, School Portal, and Dashboard overview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: route.title,
      description: route.description,
      images: [absoluteUrl("/opengraph-image")],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function createTenantMetadata({
  schoolName,
  slug,
}: {
  schoolName: string;
  slug: string;
}): Metadata {
  const canonical = absoluteUrl(`/school/${slug}`);
  const title = `${schoolName} School Portal - MyShule`;
  const description = `Access verified school communication, parent visibility, and operational records for ${schoolName} through MyShule.`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "en_KE",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
