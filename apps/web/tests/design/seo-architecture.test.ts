import { readFileSync } from "node:fs";
import { join } from "node:path";

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  getPublicSeoRoute,
  primarySitelinkRoutes,
  publicSeoRoutes,
} from "@/lib/seo/public-routes";
import {
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildSiteNavigationJsonLd,
} from "@/lib/seo/structured-data";
import {
  getSubdomainTenant,
  isReservedSchoolRouteSlug,
  normalizeTenantSlug,
} from "@/lib/seo/tenant-routes";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(relativePath: string) {
  const image = readFileSync(join(process.cwd(), relativePath));

  if (!image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`${relativePath} is not a valid PNG file.`);
  }

  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    bitDepth: image.readUInt8(24),
    colorType: image.readUInt8(25),
  };
}

function readIcoFrames(relativePath: string) {
  const image = readFileSync(join(process.cwd(), relativePath));
  const reserved = image.readUInt16LE(0);
  const type = image.readUInt16LE(2);
  const frameCount = image.readUInt16LE(4);

  if (reserved !== 0 || type !== 1) {
    throw new Error(`${relativePath} is not a valid ICO file.`);
  }

  return Array.from({ length: frameCount }, (_, index) => {
    const directoryOffset = 6 + index * 16;
    const encodedWidth = image.readUInt8(directoryOffset);
    const encodedHeight = image.readUInt8(directoryOffset + 1);
    const bytes = image.readUInt32LE(directoryOffset + 8);
    const imageOffset = image.readUInt32LE(directoryOffset + 12);
    const isPng = image
      .subarray(imageOffset, imageOffset + PNG_SIGNATURE.length)
      .equals(PNG_SIGNATURE);

    return {
      width: encodedWidth === 0 ? 256 : encodedWidth,
      height: encodedHeight === 0 ? 256 : encodedHeight,
      bitsPerPixel: image.readUInt16LE(directoryOffset + 6),
      payloadWithinFile: imageOffset + bytes <= image.length,
      rgbaPngPayload: isPng && image.readUInt8(imageOffset + 25) === 6,
    };
  });
}

