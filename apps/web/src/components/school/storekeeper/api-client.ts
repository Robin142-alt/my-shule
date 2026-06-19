import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──────────────────────────────────────────────────
export async function fetchStorekeeperOverview() {
  return requestDashboardApi('/admin-command/storekeeper/overview');
}

export async function fetchItems() {
  return requestDashboardApi('/admin-command/storekeeper/items');
}

export async function fetchLowStock() {
  return requestDashboardApi('/admin-command/storekeeper/low-stock');
}

export async function fetchDamagedMissing() {
  return requestDashboardApi('/admin-command/storekeeper/damaged-missing');
}

export async function fetchStocktakes() {
  return requestDashboardApi('/admin-command/storekeeper/stocktake');
}

export async function fetchRequests() {
  return requestDashboardApi('/admin-command/storekeeper/requests');
}

export async function fetchStorekeeperReports() {
  return requestDashboardApi('/admin-command/storekeeper/reports');
}

// ── Mutation functions ───────────────────────────────────────────────
export async function createItem(data: any) {
  return requestDashboardApi('/admin-command/storekeeper/items', { method: 'POST', body: data });
}

export async function updateItem(id: string, data: any) {
  return requestDashboardApi(`/admin-command/storekeeper/items/${id}`, { method: 'PATCH', body: data });
}

export async function deleteItem(id: string) {
  return requestDashboardApi(`/admin-command/storekeeper/items/${id}`, { method: 'DELETE' });
}

export async function receiveStock(data: any) {
  return requestDashboardApi('/admin-command/storekeeper/items/receive', { method: 'POST', body: data });
}

export async function issueStock(data: any) {
  return requestDashboardApi('/admin-command/storekeeper/items/issue', { method: 'POST', body: data });
}

export async function reorderItem(id: string) {
  return requestDashboardApi(`/admin-command/storekeeper/low-stock/${id}/reorder`, { method: 'POST' });
}

export async function reportDamagedItem(data: any) {
  return requestDashboardApi('/admin-command/storekeeper/damaged-missing', { method: 'POST', body: data });
}

export async function writeOffItem(id: string, data: any) {
  return requestDashboardApi(`/admin-command/storekeeper/damaged-missing/${id}/write-off`, { method: 'POST', body: data });
}

export async function startStocktake(data: any) {
  return requestDashboardApi('/admin-command/storekeeper/stocktake', { method: 'POST', body: data });
}

export async function submitStocktakeCount(id: string, data: any) {
  return requestDashboardApi(`/admin-command/storekeeper/stocktake/${id}/submit`, { method: 'POST', body: data });
}

export async function finalizeStocktake(id: string) {
  return requestDashboardApi(`/admin-command/storekeeper/stocktake/${id}/finalize`, { method: 'POST' });
}

export async function approveRequest(id: string) {
  return requestDashboardApi(`/admin-command/storekeeper/requests/${id}/approve`, { method: 'POST' });
}

export async function rejectRequest(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/storekeeper/requests/${id}/reject`, { method: 'POST', body: { reason } });
}

export async function fulfillRequest(id: string) {
  return requestDashboardApi(`/admin-command/storekeeper/requests/${id}/fulfill`, { method: 'POST' });
}

export async function generateStoreReport(data: any) {
  return requestDashboardApi('/admin-command/storekeeper/reports/generate', { method: 'POST', body: data });
}

export async function downloadReport(id: string) {
  return requestDashboardApi(`/admin-command/storekeeper/reports/${id}/download`, { method: 'GET' });
}
