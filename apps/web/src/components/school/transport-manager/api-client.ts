import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ──────────────────────────────────────────────────
export async function fetchTransportOverview() {
  return requestDashboardApi('/admin-command/transport-manager/overview');
}

export async function fetchVehicles() {
  return requestDashboardApi('/admin-command/transport-manager/vehicles');
}

export async function fetchDrivers() {
  return requestDashboardApi('/admin-command/transport-manager/drivers');
}

export async function fetchRoutes() {
  return requestDashboardApi('/admin-command/transport-manager/routes');
}

export async function fetchTrips() {
  return requestDashboardApi('/admin-command/transport-manager/trips');
}

export async function fetchFuelMaintenance() {
  return requestDashboardApi('/admin-command/transport-manager/fuel-maintenance');
}

export async function fetchStudentTransportList() {
  return requestDashboardApi('/admin-command/transport-manager/student-transport-list');
}

export async function fetchTransportReports() {
  return requestDashboardApi('/admin-command/transport-manager/reports');
}

// ── Mutation functions ───────────────────────────────────────────────
export async function createVehicle(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/vehicles', { method: 'POST', body: data });
}

export async function updateVehicle(id: string, data: any) {
  return requestDashboardApi(`/admin-command/transport-manager/vehicles/${id}`, { method: 'PATCH', body: data });
}

export async function decommissionVehicle(id: string) {
  return requestDashboardApi(`/admin-command/transport-manager/vehicles/${id}/decommission`, { method: 'POST' });
}

export async function createDriver(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/drivers', { method: 'POST', body: data });
}

export async function updateDriver(id: string, data: any) {
  return requestDashboardApi(`/admin-command/transport-manager/drivers/${id}`, { method: 'PATCH', body: data });
}

export async function suspendDriver(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/transport-manager/drivers/${id}/suspend`, { method: 'POST', body: { reason } });
}

export async function createRoute(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/routes', { method: 'POST', body: data });
}

export async function updateRoute(id: string, data: any) {
  return requestDashboardApi(`/admin-command/transport-manager/routes/${id}`, { method: 'PATCH', body: data });
}

export async function assignVehicleToRoute(routeId: string, vehicleId: string) {
  return requestDashboardApi(`/admin-command/transport-manager/routes/${routeId}/assign-vehicle`, { method: 'POST', body: { vehicle_id: vehicleId } });
}

export async function logTrip(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/trips', { method: 'POST', body: data });
}

export async function completeTrip(id: string, data: any) {
  return requestDashboardApi(`/admin-command/transport-manager/trips/${id}/complete`, { method: 'POST', body: data });
}

export async function logFuelEntry(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/fuel-maintenance/fuel', { method: 'POST', body: data });
}

export async function logMaintenanceEntry(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/fuel-maintenance/maintenance', { method: 'POST', body: data });
}

export async function assignStudentTransport(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/student-transport-list', { method: 'POST', body: data });
}

export async function removeStudentTransport(id: string) {
  return requestDashboardApi(`/admin-command/transport-manager/student-transport-list/${id}`, { method: 'DELETE' });
}

export async function generateTransportReport(data: any) {
  return requestDashboardApi('/admin-command/transport-manager/reports/generate', { method: 'POST', body: data });
}
