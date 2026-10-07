import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { getRoleHomePath } from '@/lib/auth/role-routing';
import { getSchoolRoleAlias, normalizeSchoolExperienceRole } from '@/lib/auth/school-role-normalization';
import { getSchoolWorkspace } from '@/lib/experiences/school-data';
import { HosCommandCenter, SubjectAppointmentsWorkspace } from '@/components/school/hos-command-center';
import { UserManagementPanel } from '@/components/school/user-management-panel';
import { hosWorkspaces, isHosSection } from '@/lib/school/hos-workspaces';
import { isSchoolSection } from '@/lib/routing/experience-routes';

const mockQuery = jest.fn();
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: (...args: unknown[]) => mockQuery(...args) }));
jest.mock('@/lib/auth/csrf-client', () => ({ getCsrfToken: async () => 'csrf-test' }));
jest.mock('@/components/school/school-pages', () => ({ buildSchoolSectionHref: (role: string, section: string, mode: string) => mode === 'public' ? `/school/${role}/${section}` : `/${section}` }));
jest.mock('@/components/school/integrated-school-command-header', () => ({ IntegratedSchoolCommandHeader: ({ roleTitle }: { roleTitle: string }) => <h1>{roleTitle}</h1>, SchoolCommandSidebarIdentity: () => <div>School identity</div> }));
jest.mock('@/components/school/academic-intelligence-workspace', () => ({ AcademicIntelligenceWorkspace: ({ audience, activeView }: { audience: string; activeView?: string }) => <div data-testid="analytics-audience">{audience}<span>{activeView}</span></div> }));
jest.mock('@/components/shared/notification-bell', () => ({ NotificationBell: () => <button>Notifications</button> }));
jest.mock('@/components/school/subject-head-setup', () => ({ SubjectHeadSetup: () => <p>Manage subject appointments</p> }));

beforeEach(() => { mockQuery.mockReset(); mockQuery.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() }); });

it('routes canonical and alias roles to a real subject workspace', () => {
  for (const role of ['head_of_subject', 'head-of-subject', 'hos']) {
    expect(getRoleHomePath(role)).toBe('/school/hos');
    expect(normalizeSchoolExperienceRole(role)).toBe('hos');
  }
  expect(getSchoolRoleAlias('head_of_subject')).toBe('hos');
  const workspace = getSchoolWorkspace('hos');
  expect(workspace.profile.roleLabel).toBe('Head of Subject');
  expect(workspace.navItems.map(item => item.id)).toEqual(expect.arrayContaining(['academic-intelligence', 'subjects']));
  render(<HosCommandCenter routeMode="public" />);
  expect(screen.getByRole('heading', { name: 'Head of Subject' })).toBeVisible();
  expect(screen.getByTestId('analytics-audience')).toHaveTextContent('hos');
  expect(screen.getByRole('link', { name: 'My Subject Appointments' })).toHaveAttribute('href', '/school/hos/subjects');
});

it('explains how to assign an empty subject scope and offers retry on failures', () => {
  const first = render(<SubjectAppointmentsWorkspace />);
  expect(screen.getByText('No subject appointment yet')).toBeVisible();
  expect(screen.getByText(/Ask the Principal/)).toBeVisible();
  expect(mockQuery).toHaveBeenCalledWith('/academics/my-subject-appointments');
  first.unmount();
  const refetch = jest.fn();
  mockQuery.mockReturnValue({ error: new Error('Service unavailable'), refetch });
  render(<SubjectAppointmentsWorkspace />);
  expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry appointments' }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it('provides grouped desktop navigation and opens a distinct learner workspace', () => {
  render(<HosCommandCenter routeMode="public" />);
  const menu = screen.getByRole('navigation', { name: 'Head of Subject workspaces' });
  expect(within(menu).getAllByRole('link')).toHaveLength(13);
  expect(within(menu).getByRole('link', { name: 'Exam Analytics' })).toHaveAttribute('href', '/school/hos/exam-analytics');
  fireEvent.click(within(menu).getByRole('link', { name: 'Learners at Risk' }));
  expect(screen.getByTestId('analytics-audience')).toHaveTextContent('At Risk');
  expect(within(menu).getByRole('link', { name: 'Learners at Risk' })).toHaveAttribute('aria-current', 'page');
  expect(window.location.pathname).toBe('/school/hos/at-risk');
});

