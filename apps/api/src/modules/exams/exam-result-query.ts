import { examGradeOverrideSql, paperClassScopeSql } from './exam-result-policy';

/** Repository-owned expressions only. Shared by processing and transactional correction refreshes. */
export function examResultCtes(tenant: string, batch: string, mode: string): string {
  return `batch_scope AS (
    SELECT id, exam_series_id, class_section_id FROM report_card_generation_batches
    WHERE tenant_id=${tenant} AND id=${batch}::uuid
  ), selected_policy AS (
    SELECT policy.* FROM exam_grading_policies policy CROSS JOIN batch_scope batch
    WHERE policy.tenant_id=${tenant} AND policy.status='active'
      AND (policy.exam_series_id=batch.exam_series_id OR policy.exam_series_id IS NULL)
      AND (policy.effective_from IS NULL OR policy.effective_from<=NOW())
      AND (policy.effective_to IS NULL OR policy.effective_to>NOW())
    ORDER BY (policy.exam_series_id=batch.exam_series_id) DESC NULLS LAST, policy.version DESC,
      policy.activated_at DESC NULLS LAST, policy.created_at DESC LIMIT 1
  ), expected_keys AS (
    SELECT batch.*,mark.student_id,mark.subject_id,mark.class_section_id AS learner_class
    FROM batch_scope batch JOIN exam_marks mark ON mark.tenant_id=${tenant} AND mark.exam_series_id=batch.exam_series_id
      AND (batch.class_section_id IS NULL OR mark.class_section_id=batch.class_section_id)
    UNION
    SELECT batch.*,enrollment.student_id::uuid,w.subject_id,w.class_section_id AS learner_class
    FROM batch_scope batch JOIN exam_mark_entry_windows w ON w.tenant_id=${tenant} AND w.exam_series_id=batch.exam_series_id
      AND (batch.class_section_id IS NULL OR w.class_section_id=batch.class_section_id)
    JOIN exam_series series ON series.tenant_id=w.tenant_id AND series.id=w.exam_series_id
    JOIN student_subject_enrollments enrollment ON enrollment.tenant_id=w.tenant_id
      AND enrollment.class_section_id=w.class_section_id::text AND enrollment.subject_id=w.subject_id::text AND enrollment.status='active'
      AND (to_jsonb(enrollment)->>'academic_term_id' IS NULL OR to_jsonb(enrollment)->>'academic_term_id'=series.academic_term_id::text)
    WHERE EXISTS (SELECT 1 FROM student_class_assignments placement WHERE placement.tenant_id=w.tenant_id
      AND placement.student_id=enrollment.student_id AND placement.class_section_id=enrollment.class_section_id
      AND placement.status IN ('active','completed','transferred'))
  ), paper_evidence AS (
    SELECT key.*,assessment.id AS assessment_id,assessment.max_score,COALESCE(assessment.weight,assessment.max_score) AS weight,
      mark.score,CASE WHEN mark.score_status IN ('X','Y','exempt') THEN mark.score_status
        WHEN mark.status IN ('reviewed','locked','published') THEN mark.score_status ELSE 'X' END AS score_status
    FROM expected_keys key JOIN exam_assessments assessment ON assessment.tenant_id=${tenant} AND assessment.exam_series_id=key.exam_series_id
      AND assessment.subject_id=key.subject_id AND ${paperClassScopeSql('assessment', 'key.learner_class')}
    LEFT JOIN exam_marks mark ON mark.tenant_id=${tenant} AND mark.assessment_id=assessment.id AND mark.student_id=key.student_id
      AND mark.class_section_id=key.learner_class AND mark.exam_series_id=key.exam_series_id AND mark.subject_id=key.subject_id
  ), subject_scores AS (
    SELECT id AS batch_id,exam_series_id,class_section_id,learner_class,student_id,subject_id,COUNT(*)::int AS assessment_count,
      ${examGradeOverrideSql('score_status')} AS override_grade,
      SUM(score/max_score*weight) FILTER(WHERE score_status='entered') / NULLIF(SUM(weight) FILTER(WHERE score_status='entered'),0)*100 AS percentage
    FROM paper_evidence GROUP BY id,exam_series_id,class_section_id,learner_class,student_id,subject_id
  ), scores AS (
    SELECT batch_id,exam_series_id,class_section_id,learner_class,student_id,SUM(assessment_count)::int AS assessment_count,
      ${examGradeOverrideSql('override_grade')} AS override_grade,
      CASE WHEN ${examGradeOverrideSql('override_grade')} IS NULL THEN ROUND(SUM(percentage),2) END AS raw_total,
      CASE WHEN ${examGradeOverrideSql('override_grade')} IS NULL THEN ROUND(
        SUM(percentage*COALESCE(weighting.weight,1))/NULLIF(SUM(COALESCE(weighting.weight,1)) FILTER(WHERE percentage IS NOT NULL),0),2) END AS average_percentage
    FROM subject_scores LEFT JOIN exam_subject_weightings weighting ON weighting.tenant_id=${tenant}
      AND weighting.grading_policy_id=(SELECT id FROM selected_policy) AND weighting.subject_id=subject_scores.subject_id
    GROUP BY batch_id,exam_series_id,class_section_id,learner_class,student_id
  ), ranked AS (
    SELECT scores.*,CASE WHEN ${mode}='rankings' AND override_grade IS NULL AND average_percentage IS NOT NULL
      THEN DENSE_RANK() OVER(PARTITION BY learner_class ORDER BY average_percentage DESC NULLS LAST)::int END AS class_rank,
      COALESCE(override_grade,boundary.label,legacy.label,academic.label) AS grade_label
    FROM scores LEFT JOIN LATERAL (
      SELECT label FROM exam_grading_policy_boundaries boundary WHERE boundary.tenant_id=${tenant}
        AND boundary.grading_policy_id=(SELECT id FROM selected_policy) AND average_percentage>=min_score
      ORDER BY min_score DESC LIMIT 1
    ) boundary ON TRUE
    LEFT JOIN LATERAL (
      SELECT label FROM exam_grade_boundaries boundary WHERE boundary.tenant_id=${tenant}
        AND boundary.exam_series_id=scores.exam_series_id AND average_percentage BETWEEN min_score AND max_score
      ORDER BY min_score DESC LIMIT 1
    ) legacy ON NOT EXISTS(SELECT 1 FROM selected_policy)
    LEFT JOIN LATERAL (
      SELECT rule->>'label' AS label FROM (
        SELECT system.rules FROM academics_grading_systems system
        CROSS JOIN (SELECT COALESCE(
          (SELECT NULLIF(to_jsonb(series)->>'grading_system_id','') FROM exam_series series
            WHERE series.tenant_id=${tenant} AND series.id=scores.exam_series_id),
          (SELECT settings.grading_system_id::text FROM academics_report_card_settings settings
            WHERE settings.tenant_id=${tenant} AND settings.is_active=TRUE ORDER BY settings.updated_at DESC,settings.created_at DESC LIMIT 1)
        ) AS id) preferred
        WHERE system.tenant_id=${tenant} AND system.is_active=TRUE AND (preferred.id IS NULL OR system.id::text=preferred.id)
        ORDER BY system.updated_at DESC,system.id LIMIT 1
      ) grading CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(grading.rules)='array' THEN grading.rules ELSE '[]'::jsonb END) rule
      WHERE COALESCE(rule->>'min',rule->>'min_score') ~ '^[0-9]+([.][0-9]+)?$'
        AND average_percentage>=COALESCE(rule->>'min',rule->>'min_score')::numeric
      ORDER BY COALESCE(rule->>'min',rule->>'min_score')::numeric DESC LIMIT 1
    ) academic ON NOT EXISTS(SELECT 1 FROM selected_policy)
  )`;
}

