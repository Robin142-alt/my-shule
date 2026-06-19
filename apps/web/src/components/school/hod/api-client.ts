import { requestDashboardApi } from '@/lib/dashboard/api-client';

export async function fetchCoverageReview() {
  return requestDashboardApi('/admin-command/hod/coverage-review');
}

export async function fetchDepartmentTeachers() {
  return requestDashboardApi('/admin-command/hod/department-teachers');
}

export async function fetchLessonPlans() {
  return requestDashboardApi('/admin-command/hod/lesson-plans');
}

export async function fetchMarksModeration() {
  return requestDashboardApi('/admin-command/hod/marks-moderation');
}

export async function fetchOverview() {
  return requestDashboardApi('/admin-command/hod/overview');
}

export async function fetchReports() {
  return requestDashboardApi('/admin-command/hod/reports');
}

export async function fetchResourceRequests() {
  return requestDashboardApi('/admin-command/hod/resource-requests');
}

export async function fetchSubjectAllocation() {
  return requestDashboardApi('/admin-command/hod/subject-allocation');
}

