export const TEACHER_WORKLOAD_SQL = `
  SELECT staff.id::text, staff.display_name AS teacher_name,
    COUNT(DISTINCT assignment.class_section_id)::int AS classes,
    COUNT(DISTINCT assignment.subject_id)::int AS subjects,
    COUNT(DISTINCT slot.id)::int AS lessons_per_week
  FROM staff_profiles staff
  LEFT JOIN teacher_subject_assignments assignment ON assignment.tenant_id = staff.tenant_id
    AND assignment.teacher_user_id::text = staff.user_id::text AND assignment.status = 'active'
  LEFT JOIN timetable_slots slot ON slot.tenant_id = assignment.tenant_id
    AND slot.teacher_id::text = assignment.teacher_user_id::text
    AND slot.class_section_id::text = assignment.class_section_id::text
    AND slot.subject_id::text = assignment.subject_id::text
  WHERE staff.tenant_id = $1 AND staff.status = 'active'
  GROUP BY staff.id, staff.display_name ORDER BY staff.display_name
`;

export const CURRICULUM_COVERAGE_SQL = `
  SELECT subject.id::text, subject.name AS subject, section.name AS class_name,
    COUNT(DISTINCT plan.id)::int AS planned_topics,
    COUNT(DISTINCT log.plan_id)::int AS covered_topics,
    ROUND(100.0 * COUNT(DISTINCT log.plan_id) / NULLIF(COUNT(DISTINCT plan.id), 0), 1) AS coverage
  FROM class_subject_assignments offering
  JOIN subjects subject ON subject.tenant_id = offering.tenant_id AND subject.id::text = offering.subject_id::text
  JOIN class_sections section ON section.tenant_id = offering.tenant_id AND section.id::text = offering.class_section_id::text
  LEFT JOIN academics_lesson_plans plan ON plan.tenant_id = offering.tenant_id
    AND plan.subject_id::text = offering.subject_id::text AND plan.class_id::text = offering.class_section_id::text
  LEFT JOIN academics_lesson_logs log ON log.tenant_id = plan.tenant_id AND log.plan_id::text = plan.id::text
  WHERE offering.tenant_id = $1 AND offering.status = 'active'
  GROUP BY subject.id, subject.name, section.id, section.name ORDER BY subject.name, section.name
`;

export const DEPARTMENT_PERFORMANCE_SQL = `
  SELECT department.id::text, department.name AS department,
    COUNT(mark.id)::int AS marks_count,
    ROUND(AVG(100.0 * mark.score / NULLIF(assessment.max_score, 0)), 2) AS average_score
  FROM academics_departments department
  LEFT JOIN subjects subject ON subject.tenant_id = department.tenant_id AND subject.department_id::text = department.id::text
  LEFT JOIN exam_assessments assessment ON assessment.tenant_id = subject.tenant_id AND assessment.subject_id::text = subject.id::text
  LEFT JOIN exam_marks mark ON mark.tenant_id = assessment.tenant_id AND mark.assessment_id::text = assessment.id::text
    AND mark.score_status = 'entered' AND mark.status IN ('submitted', 'reviewed', 'locked', 'published')
  WHERE department.tenant_id = $1
  GROUP BY department.id, department.name ORDER BY department.name
`;
