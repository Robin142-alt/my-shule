import { requestDashboardApi } from '@/lib/dashboard/api-client';

export async function fetchAcademicInterventions() {
  return requestDashboardApi('/admin-command/dean-academics/academic-interventions');
}

export async function fetchAssessments() {
  return requestDashboardApi('/admin-command/dean-academics/assessments');
}

export async function fetchCurriculumCoverage() {
  return requestDashboardApi('/admin-command/dean-academics/curriculum-coverage');
}

export async function fetchDepartmentPerformance() {
  return requestDashboardApi('/admin-command/dean-academics/department-performance');
}

export async function fetchLessonLogs() {
  return requestDashboardApi('/admin-command/dean-academics/lesson-logs');
}

export async function fetchLessonPlans() {
  return requestDashboardApi('/admin-command/dean-academics/lesson-plans');
}

export async function fetchOverview() {
  return requestDashboardApi('/admin-command/dean-academics/overview');
}

export async function fetchReports() {
  return requestDashboardApi('/admin-command/dean-academics/reports');
}

export async function fetchTeacherWorkload() {
  return requestDashboardApi('/admin-command/dean-academics/teacher-workload');
}

