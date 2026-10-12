import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BulkFeeBillingDialog } from '@/components/school/accountant/bulk-fee-billing-dialog';
import { requestDashboardApi } from '@/lib/dashboard/api-client';

const mockInvalidate = jest.fn().mockResolvedValue(undefined);
const mockRefetch = jest.fn();
let mockError: Error | null = null;
const originalRoster = [
  { student_id: 'one', student_name: 'Amina', admission_number: '001', grade_level: 'Grade 7', class_name: 'East' },
  { student_id: 'two', student_name: 'Baraka', admission_number: '002', grade_level: 'Grade 7', class_name: 'West' },
  { student_id: 'three', student_name: 'Chao', admission_number: '003', grade_level: 'Grade 8', class_name: 'East' },
];
let mockRoster = [...originalRoster];
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock('@/lib/data/school-tenant-scope', () => ({ useOptionalSchoolTenantId: () => 'school-a' }));
jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
jest.mock('@/lib/dashboard/api-client', () => ({ requestDashboardApi: jest.fn() }));
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: (path: string) => ({
  data: path?.includes('billable-students') ? mockRoster : [{ id: 'plan', name: 'Term fees', grade_levels: ['Grade 7', 'Grade 8'], status: 'active', total_amount_minor: '123450', due_days: 14 }],
  error: mockError, isLoading: false, isFetching: false, refetch: mockRefetch,
}) }));
beforeEach(() => { jest.clearAllMocks(); mockError = null; mockRoster = [...originalRoster]; });
test('loads a whole roster, selects multiple distinct classes and reviews before issuing', async () => {
  const onComplete = jest.fn();
  (requestDashboardApi as jest.Mock).mockResolvedValue({ generated_count: 2, skipped_count: 0 });
  render(<BulkFeeBillingDialog initialStructureId="plan" onClose={jest.fn()} onComplete={onComplete} />);
  fireEvent.click(screen.getByLabelText('Selected classes / streams'));
  fireEvent.click(screen.getByLabelText('Grade 7 · East (1)'));
  fireEvent.click(screen.getByLabelText('Grade 8 · East (1)'));
  fireEvent.click(screen.getByRole('button', { name: 'Review 2 invoices' }));
  expect(requestDashboardApi).not.toHaveBeenCalled();
  expect(screen.getByText(/2,469/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Issue 2 invoices' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalled());
  expect(requestDashboardApi).toHaveBeenCalledWith('/billing/fee-structures/plan/generate-invoices', expect.objectContaining({ tenantId: 'school-a', body: expect.objectContaining({ target_students: [
    { student_id: 'one', student_name: 'Amina' }, { student_id: 'three', student_name: 'Chao' },
  ] }) }));
});
test('individual search keeps earlier selections and failed submissions retry unchanged', async () => {
  (requestDashboardApi as jest.Mock).mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ generated_count: 1, skipped_count: 1 });
  render(<BulkFeeBillingDialog initialStructureId="plan" onClose={jest.fn()} onComplete={jest.fn()} />);
  fireEvent.click(screen.getByLabelText('Individual learners'));
  fireEvent.click(screen.getByLabelText('Select Amina (001)'));
  fireEvent.change(screen.getByLabelText('Search learners'), { target: { value: '003' } });
  fireEvent.click(screen.getByLabelText('Select Chao (003)'));
  fireEvent.click(screen.getByRole('button', { name: 'Review 2 invoices' }));
  fireEvent.click(screen.getByRole('button', { name: 'Issue 2 invoices' }));
  await screen.findByText('Connection interrupted');
  fireEvent.click(screen.getByRole('button', { name: 'Retry issuing invoices' }));
  await waitFor(() => expect(requestDashboardApi).toHaveBeenCalledTimes(2));
  expect((requestDashboardApi as jest.Mock).mock.calls[0]).toEqual((requestDashboardApi as jest.Mock).mock.calls[1]);
});
test('failed roster cannot be billed and offers retry', () => {
  mockError = new Error('Roster unavailable');
  render(<BulkFeeBillingDialog initialStructureId="plan" onClose={jest.fn()} onComplete={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Review .* invoices/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry roster' }));
  expect(mockRefetch).toHaveBeenCalled();
});

test('a refreshed roster cannot silently add learners after the billing review', async () => {
  (requestDashboardApi as jest.Mock).mockResolvedValue({generated_count:3,skipped_count:0});
  const props={initialStructureId:'plan',onClose:jest.fn(),onComplete:jest.fn()};
  const view=render(<BulkFeeBillingDialog {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Review 3 invoices'}));
  mockRoster=[...mockRoster,{student_id:'new',student_name:'New learner',admission_number:'004',grade_level:'Grade 7',class_name:'East'}];
  view.rerender(<BulkFeeBillingDialog {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Issue 3 invoices'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalled());
  expect((requestDashboardApi as jest.Mock).mock.calls[0][1].body.target_students).toHaveLength(3);
});
