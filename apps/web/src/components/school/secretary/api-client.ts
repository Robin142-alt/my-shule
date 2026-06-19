import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Overview ──
export async function fetchSecretaryOverview() {
  return requestDashboardApi('/admin-command/secretary/overview');
}

// ── Reception Queue ──
export async function fetchReceptionQueue() {
  return requestDashboardApi('/admin-command/secretary/reception-queue');
}
export async function createQueueEntry(data: any) {
  return requestDashboardApi('/admin-command/secretary/reception-queue', { method: 'POST', body: data });
}
export async function callNextInQueue(id: string) {
  return requestDashboardApi(`/admin-command/secretary/reception-queue/${id}/call`, { method: 'POST' });
}
export async function completeQueueEntry(id: string) {
  return requestDashboardApi(`/admin-command/secretary/reception-queue/${id}/complete`, { method: 'POST' });
}

// ── Visitors ──
export async function fetchVisitors() {
  return requestDashboardApi('/admin-command/secretary/visitors');
}
export async function checkInVisitor(data: any) {
  return requestDashboardApi('/admin-command/secretary/visitors/check-in', { method: 'POST', body: data });
}
export async function checkOutVisitor(id: string) {
  return requestDashboardApi(`/admin-command/secretary/visitors/${id}/check-out`, { method: 'POST' });
}
export async function printVisitorSlip(id: string) {
  return requestDashboardApi(`/admin-command/secretary/visitors/${id}/print-slip`, { method: 'POST' });
}

// ── Appointments ──
export async function fetchAppointments() {
  return requestDashboardApi('/admin-command/secretary/appointments');
}
export async function createAppointment(data: any) {
  return requestDashboardApi('/admin-command/secretary/appointments', { method: 'POST', body: data });
}
export async function cancelAppointment(id: string) {
  return requestDashboardApi(`/admin-command/secretary/appointments/${id}/cancel`, { method: 'POST' });
}
export async function rescheduleAppointment(id: string, data: any) {
  return requestDashboardApi(`/admin-command/secretary/appointments/${id}/reschedule`, { method: 'POST', body: data });
}
export async function confirmAppointment(id: string) {
  return requestDashboardApi(`/admin-command/secretary/appointments/${id}/confirm`, { method: 'POST' });
}

// ── Calls Log ──
export async function fetchCallsLog() {
  return requestDashboardApi('/admin-command/secretary/calls-log');
}
export async function logCall(data: any) {
  return requestDashboardApi('/admin-command/secretary/calls-log', { method: 'POST', body: data });
}
export async function markCallFollowedUp(id: string) {
  return requestDashboardApi(`/admin-command/secretary/calls-log/${id}/follow-up`, { method: 'POST' });
}

// ── Parent Messages ──
export async function fetchParentMessages() {
  return requestDashboardApi('/admin-command/secretary/parent-messages');
}
export async function sendParentMessage(data: any) {
  return requestDashboardApi('/admin-command/secretary/parent-messages', { method: 'POST', body: data });
}
export async function markMessageRead(id: string) {
  return requestDashboardApi(`/admin-command/secretary/parent-messages/${id}/read`, { method: 'POST' });
}
export async function replyToMessage(id: string, data: any) {
  return requestDashboardApi(`/admin-command/secretary/parent-messages/${id}/reply`, { method: 'POST', body: data });
}

// ── Letters & Documents ──
export async function fetchLettersDocuments() {
  return requestDashboardApi('/admin-command/secretary/letters-documents');
}
export async function createDocument(data: any) {
  return requestDashboardApi('/admin-command/secretary/letters-documents', { method: 'POST', body: data });
}
export async function downloadDocument(id: string) {
  return requestDashboardApi(`/admin-command/secretary/letters-documents/${id}/download`, { method: 'POST' });
}
export async function printDocument(id: string) {
  return requestDashboardApi(`/admin-command/secretary/letters-documents/${id}/print`, { method: 'POST' });
}

// ── Student Clearance ──
export async function fetchStudentClearance() {
  return requestDashboardApi('/admin-command/secretary/student-clearance');
}
export async function initiateClearance(data: any) {
  return requestDashboardApi('/admin-command/secretary/student-clearance', { method: 'POST', body: data });
}
export async function approveClearanceStep(id: string, step: string) {
  return requestDashboardApi(`/admin-command/secretary/student-clearance/${id}/approve`, { method: 'POST', body: { step } });
}
export async function completeClearance(id: string) {
  return requestDashboardApi(`/admin-command/secretary/student-clearance/${id}/complete`, { method: 'POST' });
}
export async function printClearanceForm(id: string) {
  return requestDashboardApi(`/admin-command/secretary/student-clearance/${id}/print`, { method: 'POST' });
}

// ── Reports ──
export async function fetchSecretaryReports() {
  return requestDashboardApi('/admin-command/secretary/reports');
}
export async function generateSecretaryReport(data: any) {
  return requestDashboardApi('/admin-command/secretary/reports/generate', { method: 'POST', body: data });
}
export async function downloadReport(id: string) {
  return requestDashboardApi(`/admin-command/secretary/reports/${id}/download`, { method: 'POST' });
}
