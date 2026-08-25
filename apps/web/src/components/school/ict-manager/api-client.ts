import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──
export async function fetchIctOverview() {
  return requestDashboardApi('/admin-command/ict-manager/overview');
}

export async function fetchAssets() {
  return requestDashboardApi('/admin-command/ict-manager/assets');
}

export async function fetchAssetAssignments() {
  return requestDashboardApi('/admin-command/ict-manager/asset-assignment');
}

export async function fetchLoansReturns() {
  return requestDashboardApi('/admin-command/ict-manager/loans-returns');
}

export async function fetchMaintenance() {
  return requestDashboardApi('/admin-command/ict-manager/maintenance');
}

export async function fetchFacilitiesIssues() {
  return requestDashboardApi('/admin-command/ict-manager/facilities-issues');
}

export async function fetchIctReports() {
  return requestDashboardApi('/admin-command/ict-manager/reports');
}

// ── Mutation functions ──
export async function createAsset(data: any) {
  return requestDashboardApi('/admin-command/ict-manager/assets', { method: 'POST', body: data });
}

export async function assignAsset(data: any) {
  return requestDashboardApi('/admin-command/ict-manager/asset-assignment', { method: 'POST', body: data });
}

export async function revokeAssignment(id: string) {
  return requestDashboardApi(`/admin-command/ict-manager/asset-assignment/${id}/revoke`, { method: 'POST' });
}

export async function createLoan(data: any) {
  return requestDashboardApi('/admin-command/ict-manager/loans-returns', { method: 'POST', body: data });
}

export async function processReturn(id: string, data: any) {
  return requestDashboardApi(`/admin-command/ict-manager/loans-returns/${id}/return`, { method: 'POST', body: data });
}

export async function scheduleMaintenance(data: any) {
  return requestDashboardApi('/admin-command/ict-manager/maintenance', { method: 'POST', body: data });
}

export async function completeMaintenance(id: string) {
  return requestDashboardApi(`/admin-command/ict-manager/maintenance/${id}/complete`, { method: 'POST' });
}

export async function reportFacilitiesIssue(data: any) {
  return requestDashboardApi('/admin-command/ict-manager/facilities-issues', { method: 'POST', body: data });
}

export async function resolveFacilitiesIssue(id: string) {
  return requestDashboardApi(`/admin-command/ict-manager/facilities-issues/${id}/resolve`, { method: 'POST' });
}

export async function generateIctReport(data: any) {
  return requestDashboardApi('/admin-command/ict-manager/reports/generate', { method: 'POST', body: data });
}

export async function downloadIctReport(id: string) {
  return requestDashboardApi(`/admin-command/ict-manager/reports/${id}/download`, { method: 'POST' });
}
