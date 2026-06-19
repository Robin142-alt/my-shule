import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Overview ──
export async function fetchAdmissionsOverview() {
  return requestDashboardApi('/admin-command/admissions/overview');
}

// ── Applications ──
export async function fetchApplications() {
  return requestDashboardApi('/admin-command/admissions/applications');
}
export async function createApplication(data: any) {
  return requestDashboardApi('/admin-command/admissions/applications', { method: 'POST', body: data });
}
export async function updateApplicationStatus(id: string, status: string) {
  return requestDashboardApi(`/admin-command/admissions/applications/${id}/status`, { method: 'POST', body: { status } });
}

// ── Interviews ──
export async function fetchInterviews() {
  return requestDashboardApi('/admin-command/admissions/interviews');
}
export async function scheduleInterview(data: any) {
  return requestDashboardApi('/admin-command/admissions/interviews', { method: 'POST', body: data });
}
export async function recordInterviewOutcome(id: string, data: any) {
  return requestDashboardApi(`/admin-command/admissions/interviews/${id}/outcome`, { method: 'POST', body: data });
}

// ── Documents ──
export async function fetchDocuments() {
  return requestDashboardApi('/admin-command/admissions/documents');
}
export async function verifyDocument(id: string) {
  return requestDashboardApi(`/admin-command/admissions/documents/${id}/verify`, { method: 'POST' });
}
export async function requestDocument(data: any) {
  return requestDashboardApi('/admin-command/admissions/documents/request', { method: 'POST', body: data });
}

// ── Class Placement ──
export async function fetchClassPlacements() {
  return requestDashboardApi('/admin-command/admissions/class-placement');
}
export async function assignClassPlacement(data: any) {
  return requestDashboardApi('/admin-command/admissions/class-placement', { method: 'POST', body: data });
}

// ── Parent Linking ──
export async function fetchParentLinks() {
  return requestDashboardApi('/admin-command/admissions/parent-linking');
}
export async function linkParent(data: any) {
  return requestDashboardApi('/admin-command/admissions/parent-linking', { method: 'POST', body: data });
}
export async function sendParentInvitation(id: string) {
  return requestDashboardApi(`/admin-command/admissions/parent-linking/${id}/invite`, { method: 'POST' });
}

// ── Admissions (main list) ──
export async function fetchAdmissionsList() {
  return requestDashboardApi('/admin-command/admissions/admissions');
}
export async function admitStudent(id: string) {
  return requestDashboardApi(`/admin-command/admissions/admissions/${id}/admit`, { method: 'POST' });
}
export async function generateAdmissionLetter(id: string) {
  return requestDashboardApi(`/admin-command/admissions/admissions/${id}/letter`, { method: 'POST' });
}

// ── Reports ──
export async function fetchAdmissionsReports() {
  return requestDashboardApi('/admin-command/admissions/reports');
}
export async function generateAdmissionsReport(data: any) {
  return requestDashboardApi('/admin-command/admissions/reports/generate', { method: 'POST', body: data });
}
