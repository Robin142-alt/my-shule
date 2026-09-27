import { academicFoundationCompletion } from '@/lib/school/academic-foundation-completion';

const empty = { years: [], terms: [], classes: [], streams: [], subjects: [], departments: [], classSubjectAssignments: [], classTeachers: [], teacherAssignments: [], roleAppointments: [], curriculumConfigurations: [], gradingSystems: [], attendanceSettings: [], reportCardSettings: [] };

it('reports zero for a clean school and excludes draft, archived and expired setup', () => {
  expect(Object.values(academicFoundationCompletion(empty)).map(area => area.percent)).toEqual([0, 0, 0, 0, 0, 0]);
  const data = { ...empty, years: [{ id: 'y', status: 'archived', is_current: true }], curriculumConfigurations: [{ id: 'c', status: 'draft' }], roleAppointments: [{ id: 'r', status: 'active', effective_to: '2000-01-01' }] };
  expect(academicFoundationCompletion(data)['roles-curriculum'].percent).toBe(0);
  expect(academicFoundationCompletion(data).calendar.percent).toBe(0);
});

it('measures coverage rather than treating one teacher as a completed school allocation', () => {
  const data = { ...empty, years: [{ id: 'y', is_current: true }], classes: [{ id: 'a', academic_year_id: 'y' }, { id: 'b', academic_year_id: 'y' }], subjects: [{ id: 'math' }], classTeachers: [{ id: 't', class_section_id: 'a', academic_year_id: 'y' }], classSubjectAssignments: [{ id: 'offering', class_section_id: 'a', subject_id: 'math', stream_id: 'blue' }], teacherAssignments: [{ id: 'teach', class_section_id: 'a', subject_id: 'math', stream_id: 'red' }] };
  expect(academicFoundationCompletion(data).allocations.percent).toBe(25);
  data.teacherAssignments[0].stream_id = 'blue';
  expect(academicFoundationCompletion(data).allocations.percent).toBe(75);
});

it('does not count a current term in a different year or a policy linked to inactive grading', () => {
  const data = { ...empty, years: [{ id: 'y', is_current: true }], terms: [{ id: 't', academic_year_id: 'old', is_current: true }], gradingSystems: [{ id: 'grade', is_active: false }], reportCardSettings: [{ id: 'report', grading_system_id: 'grade' }] };
  expect(academicFoundationCompletion(data).calendar.percent).toBe(50);
  expect(academicFoundationCompletion(data).policies.percent).toBe(0);
});
