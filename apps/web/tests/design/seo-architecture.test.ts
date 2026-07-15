import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  getPublicSeoRoute,
  primarySitelinkRoutes,
  publicSeoRoutes,
} from "@/lib/seo/public-routes";
import {
  buildBreadcrumbJsonLd,
  buildSiteNavigationJsonLd,
} from "@/lib/seo/structured-data";
import {
  getSubdomainTenant,
  isReservedSchoolRouteSlug,
  normalizeTenantSlug,
} from "@/lib/seo/tenant-routes";

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

  test("extracts tenant subdomains without treating apex or www as tenants", () => {
    expect(getSubdomainTenant("greenvalley.myshule.online")).toBe("greenvalley");
    expect(getSubdomainTenant("www.myshule.online")).toBeNull();
    expect(getSubdomainTenant("myshule.online")).toBeNull();
  });
});
