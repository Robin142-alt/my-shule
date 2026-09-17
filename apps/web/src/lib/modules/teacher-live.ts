import { withSession, type LiveAuthSession } from "@/lib/dashboard/api-client";

export interface TeacherAssignedClass {
  id: string;
  classSectionId: string;
  subjectId: string;
  className: string;
  subjectName: string;
  learnersCount: number;
  attendanceStatus: string;
  catAverage: string;
}

export interface TeacherOverviewStats {
  assignedClasses: number;
  totalLearnersTaught: number;
  averageAttendance: string;
}

export async function fetchTeacherClassesLive(session: LiveAuthSession): Promise<{
  stats: TeacherOverviewStats;
  classes: TeacherAssignedClass[];
}> {
  return withSession(session, "/class-teacher/my-classes", {
    method: "GET",
  });
}

export async function fetchClassTeacherOverviewLive(session: LiveAuthSession, streamId?: string) {
  return withSession(session, `/class-teacher/overview${streamId ? `?streamId=${streamId}` : ''}`, {
    method: "GET",
  });
}

export interface TeacherDashboardOverview {
  todaysLessons: { count: number; detail: string };
  pendingAttendance: { count: number; detail: string };
  pendingLessonLogs: { count: number; detail: string };
  openMarkEntry: { count: number; detail: string };
  assignmentsDue: { count: number; detail: string };
  learnersNeedingAttention: { count: number; detail: string };
  unreadMessages: { count: number; detail: string };
  storeRequests: { count: number; detail: string };
}

export async function fetchTeacherDashboardOverviewLive(session: LiveAuthSession): Promise<TeacherDashboardOverview> {
  return withSession(session, `/class-teacher/dashboard-overview`, {
    method: "GET",
  });
}

export interface AssignmentTask {
  id: string;
  title: string;
  className?: string;
  subject: string;
  dueDate: string;
  status: string;
}

export async function fetchAssignmentsLive(session: LiveAuthSession, streamId?: string): Promise<AssignmentTask[]> {
  return withSession(session, `/class-teacher/homework${streamId ? `?streamId=${streamId}` : ''}`, {
    method: "GET",
  });
}

export async function createAssignmentLive(session: LiveAuthSession, data: any): Promise<{ success: boolean }> {
  return withSession(session, `/class-teacher/homework`, {
    method: "POST",
    body: data,
  });
}

export interface LessonLog {
  id: string;
  date: string;
  class: string;
  subject: string;
  topics: string;
  status: string;
}

export async function fetchLessonLogsLive(session: LiveAuthSession, streamId?: string): Promise<LessonLog[]> {
  return withSession(session, `/class-teacher/lesson-logs${streamId ? `?streamId=${streamId}` : ''}`, {
    method: "GET",
  });
}

export async function createLessonLogLive(session: LiveAuthSession, data: any): Promise<{ success: boolean }> {
  return withSession(session, `/class-teacher/lesson-logs`, {
    method: "POST",
    body: data,
  });
}

export interface PendingAttendanceTask {
  id: string;
  classSectionId: string;
  date: string;
  time: string;
  className: string;
  subjectName: string;
  expected: number;
  status: string;
}

export async function fetchPendingAttendanceLive(session: LiveAuthSession): Promise<{
  stats: { totalTasks: number; pendingTasks: number };
  tasks: PendingAttendanceTask[];
}> {
  return withSession(session, "/class-teacher/pending-attendance", {
    method: "GET",
  });
}

export interface ClassRegisterStudent {
  id: string;
  admissionNo: string;
  name: string;
  gender: string;
  parentPhone: string;
  status: string;
}

export async function fetchClassRegisterLive(session: LiveAuthSession, streamId: string): Promise<ClassRegisterStudent[]> {
  return withSession(session, `/class-teacher/register?streamId=${streamId}`, {
    method: "GET",
  });
}

export interface PendingMarksWindow {
  id: string;
  sheetId?: string;
  streamNames?: string | null;
  savedCount?: number;
  submittedAt?: string | null;
  examSeriesId: string;
  academicTermId: string;
  examName: string;
  className: string;
  classSectionId: string;
  subjectId: string;
  subjectName: string;
  assessmentId: string;
  paperName: string;
  outOf: number;
  deadline: string;
  enteredCount: number;
  totalStudents: number;
  status: string;
  canEnter?: boolean;
  entryState?: string;
  opensAt?: string;
}

export async function fetchPendingMarksLive(session: LiveAuthSession, includeUnavailable = false, includeSubmitted = false): Promise<{
  stats: { totalWindows: number; nearingDeadline: number };
  windows: PendingMarksWindow[];
}> {
  const query = new URLSearchParams();
  if (includeUnavailable) query.set('includeUnavailable', 'true');
  if (includeSubmitted) query.set('includeSubmitted', 'true');
  return withSession(session, `/class-teacher/pending-marks${query.size ? `?${query}` : ""}`, {
    method: "GET",
  });
}

export interface TimetableSlot {
  id: string;
  dayName: string;
  startTime: string;
  endTime: string;
  className: string;
  subjectName: string;
  roomName: string;
}

