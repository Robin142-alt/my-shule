export type ReportCardScopeType = 'school' | 'class' | 'stream' | 'students';

export interface ReportCardScope {
  scopeType: ReportCardScopeType;
  schoolId: string;
  examSeriesId?: string;
  classSectionId?: string;
  streamId?: string;
  studentIds?: string[];
}

export interface ReportCardScopeQuery {
  scope_type?: string;
  exam_series_id?: string;
  class_section_id?: string;
  stream_id?: string;
  student_ids?: string[];
}

export interface ReportCardScopeSummary {
  scope: ReportCardScope;
  scopeLabel: string;
  totalCards: number;
  eligibleCards: number;
  ineligibleCards: number;
  statusCounts: Record<string, number>;
  classes: Array<{
    classSectionId: string;
    className: string;
    streams: Array<{ streamId: string; streamName: string; cardCount: number }>;
    cardCount: number;
  }>;
}

export function parseReportCardScope(
  tenantId: string,
  query: ReportCardScopeQuery,
): ReportCardScope {
  const studentIds = normalizeStudentIds(query.student_ids);
  if (studentIds.length > 0) {
    return {
      scopeType: 'students',
      schoolId: tenantId,
      examSeriesId: query.exam_series_id || undefined,
      classSectionId: query.class_section_id || undefined,
      streamId: query.stream_id || undefined,
      studentIds,
    };
  }
  if (query.stream_id?.trim()) {
    return {
      scopeType: 'stream',
      schoolId: tenantId,
      examSeriesId: query.exam_series_id || undefined,
      classSectionId: query.class_section_id || undefined,
      streamId: query.stream_id.trim(),
    };
  }
  if (query.class_section_id?.trim()) {
    return {
      scopeType: 'class',
      schoolId: tenantId,
      examSeriesId: query.exam_series_id || undefined,
      classSectionId: query.class_section_id.trim(),
    };
  }
  return {
    scopeType: 'school',
    schoolId: tenantId,
    examSeriesId: query.exam_series_id || undefined,
  };
}

function normalizeStudentIds(value: unknown): string[] {
  if (!value) return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return [...new Set(raw.map(id => String(id).trim()).filter(Boolean))];
}

export function buildScopeSqlClause(scope: ReportCardScope): {
  joins: string;
  where: string;
  params: unknown[];
  paramOffset: number;
} {
  const joins: string[] = [];
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  params.push(scope.schoolId);
  conditions.push(`card.tenant_id = $${paramIndex}`);
  paramIndex++;

  if (scope.examSeriesId) {
    params.push(scope.examSeriesId);
    conditions.push(`card.exam_series_id = $${paramIndex}::uuid`);
    paramIndex++;
  }

  if (scope.scopeType === 'students' && scope.studentIds?.length) {
    params.push(scope.studentIds);
    conditions.push(`card.student_id = ANY($${paramIndex}::uuid[])`);
    paramIndex++;
  } else if (scope.scopeType === 'stream' || scope.scopeType === 'class') {
    joins.push(`
      JOIN student_class_assignments sca
        ON sca.tenant_id = card.tenant_id
       AND sca.student_id = card.student_id::text
       AND sca.status = 'active'`);
    if (scope.classSectionId) {
      params.push(scope.classSectionId);
      conditions.push(`sca.class_section_id = $${paramIndex}::text`);
      paramIndex++;
    }
    if (scope.scopeType === 'stream' && scope.streamId) {
      params.push(scope.streamId);
      conditions.push(`sca.stream_id = $${paramIndex}::text`);
      paramIndex++;
    }
  }

  conditions.push(`card.is_current = TRUE`);

  return {
    joins: joins.join('\n'),
    where: conditions.join(' AND '),
    params,
    paramOffset: paramIndex,
  };
}

export const REPORT_CARD_TRANSITION_SOURCE_STATUSES: Record<string, string[]> = {
  submit: ['draft_generated', 'draft', 'regeneration_required'],
  approve: ['under_review'],
  recall: ['under_review'],
  publish: ['approved'],
  unpublish: ['published'],
};

export const REPORT_CARD_TRANSITION_TARGET_STATUS: Record<string, string> = {
  submit: 'under_review',
  approve: 'approved',
  recall: 'draft_generated',
  publish: 'published',
  unpublish: 'withdrawn',
};
