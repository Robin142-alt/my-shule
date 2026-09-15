import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveReportCardsWorkspace } from '@/components/school/live-report-cards-workspace';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { requestSchoolApiProxy } from '@/lib/dashboard/school-api-proxy-client';
import type { LiveReportCardGenerationScope } from '@/lib/modules/exams-client';

jest.mock('@/components/school/integrated-school-command-header', () => ({
  useSchoolCommandIdentity: () => ({ schoolName: 'Test School', logoUrl: null }),
}));
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: jest.fn() }));
jest.mock('@/lib/dashboard/school-api-proxy-client', () => ({ requestSchoolApiProxy: jest.fn() }));

const scope = (overrides: Partial<LiveReportCardGenerationScope> = {}): LiveReportCardGenerationScope => ({
  exam_series_id: 'end-term', exam_series_name: 'END TERM 3', class_section_id: 'form-4', class_name: 'Form 4',
  expected_mark_count: 50, ready_mark_count: 1, not_ready_mark_count: 49, learner_count: 50, ready: false,
  blockers: [{ subject_id: 'math', subject_name: 'Mathematics', expected_mark_count: 50, ready_mark_count: 1,
    missing_mark_count: 49, draft_mark_count: 0, submitted_mark_count: 0, reviewed_mark_count: 0 }],
  ...overrides,
});

function queries(scopes: LiveReportCardGenerationScope[], overrides = {}) {
  const generation = { data: scopes, error: null, isLoading: false, isFetching: false,
    refetch: jest.fn().mockResolvedValue({ data: scopes }), ...overrides };
  const reports = { data: [], error: null, isLoading: false, refetch: jest.fn().mockResolvedValue({ data: [] }) };
  (useSchoolQuery as jest.Mock).mockImplementation((path: string | null) => path === '/exams/report-cards/generation-scopes' ? generation : reports);
  return { generation, reports };
}

beforeEach(() => jest.clearAllMocks());

it('shows 49 missing marks before generation and leaves the affected exam selectable for diagnosis', async () => {
  queries([scope()]);
  const user = userEvent.setup();
  render(<LiveReportCardsWorkspace audience="exams-manager" />);
  const option = screen.getByRole('option', { name: 'END TERM 3 - Form 4 - 49 learner-subject marks need attention' });
  expect(option).toBeEnabled();
  await user.selectOptions(screen.getByLabelText('Class and exam cycle'), 'end-term:form-4');
  expect(screen.getByText(/49 missing/)).toBeVisible();
  expect(screen.getByText('1 of 50 learner-subject marks finalized for 50 learners.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open Marks Entry Hub' })).toHaveAttribute('href', '/school/exams-manager/marks-entry');
  expect(screen.getByRole('button', { name: 'Generate class report cards' })).toBeDisabled();
  expect(requestSchoolApiProxy).not.toHaveBeenCalled();
});

it('generates the selected complete exam even while a different exam is incomplete', async () => {
  const ready = scope({ exam_series_id: 'mid-term', exam_series_name: 'MID TERM 3', ready: true, ready_mark_count: 50, not_ready_mark_count: 0, blockers: [] });
  const { generation, reports } = queries([scope(), ready]);
  (requestSchoolApiProxy as jest.Mock).mockResolvedValue({ id: 'batch', completed_students: 50, total_students: 50, failed_students: 0 });
  const user = userEvent.setup();
  render(<LiveReportCardsWorkspace audience="exams-manager" />);
  await user.selectOptions(screen.getByLabelText('Class and exam cycle'), 'mid-term:form-4');
  await user.click(screen.getByRole('button', { name: 'Generate class report cards' }));
  expect(requestSchoolApiProxy).toHaveBeenCalledWith('/exams/report-cards/batches', { method: 'POST', body: {
    exam_series_id: 'mid-term', class_section_id: 'form-4', batch_size: 200, offset: 0,
  } });
  await waitFor(() => expect(screen.getByText('50 report-card snapshots generated for MID TERM 3 - Form 4.')).toBeVisible());
  expect(reports.refetch).toHaveBeenCalledTimes(1);
  expect(generation.refetch).toHaveBeenCalledTimes(1);
  await user.selectOptions(screen.getByLabelText('Class and exam cycle'), 'end-term:form-4');
  expect(screen.queryByText(/50 report-card snapshots generated/)).not.toBeInTheDocument();
  expect(screen.queryByText('Generated')).not.toBeInTheDocument();
});

