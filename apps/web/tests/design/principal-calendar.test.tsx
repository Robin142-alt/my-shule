import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PrincipalAcademicSetupWorkspace } from '@/components/school/principal-dashboard/academic-setup-workspace';
const request = jest.fn(); const refetch = jest.fn(); let canWrite = true;
jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ hasPermission: () => canWrite }) }));
jest.mock('@/components/school/principal-dashboard/verified-tenant-api', () => ({ useVerifiedPrincipalDashboardApi: () => request }));
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: () => ({ data: {
  years: [{ id: 'year', name: '2026', starts_on: '2026-01-01', ends_on: '2026-12-31', is_current: true }],
  terms: [{ id: 'term', academic_year_id: 'year', name: 'Term 3', starts_on: '2026-09-01', ends_on: '2026-11-20', is_current: true }],
  calendarPeriods: [{ id: 'exam', academic_year_id: 'year', name: 'Final examinations', period_type: 'exam', starts_on: '2026-11-10', ends_on: '2026-11-14' }],
}, refetch }) }));
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-11-02T08:00:00Z') }); canWrite = true; request.mockReset().mockResolvedValue({}); });
afterEach(() => { jest.useRealTimers(); });

test('calendar shows authoritative years, terms and milestones without unrelated setup or archive controls', () => {
  render(<PrincipalAcademicSetupWorkspace />);
  expect(screen.getByRole('heading', { name: 'Academic Calendar' })).toBeVisible();
  expect(screen.getByText('Final examinations')).toBeVisible();
  expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Grading Systems|Attendance Settings|Report Card Profiles/)).not.toBeInTheDocument();
});

test('authorized year creation updates the existing calendar endpoint and refreshes records', async () => {
  render(<PrincipalAcademicSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Add year' }));
  const dialog = screen.getByRole('dialog', { name: 'Add academic year' });
  fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: '2027' } });
  fireEvent.change(within(dialog).getByLabelText('Starts on'), { target: { value: '2027-01-04' } });
  fireEvent.change(within(dialog).getByLabelText('Ends on'), { target: { value: '2027-11-19' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save calendar record' }));
  await waitFor(() => expect(request).toHaveBeenCalledWith('/academics/years', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ name: '2027', starts_on: '2027-01-04', ends_on: '2027-11-19' }) })));
  await waitFor(() => expect(refetch).toHaveBeenCalled());
});

test('read-only leadership sees dates without mutation controls', () => {
  canWrite = false; render(<PrincipalAcademicSetupWorkspace />);
  expect(screen.queryByRole('button', { name: 'Add year' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
});
