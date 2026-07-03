function parsePositiveAmount(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function formatKesAmount(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function formatMinorKes(amountMinor: string) {
  const value = Number(amountMinor);

  if (!Number.isFinite(value)) {
    return "KES 0";
  }

  return formatKesAmount(value / 100);
}

export function toMinorUnits(amount: string) {
  const parsed = parsePositiveAmount(amount);

  if (parsed === null) {
    return null;
  }

  return String(Math.round(parsed * 100));
}

export function formatActivityDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

export function unwrapBillingApiData<T>(
  payload: T | { data?: T; message?: string } | { message?: string } | null | undefined,
): T | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload) {
    return payload.data === undefined ? null : (payload.data as T);
  }

  return payload === undefined ? null : (payload as T);
}
