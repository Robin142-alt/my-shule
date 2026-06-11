import { requestDashboardApi } from '@/lib/dashboard/api-client';

export type PrincipalWorkspaceData = {
  status: "active" | "degraded" | "setup_required";
  [key: string]: unknown;
};

export async function fetchPrincipalOverview() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/overview');
}

export async function fetchPrincipalSetupChecklist() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/setup-checklist');
}

export async function fetchPrincipalSchoolProfile() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/school-profile');
}

export async function fetchPrincipalAcademicSetup() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/academic-setup');
}

export async function fetchPrincipalClassesStreams() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/classes-streams');
}

export async function fetchPrincipalSubjectsDepartments() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/subjects-departments');
}

export async function fetchPrincipalStaffRoles() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/staff-roles');
}

export async function fetchPrincipalStudents() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/students');
}

export async function fetchPrincipalAttendance() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/attendance');
}

export async function fetchPrincipalAcademics() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/academics');
}

export async function fetchPrincipalExamsReports() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/exams-reports');
}

export async function fetchPrincipalFinanceOverview() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/finance-overview');
}

export async function fetchPrincipalDiscipline() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/discipline');
}

export async function fetchPrincipalCommunication() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/communication');
}

export async function fetchPrincipalApprovals() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/approvals');
}

export async function fetchPrincipalReports() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/reports');
}

export async function fetchPrincipalSettings() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/settings');
}

export async function fetchPrincipalTeaching() {
  return requestDashboardApi<PrincipalWorkspaceData>('/admin-command/principal/teaching');
}
