import { STAFF_APPOINTMENT_CATALOG, MULTI_HOLDER_STAFF_APPOINTMENT_CODES } from "../../../api/src/auth/staff-appointment-catalog";
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AcademicFoundationWorkspace } from '@/components/school/academic-foundation-workspace';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { requestDashboardApi } from '@/lib/dashboard/api-client';
import { toast } from 'sonner';

jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: jest.fn() }));
jest.mock('@/lib/dashboard/api-client', () => ({ requestDashboardApi: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const foundation = {
  years: [], terms: [], calendarPeriods: [], classes: [], streams: [], departments: [], teachers: [],
  subjects: [{ id: 'math', name: 'Mathematics', status: 'active' }],
  hosStaff: [{ user_id: 'librarian', label: 'Alex', role_code: 'librarian' }],
  classSubjectAssignments: [], classTeachers: [], teacherAssignments: [], roleAppointments: [], appointmentRoles: STAFF_APPOINTMENT_CATALOG.map(role => ({ ...role, multipleHolders: MULTI_HOLDER_STAFF_APPOINTMENT_CODES.includes(role.code) })),
  curriculumConfigurations: [], gradingSystems: [], attendanceSettings: [], reportCardSettings: [],
};
const refetch = jest.fn().mockResolvedValue({ data: foundation });
beforeEach(() => {
  jest.clearAllMocks();
  (useSchoolQuery as jest.Mock).mockReturnValue({ data: foundation, isLoading: false, error: null, refetch });
});
const renderSetup = () => render(<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="Test School" tenantId="school-a" initialTab="subjects" />);

it('offers all existing school staff dashboards, omits obsolete coordinators and appoints existing non-teaching staff', async () => {
  const user = userEvent.setup();
  (requestDashboardApi as jest.Mock).mockResolvedValue({ appointment: { id: 'saved' } });
  render(<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="Test School" tenantId="school-a" initialTab="roles-curriculum" />);
  const role = screen.getByRole('combobox', { name: 'Role' });
  expect(within(role).getAllByRole('option').map(option => option.textContent).slice(1))
    .toEqual(STAFF_APPOINTMENT_CATALOG.map(role => role.label));
  for (const label of ['Subject Coordinator', 'Curriculum Coordinator', 'Academic Year Coordinator']) {
    expect(within(role).queryByRole('option', { name: label })).not.toBeInTheDocument();
  }
  await user.selectOptions(role, 'librarian');
  expect(screen.getByText(/Other holders keep their access/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Staff member'), 'librarian');
  await user.type(screen.getByLabelText('Reason', { exact: true }), 'Coordinate this term');
  expect(screen.getByLabelText('Department scope')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Save role appointment' }));
  await waitFor(() => expect(requestDashboardApi).toHaveBeenCalledWith('/academics/academic-roles', {
    method: 'POST', tenantId: 'school-a', body: expect.objectContaining({ role_type: 'librarian', teacher_user_id: 'librarian' }),
  }));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

it('keeps HOD and provides a separate two-field school-wide HOS assignment for non-teaching staff', async () => {
  const user = userEvent.setup();
  (requestDashboardApi as jest.Mock).mockResolvedValue({ appointment: { id: 'saved' } });
  renderSetup();
  expect(screen.getByRole('heading', { name: 'Assign or change HOD' })).toBeInTheDocument();
  const form = within(screen.getByRole('form', { name: 'Assign or change HOS' }));
  expect(form.getAllByRole('combobox')).toHaveLength(2);
  expect(form.queryByRole('textbox')).not.toBeInTheDocument();
  await user.selectOptions(form.getByLabelText('Subject', { exact: true }), 'math');
  await user.selectOptions(form.getByLabelText('Head of Subject'), 'librarian');
  await user.click(form.getByRole('button', { name: 'Save HOS' }));
  await waitFor(() => expect(requestDashboardApi).toHaveBeenCalledWith('/academics/subject-heads', {
    method: 'POST', tenantId: 'school-a', body: { subject_id: 'math', teacher_user_id: 'librarian' },
  }));
  await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  expect(toast.success).toHaveBeenCalled();
});

it('keeps the HOS form recoverable on failure and never announces false success', async () => {
  const user = userEvent.setup();
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('Staff membership is no longer active.'));
  renderSetup();
  const form = within(screen.getByRole('form', { name: 'Assign or change HOS' }));
  await user.selectOptions(form.getByLabelText('Subject', { exact: true }), 'math');
  await user.selectOptions(form.getByLabelText('Head of Subject'), 'librarian');
  await user.click(form.getByRole('button', { name: 'Save HOS' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Staff membership is no longer active.');
  expect(toast.success).not.toHaveBeenCalled();
  expect(form.getByLabelText('Subject', { exact: true })).toHaveValue('math');
  expect(form.getByRole('button', { name: 'Save HOS' })).toBeEnabled();
});

it('replaces the global readiness summary with per-area completion and supports mobile area switching', async () => {
  const user = userEvent.setup();
  renderSetup();
  expect(screen.queryByText(/Setup readiness/i)).not.toBeInTheDocument();
  const areas = screen.getByLabelText('Setup area');
  expect(within(areas).getAllByRole('option')).toHaveLength(6);
  expect(within(areas).getByRole('option', { name: /Subjects & Departments · 20%/ })).toBeInTheDocument();
  await user.selectOptions(areas, 'calendar');
  expect(screen.getByRole('tabpanel', { name: 'Academic Calendar' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create Academic Year' })).toBeInTheDocument();
});

it('uses keyboard arrows for area navigation and offers retry without reporting fake completion on load failure', async () => {
  const user = userEvent.setup();
  (useSchoolQuery as jest.Mock).mockReturnValue({ data: foundation, error: new Error('Network unavailable'), isLoading: false, refetch });
  renderSetup();
  expect(screen.queryByText(/% complete/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry setup' }));
  expect(refetch).toHaveBeenCalled();
  const subjects = screen.getByRole('tab', { name: 'Subjects & Departments' });
  subjects.focus();
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('tab', { name: 'Teacher Allocations' })).toHaveFocus();
  expect(screen.getByRole('tabpanel', { name: 'Teacher Allocations' })).toBeInTheDocument();
});

it('shows protected roles with a clear permission reason and prevents submitting them', async () => {
  const user = userEvent.setup();
  (useSchoolQuery as jest.Mock).mockReturnValue({ data: { ...foundation, appointmentRoles: [
    { code: 'principal', label: 'Principal', unavailableReason: 'A Principal or school administrator must manage this leadership appointment.' },
  ] }, isLoading: false, error: null, refetch });
  render(<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="Test School" tenantId="school-a" initialTab="roles-curriculum" />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'principal');
  expect(screen.getByRole('alert')).toHaveTextContent('A Principal or school administrator');
  expect(screen.getByRole('button', { name: 'Save role appointment' })).toBeDisabled();
  expect(requestDashboardApi).not.toHaveBeenCalled();
});
