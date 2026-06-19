import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──
export async function fetchProcurementOverview() {
  return requestDashboardApi('/admin-command/procurement-officer/overview');
}

export async function fetchSuppliers() {
  return requestDashboardApi('/admin-command/procurement-officer/suppliers');
}

export async function fetchPurchaseRequests() {
  return requestDashboardApi('/admin-command/procurement-officer/purchase-requests');
}

export async function fetchQuotations() {
  return requestDashboardApi('/admin-command/procurement-officer/quotations');
}

export async function fetchPurchaseOrders() {
  return requestDashboardApi('/admin-command/procurement-officer/purchase-orders');
}

export async function fetchDeliveries() {
  return requestDashboardApi('/admin-command/procurement-officer/deliveries');
}

export async function fetchProcurementReports() {
  return requestDashboardApi('/admin-command/procurement-officer/reports');
}

// ── Mutation functions ──
export async function createSupplier(data: any) {
  return requestDashboardApi('/admin-command/procurement-officer/suppliers', { method: 'POST', body: data });
}

export async function updateSupplier(id: string, data: any) {
  return requestDashboardApi(`/admin-command/procurement-officer/suppliers/${id}`, { method: 'PUT', body: data });
}

export async function createPurchaseRequest(data: any) {
  return requestDashboardApi('/admin-command/procurement-officer/purchase-requests', { method: 'POST', body: data });
}

export async function approvePurchaseRequest(id: string) {
  return requestDashboardApi(`/admin-command/procurement-officer/purchase-requests/${id}/approve`, { method: 'POST' });
}

export async function rejectPurchaseRequest(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/procurement-officer/purchase-requests/${id}/reject`, { method: 'POST', body: { reason } });
}

export async function createQuotation(data: any) {
  return requestDashboardApi('/admin-command/procurement-officer/quotations', { method: 'POST', body: data });
}

export async function selectQuotation(id: string) {
  return requestDashboardApi(`/admin-command/procurement-officer/quotations/${id}/select`, { method: 'POST' });
}

export async function createPurchaseOrder(data: any) {
  return requestDashboardApi('/admin-command/procurement-officer/purchase-orders', { method: 'POST', body: data });
}

export async function approvePurchaseOrder(id: string) {
  return requestDashboardApi(`/admin-command/procurement-officer/purchase-orders/${id}/approve`, { method: 'POST' });
}

export async function recordDelivery(data: any) {
  return requestDashboardApi('/admin-command/procurement-officer/deliveries', { method: 'POST', body: data });
}

export async function confirmDelivery(id: string) {
  return requestDashboardApi(`/admin-command/procurement-officer/deliveries/${id}/confirm`, { method: 'POST' });
}

export async function generateProcurementReport(data: any) {
  return requestDashboardApi('/admin-command/procurement-officer/reports/generate', { method: 'POST', body: data });
}
