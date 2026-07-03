/**
 * @jest-environment node
 */

import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

describe("dashboard API base URL resolution", () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalApiBaseDomain = process.env.NEXT_PUBLIC_API_BASE_DOMAIN;

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
});
