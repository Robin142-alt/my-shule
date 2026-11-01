import { paperClassScopeSql } from '../exam-result-policy';
import type { ReportCardSubjectPayload } from './report-card-template.service';

export const CLASS_AVERAGE_SQL = `WITH learners AS (
  SELECT DISTINCT student_id,subject_id FROM exam_marks
  WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND class_section_id::text=$3
), results AS (
  SELECT learner.student_id,learner.subject_id,
    CASE WHEN BOOL_AND(COALESCE(mark.score_status='exempt' OR (mark.score_status='entered'
      AND mark.score IS NOT NULL AND paper.max_score>0 AND mark.score BETWEEN 0 AND paper.max_score),FALSE))
    THEN SUM(mark.score/NULLIF(paper.max_score,0)*COALESCE(paper.weight,paper.max_score)) FILTER (WHERE mark.score_status='entered')
      /NULLIF(SUM(COALESCE(paper.weight,paper.max_score)) FILTER (WHERE mark.score_status='entered'),0)*100 END AS percentage
  FROM learners learner JOIN exam_assessments paper ON paper.tenant_id=$1 AND paper.exam_series_id=$2::uuid
    AND paper.subject_id=learner.subject_id AND ${paperClassScopeSql('paper', '$3::uuid')}
  LEFT JOIN exam_marks mark ON mark.tenant_id=$1 AND mark.exam_series_id=$2::uuid AND mark.class_section_id::text=$3
    AND mark.subject_id=learner.subject_id AND mark.student_id=learner.student_id AND mark.assessment_id=paper.id
    AND mark.status IN ('locked','published')
  GROUP BY learner.student_id,learner.subject_id
)
SELECT subject_id::text,ROUND(AVG(percentage),2)::float AS class_average,COUNT(percentage)::int AS compared_learners
FROM results GROUP BY subject_id`;

export const CLASS_AVERAGE_TOLERANCE = 5;
export const COMPARISON_STYLES = {
  above: { symbol: '▲', label: 'Above Average', color: '#2f7d49', background: '#edf6ec' },
  near: { symbol: '◆', label: 'Near Average', color: '#346ba3', background: '#edf3fa' },
  below: { symbol: '▼', label: 'Below Average', color: '#b05a58', background: '#faeeee' },
} as const;

export function classComparison(subject: ReportCardSubjectPayload): keyof typeof COMPARISON_STYLES | null {
  if (subject.score_status !== 'entered' || subject.score === null || !(subject.max_score > 0)
    || typeof subject.class_average !== 'number' || !Number.isFinite(subject.class_average)) return null;
  const percentage = subject.percentage ?? subject.score / subject.max_score * 100;
  const difference = Math.round((percentage - subject.class_average) * 100) / 100;
  return difference > CLASS_AVERAGE_TOLERANCE ? 'above' : difference < -CLASS_AVERAGE_TOLERANCE ? 'below' : 'near';
}

export function classComparisonCounts(subjects: ReportCardSubjectPayload[]) {
  const counts = { above: 0, near: 0, below: 0 };
  for (const subject of subjects) { const status = classComparison(subject); if (status) counts[status]++; }
  return { ...counts, total: counts.above + counts.near + counts.below };
}
