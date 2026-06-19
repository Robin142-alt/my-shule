import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetchers ──────────────────────────────────────────────────────
export async function fetchNurseOverview() {
  return requestDashboardApi('/admin-command/nurse/overview');
}

export async function fetchVisits() {
  return requestDashboardApi('/admin-command/nurse/visits');
}

export async function fetchSickBayQueue() {
  return requestDashboardApi('/admin-command/nurse/sick-bay-queue');
}

export async function fetchMedicineInventory() {
  return requestDashboardApi('/admin-command/nurse/medicine-inventory');
}

export async function fetchDispensingLog() {
  return requestDashboardApi('/admin-command/nurse/dispensing-log');
}

export async function fetchParentNotifications() {
  return requestDashboardApi('/admin-command/nurse/parent-notifications');
}

export async function fetchHealthReports() {
  return requestDashboardApi('/admin-command/nurse/health-reports');
}

// ── Mutations ─────────────────────────────────────────────────────
export async function createVisit(data: any) {
  return requestDashboardApi('/admin-command/nurse/visits', { method: 'POST', body: data });
}

export async function closeVisit(visitId: string) {
  return requestDashboardApi(`/admin-command/nurse/visits/${visitId}/close`, { method: 'POST' });
}

export async function referVisit(visitId: string, data: any) {
  return requestDashboardApi(`/admin-command/nurse/visits/${visitId}/refer`, { method: 'POST', body: data });
}

export async function admitToSickBay(data: any) {
  return requestDashboardApi('/admin-command/nurse/sick-bay-queue', { method: 'POST', body: data });
}

export async function dischargeFromSickBay(entryId: string) {
  return requestDashboardApi(`/admin-command/nurse/sick-bay-queue/${entryId}/discharge`, { method: 'POST' });
}

export async function addMedicineStock(data: any) {
  return requestDashboardApi('/admin-command/nurse/medicine-inventory', { method: 'POST', body: data });
}

export async function adjustMedicineStock(medicineId: string, data: any) {
  return requestDashboardApi(`/admin-command/nurse/medicine-inventory/${medicineId}/adjust`, { method: 'POST', body: data });
}

export async function dispenseMedicine(data: any) {
  return requestDashboardApi('/admin-command/nurse/dispensing-log', { method: 'POST', body: data });
}

export async function sendParentNotification(data: any) {
  return requestDashboardApi('/admin-command/nurse/parent-notifications', { method: 'POST', body: data });
}

export async function resendParentNotification(notificationId: string) {
  return requestDashboardApi(`/admin-command/nurse/parent-notifications/${notificationId}/resend`, { method: 'POST' });
}

export async function generateHealthReport(data: any) {
  return requestDashboardApi('/admin-command/nurse/health-reports/generate', { method: 'POST', body: data });
}
