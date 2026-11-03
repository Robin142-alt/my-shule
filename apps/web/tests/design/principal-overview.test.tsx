import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrincipalOverviewWorkspace } from '@/components/school/principal-dashboard/overview-workspace';
import { waitingTime } from '@/components/school/principal-dashboard/overview-visitors';
import type { OverviewDetails } from '@/components/school/principal-dashboard/overview-types';
import { useSchoolQuery } from '@/lib/data/school-hooks';

test('the Overview keeps leadership actions without a repeated greeting or action heading', () => {
  mount();
  expect(screen.queryByLabelText('School greeting')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Quick actions' })).not.toBeInTheDocument();
  const buttons = within(screen.getByRole('region', { name: 'Quick actions' })).getAllByRole('button');
  expect(buttons).toHaveLength(4);
  expect(buttons[0]).toHaveTextContent('Send Message');
});

jest.mock('@/lib/data/school-hooks', () => ({ ...jest.requireActual('@/lib/data/school-hooks'), useSchoolQuery: jest.fn() }));
jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ hasPermission: () => true, isLoading: false }) }));
jest.mock('@/lib/data/school-tenant-scope', () => ({ useOptionalSchoolTenantId: () => 'school-test' }));
const subscribe = jest.fn((_event: string, _callback: () => void) => jest.fn());
jest.mock('@/lib/dashboard-communication/dashboard-communication-provider', () => ({ useDashboardEventBus: () => ({ subscribe }) }));
const query = jest.mocked(useSchoolQuery);
const retry = jest.fn();
let details: OverviewDetails;
let failDetails = false;
const arrival = new Date(Date.now() - 10 * 60_000).toISOString();
const visitors = Array.from({ length: 5 }, (_, index) => ({ id: `v-${index}`, visitor_name: `Test visitor ${index + 1}`,
  role_relationship: index ? 'Teacher' : 'Parent (Class A)', purpose: `Meeting request ${index + 1}`,
  arrival_time: arrival, person_to_see: 'Principal', ticket_number: `R-${index}`, status: 'Waiting' }));
const performance = {
  filters: { exam_series_id: 'exam-new', comparison_exam_id: 'exam-old' },
  options: { exams: [{ id: 'exam-new', name: 'Term assessment' }, { id: 'exam-old', name: 'Previous assessment' }] },
  kpis: { school_average: 61.5 }, previous: { mean: 60 },
  comparisons: [{ dimension: 'class', id: 'a', label: 'Class A', mean: 0, learners_examined: 2, expected_learners: 3, marks_completion: 80 },
    { dimension: 'class', id: 'b', label: 'Class B', mean: 82, learners_examined: 6, expected_learners: 6, marks_completion: 100 }],
};
const executive = { tenant_id: 'school-test', generated_at: '', enabled_modules: [], notifications: [], realtime_channels: [],
  alerts: [{ id: 'a', module_code: 'academics', title: 'Syllabus follow-up', message: 'Two subjects need review', severity: 'warning' as const }] };

function mount() {
  const navigate = jest.fn();
  const view = render(<QueryClientProvider client={new QueryClient()}><PrincipalOverviewWorkspace executiveDashboard={executive} onNavigate={navigate} /></QueryClientProvider>);
  return { ...view, navigate };
}
beforeEach(() => {
  jest.clearAllMocks(); failDetails = false;
  details = { generatedAt: new Date().toISOString(), calendar: { state: 'ready', data: { name: 'Term 2', year: '2026', week: 3, weeks: 12, days_left: 64 } },
    lessons: { state: 'ready', data: { taught: 12, recorded: 15 } }, health: { state: 'ready', data: { cases: 0 } },
    visitors: { state: 'ready', data: visitors }, finance: { state: 'hidden' } };
  query.mockImplementation((path) => ({ data: path?.includes('overview-details') ? details
    : path?.includes('/exams/analytics') ? performance : path?.includes('school-profile') ? { schoolName: 'Test School' }
      : { totalStudents: 412, totalStaff: 32, pendingApprovals: 2, activeIssues: 0 },
    isLoading: false, isError: failDetails && path?.includes('overview-details'), refetch: retry }) as never);
});

test('finance cards only appear for an onboarded module and use server amounts, including zero', () => {
  const view = mount();
  expect(screen.queryByText('Fee Collection Today')).not.toBeInTheDocument();
  expect(screen.queryByText('Total Arrears')).not.toBeInTheDocument();
  view.unmount();
  details.finance = { state: 'ready', data: { collectedTodayMinor: '0', arrearsMinor: '1234567', currency: 'KES' } };
  mount();
  expect(screen.getByRole('button', { name: 'View fee collection today' })).toHaveTextContent(/Ksh\s*0/i);
  expect(screen.getByRole('button', { name: 'View total arrears' })).toHaveTextContent(/12,345\.67/);
  expect(screen.queryByText(/Finance Active/)).not.toBeInTheDocument();
});

