export const ANALYTICS_SCOPES = ['school', 'department', 'subject', 'grade', 'class', 'assignment'] as const;
export type ExamAnalyticsScopeLevel = typeof ANALYTICS_SCOPES[number];
export interface ExamAnalyticsScope { level: ExamAnalyticsScopeLevel; actor_user_id: string | null; role: string }
export interface AnalyticsFilters {
  scope?: ExamAnalyticsScopeLevel;
  academic_year_id?: string; academic_term_id?: string; exam_series_id?: string; comparison_exam_id?: string;
  department_id?: string; subject_id?: string; grade_level?: string; class_section_id?: string;
  stream_id?: string; teacher_user_id?: string; student_id?: string; learner_query?: string;
  risk_level?: string; grade?: string; marks_status?: string; publication_status?: string; learner_group?: string;
  page: number; page_size: number;
}
