import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──────────────────────────────────────────────────
export async function fetchClassTeacherOverview() {
  return requestDashboardApi('/admin-command/class-teacher/overview');
}

export async function fetchMyClass() {
  return requestDashboardApi('/admin-command/class-teacher/my-class');
}

export async function fetchAttendanceFollowUp() {
  return requestDashboardApi('/admin-command/class-teacher/attendance-follow-up');
}

export async function fetchClassAcademics() {
  return requestDashboardApi('/admin-command/class-teacher/class-academics');
}

export async function fetchDisciplineFollowUp() {
  return requestDashboardApi('/admin-command/class-teacher/discipline-follow-up');
}

export async function fetchLearnerProfiles() {
  return requestDashboardApi('/admin-command/class-teacher/learner-profiles');
}

export async function fetchParentContacts() {
  return requestDashboardApi('/admin-command/class-teacher/parent-contacts');
}

export async function fetchReportComments() {
  return requestDashboardApi('/admin-command/class-teacher/report-comments');
}

export async function fetchClassTeacherReports() {
  return requestDashboardApi('/admin-command/class-teacher/reports');
}

export async function fetchWelfareNotes() {
  return requestDashboardApi('/admin-command/class-teacher/welfare-notes');
}

// ── Mutation functions ───────────────────────────────────────────────
export async function sendAttendanceFollowUp(studentId: string, data: any) {
  return requestDashboardApi(`/admin-command/class-teacher/attendance-follow-up/${studentId}/notify`, { method: 'POST', body: data });
}

export async function markAttendanceResolved(studentId: string) {
  return requestDashboardApi(`/admin-command/class-teacher/attendance-follow-up/${studentId}/resolve`, { method: 'POST' });
}

export async function addDisciplineFollowUp(incidentId: string, data: any) {
  return requestDashboardApi(`/admin-command/class-teacher/discipline-follow-up/${incidentId}/follow-up`, { method: 'POST', body: data });
}

export async function escalateDisciplineCase(incidentId: string) {
  return requestDashboardApi(`/admin-command/class-teacher/discipline-follow-up/${incidentId}/escalate`, { method: 'POST' });
}

export async function saveReportComment(studentId: string, data: any) {
  return requestDashboardApi(`/admin-command/class-teacher/report-comments/${studentId}`, { method: 'POST', body: data });
}

export async function submitAllComments(data: any) {
  return requestDashboardApi('/admin-command/class-teacher/report-comments/submit-all', { method: 'POST', body: data });
}

export async function createWelfareNote(data: any) {
  return requestDashboardApi('/admin-command/class-teacher/welfare-notes', { method: 'POST', body: data });
}

export async function escalateWelfareNote(noteId: string) {
  return requestDashboardApi(`/admin-command/class-teacher/welfare-notes/${noteId}/escalate`, { method: 'POST' });
}

export async function messageParent(parentId: string, data: any) {
  return requestDashboardApi(`/admin-command/class-teacher/parent-contacts/${parentId}/message`, { method: 'POST', body: data });
}

export async function generateClassReport(data: any) {
  return requestDashboardApi('/admin-command/class-teacher/reports/generate', { method: 'POST', body: data });
}

export async function updateLearnerNote(studentId: string, data: any) {
  return requestDashboardApi(`/admin-command/class-teacher/learner-profiles/${studentId}/note`, { method: 'POST', body: data });
}
