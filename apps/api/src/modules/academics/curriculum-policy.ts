export const BLUEPRINT_CURRICULA = [
  'cbc',
  'cbe',
  '8_4_4',
  'cambridge',
  'igcse',
  'international',
] as const;

export type BlueprintCurriculum = (typeof BLUEPRINT_CURRICULA)[number];
export type InstitutionCategory =
  | 'international_school'
  | 'primary_school'
  | 'junior_school'
  | 'secondary_high_school';

export type AcademicTermCode = 'term_1' | 'term_2' | 'term_3' | 'semester_1' | 'semester_2';
export type AssessmentModel =
  | 'competency_based_assessment'
  | 'national_exam_based'
  | 'external_exam_board'
  | 'school_defined';

export type CurriculumLevel = {
  code: string;
  label: string;
};

export type CurriculumPolicyInput = {
  tenantId: string;
  curriculum: BlueprintCurriculum;
  institutionCategory: InstitutionCategory;
  campuses: readonly string[];
  academicYear: string;
};

export type CurriculumPolicy = {
  tenant_id: string;
  curriculum: BlueprintCurriculum;
  institution_category: InstitutionCategory;
  campuses: string[];
  academic_year: string;
  terms: AcademicTermCode[];
  levels: CurriculumLevel[];
  learning_unit_label: 'learning_area' | 'subject';
  assessment_model: AssessmentModel;
};

export type CurriculumSetupInput = {
  classCount: number;
  streamCount: number;
  subjectCount: number;
  teacherAllocationCount: number;
  promotionRulesConfigured: boolean;
};

export type CurriculumSetupEvaluation = {
  tenant_id: string;
  curriculum: BlueprintCurriculum;
  status: 'pass' | 'fail';
  required_actions: string[];
};

export function buildCurriculumPolicy(input: CurriculumPolicyInput): CurriculumPolicy {
  return {
    tenant_id: input.tenantId,
    curriculum: input.curriculum,
    institution_category: input.institutionCategory,
    campuses: [...input.campuses],
    academic_year: input.academicYear,
    terms: termsForCurriculum(input.curriculum),
    levels: levelsFor(input.curriculum, input.institutionCategory),
    learning_unit_label: input.curriculum === 'cbc' || input.curriculum === 'cbe'
      ? 'learning_area'
      : 'subject',
    assessment_model: assessmentModelFor(input.curriculum),
  };
}

export function evaluateCurriculumSetup(
  policy: CurriculumPolicy,
  input: CurriculumSetupInput,
): CurriculumSetupEvaluation {
  const actions: string[] = [];

  if (input.classCount < policy.levels.length) {
    actions.push(`Configure at least ${policy.levels.length} academic levels for ${policy.curriculum}.`);
  }

  if (input.streamCount < 1) {
    actions.push('Configure at least one stream per active school level.');
  }

  if (input.subjectCount < minimumSubjectCount(policy)) {
    actions.push(`Configure at least ${minimumSubjectCount(policy)} ${policy.learning_unit_label}s.`);
  }

  if (input.teacherAllocationCount < input.subjectCount) {
    actions.push('Configure teacher allocations before go-live.');
  }

  if (!input.promotionRulesConfigured) {
    actions.push('Configure promotion rules for the curriculum.');
  }

  return {
    tenant_id: policy.tenant_id,
    curriculum: policy.curriculum,
    status: actions.length === 0 ? 'pass' : 'fail',
    required_actions: actions,
  };
}

function termsForCurriculum(curriculum: BlueprintCurriculum): AcademicTermCode[] {
  if (curriculum === 'international') {
    return ['semester_1', 'semester_2'];
  }

  return ['term_1', 'term_2', 'term_3'];
}

function levelsFor(
  curriculum: BlueprintCurriculum,
  institutionCategory: InstitutionCategory,
): CurriculumLevel[] {
  if (curriculum === 'cambridge' || curriculum === 'igcse') {
    return [
      { code: 'primary', label: 'Primary' },
      { code: 'lower_secondary', label: 'Lower Secondary' },
      { code: 'igcse', label: 'IGCSE' },
      { code: 'as_a_level', label: 'AS/A Level' },
    ];
  }

  if (curriculum === 'cbc' && institutionCategory === 'primary_school') {
    return rangeLevels('grade', 1, 6);
  }

  if (curriculum === 'cbe' || institutionCategory === 'junior_school') {
    return rangeLevels('grade', 7, 9);
  }

  if (institutionCategory === 'secondary_high_school' || curriculum === '8_4_4') {
    return rangeLevels('form', 1, 4);
  }

  return [
    { code: 'lower_school', label: 'Lower School' },
    { code: 'middle_school', label: 'Middle School' },
    { code: 'upper_school', label: 'Upper School' },
  ];
}

function assessmentModelFor(curriculum: BlueprintCurriculum): AssessmentModel {
  if (curriculum === 'cbc' || curriculum === 'cbe') {
    return 'competency_based_assessment';
  }

  if (curriculum === '8_4_4') {
    return 'national_exam_based';
  }

  if (curriculum === 'cambridge' || curriculum === 'igcse') {
    return 'external_exam_board';
  }

  return 'school_defined';
}

function minimumSubjectCount(policy: CurriculumPolicy): number {
  if (policy.curriculum === 'cbc' || policy.curriculum === 'cbe') {
    return 8;
  }

  return 6;
}

function rangeLevels(prefix: 'grade' | 'form', start: number, end: number): CurriculumLevel[] {
  const levels: CurriculumLevel[] = [];

  for (let value = start; value <= end; value += 1) {
    levels.push({
      code: `${prefix}_${value}`,
      label: `${capitalize(prefix)} ${value}`,
    });
  }

  return levels;
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
