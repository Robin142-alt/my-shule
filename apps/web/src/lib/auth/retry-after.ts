/** Honor both forms of Retry-After, with a finite fallback for missing headers. */
export function readRetryAfterSeconds(value: string | null | undefined, fallback = 60) {
  if (!value?.trim()) return fallback;
  const seconds = /^\d+$/.test(value.trim())
    ? Number(value)
    : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds) ? Math.min(86_400, Math.max(1, seconds)) : fallback;
}
