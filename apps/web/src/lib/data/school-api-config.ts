export function buildBillingApiPath(path: string, tenantSlug?: string | null) {
  if (!tenantSlug) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenant_slug=${encodeURIComponent(tenantSlug)}`;
}

export function buildPaymentsApiPath(path: string, tenantSlug?: string | null) {
  if (!tenantSlug) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenant_slug=${encodeURIComponent(tenantSlug)}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function unwrapApiData<T>(
  payload: T | { data?: T; message?: string } | { message?: string } | null | undefined,
): T | null {
  if (isRecord(payload) && "data" in payload) {
    return payload.data === undefined ? null : payload.data as T;
  }

  return payload === undefined ? null : payload as T;
}
