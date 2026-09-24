import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { REPORT_RENDERER_VERSION } from './services/report-artifact-identity';
export type ReportCardScopeType = 'school' | 'class' | 'stream' | 'students';
export interface ReportCardScope {
  scopeType: ReportCardScopeType;
  schoolId: string;
  examSeriesId?: string;
  classSectionId?: string;
  streamId?: string;
  studentIds?: string[];
  reportCardIds?: string[];
}
export interface ReportCardScopeQuery {
  scope_type?: string;
  exam_series_id?: string;
  class_section_id?: string;
  stream_id?: string;
  student_ids?: string[] | string;
  report_card_ids?: string[] | string;
}
function optionalId(value: unknown): string | undefined {
  if (value === undefined)
    return undefined;
  if (typeof value !== 'string')
    throw new BadRequestException('Scope identifiers must be text');
  return value.trim() || undefined;
}
function ids(value: unknown): string[] | undefined {
  if (value === undefined)
    return undefined;
  const values = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(values) || values.some(id => typeof id !== 'string')) {
    throw new BadRequestException('Selected identifiers must be a list');
  }
  const result = [...new Set<string>(values.map(id => id.trim()).filter(Boolean))].sort();
  if (!result.length)
    throw new BadRequestException('Select at least one learner or report card');
  if (result.length > 10000)
    throw new BadRequestException('Use a class or school scope for large selections');
  return result;
}
export function parseReportCardScope(tenantId: string, query: ReportCardScopeQuery): ReportCardScope {
  if (!tenantId?.trim())
    throw new BadRequestException('School context is required');
  const studentIds = ids(query.student_ids);
  const reportCardIds = ids(query.report_card_ids);
  const classSectionId = optionalId(query.class_section_id);
  const streamId = optionalId(query.stream_id);
  if (streamId && !classSectionId)
    throw new BadRequestException('Select the class before its stream');
  const scopeType = studentIds || reportCardIds ? 'students' : streamId ? 'stream' : classSectionId ? 'class' : 'school';
  if (query.scope_type && query.scope_type !== scopeType) {
    throw new BadRequestException('Scope type does not match the selected class, stream or learners');
  }
  return { scopeType, schoolId: tenantId, examSeriesId: optionalId(query.exam_series_id),
    ...(classSectionId ? { classSectionId } : {}), ...(streamId ? { streamId } : {}),
    ...(studentIds ? { studentIds } : {}), ...(reportCardIds ? { reportCardIds } : {}) };
}
// One active assignment prevents duplicate cards from legacy duplicate assignments.
// Selected students/cards always intersect the parent class, stream and exam.
export const REPORT_CARD_SCOPE_JOINS = `
  LEFT JOIN LATERAL (
  SELECT assignment.class_section_id, assignment.stream_id
  FROM student_class_assignments assignment
  WHERE assignment.tenant_id = card.tenant_id AND assignment.student_id = card.student_id::text
    AND assignment.status = 'active'
  ORDER BY assignment.updated_at DESC NULLS LAST, assignment.created_at DESC NULLS LAST,
    assignment.class_section_id, assignment.stream_id NULLS FIRST LIMIT 1
  ) sca ON TRUE
  LEFT JOIN class_sections cs ON cs.tenant_id = card.tenant_id AND cs.id = sca.class_section_id
  LEFT JOIN class_streams stream ON stream.tenant_id = card.tenant_id AND stream.id::text = sca.stream_id::text
  LEFT JOIN students student ON student.tenant_id = card.tenant_id AND student.id = card.student_id::text`;
export const REPORT_CARD_SCOPE_ORDER = `cs.name ASC NULLS LAST, stream.name ASC NULLS LAST,
  student.last_name ASC NULLS LAST, student.first_name ASC NULLS LAST,
  student.middle_name ASC NULLS LAST, student.admission_number ASC NULLS LAST, card.id ASC`;
