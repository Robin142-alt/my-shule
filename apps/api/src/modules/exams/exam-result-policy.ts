/** X/Y are evidence, never numeric marks. Explicit exemptions are not missing papers. */
export function examGradeOverride(statuses: Array<string | null | undefined>): 'X' | 'Y' | null {
  const values = statuses.map(status => String(status ?? '').toLowerCase());
  if (values.some(status => status === 'y' || status === 'irregularity')) return 'Y';
  if (values.some(status => ['x', 'missing', 'absent', 'not_assessed', 'incomplete', 'withheld', 'medical_exception', 'transfer_student'].includes(status))) return 'X';
  return null;
}

export interface PaperResult {
  score: number | null;
  max_score: number;
  score_status: string;
  weight?: number | null;
}

export function categoryResult(values: Record<string, unknown>, categories: Array<{ id: string; max_score: number | string }>) {
  if (!values || Array.isArray(values) || typeof values !== 'object' || !categories.length
    || Object.keys(values).some(id => !categories.some(category => category.id === id))) throw new Error('Category does not belong to this paper.');
  let total = 0; let missing = false; let irregular = false;
  for (const category of categories) {
    const value = values[category.id];
    if (value === null || value === undefined || value === 'X') missing = true;
    else if (value === 'Y') irregular = true;
    else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number(category.max_score))
      throw new Error(`Enter a category score between 0 and ${category.max_score}, X or Y.`);
    else total += value;
  }
  return { score: missing || irregular ? null : Number(total.toFixed(2)), score_status: irregular ? 'Y' as const : missing ? 'X' as const : 'entered' as const };
}

/** A null weight means raw marks: 10/20 + 60/80 = 70/100, not 62.5%. */
export function combinePapers(papers: PaperResult[]) {
  const applicable = papers.filter(paper => paper.score_status !== 'exempt');
  const override = examGradeOverride(applicable.map(paper => paper.score_status));
  const complete = applicable.length > 0 && applicable.every(paper => paper.score_status === 'entered'
    && paper.score !== null && Number.isFinite(paper.score) && paper.max_score > 0
    && paper.score >= 0 && paper.score <= paper.max_score);
  if (override || !complete) return { percentage: null, status: override ?? (applicable.length ? 'X' : 'exempt') };
  const denominator = applicable.reduce((total, paper) => total + (paper.weight ?? paper.max_score), 0);
  const numerator = applicable.reduce((total, paper) => total + Number(paper.score) / paper.max_score * (paper.weight ?? paper.max_score), 0);
  return { percentage: Number((numerator / denominator * 100).toFixed(2)), status: 'entered' };
}

// These SQL fragments accept only repository-owned expressions, never request values.
export function examGradeOverrideSql(status: string): string {
  return `CASE WHEN BOOL_OR(lower(${status}) IN ('y','irregularity')) THEN 'Y'
    WHEN BOOL_OR(lower(${status}) IN ('x','missing','absent','not_assessed','incomplete','withheld','medical_exception','transfer_student')) THEN 'X' ELSE NULL END`;
}

/** Class-specific papers replace legacy shared papers only for that exact class/subject/exam. */
export function paperClassScopeSql(paper: string, classId: string): string {
  return `(${paper}.class_section_id::text = ${classId}::text OR (${paper}.class_section_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM exam_assessments scoped_paper WHERE scoped_paper.tenant_id = ${paper}.tenant_id
      AND scoped_paper.exam_series_id = ${paper}.exam_series_id AND scoped_paper.subject_id = ${paper}.subject_id
      AND scoped_paper.class_section_id::text = ${classId}::text)))`;
}