it('opens the shared mobile menu and selects a workspace', () => {
  render(<HosCommandCenter routeMode="public" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Head of Subject workspace sidebar' }));
  const menu = screen.getByRole('dialog');
  fireEvent.click(within(menu).getByRole('button', { name: /Interventions/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByTestId('analytics-audience')).toHaveTextContent('Interventions');
});

it('honors direct links and subsequent route changes', () => {
  const { rerender } = render(<HosCommandCenter activeSection="reports" />);
  expect(screen.getByTestId('analytics-audience')).toHaveTextContent('Reports');
  rerender(<HosCommandCenter activeSection="trends" />);
  expect(screen.getByTestId('analytics-audience')).toHaveTextContent('Trends');
});

it('registers every HOS menu entry as an accessible school route', () => {
  const ids = getSchoolWorkspace('hos').navItems.map(item => item.id);
  for (const item of hosWorkspaces) {
    expect(ids).toContain(item.id);
    expect(isSchoolSection(item.id)).toBe(true);
    expect(isHosSection(item.id)).toBe(true);
  }
});

it('filters appointments by status and opens only active subject results', () => {
  const onOpenSubject = jest.fn();
  mockQuery.mockReturnValue({ data: [
    { id: 'a', subject_id: 'math', subject_name: 'Mathematics', status: 'active', appointment_type: 'permanent' },
    { id: 'b', subject_id: 'bio', subject_name: 'Biology', status: 'expired', appointment_type: 'acting' },
  ], refetch: jest.fn() });
  render(<SubjectAppointmentsWorkspace onOpenSubject={onOpenSubject} />);
  expect(screen.getAllByRole('button', { name: 'View subject results' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'View subject results' }));
  expect(onOpenSubject).toHaveBeenCalledWith('math');
  fireEvent.change(screen.getByLabelText('Appointment status'), { target: { value: 'expired' } });
  expect(screen.queryByRole('heading', { name: 'Mathematics' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Biology' })).toBeVisible();
});

it('shows dates and appointment state and filters by subject', () => {
  mockQuery.mockReturnValue({ data: [{ id: 'a', subject_name: 'Mathematics', appointment_type: 'acting', status: 'scheduled', effective_from: '2027-01-01', effective_to: null }], refetch: jest.fn() });
  render(<SubjectAppointmentsWorkspace />);
  expect(within(screen.getByRole('list')).getByText('scheduled')).toBeVisible();
  expect(screen.getByText('2027-01-01 to no end date')).toBeVisible();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Biology' } });
  expect(screen.getByText('No appointments match your search.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByText('Mathematics')).toBeVisible();
});

it('submits Head of Subject invitations through the existing CSRF protected endpoint', async () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'invite-1', role_code: 'head_of_subject', display_name: 'Subject Leader', email: 'hos@example.test', status: 'invited', invitation_sent: true }) });
  global.fetch = fetchMock;
  try {
    render(<UserManagementPanel />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Subject Leader' } });
    fireEvent.change(screen.getByPlaceholderText('name@school.ac.ke'), { target: { value: 'hos@example.test' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Role' }), { target: { value: 'head_of_subject' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invitation/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/auth/invitations');
    expect(options.headers['x-myshule-csrf']).toBe('csrf-test');
    expect(JSON.parse(options.body)).toEqual({ display_name: 'Subject Leader', email: 'hos@example.test', role_code: 'head_of_subject' });
    expect(await screen.findByText('Invitation queued for delivery.')).toBeVisible();
  } finally { global.fetch = originalFetch; }
});
