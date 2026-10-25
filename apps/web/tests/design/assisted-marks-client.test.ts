import { withSession } from "@/lib/dashboard/api-client";
import { fetchPendingMarksLive, fetchTeacherMarkSheetLive, saveExamMarksLive } from "@/lib/modules/teacher-live";

jest.mock("@/lib/dashboard/api-client", () => ({ withSession: jest.fn() }));
const session = { tenantId: "school-a", user: { user_id: "manager-a" } } as Parameters<typeof saveExamMarksLive>[0];

beforeEach(() => jest.clearAllMocks());

it('preserves the selected stream scope without changing the actor or inventing a teacher',async()=>{
  jest.mocked(withSession).mockResolvedValue({windows:[]});
  await fetchPendingMarksLive(session,true,true,null,['white',null]);
  expect(withSession).toHaveBeenCalledWith(session,'/exams/assisted-marks-entry/markbooks?streamIds=white&streamIds=',{method:'GET'});
});

it("loads assisted markbooks through the existing exams proxy without changing the session", async () => {
  jest.mocked(withSession).mockResolvedValue({ windows: [] });
  await fetchPendingMarksLive(session, true, true, "teacher-a");
  expect(withSession).toHaveBeenCalledWith(session, "/exams/assisted-marks-entry/markbooks?teacherUserId=teacher-a", { method: "GET" });
});

it("sends the selected teacher as a roster filter, preserving the authenticated editor", async () => {
  jest.mocked(withSession).mockResolvedValue({ data: [] });
  await fetchTeacherMarkSheetLive(session, { examSeriesId: "exam-a", classSectionId: "class-a", subjectId: "maths", assessmentId: "paper-a", teacherUserId: "teacher-a" });
  const [actor, path] = jest.mocked(withSession).mock.calls[0];
  expect(actor).toBe(session);
  expect(path).toContain("/exams/marks?");
  expect(path).toContain("teacher_user_id=teacher-a");
});

it("uses separate assisted and normal teacher write endpoints", async () => {
  const payload = { action: "draft" as const, examId: "window-a", classSectionId: "class-a", assessmentId: "paper-a", marks: {} };
  await saveExamMarksLive(session, { ...payload, teacherUserId: "teacher-a" });
  expect(withSession).toHaveBeenLastCalledWith(session, "/exams/assisted-marks-entry", { method: "POST", body: { ...payload, teacherUserId: "teacher-a" } });
  await saveExamMarksLive(session, payload);
  expect(withSession).toHaveBeenLastCalledWith(session, "/class-teacher/marks", { method: "POST", body: payload });
});

it("routes a manager without a teacher through the protected manager endpoints",async()=>{
  jest.mocked(withSession).mockResolvedValue({windows:[]});
  await fetchPendingMarksLive(session,true,true,null);
  expect(withSession).toHaveBeenLastCalledWith(session,"/exams/assisted-marks-entry/markbooks",{method:"GET"});
  const payload={action:"draft" as const,examId:"window-a",classSectionId:"class-a",assessmentId:"paper-a",teacherUserId:null,streamIds:['white',''],marks:{}};
  await saveExamMarksLive(session,payload);
  expect(withSession).toHaveBeenLastCalledWith(session,"/exams/assisted-marks-entry",{method:"POST",body:payload});
});
