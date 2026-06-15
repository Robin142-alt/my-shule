import { withSession, type LiveAuthSession } from "@/lib/dashboard/api-client";

export interface TeacherAssignedClass {
  id: string;
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
  examName: string;
  className: string;
  classSectionId: string;
  subjectName: string;
  paperName: string;
  outOf: number;
  deadline: string;
  enteredCount: number;
  totalStudents: number;
  status: string;
}

export async function fetchPendingMarksLive(session: LiveAuthSession): Promise<{
  stats: { totalWindows: number; nearingDeadline: number };
  windows: PendingMarksWindow[];
}> {
  return withSession(session, "/class-teacher/pending-marks", {
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
  return withSession(session, "/class-teacher/timetable", {
    method: "GET",
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
  feeStatus: string;
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

export async function saveExamMarksLive(session: LiveAuthSession, data: any): Promise<{ success: boolean }> {
  return withSession(session, "/class-teacher/marks", {
    method: "POST",
    body: data,
  });
}