describe("implementation 70 SEO architecture", () => {
  test("registers the core public routes Google should understand", () => {
    expect(publicSeoRoutes.map((route) => route.path)).toEqual([
      "/",
      "/parent-portal",
      "/school-portal",
      "/dashboard",
      "/login",
    ]);
  });

  test("marks Parent Portal, School Portal, and Dashboard as primary sitelink targets", () => {
    expect(primarySitelinkRoutes.map((route) => route.label)).toEqual([
      "Parent Portal",
      "School Portal",
      "Dashboard",
    ]);
  });

  test("uses unique titles and descriptions for the priority public pages", () => {
    const titles = publicSeoRoutes.map((route) => route.title);
    const descriptions = publicSeoRoutes.map((route) => route.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(getPublicSeoRoute("/parent-portal")?.title).toBe("Parent Portal - MyShule");
    expect(getPublicSeoRoute("/school-portal")?.title).toBe("School Portal - MyShule");
    expect(getPublicSeoRoute("/dashboard")?.title).toBe("Dashboard - MyShule");
  });

  test("generates site navigation schema for the sitelink routes", () => {
    const schema = buildSiteNavigationJsonLd();

    expect(schema).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ItemList",
    });
    expect(schema.itemListElement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Parent Portal", url: "https://myshule.online/parent-portal" }),
        expect.objectContaining({ name: "School Portal", url: "https://myshule.online/school-portal" }),
        expect.objectContaining({ name: "Dashboard", url: "https://myshule.online/dashboard" }),
      ]),
    );
  });

  test("builds breadcrumb schema for public pages", () => {
    expect(buildBreadcrumbJsonLd("/school-portal")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        expect.objectContaining({ name: "MyShule", item: "https://myshule.online/" }),
        expect.objectContaining({ name: "School Portal", item: "https://myshule.online/school-portal" }),
      ],
    });
  });

  test("includes core pages in the sitemap", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        "https://myshule.online/",
        "https://myshule.online/parent-portal",
        "https://myshule.online/school-portal",
        "https://myshule.online/dashboard",
        "https://myshule.online/login",
      ]),
    );
  });

  test("allows the core public pages in robots", () => {
    const rules = robots().rules;
    const allow = Array.isArray(rules) ? rules.flatMap((rule) => rule.allow ?? []) : rules.allow ?? [];

    expect(allow).toEqual(
      expect.arrayContaining([
        "/",
        "/parent-portal",
        "/school-portal",
        "/dashboard",
        "/login",
      ]),
    );
  });

  test("distinguishes reserved school role slugs from tenant slugs", () => {
    expect(isReservedSchoolRouteSlug("principal")).toBe(true);
    expect(isReservedSchoolRouteSlug("bursar")).toBe(true);
    expect(isReservedSchoolRouteSlug("owner")).toBe(true);
    expect(isReservedSchoolRouteSlug("dean")).toBe(true);
    expect(isReservedSchoolRouteSlug("academic-dean")).toBe(true);
    expect(isReservedSchoolRouteSlug("admissions-officer")).toBe(true);
    expect(isReservedSchoolRouteSlug("procurement-manager")).toBe(true);
    expect(isReservedSchoolRouteSlug("green-valley-academy")).toBe(false);
    expect(normalizeTenantSlug(" Green Valley Academy ")).toBe("green-valley-academy");
  });

  test("publishes the absolute MyShule logo as Organization structured data", () => {
    expect(buildOrganizationJsonLd()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "MyShule",
      alternateName: "My Shule",
      url: "https://myshule.online",
      logo: {
        "@type": "ImageObject",
        url: "https://myshule.online/brand/myshule-mark-512.png",
        contentUrl: "https://myshule.online/brand/myshule-mark-512.png",
        width: 512,
        height: 512,
        caption: "MyShule logo",
      },
    });
  });

  test("registers installable any-purpose and maskable manifest icons", () => {
    expect(manifest().icons).toEqual([
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
    ]);
  });

  test("keeps every browser and installable PNG at its declared dimensions", () => {
    expect(readPngDimensions("src/app/icon.png")).toEqual({ width: 512, height: 512, bitDepth: 8, colorType: 6 });
    expect(readPngDimensions("src/app/apple-icon.png")).toEqual({ width: 180, height: 180, bitDepth: 8, colorType: 6 });
    expect(readPngDimensions("public/brand/myshule-mark-192.png")).toEqual({ width: 192, height: 192, bitDepth: 8, colorType: 6 });
    expect(readPngDimensions("public/brand/myshule-mark-512.png")).toEqual({ width: 512, height: 512, bitDepth: 8, colorType: 6 });
    expect(readPngDimensions("public/brand/myshule-mark-maskable-512.png")).toEqual({ width: 512, height: 512, bitDepth: 8, colorType: 6 });
    expect(readPngDimensions("public/brand/myshule-apple-touch-icon.png")).toEqual({ width: 180, height: 180, bitDepth: 8, colorType: 6 });
  });

  test("keeps a square multi-resolution favicon with intact frame payloads", () => {
    expect(readIcoFrames("src/app/favicon.ico")).toEqual([
      { width: 16, height: 16, bitsPerPixel: 32, payloadWithinFile: true, rgbaPngPayload: true },
      { width: 32, height: 32, bitsPerPixel: 32, payloadWithinFile: true, rgbaPngPayload: true },
      { width: 48, height: 48, bitsPerPixel: 32, payloadWithinFile: true, rgbaPngPayload: true },
      { width: 256, height: 256, bitsPerPixel: 32, payloadWithinFile: true, rgbaPngPayload: true },
    ]);
  });

  test("extracts tenant subdomains without treating apex or www as tenants", () => {
    expect(getSubdomainTenant("greenvalley.myshule.online")).toBe("greenvalley");
    expect(getSubdomainTenant("www.myshule.online")).toBeNull();
    expect(getSubdomainTenant("myshule.online")).toBeNull();
  });
});
