import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  clearCachedSchoolModuleCodes,
  getSchoolModuleAccessCacheKey,
  readCachedSchoolModuleCodes,
  writeCachedSchoolModuleCodes,
} from "@/lib/module-access/school-module-access-cache";

const cacheIdentity = {
  role: "deputy-principal",
  tenantSlug: "school-a",
  userId: "user-1",
  activeAuthorizationRoleCode: "DEPUTY_PRINCIPAL",
};

describe("school module access cache", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("requires and isolates tenant, user, active authorization role, and dashboard role", () => {
    const baseKey = getSchoolModuleAccessCacheKey(cacheIdentity);

    expect(baseKey).toBeTruthy();
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, tenantSlug: "" })).toBeNull();
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, userId: "" })).toBeNull();
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, activeAuthorizationRoleCode: "" })).toBeNull();
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, role: "" })).toBeNull();
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, tenantSlug: "school-b" })).not.toBe(baseKey);
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, userId: "user-2" })).not.toBe(baseKey);
    expect(getSchoolModuleAccessCacheKey({
      ...cacheIdentity,
      activeAuthorizationRoleCode: "TEACHER",
    })).not.toBe(baseKey);
    expect(getSchoolModuleAccessCacheKey({ ...cacheIdentity, role: "principal" })).not.toBe(baseKey);
  });

  it("only returns codes for the exact verified authorization identity", () => {
    writeCachedSchoolModuleCodes({ ...cacheIdentity, moduleCodes: ["academics", " timetable "] });

    expect(readCachedSchoolModuleCodes(cacheIdentity)).toEqual(new Set(["academics", "timetable"]));
    expect(readCachedSchoolModuleCodes({ ...cacheIdentity, tenantSlug: "school-b" })).toBeNull();
    expect(readCachedSchoolModuleCodes({ ...cacheIdentity, userId: "user-2" })).toBeNull();
    expect(readCachedSchoolModuleCodes({
      ...cacheIdentity,
      activeAuthorizationRoleCode: "TEACHER",
    })).toBeNull();
  });

  it("expires entries at the TTL boundary and rejects future or malformed cache records", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-15T03:00:00.000Z"));
    writeCachedSchoolModuleCodes({ ...cacheIdentity, moduleCodes: ["academics"] });
    const cacheKey = getSchoolModuleAccessCacheKey(cacheIdentity);
    expect(cacheKey).toBeTruthy();

    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(readCachedSchoolModuleCodes(cacheIdentity)).toBeNull();
    expect(window.sessionStorage.getItem(cacheKey!)).toBeNull();

    window.sessionStorage.setItem(cacheKey!, JSON.stringify({
      moduleCodes: ["academics"],
      cachedAt: "2026-08-15T03:10:00.000Z",
    }));
    expect(readCachedSchoolModuleCodes(cacheIdentity)).toBeNull();
    expect(window.sessionStorage.getItem(cacheKey!)).toBeNull();

    window.sessionStorage.setItem(cacheKey!, JSON.stringify({
      moduleCodes: "academics",
      cachedAt: new Date().toISOString(),
    }));
    expect(readCachedSchoolModuleCodes(cacheIdentity)).toBeNull();
    expect(window.sessionStorage.getItem(cacheKey!)).toBeNull();
  });

  it("clears the exact authorization cache and integrates that eviction on 401 and 403", () => {
    writeCachedSchoolModuleCodes({ ...cacheIdentity, moduleCodes: ["academics"] });
    clearCachedSchoolModuleCodes(cacheIdentity);
    expect(readCachedSchoolModuleCodes(cacheIdentity)).toBeNull();

    const schoolPagesSource = readFileSync(
      join(process.cwd(), "src/components/school/school-pages.tsx"),
      "utf8",
    );
    expect(schoolPagesSource).toMatch(
      /response\.status === 401 \|\| response\.status === 403\)[\s\S]{0,160}clearCachedSchoolModuleCodes\(cacheIdentity\)/,
    );
  });
});
