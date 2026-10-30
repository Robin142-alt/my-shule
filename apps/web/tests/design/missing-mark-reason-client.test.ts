import {withSession} from '@/lib/dashboard/api-client';
import {fetchTeacherMarkSheetLive, saveMissingMarkReasonLive} from '@/lib/modules/teacher-live';

jest.mock('@/lib/dashboard/api-client', () => ({withSession: jest.fn()}));
const session = {tenantId: 'school-a', user: {user_id: 'manager-a'}} as Parameters<typeof saveMissingMarkReasonLive>[0];
beforeEach(() => jest.clearAllMocks());

it('patches one reason with the current record version and assisted stream scope, without a class submission', async () => {
  const payload = {mark_entry_window_id: 'window-a', assessment_id: 'paper-a', student_id: 'student-a',
    score_status: 'Y' as const, expected_updated_at: '2026-10-29T10:00:00Z', paper_config_version: 3,
    teacher_user_id: 'teacher-a', stream_ids: ['blue']};
  const result = {success: true, data: {id: 'mark-a', student_id: 'student-a', status: 'submitted', score: null, score_status: 'Y', updated_at: '2026-10-29T10:01:00Z'}};
  jest.mocked(withSession).mockResolvedValue(result);
  expect(await saveMissingMarkReasonLive(session, payload)).toEqual(result);
  expect(withSession).toHaveBeenCalledTimes(1);
  expect(withSession).toHaveBeenCalledWith(session, '/exams/marks/missing-reason', {method: 'PATCH', body: payload});
});

it('reloads only the conflicting student inside the same exam, class, subject and paper', async () => {
  jest.mocked(withSession).mockResolvedValue({success: true, data: []});
  await fetchTeacherMarkSheetLive(session, {examSeriesId: 'exam-a', classSectionId: 'class-a', subjectId: 'subject-a',
    assessmentId: 'paper-a', studentId: 'student-a', teacherUserId: 'teacher-a', view: 'all'});
  const [actor, path] = jest.mocked(withSession).mock.calls[0];
  expect(actor).toBe(session);
  const query = new URL(String(path), 'https://local.test').searchParams;
  expect(Object.fromEntries(query)).toEqual({exam_series_id: 'exam-a', class_section_id: 'class-a', subject_id: 'subject-a',
    assessment_id: 'paper-a', student_id: 'student-a', teacher_user_id: 'teacher-a', view: 'all', offset: '0', limit: '100'});
});
