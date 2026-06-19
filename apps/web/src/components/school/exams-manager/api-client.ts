import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──
export async function fetchExamsOverview() {
  return requestDashboardApi('/admin-command/exams-manager/overview');
}

export async function fetchExamSetup() {
  return requestDashboardApi('/admin-command/exams-manager/exam-setup');
}

export async function fetchExamTimetable() {
  return requestDashboardApi('/admin-command/exams-manager/exam-timetable');
}

export async function fetchMarksEntry() {
  return requestDashboardApi('/admin-command/exams-manager/marks-entry');
}

export async function fetchModeration() {
  return requestDashboardApi('/admin-command/exams-manager/moderation');
}

export async function fetchAnalysis() {
  return requestDashboardApi('/admin-command/exams-manager/analysis');
}

export async function fetchReportCards() {
  return requestDashboardApi('/admin-command/exams-manager/report-cards');
}

export async function fetchPublishing() {
  return requestDashboardApi('/admin-command/exams-manager/publishing');
}

export async function fetchExamsReports() {
  return requestDashboardApi('/admin-command/exams-manager/reports');
}

// ── Mutation functions ──
export async function createExam(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/exam-setup', { method: 'POST', body: data });
}

export async function createTimetableSlot(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/exam-timetable', { method: 'POST', body: data });
}

export async function submitMarks(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/marks-entry', { method: 'POST', body: data });
}

export async function lockMarksEntry(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/marks-entry/${examId}/lock`, { method: 'POST' });
}

export async function approveModeration(id: string) {
  return requestDashboardApi(`/admin-command/exams-manager/moderation/${id}/approve`, { method: 'POST' });
}

export async function rejectModeration(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/exams-manager/moderation/${id}/reject`, { method: 'POST', body: { reason } });
}

export async function generateReportCards(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/report-cards/${examId}/generate`, { method: 'POST' });
}

export async function publishResults(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/publishing/${examId}/publish`, { method: 'POST' });
}

export async function unpublishResults(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/publishing/${examId}/unpublish`, { method: 'POST' });
}

export async function generateExamsReport(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/reports/generate', { method: 'POST', body: data });
}