export function buildScopeSqlClause(scope: ReportCardScope) {
  const params: unknown[] = [scope.schoolId];
  const conditions = ['card.tenant_id = $1', 'card.is_current = TRUE'];
  const add = (column: string, value?: string) => {
    if (value) {
      params.push(value);
      conditions.push(`${column} = $${params.length}::text`);
    }
  };
  add('card.exam_series_id::text', scope.examSeriesId);
  add('sca.class_section_id', scope.classSectionId);
  add('sca.stream_id::text', scope.streamId);
  for (const [column, values] of [['card.student_id', scope.studentIds], ['card.id', scope.reportCardIds]] as const) {
    if (values) {
      params.push(values);
      conditions.push(`${column}::text = ANY($${params.length}::text[])`);
    }
  }
  return { joins: REPORT_CARD_SCOPE_JOINS, where: conditions.join(' AND '), params, paramOffset: params.length + 1 };
}
export const REPORT_CARD_TRANSITION_SOURCE_STATUSES: Record<string, string[]> = {
  submit: ['draft_generated', 'draft'], approve: ['under_review'], recall: ['under_review'],
  publish: ['approved'], unpublish: ['published'],
};
export const REPORT_CARD_TRANSITION_TARGET_STATUS: Record<string, string> = {
  submit: 'under_review', approve: 'approved', recall: 'draft_generated', publish: 'published', unpublish: 'withdrawn',
};
// Shared by preview, individual transitions and batch transitions. NULL means eligible.
export function reportCardIneligibilitySql(action: string): string {
  return `CASE
  WHEN NOT card.is_current THEN 'This revision has been superseded'
  WHEN ${action} = 'export' AND card.status NOT IN ('draft_generated','draft','under_review','approved','published')
    THEN 'This report was withdrawn or needs regeneration'
  WHEN ${action} IN ('export','submit','approve','publish') AND (
    card.metadata->>'renderer_version' IS DISTINCT FROM '${REPORT_RENDERER_VERSION}'
    OR (card.metadata->>'source_valid_until')::timestamptz <= now()
    OR COALESCE(card.metadata->>'source_revision','null')::jsonb IS DISTINCT FROM
      COALESCE((SELECT jsonb_agg(jsonb_build_array(source.scope_key,source.version::text) ORDER BY source.scope_key)
        FROM report_source_versions source WHERE source.tenant_id=card.tenant_id
          AND source.scope_key IN ('school','student:' || card.student_id::text)), '[]'::jsonb)
  ) THEN 'Report inputs changed; regenerate this card'
  WHEN ${action} <> 'export' AND card.status <> ALL(CASE ${action}
    ${Object.entries(REPORT_CARD_TRANSITION_SOURCE_STATUSES).map(([key, statuses]) => `WHEN '${key}' THEN ARRAY[${statuses.map(status => `'${status}'`).join(',')}]::text[]`).join('\n')}
    ELSE ARRAY[]::text[] END) THEN CASE WHEN card.status = 'regeneration_required'
    THEN 'Regenerate this card after corrections' ELSE 'Not eligible from status: ' || card.status END
  WHEN ${action} IN ('submit', 'export') AND (
    NULLIF(BTRIM(card.verification_code), '') IS NULL
    OR jsonb_typeof(card.metadata->'report_card'->'template_fields') IS DISTINCT FROM 'object'
    OR jsonb_typeof(card.metadata->'report_card'->'totals') IS DISTINCT FROM 'object'
    OR jsonb_typeof(card.metadata->'report_card'->'subjects') IS DISTINCT FROM 'array'
    OR jsonb_typeof(card.metadata->'report_card'->'generated_at') IS DISTINCT FROM 'string'
  ) THEN 'No valid generated snapshot; regenerate this card'
  WHEN ${action} = 'submit' AND COALESCE(card.metadata->'report_card'->'subjects', '[]'::jsonb) = '[]'::jsonb
    THEN 'No subject results in the snapshot'
  WHEN ${action} = 'submit' AND (
    NULLIF(BTRIM(card.metadata->'report_card'->'template_fields'->>'class_teacher_comment'), '') IS NULL
    OR NULLIF(BTRIM(card.metadata->'report_card'->'template_fields'->>'principal_comment'), '') IS NULL
  ) THEN 'Complete the class teacher and principal comments'
  WHEN ${action} = 'submit' AND EXISTS (
    SELECT 1 FROM exam_marks mark WHERE mark.tenant_id = card.tenant_id
    AND mark.exam_series_id = card.exam_series_id AND mark.student_id = card.student_id
    AND mark.status NOT IN ('locked', 'published')
  ) THEN 'Marks must be reviewed and locked before submission'
  ELSE NULL END`;
}
export function reportCardPreviewToken(scope: ReportCardScope, action: string, cards: Record<string, any>[]) {
  return createHash('sha256').update(JSON.stringify({ scope, action, cards: cards.map(card => [card.id, card.workflow_version, card.updated_at, card.ineligible_reason]) })).digest('hex');
}
