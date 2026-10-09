import { BadRequestException } from '@nestjs/common';

export interface DocumentRequirement { id: string; kind: string; generation: number }

export function needsGuardian(dateOfBirth: string | null, now = new Date()): boolean {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return true;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0,10) !== dateOfBirth || birth > now) return true;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const eighteenthBirthday = `${Number(dateOfBirth.slice(0, 4)) + 18}${dateOfBirth.slice(4)}`;
  return today < eighteenthBirthday;
}

export function outstandingDocuments<T extends DocumentRequirement>(documents: readonly T[], accepted: readonly { kind: string; generation: number }[]): T[] {
  return documents.filter((document) => !accepted.some((row) => row.kind === document.kind && row.generation === document.generation));
}

export function validateSelections(selections: unknown, documents: readonly DocumentRequirement[]): asserts selections is { document_id: string; checked: true }[] {
  if (!Array.isArray(selections) || selections.length !== documents.length || new Set(selections.map((row) => row?.document_id)).size !== selections.length || selections.some((row) => !row || row.checked !== true || !documents.some((document) => document.id === row.document_id))) {
    throw new BadRequestException('Select each required agreement using the current document version. Reload and try again.');
  }
}
