type SchoolModuleAccessCacheInput = {
  role: string;
  tenantSlug?: string | null;
};

const SCHOOL_MODULE_ACCESS_CACHE_PREFIX = "myshule:school-module-access:v1";

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
  const tenantKey = input.tenantSlug?.trim() || "default";

  return `${SCHOOL_MODULE_ACCESS_CACHE_PREFIX}:${input.role}:${tenantKey}`;
}

export function readCachedSchoolModuleCodes(input: SchoolModuleAccessCacheInput) {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const raw = storage.getItem(getSchoolModuleAccessCacheKey(input));

  if (!raw) {
    return null;
  }

  try {
    return toModuleCodeSet(JSON.parse(raw));
  } catch {
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

  const moduleCodes = [...input.moduleCodes]
    .map((item) => item.trim())
    .filter(Boolean);

  storage.setItem(
    getSchoolModuleAccessCacheKey(input),
    JSON.stringify({
      moduleCodes,
      cachedAt: new Date().toISOString(),
    }),
  );
}