/** Refreshes only already-processed batches; immutable report documents still require controlled regeneration. */
export const EXAM_RESULT_REFRESH_SCHEMA = `
CREATE OR REPLACE FUNCTION refresh_changed_exam_results() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed record; processing_mode text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NOT EXISTS(SELECT 1 FROM changed_marks n JOIN prior_marks o ON n.id=o.id AND n.tenant_id=o.tenant_id
    WHERE (n.exam_series_id,n.assessment_id,n.class_section_id,n.subject_id,n.student_id,n.score,n.score_status,
      n.status IN ('reviewed','locked','published')) IS DISTINCT FROM
      (o.exam_series_id,o.assessment_id,o.class_section_id,o.subject_id,o.student_id,o.score,o.score_status,
      o.status IN ('reviewed','locked','published'))) THEN RETURN NULL; END IF;
  END IF;
  FOR changed IN SELECT DISTINCT batch.tenant_id,batch.id,batch.metadata FROM report_card_generation_batches batch
    JOIN changed_marks mark ON mark.tenant_id=batch.tenant_id AND mark.exam_series_id=batch.exam_series_id
      AND (batch.class_section_id IS NULL OR batch.class_section_id=mark.class_section_id)
    WHERE EXISTS(SELECT 1 FROM exam_result_snapshots s WHERE s.tenant_id=batch.tenant_id AND s.batch_id=batch.id)
    ORDER BY batch.tenant_id,batch.id LOOP
    processing_mode := COALESCE(changed.metadata->'results_processing'->>'mode','rankings');
    WITH ${examResultCtes('changed.tenant_id', 'changed.id', 'processing_mode')}
    UPDATE exam_result_snapshots snapshot SET raw_total=ranked.raw_total,assessment_count=ranked.assessment_count,
      average_percentage=ranked.average_percentage,grade_label=ranked.grade_label,class_rank=ranked.class_rank,processed_at=NOW()
    FROM ranked WHERE snapshot.tenant_id=changed.tenant_id AND snapshot.batch_id=changed.id AND snapshot.student_id=ranked.student_id
      AND (snapshot.raw_total,snapshot.assessment_count,snapshot.average_percentage,snapshot.grade_label,snapshot.class_rank)
        IS DISTINCT FROM (ranked.raw_total,ranked.assessment_count,ranked.average_percentage,ranked.grade_label,ranked.class_rank);
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS exam_results_after_insert ON exam_marks;
DROP TRIGGER IF EXISTS exam_results_after_update ON exam_marks;
DROP TRIGGER IF EXISTS exam_results_after_delete ON exam_marks;
CREATE TRIGGER exam_results_after_insert AFTER INSERT ON exam_marks REFERENCING NEW TABLE AS changed_marks
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_changed_exam_results();
CREATE TRIGGER exam_results_after_update AFTER UPDATE ON exam_marks REFERENCING NEW TABLE AS changed_marks OLD TABLE AS prior_marks
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_changed_exam_results();
CREATE TRIGGER exam_results_after_delete AFTER DELETE ON exam_marks REFERENCING OLD TABLE AS changed_marks
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_changed_exam_results();
`;
