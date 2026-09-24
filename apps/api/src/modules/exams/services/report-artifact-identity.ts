import { createHash } from 'node:crypto';

// Bump whenever PDF layout, fonts, or snapshot interpretation changes.
export const REPORT_RENDERER_VERSION = 'pdfkit-report-card-4';
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonicalJson(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function reportIdentity(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
export function reportPdfIdentity(card: Record<string, any>): string {
  return reportIdentity({
    renderer: REPORT_RENDERER_VERSION,
    tenant: card.tenant_id,
    id: card.id,
    verification: card.verification_code,
    payload: card.metadata?.report_card,
  });
}
