type RecordState = {
  id: string; status?: string; is_active?: boolean; archived_at?: string | null;
  effective_from?: string | null; effective_to?: string | null;
  academic_year_id?: string | null; academic_term_id?: string | null; is_current?: boolean;
  class_section_id?: string | null; stream_id?: string | null; cohort_id?: string | null;
  subject_id?: string | null; role_type?: string; department_id?: string | null;
  head_of_department_user_id?: string | null; grading_system_id?: string | null;
};
type Foundation = Record<'years' | 'terms' | 'classes' | 'streams' | 'subjects' | 'departments' |
  'classSubjectAssignments' | 'classTeachers' | 'teacherAssignments' | 'roleAppointments' |
  'curriculumConfigurations' | 'gradingSystems' | 'attendanceSettings' | 'reportCardSettings', RecordState[]>;

/** Each area averages its own documented setup checks; coverage checks count every live scope. */
export function academicFoundationCompletion(data: Foundation, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })) {
  const active = (row: RecordState) => (!row.status || row.status === 'active') && row.is_active !== false
    && !row.archived_at && (!row.effective_from || row.effective_from.slice(0, 10) <= today)
    && (!row.effective_to || row.effective_to.slice(0, 10) >= today);
  const years = data.years.filter(active);
  const currentYears = years.filter(row => row.is_current);
  const terms = data.terms.filter(row => active(row) && currentYears.some(year => year.id === row.academic_year_id));
  const classes = data.classes.filter(row => active(row) && currentYears.some(year => year.id === row.academic_year_id));
  const subjects = data.subjects.filter(active);
  const departments = data.departments.filter(active);
  const streams = data.streams.filter(active);
  const offerings = data.classSubjectAssignments.filter(row => active(row)
    && classes.some(section => section.id === row.class_section_id)
    && subjects.some(subject => subject.id === row.subject_id)
    && (!row.academic_term_id || terms.some(term => term.id === row.academic_term_id && term.is_current)));
  const appointments = data.roleAppointments.filter(active);
  const grading = data.gradingSystems.filter(active);
  const coverage = (rows: RecordState[], matches: (row: RecordState) => boolean) => rows.length ? rows.filter(matches).length / rows.length : 0;
  const area = (checks: Array<[string, number | boolean]>) => ({
    percent: Math.round(checks.reduce((sum, [, score]) => sum + Number(score), 0) / checks.length * 100),
    checks: checks.map(([label, score]) => ({ label, percent: Math.round(Number(score) * 100) })),
  });
  return {
    calendar: area([
      ['Academic year', years.length > 0], ['Current academic year', currentYears.length > 0],
      ['Terms in the current year', terms.length > 0], ['Current term', terms.some(row => row.is_current)],
    ]),
    classes: area([
      ['Classes/forms/grades in the current year', classes.length > 0],
      ['Classes with streams', coverage(classes, row => streams.some(stream => stream.class_section_id === row.id))],
    ]),
    subjects: area([
      ['Subjects/learning areas', subjects.length > 0], ['Departments', departments.length > 0],
      ['HODs assigned to departments', coverage(departments, row => Boolean(row.head_of_department_user_id))],
      ['School-wide HOS assigned to subjects', coverage(subjects, row => appointments.some(ap => ap.role_type === 'head_of_subject'
        && ap.subject_id === row.id && !ap.department_id && !ap.academic_year_id && !ap.class_section_id && !ap.stream_id))],
      ['Class subject offerings', coverage(classes, row => offerings.some(offering => offering.class_section_id === row.id))],
    ]),
    allocations: area([
      ['Class teachers for current classes', coverage(classes, row => data.classTeachers.some(assignment => active(assignment)
        && assignment.class_section_id === row.id && assignment.academic_year_id === row.academic_year_id))],
      ['Subject teachers for each offering', coverage(offerings, row => data.teacherAssignments.some(assignment => active(assignment)
        && assignment.class_section_id === row.class_section_id && assignment.subject_id === row.subject_id
        && (assignment.stream_id ?? null) === (row.stream_id ?? null)
        && (assignment.cohort_id ?? null) === (row.cohort_id ?? null)
        && (!assignment.academic_term_id || terms.some(term => term.id === assignment.academic_term_id && term.is_current))))],
    ]),
    'roles-curriculum': area([
      ['Current academic leadership appointments', appointments.length > 0],
      ['Active curriculum configuration', data.curriculumConfigurations.some(active)],
    ]),
    policies: area([
      ['Active grading system', grading.length > 0], ['Active attendance policy', data.attendanceSettings.some(active)],
      ['Report-card policy with active grading', data.reportCardSettings.some(row => active(row) && grading.some(policy => policy.id === row.grading_system_id))],
    ]),
  };
}