test('quick actions and attention rows open established workspaces', async () => {
  const { navigate } = mount(); const user = userEvent.setup();
  for (const [label, route] of [['Send Message', 'communication'], ['Review Approvals', 'approvals'], ['Publish Results', 'exams-reports'], ['Student Progression', 'student-progression']]) {
    await user.click(screen.getByRole('button', { name: new RegExp(label) })); expect(navigate).toHaveBeenLastCalledWith(route);
  }
  await user.click(screen.getByRole('button', { name: /Syllabus follow-up/ })); expect(navigate).toHaveBeenLastCalledWith('syllabus-coverage');
  await user.click(screen.getByRole('button', { name: 'View students' })); expect(navigate).toHaveBeenLastCalledWith('students');
});

test('exam selection refetches its real scope and zero scores remain valid clickable results', async () => {
  mount(); const user = userEvent.setup();
  expect(screen.getByText('61.5%')).toBeVisible();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Academic performance exam' }), 'exam-old');
  expect(query).toHaveBeenCalledWith('/exams/analytics?scope=school&page_size=1&exam_series_id=exam-old', expect.anything());
  await user.click(screen.getByRole('button', { name: 'Class A: 0%. View class details' }));
  const dialog = screen.getByRole('dialog', { name: 'Class A results' });
  expect(within(dialog).getByText('0%')).toBeVisible(); expect(within(dialog).getByText('2 of 3')).toBeVisible();
  await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('visitors retain arrival order, expand without truncation, and expose text-only purposes and details', async () => {
  mount(); const user = userEvent.setup();
  expect(screen.queryByText('Test visitor 5')).not.toBeInTheDocument();
  const table = screen.getByRole('table', { name: 'Visitors in arrival order' });
  expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Test visitor 1');
  expect(screen.getByText('Meeting request 1').querySelector('svg,img')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'View All' })); expect(screen.getByText('Test visitor 5')).toBeVisible();
  await user.click(within(screen.getByRole('dialog', { name: 'All waiting visitors' })).getByRole('button', { name: 'View details for Test visitor 1' }));
  expect(within(screen.getByRole('dialog')).getByText('Parent (Class A)')).toBeVisible();
});

test('refreshes keep one academic section and the visitor list opens without lengthening the Overview', async () => {
  const client = new QueryClient(); const user = userEvent.setup();
  const element = () => <QueryClientProvider client={client}><PrincipalOverviewWorkspace onNavigate={jest.fn()} /></QueryClientProvider>;
  const view = render(element()); view.rerender(element()); view.rerender(element());
  expect(screen.getAllByRole('region', { name: 'Academic performance' })).toHaveLength(1);
  const summary = screen.getByTestId('principal-overview');
  await user.click(within(summary).getByRole('button', { name: 'View All' }));
  expect(within(summary).queryByText('Test visitor 5')).not.toBeInTheDocument();
  expect(within(screen.getByRole('dialog', { name: 'All waiting visitors' })).getByText('Test visitor 5')).toBeVisible();
});

test('waiting times handle new arrivals, clock skew, elapsed hours and malformed dates', () => {
  const now = Date.parse('2026-11-02T09:00:00Z');
  expect(waitingTime('2026-11-02T09:00:30Z', now)).toBe('Just arrived');
  expect(waitingTime('2026-11-02T08:48:00Z', now)).toBe('12 min');
  expect(waitingTime('2026-11-02T07:42:00Z', now)).toBe('1h 18m');
  expect(waitingTime('invalid', now)).toBe('Time unavailable');
});

test('partial failure leaves retryable panels visible and does not imply a healthy empty queue', async () => {
  details.visitors = { state: 'error' }; details.finance = { state: 'error' };
  mount(); const user = userEvent.setup();
  expect(screen.getByText('The reception queue could not be loaded.')).toBeVisible();
  expect(screen.queryByText(/No one is waiting/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'View total arrears' })).toHaveTextContent('—');
  await user.click(within(screen.getByRole('region', { name: 'People waiting to see you' })).getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalled();
});

test('admission events invalidate authoritative counts instead of adding optimistic duplicate students', () => {
  const client = new QueryClient(); const invalidate = jest.spyOn(client, 'invalidateQueries');
  render(<QueryClientProvider client={client}><PrincipalOverviewWorkspace executiveDashboard={executive} /></QueryClientProvider>);
  const callback = subscribe.mock.calls[0]?.[1] as unknown as () => void;
  act(() => callback()); expect(invalidate).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'View students' })).toHaveTextContent('412');
});
