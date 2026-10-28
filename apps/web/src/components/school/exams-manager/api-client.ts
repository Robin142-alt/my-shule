import { requestDashboardApi } from '@/lib/dashboard/api-client';
import type {
  LiveExamReportCard,
  ReportCardTransitionAction,
} from '@/lib/modules/exams-client';
import type { ClassSubjectSelection } from './class-subject-selection';

export type ExamSetupInput = {
  name: string; starts_on: string; ends_on: string; status: string;
  academic_term_id: string | null; exam_type: string; type?: string;
  max_marks: number; grading_system_id: string;
  class_section_ids: string[]; class_subjects: ClassSubjectSelection[];
  configuration_version?: number;
};

// ── Fetch functions ──
export async function fetchExamsOverview() {
  return requestDashboardApi('/admin-command/exams-manager/overview');
}

export async function fetchExamSetup() {
  return requestDashboardApi('/admin-command/exams-manager/exam-setup');
}

export async function fetchExamTimetable() {
  return requestDashboardApi('/admin-command/exams-manager/exam-timetable');
}

export async function fetchMarksEntry() {
  return requestDashboardApi('/admin-command/exams-manager/marks-entry');
}

export async function fetchModeration() {
  return requestDashboardApi('/admin-command/exams-manager/moderation');
}

export async function fetchAnalysis() {
  return requestDashboardApi('/admin-command/exams-manager/analysis');
}

export async function fetchReportCards() {
  return requestDashboardApi('/admin-command/exams-manager/report-cards');
}

export async function fetchPublishing() {
  return requestDashboardApi('/admin-command/exams-manager/publishing');
}

export async function fetchLifecycleReportCards() {
  return requestDashboardApi<LiveExamReportCard[]>('/exams/report-cards?limit=50');
}

export async function fetchExamsReports() {
  return requestDashboardApi('/admin-command/exams-manager/reports');
}

// ── Mutation functions ──
export async function createExam(data: ExamSetupInput) {
  return requestDashboardApi('/admin-command/exams-manager/exam-setup', { method: 'POST', body: data });
}

export async function configureExam(examId: string, data: ExamSetupInput) {
  return requestDashboardApi(`/admin-command/exams-manager/exam-setup/${examId}/configure`, { method: 'POST', body: data });
}

export async function deleteExam(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/exam-setup/${encodeURIComponent(examId)}`, { method: 'DELETE' });
}

export async function createTimetableSlot(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/exam-timetable', { method: 'POST', body: data });
}

export async function submitMarks(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/marks-entry', { method: 'POST', body: data });
}

export async function lockMarksEntry(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/marks-entry/${examId}/lock`, { method: 'POST' });
}

export async function openMarksEntry(data: { exam_series_id: string; scope: 'teacher' | 'class' | 'everyone';
  teacher_user_id?: string; class_section_id?: string; closes_at: string }) {
  return requestDashboardApi<{ success: boolean; message: string; window_count: number }>(
    '/admin-command/exams-manager/marks-entry/open', { method: 'POST', body: data });
}

export async function approveModeration(id: string) {
  return requestDashboardApi(`/admin-command/exams-manager/moderation/${id}/approve`, { method: 'POST' });
}

export async function rejectModeration(id: string, reason: string) {
  return requestDashboardApi(`/admin-command/exams-manager/moderation/${id}/reject`, { method: 'POST', body: { reason } });
}

export async function generateReportCards(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/report-cards/${examId}/generate`, { method: 'POST' });
}

export async function publishResults(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/publishing/${examId}/publish`, { method: 'POST' });
}

export async function unpublishResults(examId: string) {
  return requestDashboardApi(`/admin-command/exams-manager/publishing/${examId}/unpublish`, { method: 'POST' });
}

export async function transitionReportCard(
  reportCardId: string,
  action: ReportCardTransitionAction,
  reason?: string,
) {
  return requestDashboardApi<LiveExamReportCard>(
    `/exams/report-cards/${encodeURIComponent(reportCardId)}/transition`,
    {
      method: 'PATCH',
      body: {
        action,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      },
    },
  );
}

export async function generateExamsReport(data: any) {
  return requestDashboardApi('/admin-command/exams-manager/reports/generate', { method: 'POST', body: data });
}
