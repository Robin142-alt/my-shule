import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Overview ──
export async function fetchBoardingOverview() {
  return requestDashboardApi('/admin-command/boarding-master/overview');
}

// ── Hostels ──
export async function fetchHostels() {
  return requestDashboardApi('/admin-command/boarding-master/hostels');
}
export async function createHostel(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/hostels', { method: 'POST', body: data });
}
export async function updateHostel(id: string, data: any) {
  return requestDashboardApi(`/admin-command/boarding-master/hostels/${id}`, { method: 'PUT', body: data });
}

// ── Rooms & Beds ──
export async function fetchRoomsBeds() {
  return requestDashboardApi('/admin-command/boarding-master/rooms-beds');
}
export async function createRoom(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/rooms-beds', { method: 'POST', body: data });
}
export async function updateBedStatus(id: string, status: string) {
  return requestDashboardApi(`/admin-command/boarding-master/rooms-beds/${id}/status`, { method: 'POST', body: { status } });
}

// ── Allocation ──
export async function fetchAllocations() {
  return requestDashboardApi('/admin-command/boarding-master/allocation');
}
export async function allocateStudent(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/allocation', { method: 'POST', body: data });
}
export async function deallocateStudent(id: string) {
  return requestDashboardApi(`/admin-command/boarding-master/allocation/${id}/deallocate`, { method: 'POST' });
}

// ── Boarding Attendance / Roll Call ──
export async function fetchBoardingAttendance() {
  return requestDashboardApi('/admin-command/boarding-master/boarding-attendance');
}
export async function submitRollCall(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/boarding-attendance', { method: 'POST', body: data });
}

// ── Leave / Exeat ──
export async function fetchLeaveExits() {
  return requestDashboardApi('/admin-command/boarding-master/leave-exit');
}
export async function createLeaveRequest(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/leave-exit', { method: 'POST', body: data });
}
export async function approveLeaveRequest(id: string) {
  return requestDashboardApi(`/admin-command/boarding-master/leave-exit/${id}/approve`, { method: 'POST' });
}
export async function rejectLeaveRequest(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/boarding-master/leave-exit/${id}/reject`, { method: 'POST', body: { reason } });
}

// ── Incidents ──
export async function fetchIncidents() {
  return requestDashboardApi('/admin-command/boarding-master/incidents');
}
export async function reportIncident(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/incidents', { method: 'POST', body: data });
}
export async function escalateIncident(id: string) {
  return requestDashboardApi(`/admin-command/boarding-master/incidents/${id}/escalate`, { method: 'POST' });
}
export async function resolveIncident(id: string, data: any) {
  return requestDashboardApi(`/admin-command/boarding-master/incidents/${id}/resolve`, { method: 'POST', body: data });
}

// ── Reports ──
export async function fetchBoardingReports() {
  return requestDashboardApi('/admin-command/boarding-master/reports');
}
export async function generateBoardingReport(data: any) {
  return requestDashboardApi('/admin-command/boarding-master/reports/generate', { method: 'POST', body: data });
}
