import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetch functions ───────────────────────────────────────────────
export async function fetchPrincipalOverview() {
  return requestDashboardApi('/admin-command/principal/overview');
}

export async function fetchSchoolProfile() {
  return requestDashboardApi('/admin-command/principal/school-profile');
}

export async function fetchAcademicSetup() {
  return requestDashboardApi('/admin-command/principal/academic-setup');
}

export async function fetchAcademics() {
  return requestDashboardApi('/admin-command/principal/academics');
}

export async function fetchClassesStreams() {
  return requestDashboardApi('/admin-command/principal/classes-streams');
}

export async function fetchSubjectsDepartments() {
  return requestDashboardApi('/admin-command/principal/subjects-departments');
}

export async function fetchStaffRoles() {
  return requestDashboardApi('/admin-command/principal/staff-roles');
}

export async function fetchStudents() {
  return requestDashboardApi('/admin-command/principal/students');
}

export async function fetchAttendanceMonitoring() {
  return requestDashboardApi('/admin-command/principal/attendance-monitoring');
}

export async function fetchDiscipline() {
  return requestDashboardApi('/admin-command/principal/discipline');
}

export async function fetchExamsReportCards() {
  return requestDashboardApi('/admin-command/principal/exams-report-cards');
}

export async function fetchFinanceOverview() {
  return requestDashboardApi('/admin-command/principal/finance-overview');
}

export async function fetchApprovals() {
  return requestDashboardApi('/admin-command/principal/approvals');
}

export async function fetchCommunication() {
  return requestDashboardApi('/admin-command/principal/communication');
}

export async function fetchReports() {
  return requestDashboardApi('/admin-command/principal/reports');
}

export async function fetchSetupChecklist() {
  return requestDashboardApi('/admin-command/principal/setup-checklist');
}

// ── Mutation functions ────────────────────────────────────────────

// School profile
export async function updateSchoolProfile(data: any) {
  return requestDashboardApi('/admin-command/principal/school-profile', { method: 'POST', body: data });
}

// Academic setup
export async function createAcademicYear(data: any) {
  return requestDashboardApi('/admin-command/principal/academic-setup/year', { method: 'POST', body: data });
}
export async function createTerm(data: any) {
  return requestDashboardApi('/admin-command/principal/academic-setup/term', { method: 'POST', body: data });
}

// Classes & Streams
export async function createClass(data: any) {
  return requestDashboardApi('/admin-command/principal/classes-streams', { method: 'POST', body: data });
}
export async function createStream(classId: string, data: any) {
  return requestDashboardApi(`/admin-command/principal/classes-streams/${classId}/streams`, { method: 'POST', body: data });
}

// Subjects & Departments
export async function createSubject(data: any) {
  return requestDashboardApi('/admin-command/principal/subjects-departments/subject', { method: 'POST', body: data });
}
export async function createDepartment(data: any) {
  return requestDashboardApi('/admin-command/principal/subjects-departments/department', { method: 'POST', body: data });
}

// Staff
export async function inviteStaff(data: any) {
  return requestDashboardApi('/admin-command/principal/staff-roles/invite', { method: 'POST', body: data });
}
export async function updateStaffRole(staffId: string, data: any) {
  return requestDashboardApi(`/admin-command/principal/staff-roles/${staffId}/role`, { method: 'POST', body: data });
}

// Students
export async function admitStudent(data: any) {
  return requestDashboardApi('/admin-command/principal/students/admit', { method: 'POST', body: data });
}
export async function transferStudent(studentId: string, data: any) {
  return requestDashboardApi(`/admin-command/principal/students/${studentId}/transfer`, { method: 'POST', body: data });
}

// Attendance
export async function sendAttendanceAlert(classId: string) {
  return requestDashboardApi(`/admin-command/principal/attendance-monitoring/${classId}/alert`, { method: 'POST' });
}

// Discipline
export async function escalateDisciplineCase(caseId: string) {
  return requestDashboardApi(`/admin-command/principal/discipline/${caseId}/escalate`, { method: 'POST' });
}
export async function resolveDisciplineCase(caseId: string, data: any) {
  return requestDashboardApi(`/admin-command/principal/discipline/${caseId}/resolve`, { method: 'POST', body: data });
}

// Exams & Report Cards
export async function publishReportCards(examId: string) {
  return requestDashboardApi(`/admin-command/principal/exams-report-cards/${examId}/publish`, { method: 'POST' });
}
export async function approveExamResults(examId: string) {
  return requestDashboardApi(`/admin-command/principal/exams-report-cards/${examId}/approve`, { method: 'POST' });
}

// Finance
export async function approveExpense(expenseId: string) {
  return requestDashboardApi(`/admin-command/principal/finance-overview/${expenseId}/approve`, { method: 'POST' });
}

// Approvals
export async function actionApproval(approvalId: string, action: 'approve' | 'reject', comment?: string) {
  return requestDashboardApi(`/admin-command/principal/approvals/${approvalId}/action`, { method: 'POST', body: { action, comment } });
}

// Communication
export async function sendAnnouncement(data: any) {
  return requestDashboardApi('/admin-command/principal/communication/announcement', { method: 'POST', body: data });
}
export async function sendMessage(data: any) {
  return requestDashboardApi('/admin-command/principal/communication/message', { method: 'POST', body: data });
}

// Reports
export async function generateReport(data: any) {
  return requestDashboardApi('/admin-command/principal/reports/generate', { method: 'POST', body: data });
}

// Setup checklist
export async function markChecklistItem(itemId: string) {
  return requestDashboardApi(`/admin-command/principal/setup-checklist/${itemId}/complete`, { method: 'POST' });
}
