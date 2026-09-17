import { analyticsScopeSql, type ExamAnalyticsScopeLevel } from './analytics-scope';

/** One tenant-bound read model: aggregate assessments before returning data to the engine.
 * $3 contains validated filters. Learner filters are applied AFTER population statistics.
 * Historical placement is matched to the exam's academic year, never the student's current class.
 */
export function analyticsQuery(level: ExamAnalyticsScopeLevel, publishedOnly = false): string {
  return `WITH request_identity AS (SELECT $1::text AS tenant_id, $2::text AS actor_user_id, $3::jsonb AS filters),
  candidate_exams AS MATERIALIZED (
    SELECT series.*, term.academic_year_id::text, term.name AS term_name, year.name AS year_name
    FROM exam_series series
    JOIN academic_terms term ON term.tenant_id = series.tenant_id AND term.id::text = series.academic_term_id::text
    JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id::text = term.academic_year_id::text
    WHERE series.tenant_id = $1
      ${publishedOnly ? "AND series.status = 'published'" : ''}
  ), anchor_exam AS (
    SELECT * FROM candidate_exams WHERE
      (($3::jsonb->>'academic_year_id') IS NULL OR academic_year_id = $3::jsonb->>'academic_year_id')
      AND (($3::jsonb->>'academic_term_id') IS NULL OR academic_term_id::text = $3::jsonb->>'academic_term_id')
      AND (($3::jsonb->>'exam_series_id') IS NULL OR id::text = $3::jsonb->>'exam_series_id')
    ORDER BY starts_on DESC, id DESC LIMIT 1
  ), exam_context AS MATERIALIZED (
    (SELECT * FROM candidate_exams WHERE starts_on <= (SELECT starts_on FROM anchor_exam)
      ORDER BY starts_on DESC, id DESC LIMIT 24)
    UNION SELECT * FROM candidate_exams WHERE id::text = $3::jsonb->>'comparison_exam_id'
  ), evidence_keys AS (
    SELECT mark.tenant_id, mark.exam_series_id, mark.assessment_id, mark.student_id::text, mark.class_section_id::text
    FROM exam_marks mark WHERE mark.tenant_id = $1 AND mark.exam_series_id IN (SELECT id FROM exam_context)
    UNION
    SELECT mark_window.tenant_id, mark_window.exam_series_id, assessment.id, enrollment.student_id::text, mark_window.class_section_id::text
    FROM exam_mark_entry_windows mark_window
    JOIN exam_context series ON series.tenant_id = mark_window.tenant_id AND series.id = mark_window.exam_series_id
    JOIN exam_assessments assessment ON assessment.tenant_id = mark_window.tenant_id
      AND assessment.exam_series_id = mark_window.exam_series_id AND assessment.subject_id = mark_window.subject_id
    JOIN student_subject_enrollments enrollment ON enrollment.tenant_id = mark_window.tenant_id
      AND enrollment.class_section_id::text = mark_window.class_section_id::text AND enrollment.subject_id::text = mark_window.subject_id::text
      AND enrollment.academic_year_id::text = series.academic_year_id
      AND enrollment.status = 'active'
      AND (enrollment.academic_term_id IS NULL OR enrollment.academic_term_id::text = series.academic_term_id::text)
      AND (enrollment.effective_from IS NULL OR enrollment.effective_from <= series.ends_on)
      AND (enrollment.effective_to IS NULL OR enrollment.effective_to >= series.starts_on)
    WHERE mark_window.tenant_id = $1
      AND EXISTS (SELECT 1 FROM student_class_assignments placement WHERE placement.tenant_id = enrollment.tenant_id
        AND placement.student_id::text = enrollment.student_id::text AND placement.class_section_id::text = enrollment.class_section_id::text
        AND placement.academic_year_id::text = series.academic_year_id AND placement.status IN ('active','completed','transferred'))
  ), evidence AS (
    SELECT key.*, assessment.subject_id::text, assessment.max_score, assessment.weight,
      series.name AS exam_name, series.status AS exam_status, series.starts_on::text AS exam_date, series.ends_on, series.academic_term_id::text,
      series.academic_year_id, series.term_name, series.year_name,
      subject.name AS subject_name, subject.department_id::text, department.name AS department_name,
      section.name AS class_name, section.grade_level::text, placement.stream_id::text, stream.name AS stream_name, placement.cohort_id,
      concat_ws(' ',student.first_name,student.middle_name,student.last_name) AS student_name, student.admission_number,
      mark.id AS mark_id, mark.score, COALESCE(mark.score_status,'missing') AS score_status,
      COALESCE(mark.status,'missing') AS mark_status,
      card.status AS report_status, card.grading_policy_id, card.grading_policy_version,
      (mark.status IN ('locked','published') AND card.status IN ('approved','published')) AS finalized
    FROM evidence_keys key
    JOIN exam_context series ON series.tenant_id = key.tenant_id AND series.id = key.exam_series_id
    JOIN exam_assessments assessment ON assessment.tenant_id = key.tenant_id AND assessment.id = key.assessment_id
    JOIN subjects subject ON subject.tenant_id = key.tenant_id AND subject.id::text = assessment.subject_id::text
    JOIN class_sections section ON section.tenant_id = key.tenant_id AND section.id::text = key.class_section_id
    JOIN students student ON student.tenant_id = key.tenant_id AND student.id::text = key.student_id
    LEFT JOIN academics_departments department ON department.tenant_id = key.tenant_id AND department.id::text = subject.department_id::text
    LEFT JOIN exam_marks mark ON mark.tenant_id = key.tenant_id AND mark.assessment_id = key.assessment_id AND mark.student_id::text = key.student_id
    LEFT JOIN LATERAL (
      SELECT p.stream_id, to_jsonb(p)->>'cohort_id' AS cohort_id FROM student_class_assignments p WHERE p.tenant_id = key.tenant_id AND p.student_id::text = key.student_id
        AND p.class_section_id::text = key.class_section_id AND p.academic_year_id::text = series.academic_year_id
      ORDER BY p.updated_at DESC, p.id DESC LIMIT 1
    ) placement ON TRUE
    LEFT JOIN class_streams stream ON stream.tenant_id = key.tenant_id AND stream.id::text = placement.stream_id::text
    LEFT JOIN student_report_cards card ON card.tenant_id = key.tenant_id AND card.exam_series_id = key.exam_series_id
      AND card.student_id::text = key.student_id AND card.is_current = TRUE
  ), scoped AS MATERIALIZED (
    SELECT evidence.* FROM evidence WHERE evidence.tenant_id = $1 AND ${analyticsScopeSql('evidence', level)}
      ${publishedOnly ? "AND evidence.mark_status = 'published' AND evidence.report_status = 'published'" : ''}
      AND (($3::jsonb->>'department_id') IS NULL OR department_id = $3::jsonb->>'department_id')
      AND (($3::jsonb->>'subject_id') IS NULL OR subject_id = $3::jsonb->>'subject_id')
      AND (($3::jsonb->>'class_section_id') IS NULL OR class_section_id = $3::jsonb->>'class_section_id')
      AND (($3::jsonb->>'stream_id') IS NULL OR stream_id = $3::jsonb->>'stream_id')
      AND (($3::jsonb->>'grade_level') IS NULL OR grade_level = $3::jsonb->>'grade_level')
      AND (($3::jsonb->>'teacher_user_id') IS NULL OR EXISTS (SELECT 1 FROM teacher_subject_assignments teacher
        WHERE teacher.tenant_id = evidence.tenant_id AND teacher.teacher_user_id::text = $3::jsonb->>'teacher_user_id'
          AND teacher.class_section_id::text = evidence.class_section_id AND teacher.subject_id::text = evidence.subject_id
          AND teacher.status = 'active' AND (teacher.academic_term_id IS NULL OR teacher.academic_term_id::text = evidence.academic_term_id)
          AND (teacher.stream_id IS NULL OR teacher.stream_id::text = evidence.stream_id)
          AND (teacher.effective_from IS NULL OR teacher.effective_from <= CURRENT_DATE)
          AND (teacher.effective_to IS NULL OR teacher.effective_to >= CURRENT_DATE)))
  ), subject_results AS (
    SELECT tenant_id, exam_series_id::text, exam_name, exam_status, exam_date, ends_on, academic_term_id, academic_year_id, term_name, year_name,
      student_id, student_name, admission_number, subject_id, subject_name, department_id, department_name,
      class_section_id, class_name, grade_level, stream_id, stream_name, cohort_id, report_status, grading_policy_id, grading_policy_version,
      SUM(score / NULLIF(max_score,0) * 100 * weight) FILTER (WHERE finalized AND score_status = 'entered' AND score BETWEEN 0 AND max_score)
        / NULLIF(SUM(weight) FILTER (WHERE finalized AND score_status = 'entered' AND score BETWEEN 0 AND max_score),0) AS average,
      COUNT(*)::int AS expected,
      COUNT(*) FILTER (WHERE mark_id IS NOT NULL)::int AS recorded,
      COUNT(*) FILTER (WHERE finalized AND score_status = 'entered' AND score BETWEEN 0 AND max_score)::int AS numeric_count,
      COUNT(*) FILTER (WHERE score_status = 'absent')::int AS absent,
      COUNT(*) FILTER (WHERE score_status IN ('missing','not_assessed','incomplete'))::int AS missing,
      COUNT(*) FILTER (WHERE score_status <> 'entered' AND mark_id IS NOT NULL)::int AS explicit_count,
      COUNT(*) FILTER (WHERE score_status = 'entered' AND (score IS NULL OR score < 0 OR score > max_score))::int AS invalid,
      COUNT(*) FILTER (WHERE mark_status = 'draft')::int AS draft,
      COUNT(*) FILTER (WHERE mark_status = 'submitted')::int AS submitted,
      COUNT(*) FILTER (WHERE mark_status = 'reviewed')::int AS reviewed,
      COUNT(*) FILTER (WHERE mark_status = 'locked')::int AS locked,
      COUNT(*) FILTER (WHERE mark_status = 'published')::int AS published
    FROM scoped
    GROUP BY tenant_id, exam_series_id, exam_name, exam_status, exam_date, ends_on, academic_term_id, academic_year_id, term_name, year_name,
      student_id, student_name, admission_number, subject_id, subject_name, department_id, department_name,
      class_section_id, class_name, grade_level, stream_id, stream_name, cohort_id, report_status, grading_policy_id, grading_policy_version
  )
  SELECT result.*, policy.id::text AS policy_id, policy.reporting_mode,
    COALESCE((SELECT settings.show_rank FROM academics_report_card_settings settings
      WHERE settings.tenant_id = result.tenant_id AND settings.is_active = TRUE AND settings.archived_at IS NULL
      ORDER BY settings.updated_at DESC, settings.id DESC LIMIT 1),FALSE) AND policy.reporting_mode = 'traditional' AS ranking_enabled,
    COALESCE(boundaries.items,'[]'::jsonb) AS boundaries,
    COALESCE(teachers.items,'[]'::jsonb) AS teachers,
    COALESCE(subject_heads.items,'[]'::jsonb) AS heads_of_subject,
    COALESCE(interventions.items,'[]'::jsonb) AS interventions
  FROM subject_results result
  LEFT JOIN LATERAL (
    SELECT p.* FROM exam_grading_policies p WHERE p.tenant_id = result.tenant_id
      AND ((result.grading_policy_id IS NOT NULL AND p.id = result.grading_policy_id
        AND (result.grading_policy_version IS NULL OR p.version = result.grading_policy_version))
        OR (result.grading_policy_id IS NULL AND (p.exam_series_id::text = result.exam_series_id OR p.exam_series_id IS NULL)
          AND p.status IN ('active','replaced','archived') AND (p.effective_from IS NULL OR p.effective_from::date <= result.ends_on)
          AND (p.effective_to IS NULL OR p.effective_to::date >= result.ends_on)))
    ORDER BY (p.exam_series_id::text = result.exam_series_id) DESC NULLS LAST, p.version DESC, p.id LIMIT 1
  ) policy ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('label',b.label,'min',b.min_score,'max',b.max_score,'points',b.points,'is_pass',b.is_pass)
      ORDER BY b.min_score DESC) AS items
    FROM exam_grading_policy_boundaries b WHERE b.tenant_id = result.tenant_id AND b.grading_policy_id = policy.id
  ) boundaries ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(DISTINCT jsonb_build_object('id',t.teacher_user_id::text,'name',COALESCE(NULLIF(s.display_name,''),'Assigned teacher'))) AS items
    FROM teacher_subject_assignments t LEFT JOIN staff_profiles s ON s.tenant_id = t.tenant_id AND s.user_id::text = t.teacher_user_id::text
    WHERE t.tenant_id = result.tenant_id AND t.subject_id::text = result.subject_id AND t.class_section_id::text = result.class_section_id
      AND (t.academic_term_id IS NULL OR t.academic_term_id::text = result.academic_term_id)
      AND (t.stream_id IS NULL OR t.stream_id::text = result.stream_id)
      AND (t.effective_from IS NULL OR t.effective_from <= result.ends_on) AND (t.effective_to IS NULL OR t.effective_to >= result.exam_date::date)
  ) teachers ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(DISTINCT jsonb_build_object('id',ap.teacher_user_id::text,'name',COALESCE(NULLIF(staff.display_name,''),'Assigned subject head'))) AS items
    FROM academics_role_appointments ap LEFT JOIN staff_profiles staff ON staff.tenant_id = ap.tenant_id AND staff.user_id::text = ap.teacher_user_id::text
    WHERE ap.tenant_id = result.tenant_id AND ap.subject_id::text = result.subject_id
      AND ap.role_type IN ('head_of_subject','hos','subject_coordinator') AND ap.status = 'active'
      AND (ap.academic_year_id IS NULL OR ap.academic_year_id::text = result.academic_year_id)
      AND (ap.class_section_id IS NULL OR ap.class_section_id::text = result.class_section_id)
      AND (ap.stream_id IS NULL OR ap.stream_id::text = result.stream_id)
      AND (ap.effective_from IS NULL OR ap.effective_from <= CURRENT_DATE) AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)
  ) subject_heads ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id',i.id,'status',i.status,'due_on',i.due_on,'starts_on',i.starts_on,
      'completed_at',i.completed_at,'baseline',i.baseline,'target',i.target,'outcome',i.outcome)) AS items
    FROM academic_interventions i WHERE i.tenant_id = result.tenant_id
      AND (i.student_id IS NULL OR i.student_id = result.student_id)
      AND (i.class_section_id IS NULL OR i.class_section_id = result.class_section_id)
      AND ${['subject', 'assignment', 'department'].includes(level) ? 'i.subject_id = result.subject_id' : '(i.subject_id IS NULL OR i.subject_id = result.subject_id)'}
      AND (i.student_id IS NOT NULL OR i.class_section_id IS NOT NULL OR i.subject_id IS NOT NULL)
  ) interventions ON TRUE
  ORDER BY result.exam_date, result.exam_series_id, result.student_id, result.subject_id`;
}
