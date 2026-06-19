import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Overview ──
export async function fetchCounsellingOverview() {
  return requestDashboardApi('/admin-command/guidance-counselling/overview');
}

// ── Sessions ──
export async function fetchSessions() {
  return requestDashboardApi('/admin-command/guidance-counselling/sessions');
}
export async function createSession(data: any) {
  return requestDashboardApi('/admin-command/guidance-counselling/sessions', { method: 'POST', body: data });
}
export async function completeSession(id: string, data: any) {
  return requestDashboardApi(`/admin-command/guidance-counselling/sessions/${id}/complete`, { method: 'POST', body: data });
}

// ── Follow-ups ──
export async function fetchFollowUps() {
  return requestDashboardApi('/admin-command/guidance-counselling/follow-ups');
}
export async function createFollowUp(data: any) {
  return requestDashboardApi('/admin-command/guidance-counselling/follow-ups', { method: 'POST', body: data });
}
export async function markFollowUpDone(id: string) {
  return requestDashboardApi(`/admin-command/guidance-counselling/follow-ups/${id}/done`, { method: 'POST' });
}

// ── Referrals ──
export async function fetchReferrals() {
  return requestDashboardApi('/admin-command/guidance-counselling/referrals');
}
export async function createReferral(data: any) {
  return requestDashboardApi('/admin-command/guidance-counselling/referrals', { method: 'POST', body: data });
}
export async function updateReferralStatus(id: string, status: string) {
  return requestDashboardApi(`/admin-command/guidance-counselling/referrals/${id}/status`, { method: 'POST', body: { status } });
}

// ── Parent Engagement ──
export async function fetchParentEngagements() {
  return requestDashboardApi('/admin-command/guidance-counselling/parent-engagement');
}
export async function createParentMeeting(data: any) {
  return requestDashboardApi('/admin-command/guidance-counselling/parent-engagement', { method: 'POST', body: data });
}
export async function sendParentNotification(id: string) {
  return requestDashboardApi(`/admin-command/guidance-counselling/parent-engagement/${id}/notify`, { method: 'POST' });
}

// ── Welfare Notes ──
export async function fetchWelfareNotes() {
  return requestDashboardApi('/admin-command/guidance-counselling/welfare-notes');
}
export async function createWelfareNote(data: any) {
  return requestDashboardApi('/admin-command/guidance-counselling/welfare-notes', { method: 'POST', body: data });
}
export async function flagWelfareNote(id: string) {
  return requestDashboardApi(`/admin-command/guidance-counselling/welfare-notes/${id}/flag`, { method: 'POST' });
}

// ── Reports ──
export async function fetchCounsellingReports() {
  return requestDashboardApi('/admin-command/guidance-counselling/reports');
}
export async function generateCounsellingReport(data: any) {
  return requestDashboardApi('/admin-command/guidance-counselling/reports/generate', { method: 'POST', body: data });
}
