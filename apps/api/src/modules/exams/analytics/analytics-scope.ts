import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { ANALYTICS_SCOPES, type AnalyticsFilters, type ExamAnalyticsScopeLevel } from './analytics-contract';
export { ANALYTICS_SCOPES } from './analytics-contract';
export type { AnalyticsFilters, ExamAnalyticsScope, ExamAnalyticsScopeLevel } from './analytics-contract';

export function parseAnalyticsFilters(query: Record<string, string | undefined>): AnalyticsFilters {
  const result: Record<string, string | number> = {};
  const textKeys = ['academic_year_id', 'academic_term_id', 'exam_series_id', 'comparison_exam_id',
    'department_id', 'subject_id', 'grade_level', 'class_section_id', 'stream_id', 'teacher_user_id', 'student_id', 'learner_query', 'grade'];
  for (const key of textKeys) {
    const value = query[key];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || value.length > 160 || /[\x00-\x1f]/.test(value)) throw new BadRequestException(`Invalid ${key}`);
    result[key] = value.trim();
  }
  const enums: Record<string, readonly string[]> = { scope: ANALYTICS_SCOPES,
    risk_level: ['At Risk', 'Low', 'Moderate', 'High', 'Critical'], learner_group: ['high_performers', 'most_improved', 'passing_all', 'declining', 'consistent_improvers', 'consistent_high'], marks_status: ['missing', 'draft', 'submitted', 'reviewed', 'locked', 'published'],
    publication_status: ['draft_requested', 'draft_generated', 'under_review', 'approved', 'published', 'withdrawn', 'regeneration_required', 'draft'] };
  for (const [key, values] of Object.entries(enums)) {
    if (!query[key]) continue;
    if (!values.includes(query[key]!)) throw new BadRequestException(`Invalid ${key}`);
    result[key] = query[key]!;
  }
  for (const [key, fallback, max] of [['page', 1, 100000], ['page_size', 25, 100]] as const) {
    const value = query[key] === undefined ? fallback : Number(query[key]);
    if (!Number.isInteger(value) || value < 1 || value > max) throw new BadRequestException(`Invalid ${key}`);
    result[key] = value;
  }
  // School identity and authority never come from the query string.
  return result as unknown as AnalyticsFilters;
}

/** Every alias passed here is internal code, never user input. $1 is tenant and $2 is actor. */
export function analyticsScopeSql(alias: string, level: ExamAnalyticsScopeLevel): string {
  if (level === 'school') return 'TRUE';
  const active = (a: string) => `${a}.status = 'active'
    AND (${a}.effective_from IS NULL OR ${a}.effective_from::date <= CURRENT_DATE)
    AND (${a}.effective_to IS NULL OR ${a}.effective_to::date >= CURRENT_DATE)`;
  const identity = (a: string) => `${a}.tenant_id = ${alias}.tenant_id AND ${a}.teacher_user_id::text = $2::text`;
  if (level === 'department') return `EXISTS (SELECT 1 FROM academics_department_hod_appointments ap
    WHERE ${identity('ap')} AND ${active('ap')} AND ap.department_id::text = ${alias}.department_id::text)`;
  if (level === 'assignment') return `EXISTS (SELECT 1 FROM teacher_subject_assignments ap
    WHERE ${identity('ap')} AND ${active('ap')}
      AND ap.class_section_id::text = ${alias}.class_section_id::text AND ap.subject_id::text = ${alias}.subject_id::text
      AND (ap.academic_term_id IS NULL OR ap.academic_term_id::text = ${alias}.academic_term_id::text)
      AND (ap.stream_id IS NULL OR ap.stream_id::text = ${alias}.stream_id::text))`;
  if (level === 'class') return `EXISTS (SELECT 1 FROM academics_class_teachers ap
    WHERE ${identity('ap')} AND ${active('ap')} AND ap.is_active = TRUE
      AND ap.class_section_id::text = ${alias}.class_section_id::text
      AND ap.academic_year_id::text = ${alias}.academic_year_id::text)`;
  if (level === 'subject' || level === 'grade') return `EXISTS (SELECT 1 FROM academics_role_appointments ap
    WHERE ${identity('ap')} AND ${active('ap')}
      AND ${level === 'subject' ? `ap.role_type IN ('head_of_subject', 'hos', 'subject_coordinator') AND ap.subject_id::text = ${alias}.subject_id::text`
    : `ap.role_type IN ('grade_master', 'form_master', 'grade_form_master') AND (ap.class_section_id IS NOT NULL OR ap.stream_id IS NOT NULL)`}
      AND (ap.academic_year_id IS NULL OR ap.academic_year_id::text = ${alias}.academic_year_id::text)
      AND (ap.class_section_id IS NULL OR ap.class_section_id::text = ${alias}.class_section_id::text)
      AND (ap.stream_id IS NULL OR ap.stream_id::text = ${alias}.stream_id::text))`;
  throw new ForbiddenException('Unsupported academic scope');
}

export const ANALYTICS_APPOINTMENTS_SQL = `SELECT level FROM (
  SELECT 'assignment' AS level FROM teacher_subject_assignments ap WHERE ap.tenant_id = $1 AND ap.teacher_user_id::text = $2::text
    AND ap.status = 'active' AND (ap.effective_from IS NULL OR ap.effective_from <= CURRENT_DATE) AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)
  UNION SELECT 'class' FROM academics_class_teachers ap WHERE ap.tenant_id = $1 AND ap.teacher_user_id::text = $2::text
    AND ap.is_active = TRUE AND ap.status = 'active' AND (ap.effective_from IS NULL OR ap.effective_from <= CURRENT_DATE) AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)
  UNION SELECT 'department' FROM academics_department_hod_appointments ap WHERE ap.tenant_id = $1 AND ap.teacher_user_id::text = $2::text
    AND ap.status = 'active' AND (ap.effective_from IS NULL OR ap.effective_from <= CURRENT_DATE) AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)
  UNION SELECT CASE WHEN ap.role_type IN ('head_of_subject','hos','subject_coordinator') THEN 'subject' ELSE 'grade' END
    FROM academics_role_appointments ap WHERE ap.tenant_id = $1 AND ap.teacher_user_id::text = $2::text
    AND ((ap.role_type IN ('head_of_subject','hos','subject_coordinator') AND ap.subject_id IS NOT NULL)
      OR (ap.role_type IN ('grade_master','form_master','grade_form_master') AND (ap.class_section_id IS NOT NULL OR ap.stream_id IS NOT NULL)))
    AND ap.status = 'active' AND (ap.effective_from IS NULL OR ap.effective_from <= CURRENT_DATE) AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)
) scopes WHERE EXISTS (SELECT 1 FROM tenant_memberships membership WHERE membership.tenant_id = $1
  AND membership.user_id::text = $2::text AND membership.status = 'active')`;
