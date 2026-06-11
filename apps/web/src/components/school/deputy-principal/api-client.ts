import { requestDashboardApi } from '@/lib/dashboard/api-client';

export async function fetchDeputyOverview() {
  return requestDashboardApi('/admin-command/deputy/overview');
}

export async function fetchDeputyDailyOperations() {
  return requestDashboardApi('/admin-command/deputy/daily-operations');
}

export async function fetchDeputyAttendance() {
  return requestDashboardApi('/admin-command/deputy/attendance');
}

export async function fetchDeputyDiscipline() {
  return requestDashboardApi('/admin-command/deputy/discipline');
}

export async function fetchDeputyWelfare() {
  return requestDashboardApi('/admin-command/deputy/welfare');
}

export async function fetchDeputyStaffDuty() {
  return requestDashboardApi('/admin-command/deputy/staff-duty');
}

export async function fetchDeputyTimetable() {
  return requestDashboardApi('/admin-command/deputy/timetable');
}

export async function fetchDeputyAcademics() {
  return requestDashboardApi('/admin-command/deputy/academics');
}

export async function fetchDeputyExams() {
  return requestDashboardApi('/admin-command/deputy/exams');
}

export async function fetchDeputyClasses() {
  return requestDashboardApi('/admin-command/deputy/classes');
}

export async function fetchDeputyApprovals() {
  return requestDashboardApi('/admin-command/deputy/approvals');
}

export async function fetchDeputyCommunication() {
  return requestDashboardApi('/admin-command/deputy/communication');
}

export async function fetchDeputyReports() {
  return requestDashboardApi('/admin-command/deputy/reports');
}

export async function fetchDeputyStaff() {
  return requestDashboardApi('/admin-command/deputy/staff');
}
