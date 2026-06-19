import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Overview ──
export async function fetchSecurityOverview() {
  return requestDashboardApi('/admin-command/security-officer/overview');
}

// ── Gate Register ──
export async function fetchGateRegister() {
  return requestDashboardApi('/admin-command/security-officer/gate-register');
}
export async function createGateEntry(data: any) {
  return requestDashboardApi('/admin-command/security-officer/gate-register', { method: 'POST', body: data });
}
export async function logGateExit(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/gate-register/${id}/exit`, { method: 'POST' });
}

// ── Visitors ──
export async function fetchSecurityVisitors() {
  return requestDashboardApi('/admin-command/security-officer/visitors');
}
export async function checkInVisitor(data: any) {
  return requestDashboardApi('/admin-command/security-officer/visitors/check-in', { method: 'POST', body: data });
}
export async function checkOutVisitor(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/visitors/${id}/check-out`, { method: 'POST' });
}
export async function flagVisitor(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/security-officer/visitors/${id}/flag`, { method: 'POST', body: { reason } });
}
export async function printVisitorBadge(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/visitors/${id}/print-badge`, { method: 'POST' });
}

// ── Incidents ──
export async function fetchIncidents() {
  return requestDashboardApi('/admin-command/security-officer/incidents');
}
export async function reportIncident(data: any) {
  return requestDashboardApi('/admin-command/security-officer/incidents', { method: 'POST', body: data });
}
export async function escalateIncident(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/incidents/${id}/escalate`, { method: 'POST' });
}
export async function resolveIncident(id: string, data: any) {
  return requestDashboardApi(`/admin-command/security-officer/incidents/${id}/resolve`, { method: 'POST', body: data });
}

// ── Staff Movement ──
export async function fetchStaffMovement() {
  return requestDashboardApi('/admin-command/security-officer/staff-movement');
}
export async function logStaffDeparture(data: any) {
  return requestDashboardApi('/admin-command/security-officer/staff-movement/departure', { method: 'POST', body: data });
}
export async function logStaffReturn(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/staff-movement/${id}/return`, { method: 'POST' });
}

// ── Student Exit Passes ──
export async function fetchStudentExitPasses() {
  return requestDashboardApi('/admin-command/security-officer/student-exit-passes');
}
export async function verifyExitPass(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/student-exit-passes/${id}/verify`, { method: 'POST' });
}
export async function logStudentExit(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/student-exit-passes/${id}/exit`, { method: 'POST' });
}
export async function logStudentReturn(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/student-exit-passes/${id}/return`, { method: 'POST' });
}
export async function flagUnauthorizedExit(data: any) {
  return requestDashboardApi('/admin-command/security-officer/student-exit-passes/flag-unauthorized', { method: 'POST', body: data });
}

// ── Reports ──
export async function fetchSecurityReports() {
  return requestDashboardApi('/admin-command/security-officer/reports');
}
export async function generateSecurityReport(data: any) {
  return requestDashboardApi('/admin-command/security-officer/reports/generate', { method: 'POST', body: data });
}
export async function downloadSecurityReport(id: string) {
  return requestDashboardApi(`/admin-command/security-officer/reports/${id}/download`, { method: 'POST' });
}
