import { BadRequestException } from '@nestjs/common';

export interface ClassExamConfiguration {
  class_section_id: string;
  subject_ids: string[];
  stream_subjects?: Array<{ stream_id: string; subject_ids: string[] }>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function identifiers(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 300 || value.some(v => typeof v !== 'string' || !uuid.test(v))
    || new Set(value).size !== value.length) throw new BadRequestException('Choose valid, unique subjects for each class.');
  return [...value].sort();
}
export function normalizeClassExamConfiguration(value: unknown): ClassExamConfiguration[] {
  if (!Array.isArray(value) || !value.length || value.length > 300) {
    throw new BadRequestException('Configure examined subjects separately for each participating class.');
  }
  const seen = new Set<string>();
  return value.map(row => {
    if (!row || !uuid.test(row.class_section_id) || seen.has(row.class_section_id)) throw new BadRequestException('Choose each participating class once.');
    seen.add(row.class_section_id);
    const streams = row.stream_subjects ?? [];
    if (!Array.isArray(streams) || streams.length > 100) throw new BadRequestException('Invalid stream subject configuration.');
    const streamIds = new Set<string>();
    const overrides = streams.map(stream => {
      if (!stream || !uuid.test(stream.stream_id) || streamIds.has(stream.stream_id)) throw new BadRequestException('Choose each stream once.');
      streamIds.add(stream.stream_id);
      return {stream_id:stream.stream_id, subject_ids:identifiers(stream.subject_ids)};
    }).sort((a,b) => a.stream_id.localeCompare(b.stream_id));
    return {class_section_id:row.class_section_id, subject_ids:identifiers(row.subject_ids), ...(overrides.length ? {stream_subjects:overrides} : {})};
  }).sort((a,b) => a.class_section_id.localeCompare(b.class_section_id));
}
export function classExamWindows(config: ClassExamConfiguration[]) {
  return config.flatMap(row => [...new Set([...row.subject_ids, ...(row.stream_subjects ?? []).flatMap(s => s.subject_ids)])].sort().map(subject => ({
    class_section_id:row.class_section_id, subject_id:subject,
    stream_scope:{default:row.subject_ids.includes(subject), overrides:Object.fromEntries((row.stream_subjects ?? []).map(s => [s.stream_id,s.subject_ids.includes(subject)]))},
  })));
}

/** SQL identifiers are repository-owned expressions, never request values. */
export function examStreamStudentScopeSql(window: string, student: string): string {
  return `EXISTS (SELECT 1 FROM student_class_assignments exam_membership
    WHERE exam_membership.student_id::text = ${student}::text
      AND ${examMembershipScopeSql('exam_membership', window)})`;
}

/** Apply to the joined placement itself when its stream is used for grouping or authorization. */
export function examMembershipScopeSql(membership: string, window: string): string {
  return `(${membership}.tenant_id = ${window}.tenant_id
      AND ${membership}.class_section_id::text = ${window}.class_section_id::text
      AND ${membership}.status IN ('active','completed','transferred')
      AND EXISTS (SELECT 1 FROM exam_series eligibility_series
        LEFT JOIN academic_terms eligibility_term ON eligibility_term.tenant_id=eligibility_series.tenant_id
          AND eligibility_term.id::text=eligibility_series.academic_term_id::text
        WHERE eligibility_series.tenant_id=${window}.tenant_id AND eligibility_series.id=${window}.exam_series_id
          AND (to_jsonb(${membership})->>'academic_year_id' IS NULL
            OR to_jsonb(${membership})->>'academic_year_id'=to_jsonb(eligibility_term)->>'academic_year_id')
          AND (to_jsonb(${membership})->>'effective_from' IS NULL OR (to_jsonb(${membership})->>'effective_from')::date<=eligibility_series.ends_on)
          AND (to_jsonb(${membership})->>'effective_to' IS NULL OR (to_jsonb(${membership})->>'effective_to')::date>=eligibility_series.starts_on))
      AND COALESCE((to_jsonb(${window})->'stream_scope'->'overrides'->>${membership}.stream_id)::boolean,
        (to_jsonb(${window})->'stream_scope'->>'default')::boolean, TRUE))`;
}

/** Enrollment validity follows the examination's term/year and dates, not today's teaching allocation. */
export function examEnrollmentScopeSql(enrollment: string, window: string): string {
  return `EXISTS (SELECT 1 FROM exam_series enrollment_series
    LEFT JOIN academic_terms enrollment_term ON enrollment_term.tenant_id=enrollment_series.tenant_id
      AND enrollment_term.id::text=enrollment_series.academic_term_id::text
    WHERE enrollment_series.tenant_id=${window}.tenant_id AND enrollment_series.id=${window}.exam_series_id
      AND (to_jsonb(${enrollment})->>'academic_term_id' IS NULL
        OR to_jsonb(${enrollment})->>'academic_term_id'=enrollment_series.academic_term_id::text)
      AND (to_jsonb(${enrollment})->>'academic_year_id' IS NULL
        OR to_jsonb(${enrollment})->>'academic_year_id'=to_jsonb(enrollment_term)->>'academic_year_id')
      AND (to_jsonb(${enrollment})->>'effective_from' IS NULL
        OR (to_jsonb(${enrollment})->>'effective_from')::date<=enrollment_series.ends_on)
      AND (to_jsonb(${enrollment})->>'effective_to' IS NULL
        OR (to_jsonb(${enrollment})->>'effective_to')::date>=enrollment_series.starts_on))`;
}