export async function fetchTimetableLive(session: LiveAuthSession): Promise<TimetableSlot[]> {
  const response = await withSession<unknown>(session, "/timetable/my-schedule", {
    method: "GET",
  });
  const rows = Array.isArray(response)
    ? response
    : Array.isArray((response as { slots?: unknown[] } | null)?.slots)
      ? (response as { slots: unknown[] }).slots
      : Array.isArray((response as { items?: unknown[] } | null)?.items)
        ? (response as { items: unknown[] }).items
        : [];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return rows.map((value, index) => {
    const row = value as Record<string, unknown>;
    const dayNumber = Number(row.day_of_week ?? row.dayOfWeek ?? 0);
    return {
      id: String(row.id ?? row.slot_id ?? `published-slot-${index}`),
      dayName: String(row.day_name ?? row.dayName ?? dayNames[dayNumber - 1] ?? "Day not recorded"),
      startTime: String(row.starts_at ?? row.startTime ?? "").slice(0, 5),
      endTime: String(row.ends_at ?? row.endTime ?? "").slice(0, 5),
      className: String(row.class_name ?? row.className ?? row.class_section_id ?? "Class not recorded"),
      subjectName: String(row.subject_name ?? row.subjectName ?? row.subject_id ?? "Subject not recorded"),
      roomName: String(row.resource_name ?? row.room_name ?? row.roomName ?? row.room_id ?? "General classroom"),
    };
  });
}

export interface ParentMessage {
  id: string;
  date: string;
  recipient: string;
  message: string;
  status: string;
}

export async function fetchSentMessagesLive(session: LiveAuthSession): Promise<ParentMessage[]> {
  return withSession(session, "/class-teacher/sent-messages", {
    method: "GET",
  });
}

export interface ClassTeacherStudentOverview {
  id: string;
  admissionNo: string;
  name: string;
  className: string;
  attendancePercent: string;
  academic: string;
  discipline: string;
}

export async function fetchClassRegisterOverviewLive(session: LiveAuthSession): Promise<{
  stats: { totalLearners: number; absentToday: number };
  students: ClassTeacherStudentOverview[];
}> {
  return withSession(session, "/class-teacher/register-overview", {
    method: "GET",
  });
}

export interface DisciplineConcern {
  id: string;
  date: string;
  learner: string;
  className: string;
  type: string;
  severity: string;
  sentTo: string;
  status: string;
}

export async function fetchDisciplineConcernsLive(session: LiveAuthSession): Promise<DisciplineConcern[]> {
  return withSession(session, "/class-teacher/discipline-concerns", {
    method: "GET",
  });
}

export async function raiseDisciplineConcernLive(session: LiveAuthSession, data: any): Promise<{ success: boolean }> {
  return withSession(session, "/class-teacher/discipline-concerns", {
    method: "POST",
    body: data,
  });
}

export interface ReportComment {
  studentId: string;
  admissionNo: string;
  name: string;
  comment: string;
  status: string;
}

export async function fetchReportCommentsLive(session: LiveAuthSession): Promise<ReportComment[]> {
  return withSession(session, "/class-teacher/report-comments", {
    method: "GET",
  });
}

export async function saveReportCommentLive(session: LiveAuthSession, data: any): Promise<{ success: boolean }> {
  return withSession(session, "/class-teacher/report-comments", {
    method: "POST",
    body: data,
  });
}

export const EXAM_SCORE_STATUSES = [
  "entered",
  "absent",
  "exempt",
  "not_assessed",
  "incomplete",
  "withheld",
  "medical_exception",
  "transfer_student",
] as const;

export type ExamScoreStatus = (typeof EXAM_SCORE_STATUSES)[number];

export interface TeacherMarkSheetRow {
  id: string | null;
  mark_entry_window_id: string;
  exam_series_id: string;
  exam_series_name: string;
  academic_term_id: string;
  assessment_id: string;
  assessment_name: string;
  max_score: number;
  assessment_weight: number;
  class_section_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  student_id: string;
  admission_number: string | null;
  student_name: string | null;
  score: number | null;
  score_status: ExamScoreStatus;
  remarks: string | null;
  status: string;
  entered_by_user_id: string | null;
  updated_at: string | null;
  opens_at: string;
  closes_at: string;
}

interface ExamsActionResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function fetchTeacherMarkSheetLive(
  session: LiveAuthSession,
  filters: {
    examSeriesId: string;
    classSectionId: string;
    subjectId: string;
    assessmentId: string;
    view?: 'active' | 'submitted';
  },
): Promise<TeacherMarkSheetRow[]> {
  const query = new URLSearchParams({
    exam_series_id: filters.examSeriesId,
    class_section_id: filters.classSectionId,
    subject_id: filters.subjectId,
    assessment_id: filters.assessmentId,
    limit: "100",
  });
  if (filters.view === 'submitted') query.set('view', 'submitted');
  // The API pages at 100 students. Submission needs the entire assigned roster,
  // including large classes, before it can ask about every missing score.
  const rows: TeacherMarkSheetRow[] = [];
  for (let offset = 0; ; offset += 100) {
    query.set("offset", String(offset));
    const response = await withSession<ExamsActionResponse<TeacherMarkSheetRow[]>>(
      session, `/exams/marks?${query.toString()}`, { method: "GET" },
    );
    rows.push(...response.data);
    if (response.data.length < 100) return rows;
  }
}

export interface TeacherMarkDraftInput {
  score?: number | null;
  score_status: ExamScoreStatus;
  remarks?: string;
}

export interface SaveTeacherMarksPayload extends Record<string, unknown> {
  action: "draft" | "submit";
  examId: string;
  classSectionId: string;
  assessmentId?: string;
  marks: Record<string, TeacherMarkDraftInput>;
}

export interface SaveTeacherMarksResult {
  success: boolean;
  action: "draft" | "submit";
  status: string;
  savedCount: number;
  submittedCount: number;
  markIds: string[];
}

export async function saveExamMarksLive(
  session: LiveAuthSession,
  data: SaveTeacherMarksPayload,
): Promise<SaveTeacherMarksResult> {
  return withSession(session, "/class-teacher/marks", {
    method: "POST",
    body: data,
  });
}
