import { fireEvent, render, screen } from '@testing-library/react';
import { AppointedTimetableWorkspace } from '@/components/school/teacher-dashboard/appointed-timetable-workspace';
import { useOptionalSchoolDashboardRole } from '@/lib/auth/school-dashboard-role-context';

jest.mock('@/lib/auth/school-dashboard-role-context', () => ({ useOptionalSchoolDashboardRole: jest.fn() }));
jest.mock('@/components/school/deputy-principal/timetable-management-workspace', () => ({ DeputyTimetableManagementWorkspace: () => <p>Existing timetable and relief management</p> }));
jest.mock('@/components/school/teacher-dashboard/timetable-workspace', () => ({ TimetableWorkspace: () => <p>My personal timetable</p> }));

it('opens existing management for an appointed teacher, preserves personal timetable and reacts to revocation', () => {
  const roles = jest.mocked(useOptionalSchoolDashboardRole);
  roles.mockReturnValue({ authenticatedUser: { permissions: ['timetable:read', 'timetable:write'] } } as never);
  const view = render(<AppointedTimetableWorkspace />);
  expect(screen.getByText('Existing timetable and relief management')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'My teaching timetable' }));
  expect(screen.getByText('My personal timetable')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Timetable & Relief' }));
  roles.mockReturnValue({ authenticatedUser: { permissions: ['timetable:read'] } } as never);
  view.rerender(<AppointedTimetableWorkspace />);
  expect(screen.queryByText('Existing timetable and relief management')).not.toBeInTheDocument();
  expect(screen.getByText('My personal timetable')).toBeVisible();
});
