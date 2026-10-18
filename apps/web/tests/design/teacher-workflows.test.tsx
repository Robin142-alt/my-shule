import { LessonLogWorkspace } from "@/components/school/teacher-dashboard/lesson-log-workspace";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignmentsWorkspace } from "@/components/school/teacher-dashboard/assignments-workspace";
import { DisciplineWelfareWorkspace } from "@/components/school/teacher-dashboard/discipline-welfare-workspace";
import { navItems } from "@/components/school/teacher-dashboard/nav-config";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";
import * as live from "@/lib/modules/teacher-live";

let mockCanWrite = true;
jest.mock("@/hooks/use-live-tenant-session", () => ({ useLiveTenantSession: () => ({ session: { tenantId: "school-a", user: { user_id: "teacher-a" } }, isLoading: false }) }));
jest.mock("@/components/providers/permission-context", () => ({ usePermissions: () => ({ hasPermission: () => mockCanWrite }) }));
jest.mock("@/lib/modules/teacher-live", () => ({
  fetchLessonLogsLive: jest.fn(), createLessonLogLive: jest.fn(), fetchAssignmentsLive: jest.fn(), fetchTeacherClassesLive: jest.fn(), createAssignmentLive: jest.fn(),
  fetchTeacherSubmissions: jest.fn(), reviewTeacherSubmission: jest.fn(),
  fetchDisciplineConcernsLive: jest.fn(), fetchTeacherConcernOptions: jest.fn(), raiseDisciplineConcernLive: jest.fn(), fetchTeacherConcernDetail: jest.fn(),
}));
const api = jest.mocked(live);
const assignment = { id: "assignment-1", title: "Fractions", className: "Grade 7 Blue", subject: "Mathematics", dueDate: "19/10/2026", createdAt: "2026-10-18T10:00:00Z", status: "Published", maxScore: 20, total: 2, submitted: 1, graded: 0 };
const learner = { studentId: "learner-1", admissionNo: "ADM001", name: "Test learner", id: "submission-1", status: "completed", submittedAt: "2026-10-18T10:00:00Z", updatedAt: "2026-10-18T10:00:00Z", score: null, feedback: null, completionMode: "student_marked_done" };
const concern = { id: "concern-1", reference: "DIS-001", title: "Follow up", description: "Class concern", date: "2026-10-18", learner: "Test learner", className: "Grade 7", type: "Behaviour", severity: "medium", sentTo: "Discipline team", status: "reported", updatedAt: "2026-10-18" };

function mount(component: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
}
beforeEach(() => {
  jest.resetAllMocks(); mockCanWrite = true;
  api.fetchAssignmentsLive.mockResolvedValue([assignment]);
  api.fetchLessonLogsLive.mockResolvedValue([]); api.createLessonLogLive.mockResolvedValue({success:true});
  api.fetchTeacherClassesLive.mockResolvedValue({ stats: { assignedClasses: 1, totalLearnersTaught: 2, averageAttendance: "—" },
    classes: [{ id: "allocation-1", classSectionId: "class-1", subjectId: "subject-1", streamId: "stream-blue", className: "Grade 7 Blue", subjectName: "Math", learnersCount: 2, attendanceStatus: "Pending", catAverage: "—" }] });
  api.createAssignmentLive.mockResolvedValue({ success: true, assignmentId: "new-assignment" });
  api.fetchTeacherSubmissions.mockResolvedValue({ assignment: { ...assignment, description: "Exercises 1-5" }, students: [learner] });
  api.reviewTeacherSubmission.mockResolvedValue({ success: true });
  api.fetchDisciplineConcernsLive.mockResolvedValue([concern]);
  api.fetchTeacherConcernOptions.mockResolvedValue({ students: [{ id: "learner-1", name: "Test learner", admissionNo: "ADM001", classId: "class-1", className: "Grade 7" }], categories: [{ id: "category-1", name: "Behaviour", defaultSeverity: "medium" }] });
  api.raiseDisciplineConcernLive.mockResolvedValue({ success: true, reference: "DIS-002" });
  api.fetchTeacherConcernDetail.mockResolvedValue({ incident: { title: concern.title, description: concern.description, incident_number: concern.reference, status: "resolved", action_taken: "Discussed with school support" }, actions: [{ id: "action", title: "Follow-up meeting", status: "completed" }], comments: [{ id: "comment", body: "Support meeting completed.", created_at: "2026-10-18" }] });
});

it("keeps every remaining sidebar route usable and removes assessment and role shortcuts", () => {
  expect(navItems.map(row => row.id)).not.toEqual(expect.arrayContaining(["assessments-cats", "class-teacher", "club", "attendance"]));
  expect(navItems.some(row => row.group === "Roles")).toBe(false);
  expect(navItems.map(row => row.id)).toEqual(expect.arrayContaining(["exams-marks", "exam-analytics", "learner-progress", "invigilation"]));
  for (const item of navItems) expect(isSchoolWorkspaceSection("teacher", item.id)).toBe(true);
});

it("publishes homework using the selected backend class, subject and stream", async () => {
  mount(<AssignmentsWorkspace onStartAction={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Create Assignment" }));
  await screen.findByRole("option", { name: /Grade 7 Blue/ });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Decimals" } });
  fireEvent.change(screen.getByLabelText("Assigned class and subject"), { target: { value: "allocation-1" } });
  fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-10-20" } });
  fireEvent.change(screen.getByLabelText("Total marks"), { target: { value: "20" } });
  fireEvent.click(screen.getByRole("button", { name: "Publish Assignment" }));
  await waitFor(() => expect(api.createAssignmentLive).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "school-a" }),
    expect.objectContaining({ title: "Decimals", classId: "class-1", subjectId: "subject-1", streamId: "stream-blue", maxScore: 20, dueDate: "2026-10-20T23:59:59+03:00" })));
  expect(await screen.findByText("Assignment published to the allocated learners.")).toBeVisible();
});

