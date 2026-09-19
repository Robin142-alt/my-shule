import { Component, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportCardsWorkspace } from '@/components/school/exams-manager/report-cards-workspace';
import { PublishingWorkspace } from '@/components/school/exams-manager/publishing-workspace';
import { SchoolTenantScopeProvider } from '@/lib/data/school-tenant-scope';

class CrashBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>Workspace crashed</p> : this.props.children; }
}

const examRows = [{ id: 'exam-1', name: 'End term' }, { id: 'exam-2', name: 'Mid term' }];
const originalFetch = globalThis.fetch;
let seriesPayload: unknown;
let seriesStatus: number;
let client: QueryClient;

beforeEach(() => {
  seriesPayload = { success: true, data: examRows };
  seriesStatus = 200;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input), 'https://school.test').pathname;
    let data: unknown = [];
    if (path === '/api/exams/series') data = seriesPayload;
    if (path.endsWith('/scope-summary')) data = {
      total_cards: 0, eligible_cards: 0, ineligible_cards: 0, status_counts: {}, skipped_cards: [], preview_token: 'token',
    };
    const status = path === '/api/exams/series' ? seriesStatus : 200;
    // Preserve the API interceptor envelope around the service's own response.
    const payload = status === 200 ? { data, meta: { request_id: 'contract-test' } } : { message: 'Exam service unavailable' };
    return { ok: status === 200, status, json: async () => payload, clone() { return this; } } as Response;
  });
});

afterEach(() => { client.clear(); globalThis.fetch = originalFetch; });

function renderDesk(handoff: boolean) {
  render(<QueryClientProvider client={client}>
    <SchoolTenantScopeProvider tenantId="school-a">
      <CrashBoundary>{handoff ? <PublishingWorkspace /> : <ReportCardsWorkspace />}</CrashBoundary>
    </SchoolTenantScopeProvider>
  </QueryClientProvider>);
}

it.each([false, true])('loads the production exam response through the real query hook (handoff=%s)', async handoff => {
  const user = userEvent.setup();
  renderDesk(handoff);
  const filter = await screen.findByRole('combobox', { name: 'Filter by exam' });
  expect(screen.getByRole('option', { name: 'End term' })).toBeVisible();
  expect(screen.queryByText('Workspace crashed')).not.toBeInTheDocument();
  await user.selectOptions(filter, 'exam-2');
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/exams\/report-cards\/scoped\?.*exam_series_id=exam-2/),
    expect.objectContaining({ credentials: 'include' }),
  ));
});

it.each([false, true])('keeps the desk visible and retries a malformed exam response (handoff=%s)', async handoff => {
  seriesPayload = { success: true, data: null };
  const user = userEvent.setup();
  renderDesk(handoff);
  expect(await screen.findByText('Exam list could not be read. Retry loading report cards.')).toBeVisible();
  expect(screen.queryByText('Workspace crashed')).not.toBeInTheDocument();
  seriesPayload = { success: true, data: examRows };
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('combobox', { name: 'Filter by exam' })).toBeVisible();
  expect(screen.queryByText('Exam list could not be read. Retry loading report cards.')).not.toBeInTheDocument();
});

it('shows a failed exam request and recovers through Retry', async () => {
  seriesStatus = 503;
  const user = userEvent.setup();
  renderDesk(true);
  expect(await screen.findByText(/Exam service unavailable/)).toBeVisible();
  seriesStatus = 200;
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('combobox', { name: 'Filter by exam' })).toBeVisible();
});
