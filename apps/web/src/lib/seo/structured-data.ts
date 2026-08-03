import {
  absoluteUrl,
  primarySitelinkRoutes,
  publicSeoRoutes,
  SITE_CONTACT_PHONE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  type PublicSeoRoute,
} from "@/lib/seo/public-routes";

export type JsonLd = Record<string, unknown>;

export function buildOrganizationJsonLd(): JsonLd {
  const logoUrl = absoluteUrl("/brand/myshule-mark-512.png");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "My Shule",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
      contentUrl: logoUrl,
      width: 512,
      height: 512,
      caption: `${SITE_NAME} logo`,
    },
    telephone: SITE_CONTACT_PHONE,
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
  };
}

export function buildWebSiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-KE",
  };
}

export function buildSiteNavigationJsonLd(): JsonLd & {
  itemListElement: Array<JsonLd & { name: string; url: string }>;
} {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "MyShule primary navigation",
    itemListElement: primarySitelinkRoutes.map((route, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: route.label,
      url: absoluteUrl(route.path),
    })),
  };
}

export function buildSoftwareApplicationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
  };
}

export function buildWebPageJsonLd(route: PublicSeoRoute): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: route.title,
    description: route.description,
    url: absoluteUrl(route.path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function buildBreadcrumbJsonLd(path: PublicSeoRoute["path"]): JsonLd {
  const route = publicSeoRoutes.find((item) => item.path === path) ?? publicSeoRoutes[0]!;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "MyShule",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: route.label,
        item: absoluteUrl(route.path),
      },
    ],
  };
}

export function buildHomeJsonLd() {
  return [
    buildOrganizationJsonLd(),
    buildWebSiteJsonLd(),
    buildSiteNavigationJsonLd(),
    buildSoftwareApplicationJsonLd(),
    buildWebPageJsonLd(publicSeoRoutes[0]!),
  ];
}

export function buildPublicPageJsonLd(route: PublicSeoRoute) {
  return [buildWebPageJsonLd(route), buildBreadcrumbJsonLd(route.path)];
}
