import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveDashboardApiProxyTenant } from "@/lib/dashboard/proxy-tenant-context";

type ProxyExpectation = {
  route: string;
  upstream: string;
  methods: string[];
};

const productionModuleProxies: ProxyExpectation[] = [
  { route: "admin-command", upstream: "/admin-command", methods: ["GET", "POST"] },
  { route: "events", upstream: "/events", methods: ["GET", "POST"] },
  { route: "operational-workflows", upstream: "/operational-workflows", methods: ["GET", "POST"] },
  { route: "academics", upstream: "/academics", methods: ["GET", "POST"] },
  { route: "reports", upstream: "/reports", methods: ["GET", "POST"] },
  { route: "staff", upstream: "/hr", methods: ["GET", "POST", "PATCH"] },
  { route: "hr", upstream: "/hr", methods: ["GET", "POST", "PATCH"] },
  { route: "timetable", upstream: "/timetable", methods: ["GET", "POST"] },
];

function readProxyRoute(route: string) {
  const routePath = join(process.cwd(), "src", "app", "api", route, "[...path]", "route.ts");

  expect(existsSync(routePath)).toBe(true);

  return readFileSync(routePath, "utf8");
}

function readSource(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("production module live API proxies", () => {
  it.each(productionModuleProxies)(
    "exposes /api/$route through the guarded school API proxy",
    ({ route, upstream, methods }) => {
      const source = readProxyRoute(route);

      expect(source).toContain("proxySchoolApiRequest");
      expect(source).toContain(`"${upstream}"`);

      for (const method of methods) {
        expect(source).toContain(`function ${method}`);
      }
    },
  );

  it("keeps principal insight event streams as streaming responses through the proxy", () => {
    const proxySource = readFileSync(join(process.cwd(), "src", "lib", "dashboard", "server-api-proxy.ts"), "utf8");
    const principalCommandCenterSource = readFileSync(
      join(process.cwd(), "src", "components", "school", "principal-command-center.tsx"),
      "utf8",
    );

    expect(proxySource).toContain("text/event-stream");
    expect(proxySource).toContain("upstreamResponse.body");
    expect(principalCommandCenterSource).toContain("new EventSource");
    expect(principalCommandCenterSource).toContain("/api/admin-command/principal/dashboard/stream");
    expect(principalCommandCenterSource).toContain("principal.dashboard");
  });

  it("keeps platform owner API calls isolated from school tenant cookies", () => {
    expect(
      resolveDashboardApiProxyTenant({
        audience: "superadmin",
        requestedTenantSlug: "kisumu-boys",
        tenantCookie: "homabay-high",
        sessionTenantSlug: "maranda-high",
      }),
    ).toEqual({
      tenantSlug: null,
      tenantMismatch: false,
    });
  });

  it("still blocks school workspace tenant mismatch", () => {
    expect(
      resolveDashboardApiProxyTenant({
        audience: "school",
        requestedTenantSlug: "kisumu-boys",
        tenantCookie: "homabay-high",
        sessionTenantSlug: "homabay-high",
      }),
    ).toEqual({
      tenantSlug: "homabay-high",
      tenantMismatch: true,
    });
  });

  it("keeps server-side API proxies on the central upstream while passing tenant context in headers", () => {
    const serverProxySources = [
      readSource("src", "lib", "dashboard", "server-api-proxy.ts"),
      readSource("src", "lib", "auth", "school-api-proxy.ts"),
      readSource("src", "app", "api", "auth", "invitations", "accept", "route.ts"),
      readSource("src", "app", "api", "billing", "[...path]", "route.ts"),
      readSource("src", "app", "api", "payments", "[...path]", "route.ts"),
      readSource("src", "app", "api", "support", "[...path]", "route.ts"),
    ];

    for (const source of serverProxySources) {
      expect(source).not.toContain("getDashboardApiBaseUrl(tenantSlug");
      expect(source).not.toContain("getDashboardApiBaseUrl(expectedTenantId");
      expect(source).not.toContain("getDashboardApiBaseUrl(resolvedTenantSlug");
    }

    expect(serverProxySources.join("\n")).toContain("\"x-tenant-id\"");
  });
});
