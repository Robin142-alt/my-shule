import { requestDashboardApi } from '@/lib/dashboard/api-client';

export async function fetchDeputyOverview() {
  return requestDashboardApi('/admin-command/deputy/overview');
}

export async function fetchDeputyDailyOperations() {
  return requestDashboardApi('/admin-command/deputy/daily-operations');
}

export async function fetchDeputyAttendance() {
  return requestDashboardApi('/admin-command/deputy/attendance');
}

export async function fetchDeputyDiscipline() {
  return requestDashboardApi('/admin-command/deputy/discipline');
}

export async function fetchDeputyWelfare() {
  return requestDashboardApi('/admin-command/deputy/welfare');
}

export async function fetchDeputyStaffDuty() {
  return requestDashboardApi('/admin-command/deputy/staff-duty');
}

export async function fetchDeputyTimetable() {
  return requestDashboardApi('/admin-command/deputy/timetable');
}

export async function fetchDeputyAcademics() {
  return requestDashboardApi('/admin-command/deputy/academics');
}

export async function fetchDeputyExams() {
  return requestDashboardApi('/admin-command/deputy/exams');
}

export async function fetchDeputyClasses() {
  return requestDashboardApi('/admin-command/deputy/classes');
}

export async function fetchDeputyApprovals() {
  return requestDashboardApi('/admin-command/deputy/approvals');
}

export async function fetchDeputyCommunication() {
  return requestDashboardApi('/admin-command/deputy/communication');
}

export async function fetchDeputyReports() {
  return requestDashboardApi('/admin-command/deputy/reports');
}

export async function fetchDeputyStaff() {
  return requestDashboardApi('/admin-command/deputy/staff');
}

export async function createDailyOperationNote(data: any) {
  return requestDashboardApi('/admin-command/deputy/daily-operations', { method: 'POST', body: data });
}

export async function notifyParentAttendance(attendanceId: string) {
  return requestDashboardApi(`/admin-command/deputy/attendance/${attendanceId}/notify`, { method: 'POST' });
}

export async function remindUnmarkedAttendance(data: any) {
  return requestDashboardApi('/admin-command/deputy/attendance/remind-unmarked', { method: 'POST', body: data });
}

export async function createDisciplineIncident(data: any) {
  return requestDashboardApi('/admin-command/deputy/discipline', { method: 'POST', body: data });
}

export async function escalateDisciplineIncident(id: string) {
  return requestDashboardApi(`/admin-command/deputy/discipline/${id}/escalate`, { method: 'POST' });
}

export async function createWelfareCase(data: any) {
  return requestDashboardApi('/admin-command/deputy/welfare', { method: 'POST', body: data });
}

export async function openWelfareCase(id: string) {
  return requestDashboardApi(`/admin-command/deputy/welfare/${id}/open`, { method: 'POST' });
}

export async function requestDutyReport(id: string) {
  return requestDashboardApi(`/admin-command/deputy/staff-duty/${id}/request-report`, { method: 'POST' });
}

export async function markTeachingAttendance(id: string) {
  return requestDashboardApi(`/admin-command/deputy/teaching/${id}/mark-attendance`, { method: 'POST' });
}

export async function logTeachingLesson(id: string) {
  return requestDashboardApi(`/admin-command/deputy/teaching/${id}/log-lesson`, { method: 'POST' });
}

export async function assignReliefTeacher(id: string, teacherName: string) {
  return requestDashboardApi(`/admin-command/deputy/timetable/${id}/assign`, { method: 'POST', body: { teacherName } });
}

export async function messageHOD(id: string) {
  return requestDashboardApi(`/admin-command/deputy/academics/${id}/message-hod`, { method: 'POST' });
}

export async function flagExamDelay(id: string) {
  return requestDashboardApi(`/admin-command/deputy/exams/${id}/flag-delay`, { method: 'POST' });
}

export async function actionApproval(id: string, action: string) {
  return requestDashboardApi(`/admin-command/deputy/approvals/${id}/action`, { method: 'POST', body: { action } });
}

export async function generateReport(data: any) {
  return requestDashboardApi('/admin-command/deputy/reports/generate', { method: 'POST', body: data });
}

export async function assignRole(data: any) {
  return requestDashboardApi('/admin-command/deputy/staff/assign-role', { method: 'POST', body: data });
}

export async function createFollowUpList(data: any) {
  return requestDashboardApi('/admin-command/deputy/attendance/follow-up', { method: 'POST', body: data });
}

export async function manageDutyRoster(data: any) {
  return requestDashboardApi('/admin-command/deputy/staff-duty/roster', { method: 'POST', body: data });
}

export async function autoAssignRelief() {
  return requestDashboardApi('/admin-command/deputy/timetable/auto-assign', { method: 'POST' });
}

export async function createIntervention(data: any) {
  return requestDashboardApi('/admin-command/deputy/academics/intervention', { method: 'POST', body: data });
}

export async function manageStreams(data: any) {
  return requestDashboardApi('/admin-command/deputy/classes/streams', { method: 'POST', body: data });
}
