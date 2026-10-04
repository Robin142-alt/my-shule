export function formatKesAmount(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function formatMinorKes(amountMinor: string) {
  if (!/^-?\d+$/.test(amountMinor)) return "Amount unavailable";
  const amount = BigInt(amountMinor);
  const absolute = amount < BigInt(0) ? -amount : amount;
  const cents = absolute % BigInt(100);
  return `KES ${amount < BigInt(0) ? "-" : ""}${(absolute / BigInt(100)).toLocaleString("en-KE")}${cents ? `.${cents.toString().padStart(2, "0")}` : ""}`;
}

export function toMinorUnits(amount: string) {
  const normalized = amount.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.replaceAll(",", "").split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return minor > BigInt(0) && minor <= BigInt("9223372036854775807") ? minor.toString() : null;
}

export function formatActivityDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
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
