import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AssessmentsWorkspace } from '@/components/school/dean-academics/assessments-workspace';
import { ExamWorkflowTracker } from '@/components/school/exam-workflow-tracker';
import { renderWithProviders } from './test-utils';

const mockQuery = jest.fn();
const mockRequest = jest.fn();
const mockRefresh = jest.fn();
const mockWorkflowRefresh = jest.fn();
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: (...args: unknown[]) => mockQuery(...args) }));
jest.mock('@/lib/dashboard/api-client', () => ({ requestDashboardApi: (...args: unknown[]) => mockRequest(...args) }));

beforeEach(() => {
  mockRequest.mockReset(); mockRefresh.mockReset(); mockWorkflowRefresh.mockReset(); mockQuery.mockReset();
  mockRequest.mockResolvedValue({ success: true, updated_count: 1 });
  mockQuery.mockImplementation((url: string) => ({ isLoading: false, error: null, refetch: url === '/exams/workflow' ? mockWorkflowRefresh : mockRefresh,
    data: url.includes('/assessments') ? { assessmentsList: [{ id: 'batch-1', title: 'Term exam', subject: 'Maths',
      mark_ids: ['mark-1'], status: 'submitted', submissions: 1, student_count: 11, total_marks: 100 }], metrics: {} }
      : url.includes('/report-cards') ? [] : { series: [], moderation_batches: [], metrics: {} } }));
});

it('shows Dean as the first reviewer in the shared progress tracker', () => {
  renderWithProviders(<ExamWorkflowTracker />);
  expect(screen.getByText('Dean mark review')).toBeVisible();
  expect(screen.queryByText(/HOD moderation|Head of Department/)).not.toBeInTheDocument();
});

it('lets the Dean approve a direct teacher submission and refreshes the queue', async () => {
  renderWithProviders(<AssessmentsWorkspace />);
  expect(screen.getByRole('button', { name: 'Lock reviewed batch' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Moderate & approve' }));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledWith('/exams/marks/moderate', {
    method: 'POST', body: { action: 'approve', mark_ids: ['mark-1'] },
  }));
  await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  await waitFor(() => expect(mockWorkflowRefresh).toHaveBeenCalled());
});

it('shows submissions out of enrolled students, independently of the score maximum', () => {
  renderWithProviders(<AssessmentsWorkspace />);
  expect(screen.getByText('1 submitted')).toBeVisible();
  expect(screen.getByText('Out of 11 students')).toBeVisible();
  expect(screen.queryByText('Out of 100')).not.toBeInTheDocument();
});

it('refreshes the shared workflow after locking reviewed marks', async () => {
  mockQuery.mockImplementation((url: string) => ({ isLoading: false, error: null,
    refetch: url === '/exams/workflow' ? mockWorkflowRefresh : mockRefresh,
    data: url.includes('/assessments') ? { assessmentsList: [{ id: 'batch-1', title: 'Term exam', subject: 'Maths',
      mark_ids: ['mark-1'], status: 'reviewed', submissions: 1, student_count: 11 }], metrics: {} }
      : url.includes('/report-cards') ? [] : { series: [], metrics: {} } }));
  mockRequest.mockResolvedValue({ locked_count: 1 });
  renderWithProviders(<AssessmentsWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Lock reviewed batch' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm lock' }));
  await waitFor(() => expect(mockWorkflowRefresh).toHaveBeenCalled());
  expect(mockRequest).toHaveBeenCalledWith('/admin-command/dean-academics/lock-batch', {
    method: 'POST', body: { markIds: ['mark-1'] },
  });
});

it('requires a correction reason and sends the Dean return through the marks API', async () => {
  renderWithProviders(<AssessmentsWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Return' }));
  expect(screen.getByRole('button', { name: 'Confirm return' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Required correction reason'), { target: { value: 'Check question two' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm return' }));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledWith('/exams/marks/moderate', {
    method: 'POST', body: { action: 'return_for_correction', mark_ids: ['mark-1'], reason: 'Check question two' },
  }));
});