it('explains each moderation stage and lets staff refresh readiness after correcting marks', async () => {
  const incomplete = scope();
  incomplete.blockers[0] = { ...incomplete.blockers[0], missing_mark_count: 46, draft_mark_count: 1, submitted_mark_count: 1, reviewed_mark_count: 1 };
  const { generation } = queries([incomplete]);
  const user = userEvent.setup();
  const view = render(<LiveReportCardsWorkspace audience="exams-manager" />);
  await user.selectOptions(screen.getByLabelText('Class and exam cycle'), 'end-term:form-4');
  expect(screen.getByText(/46 missing; 1 awaiting submission; 1 awaiting Dean review; 1 awaiting locking/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Refresh readiness' }));
  expect(generation.refetch).toHaveBeenCalledTimes(1);
  generation.data = [scope({ ready: true, ready_mark_count: 50, not_ready_mark_count: 0, blockers: [] })];
  view.rerender(<LiveReportCardsWorkspace audience="exams-manager" />);
  expect(screen.getByRole('button', { name: 'Generate class report cards' })).toBeEnabled();
  expect(screen.queryByText(/46 missing/)).not.toBeInTheDocument();
});

it('refreshes authoritative readiness after a generation rejection instead of leaving a stale Ready state', async () => {
  const { generation } = queries([scope({ ready: true, ready_mark_count: 50, not_ready_mark_count: 0, blockers: [] })]);
  (requestSchoolApiProxy as jest.Mock).mockRejectedValue(new Error('1 learner-subject mark must be entered, moderated, and locked'));
  generation.refetch.mockImplementation(async () => { generation.data = [scope()]; return { data: generation.data }; });
  const user = userEvent.setup();
  render(<LiveReportCardsWorkspace audience="exams-manager" />);
  await user.selectOptions(screen.getByLabelText('Class and exam cycle'), 'end-term:form-4');
  await user.click(screen.getByRole('button', { name: 'Generate class report cards' }));
  await waitFor(() => expect(screen.getByText('1 learner-subject mark must be entered, moderated, and locked')).toBeVisible());
  expect(generation.refetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Generate class report cards' })).toBeDisabled();
});

it('keeps generation disabled when readiness cannot be verified even if cached data says Ready', async () => {
  queries([scope({ ready: true, blockers: [] })], { error: new Error('Readiness unavailable') });
  const user = userEvent.setup();
  render(<LiveReportCardsWorkspace audience="exams-manager" />);
  await user.selectOptions(screen.getByLabelText('Class and exam cycle'), 'end-term:form-4');
  expect(screen.getByText('Readiness unavailable')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Generate class report cards' })).toBeDisabled();
});

it('loads all backend exam scopes instead of the paginated mark-sheet list', () => {
  queries(Array.from({ length: 60 }, (_, index) => scope({ exam_series_id: `exam-${index}`, exam_series_name: `Exam ${index}` })));
  render(<LiveReportCardsWorkspace audience="exams-manager" />);
  expect(screen.getAllByRole('option').filter(option => option.textContent?.startsWith('Exam '))).toHaveLength(60);
  expect((useSchoolQuery as jest.Mock).mock.calls.some(([path]) => path === '/exams/mark-sheets')).toBe(false);
});

it('shows loading and enrollment guidance rather than a Ready label for an empty class', async () => {
  const { generation } = queries([], { isLoading: true });
  const view = render(<LiveReportCardsWorkspace audience="exams-manager" />);
  expect(screen.getByText('Checking exam readiness...')).toBeVisible();
  expect(screen.getByLabelText('Class and exam cycle')).toBeDisabled();
  generation.isLoading = false;
  generation.data = [scope({ expected_mark_count: 0, ready_mark_count: 0, not_ready_mark_count: 0, learner_count: 0, blockers: [] })];
  view.rerender(<LiveReportCardsWorkspace audience="exams-manager" />);
  await userEvent.setup().selectOptions(screen.getByLabelText('Class and exam cycle'), 'end-term:form-4');
  expect(screen.getByText(/Check this class’s learner enrollments/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Generate class report cards' })).toBeDisabled();
});
