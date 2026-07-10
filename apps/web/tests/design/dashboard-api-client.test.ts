/**
 * @jest-environment node
 */

import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

describe("dashboard API base URL resolution", () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalApiBaseDomain = process.env.NEXT_PUBLIC_API_BASE_DOMAIN;
  const originalApiBaseServerUrl = process.env.SERVER_API_BASE_URL;
  const originalApiBasePrivateUrl = process.env.API_BASE_URL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }

    if (originalApiBaseDomain === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_DOMAIN = originalApiBaseDomain;
    }

    if (originalApiBaseServerUrl === undefined) {
      delete process.env.SERVER_API_BASE_URL;
    } else {
      process.env.SERVER_API_BASE_URL = originalApiBaseServerUrl;
    }

    if (originalApiBasePrivateUrl === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = originalApiBasePrivateUrl;
    }

    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  });

  it("uses the configured base URL for local tenant-aware API calls", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api";
    process.env.NEXT_PUBLIC_API_BASE_DOMAIN = "localhost";

    expect(getDashboardApiBaseUrl("kb-high")).toBe("http://127.0.0.1:3000");
  });

  it("keeps production tenant subdomain routing for real base domains", () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_DOMAIN = "api.myshule.online";

    expect(getDashboardApiBaseUrl("kb-high")).toBe("https://kb-high.api.myshule.online");
  });

  it("uses the live Railway API when production env points at stale or local API origins", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://my-shule-erp-api.vercel.app";
    delete process.env.NEXT_PUBLIC_API_BASE_DOMAIN;
    delete process.env.SERVER_API_BASE_URL;
    delete process.env.API_BASE_URL;

    expect(getDashboardApiBaseUrl()).toBe("https://my-shule-api-production.up.railway.app");

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

    expect(getDashboardApiBaseUrl()).toBe("https://my-shule-api-production.up.railway.app");
  });

  it("allows explicit server API URLs to override public browser API configuration", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://my-shule-erp-api.vercel.app";
    process.env.SERVER_API_BASE_URL = "https://api.myshule.online";

    expect(getDashboardApiBaseUrl()).toBe("https://api.myshule.online");
  });
});
