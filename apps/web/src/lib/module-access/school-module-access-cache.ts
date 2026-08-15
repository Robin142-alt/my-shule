type SchoolModuleAccessCacheInput = {
  role: string;
  tenantSlug?: string | null;
  userId?: string | null;
  activeAuthorizationRoleCode?: string | null;
};

const SCHOOL_MODULE_ACCESS_CACHE_PREFIX = "myshule:school-module-access:v2";
const SCHOOL_MODULE_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function toModuleCodeSet(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { moduleCodes?: unknown }).moduleCodes)
      ? (value as { moduleCodes: unknown[] }).moduleCodes
      : null;

  if (!source) {
    return null;
  }

  return new Set(
    source
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function getSchoolModuleAccessCacheKey(input: SchoolModuleAccessCacheInput) {
  const dashboardRoleKey = input.role.trim();
  const tenantKey = input.tenantSlug?.trim();
  const userKey = input.userId?.trim();
  const authorizationRoleKey = input.activeAuthorizationRoleCode?.trim();

  if (!dashboardRoleKey || !tenantKey || !userKey || !authorizationRoleKey) {
    return null;
  }

  return `${SCHOOL_MODULE_ACCESS_CACHE_PREFIX}:${encodeURIComponent(tenantKey)}:${encodeURIComponent(userKey)}:${encodeURIComponent(authorizationRoleKey)}:${encodeURIComponent(dashboardRoleKey)}`;
}

export function readCachedSchoolModuleCodes(input: SchoolModuleAccessCacheInput) {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const cacheKey = getSchoolModuleAccessCacheKey(input);
  if (!cacheKey) {
    return null;
  }

  const raw = storage.getItem(cacheKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { cachedAt?: unknown };
    const cachedAt = typeof parsed?.cachedAt === "string" ? Date.parse(parsed.cachedAt) : Number.NaN;

    const age = Date.now() - cachedAt;
    if (!Number.isFinite(cachedAt) || age < 0 || age >= SCHOOL_MODULE_ACCESS_CACHE_TTL_MS) {
      storage.removeItem(cacheKey);
      return null;
    }

    const moduleCodes = toModuleCodeSet(parsed);
    if (!moduleCodes) {
      storage.removeItem(cacheKey);
      return null;
    }

    return moduleCodes;
  } catch {
    storage.removeItem(cacheKey);
    return null;
  }
}

export function writeCachedSchoolModuleCodes(
  input: SchoolModuleAccessCacheInput & { moduleCodes: Iterable<string> },
) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  const cacheKey = getSchoolModuleAccessCacheKey(input);
  if (!cacheKey) {
    return;
  }

  const moduleCodes = [...input.moduleCodes]
    .map((item) => item.trim())
    .filter(Boolean);

  storage.setItem(
    cacheKey,
    JSON.stringify({
      moduleCodes,
      cachedAt: new Date().toISOString(),
    }),
  );
}

export function clearCachedSchoolModuleCodes(input: SchoolModuleAccessCacheInput) {
  const storage = getSessionStorage();
  const cacheKey = getSchoolModuleAccessCacheKey(input);

  if (storage && cacheKey) {
    storage.removeItem(cacheKey);
  }
}
