import { examRosterSql, recordedMarkSql, markSheetStatusSql } from '../exams/exam-mark-roster';
import { paperClassScopeSql } from '../exams/exam-result-policy';
import { markEntryHasStartedSql, teacherEntryDeadlineSql, effectiveEntryDeadlineSql } from '../exams/mark-entry-window-policy';

export type TeacherMarkProgress = {
  id: string;
  window_id: string;
  class_section_id: string;
  exam_id: string;
  exam_name: string;
  subject: string;
  subject_id: string;
  stream_id: string | null;
  paper: string;
  paper_count: number;
  class_name: string;
  stream: string | null;
  teacher_id: string | null;
  teacher: string;
  total_students: number;
  entered: number;
  recorded: number;
  submitted: number;
  missing: number;
  status: string;
  assessment_id: string;
  is_submitted: boolean;
  outstanding: boolean;
  overdue: boolean;
  deadline: string;
  window_closed: boolean;
  last_activity: string | null;
};

// Start with the enrolled roster, not existing marks: zero-entry teachers and
// unassigned streams must remain visible. Each paper has its own submission.
export const TEACHER_MARK_PROGRESS_SQL = `
  WITH progress AS (
    SELECT w.id AS window_id, w.class_section_id, w.subject_id, series.id AS exam_id, series.name AS exam_name,
      series.status AS exam_status, assessment.id AS assessment_id, assessment.name AS paper,
      (SELECT COUNT(*)::int FROM exam_assessments configured WHERE configured.tenant_id=w.tenant_id
        AND configured.exam_series_id=w.exam_series_id AND configured.subject_id=w.subject_id
        AND ${paperClassScopeSql('configured','w.class_section_id')}) AS paper_count,
      subject.name AS subject, section.name AS class_name,
      roster.stream_id, stream.name AS stream, owner.teacher_user_id AS teacher_id,
      COALESCE(MAX(NULLIF(staff.display_name, '')), MAX(staff.staff_number),
        CASE WHEN owner.teacher_user_id IS NULL THEN 'Unassigned' ELSE 'Teacher name unavailable' END) AS teacher,
      COUNT(DISTINCT roster.student_id)::int AS total_students,
      COUNT(DISTINCT roster.student_id) FILTER (WHERE mark.score_status = 'entered' AND mark.score IS NOT NULL)::int AS entered,
      COUNT(DISTINCT roster.student_id) FILTER (WHERE ${recordedMarkSql('mark')})::int AS recorded,
      COUNT(DISTINCT roster.student_id) FILTER (WHERE mark.status IN ('submitted','reviewed','approved','locked','published')
        AND ${recordedMarkSql('mark')})::int AS submitted,
      (BOOL_OR(mark.status IN ('submitted','reviewed','approved','locked','published'))
        AND NOT COALESCE(BOOL_OR(mark.status = 'draft'), FALSE)) AS is_submitted,
      w.last_action,
      MAX(mark.updated_at)::text AS last_activity,
      (w.status = 'closed' AND COALESCE(${teacherEntryDeadlineSql('w', 'owner.teacher_user_id')} < NOW(), TRUE))
        OR series.status IN ('locked', 'published') OR series.locked_at IS NOT NULL OR series.published_at IS NOT NULL AS window_closed,
      (${markEntryHasStartedSql('w', 'series')} OR ${teacherEntryDeadlineSql('w', 'owner.teacher_user_id')} IS NOT NULL) AS has_started,
      ${effectiveEntryDeadlineSql('w', 'owner.teacher_user_id')} AS deadline
    FROM exam_mark_entry_windows w
    JOIN exam_series series ON series.tenant_id = w.tenant_id AND series.id = w.exam_series_id
    JOIN exam_assessments assessment ON assessment.tenant_id = w.tenant_id
      AND assessment.exam_series_id = w.exam_series_id AND assessment.subject_id = w.subject_id
      AND ${paperClassScopeSql('assessment','w.class_section_id')}
    JOIN subjects subject ON subject.tenant_id = w.tenant_id AND subject.id::text = w.subject_id::text
    JOIN class_sections section ON section.tenant_id = w.tenant_id AND section.id::text = w.class_section_id::text
    LEFT JOIN LATERAL (
      ${examRosterSql('w','series')}
    ) roster ON TRUE
    LEFT JOIN class_streams stream ON stream.tenant_id = w.tenant_id
      AND stream.class_section_id = w.class_section_id::text AND stream.id = roster.stream_id
    LEFT JOIN LATERAL (
      SELECT DISTINCT assignment.teacher_user_id
      FROM teacher_subject_assignments assignment
      WHERE assignment.tenant_id = w.tenant_id
        AND assignment.class_section_id = w.class_section_id::text AND assignment.subject_id = w.subject_id::text
        AND (assignment.stream_id IS NULL OR assignment.stream_id = roster.stream_id)
        AND (assignment.academic_term_id IS NULL OR assignment.academic_term_id = series.academic_term_id::text)
        AND assignment.status = 'active' AND assignment.mark_entry_allowed = TRUE
        AND assignment.effective_from <= CURRENT_DATE
        AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
    ) owner ON TRUE
    LEFT JOIN staff_profiles staff ON staff.tenant_id = w.tenant_id AND staff.user_id::text = owner.teacher_user_id::text
    LEFT JOIN exam_marks mark ON mark.tenant_id = w.tenant_id AND mark.exam_series_id = w.exam_series_id
      AND mark.assessment_id = assessment.id AND mark.subject_id = w.subject_id
      AND mark.class_section_id = w.class_section_id AND mark.student_id::text = roster.student_id::text
    WHERE w.tenant_id = $1 AND series.status <> 'archived'
    GROUP BY w.id, series.id, assessment.id, subject.name, section.name,
      roster.stream_id, stream.name, owner.teacher_user_id
  )
  SELECT CONCAT(window_id, ':', assessment_id, ':', COALESCE(teacher_id::text, 'unassigned'), ':', COALESCE(stream_id, 'class')) AS id,
    assessment_id::text, window_id::text, class_section_id::text, subject_id::text, stream_id, exam_id::text, exam_name, subject, paper, paper_count, class_name, stream,
    teacher_id::text, teacher, total_students, entered, recorded, submitted,
    (total_students - recorded)::int AS missing, deadline::text, window_closed, last_activity, COALESCE(is_submitted,FALSE) AS is_submitted,
    (total_students > 0 AND NOT COALESCE(is_submitted,FALSE) AND exam_status <> 'draft' AND has_started) AS outstanding,
    ${markSheetStatusSql({total:'total_students',recorded:'recorded',submitted:'is_submitted',examStatus:'exam_status',started:'has_started',closed:'window_closed',teacher:'teacher_id',lastAction:'last_action'})} AS status,
    (NOT COALESCE(is_submitted,FALSE) AND total_students > 0 AND exam_status <> 'draft'
      AND deadline < NOW()) AS overdue
  FROM progress
  ORDER BY overdue DESC, deadline, teacher, exam_name, class_name, stream, subject, paper
`;
