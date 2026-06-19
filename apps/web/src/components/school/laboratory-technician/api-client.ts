import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──
export async function fetchLabOverview() {
  return requestDashboardApi('/admin-command/laboratory-technician/overview');
}

export async function fetchLabInventory() {
  return requestDashboardApi('/admin-command/laboratory-technician/lab-inventory');
}

export async function fetchChemicals() {
  return requestDashboardApi('/admin-command/laboratory-technician/chemicals');
}

export async function fetchApparatusIssues() {
  return requestDashboardApi('/admin-command/laboratory-technician/apparatus-issue');
}

export async function fetchLabTimetable() {
  return requestDashboardApi('/admin-command/laboratory-technician/lab-timetable');
}

export async function fetchSafetyIncidents() {
  return requestDashboardApi('/admin-command/laboratory-technician/safety-incidents');
}

export async function fetchLabReports() {
  return requestDashboardApi('/admin-command/laboratory-technician/reports');
}

// ── Mutation functions ──
export async function addInventoryItem(data: any) {
  return requestDashboardApi('/admin-command/laboratory-technician/lab-inventory', { method: 'POST', body: data });
}

export async function addChemical(data: any) {
  return requestDashboardApi('/admin-command/laboratory-technician/chemicals', { method: 'POST', body: data });
}

export async function disposeChemical(id: string) {
  return requestDashboardApi(`/admin-command/laboratory-technician/chemicals/${id}/dispose`, { method: 'POST' });
}

export async function issueApparatus(data: any) {
  return requestDashboardApi('/admin-command/laboratory-technician/apparatus-issue', { method: 'POST', body: data });
}

export async function returnApparatus(id: string, data: any) {
  return requestDashboardApi(`/admin-command/laboratory-technician/apparatus-issue/${id}/return`, { method: 'POST', body: data });
}

export async function createLabSlot(data: any) {
  return requestDashboardApi('/admin-command/laboratory-technician/lab-timetable', { method: 'POST', body: data });
}

export async function reportSafetyIncident(data: any) {
  return requestDashboardApi('/admin-command/laboratory-technician/safety-incidents', { method: 'POST', body: data });
}

export async function resolveSafetyIncident(id: string) {
  return requestDashboardApi(`/admin-command/laboratory-technician/safety-incidents/${id}/resolve`, { method: 'POST' });
}

export async function generateLabReport(data: any) {
  return requestDashboardApi('/admin-command/laboratory-technician/reports/generate', { method: 'POST', body: data });
}