it("opens persisted submissions and saves a zero score with feedback", async () => {
  mount(<AssignmentsWorkspace onStartAction={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View / Grade" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review Work" }));
  fireEvent.change(screen.getByLabelText("Score out of 20"), { target: { value: "0" } });
  fireEvent.change(screen.getByLabelText("Feedback"), { target: { value: "Please revise fractions" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Grade" }));
  await waitFor(() => expect(api.reviewTeacherSubmission).toHaveBeenCalledWith(expect.anything(), "assignment-1", expect.objectContaining({ studentId: "learner-1", status: "graded", score: 0, feedback: "Please revise fractions" })));
  expect(await screen.findByText("Submission updated.")).toBeVisible();
});

it("requires feedback before returning work and keeps failed review editable", async () => {
  api.reviewTeacherSubmission.mockRejectedValue(new Error("Review service unavailable"));
  mount(<AssignmentsWorkspace onStartAction={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View / Grade" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review Work" }));
  expect(screen.getByRole("button", { name: "Return for Revision" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Feedback"), { target: { value: "Complete question 2" } });
  fireEvent.click(screen.getByRole("button", { name: "Return for Revision" }));
  expect(await screen.findByText("Review service unavailable")).toBeVisible();
  expect(screen.getByLabelText("Feedback")).toHaveValue("Complete question 2");
});

it("records receipt for missing paper work without inventing a grade", async () => {
  api.fetchTeacherSubmissions.mockResolvedValue({ assignment: { ...assignment, description: "" }, students: [{ ...learner, id: null, status: "missing", updatedAt: null }] });
  mount(<AssignmentsWorkspace onStartAction={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View / Grade" }));
  fireEvent.click(await screen.findByRole("button", { name: "Record Received" }));
  await waitFor(() => expect(api.reviewTeacherSubmission).toHaveBeenCalledWith(expect.anything(), "assignment-1", { studentId: "learner-1", status: "submitted", expectedUpdatedAt: undefined }));
});

it("provides a real empty assignment action and restricts read-only roles", async () => {
  mockCanWrite = false; api.fetchAssignmentsLive.mockResolvedValue([]);
  mount(<AssignmentsWorkspace onStartAction={jest.fn()} />);
  expect(await screen.findByText(/No assignments yet/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Create Assignment" })).toBeDisabled();
});

it("raises a concern for an allocated learner and shows the saved reference", async () => {
  mount(<DisciplineWelfareWorkspace onStartAction={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Raise Concern" }));
  await screen.findByRole("option", { name: /Test learner/ });
  fireEvent.change(screen.getByLabelText("Learner"), { target: { value: "learner-1" } });
  fireEvent.change(screen.getByLabelText("Concern type"), { target: { value: "category-1" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Class concern" } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Please follow up" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Concern" }));
  expect(await screen.findByText(/Concern DIS-002 recorded/)).toBeVisible();
  expect(api.raiseDisciplineConcernLive).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ studentId: "learner-1", categoryId: "category-1", title: "Class concern" }));
});

it("tracks the discipline team's saved status and shared follow-up", async () => {
  mount(<DisciplineWelfareWorkspace onStartAction={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View Status" }));
  expect(await screen.findByText("Support meeting completed.")).toBeVisible();
  expect(screen.getByText("Discussed with school support")).toBeVisible();
  expect(screen.getByText("Follow-up meeting")).toBeVisible();
});

it("shows query failures with retry instead of a false empty workspace", async () => {
  api.fetchDisciplineConcernsLive.mockRejectedValueOnce(new Error("School service unavailable"));
  mount(<DisciplineWelfareWorkspace onStartAction={jest.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("School service unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByRole("button", { name: "View Status" })).toBeVisible();
});

it("records taught and not-taught lessons without exposing attendance registers", async () => {
  mount(<LessonLogWorkspace />);
  fireEvent.click(screen.getByRole("button", {name:"Record Lesson"}));
  await screen.findByRole("option", {name:/Grade 7 Blue/});
  fireEvent.change(screen.getByLabelText(/Assigned class and subject/), {target:{value:"allocation-1"}});
  fireEvent.change(screen.getByLabelText(/Was the lesson taught/), {target:{value:"not_taught"}});
  expect(screen.getByRole("button",{name:"Save Lesson"})).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Reason not taught"), {target:{value:"School assembly"}});
  fireEvent.click(screen.getByRole("button",{name:"Save Lesson"}));
  await screen.findByText("Lesson delivery recorded.");
  expect(api.createLessonLogLive).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({classId:"class-1",subjectId:"subject-1",streamId:"stream-blue",lessonStatus:"not_taught",challenges:"School assembly"}));
  expect(screen.queryByRole("button",{name:/View Register|Mark Attendance/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Record Lesson"}));
  fireEvent.change(screen.getByLabelText(/Assigned class and subject/), {target:{value:"allocation-1"}});
  fireEvent.change(screen.getByLabelText("Topics covered"), {target:{value:"Fraction addition"}});
  fireEvent.click(screen.getByRole("button",{name:"Save Lesson"}));
  await waitFor(()=>expect(api.createLessonLogLive).toHaveBeenLastCalledWith(expect.anything(),expect.objectContaining({lessonStatus:"taught",topics:"Fraction addition"})));
});
