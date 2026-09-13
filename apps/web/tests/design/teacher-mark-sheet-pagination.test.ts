import { withSession } from '@/lib/dashboard/api-client';
import { fetchTeacherMarkSheetLive } from '@/lib/modules/teacher-live';

jest.mock('@/lib/dashboard/api-client', () => ({ withSession: jest.fn() }));

it('loads all roster pages before resolving the markbook', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ student_id: `student-${index}` }));
  jest.mocked(withSession).mockResolvedValueOnce({ data: firstPage }).mockResolvedValueOnce({ data: [{ student_id: 'student-100' }] });
  const session = { tenantId: 'school-a' } as Parameters<typeof fetchTeacherMarkSheetLive>[0];
  const result = await fetchTeacherMarkSheetLive(session, { examSeriesId: 'exam', classSectionId: 'class', subjectId: 'subject', assessmentId: 'paper' });
  expect(result).toHaveLength(101);
  const calls = jest.mocked(withSession).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][1]).toContain('offset=0');
  expect(calls[1][1]).toContain('offset=100');
  for (const call of calls) {
    expect(call[0]).toBe(session);
    expect(call[1]).toContain('assessment_id=paper');
    expect(call[1]).toContain('class_section_id=class');
  }
});
