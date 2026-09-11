import { fireEvent, render, screen } from '@testing-library/react';
import { SubjectHeadSetup } from '@/components/school/subject-head-setup';
import { SchoolTenantScopeProvider } from '@/lib/data/school-tenant-scope';

const mockPermission = jest.fn();
jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ hasPermission: mockPermission }) }));
jest.mock('@/lib/auth/school-dashboard-role-context', () => ({ useOptionalSchoolDashboardRole: () => ({ activeAuthorizationRoleCode: 'principal' }) }));
jest.mock('@/components/school/integrated-school-command-header', () => ({ useSchoolCommandIdentity: () => ({ schoolName: 'School A' }) }));
jest.mock('@/components/school/academic-foundation-workspace', () => ({ AcademicFoundationWorkspace: (props: { tenantId: string; initialRoleType: string; initialTab: string }) => <div data-testid="appointment-form" data-tenant={props.tenantId} data-role={props.initialRoleType} data-tab={props.initialTab}>Appointment form</div> }));

it('opens the existing appointment form in the current school with the subject role selected', () => {
  mockPermission.mockReturnValue(true);
  render(<SchoolTenantScopeProvider tenantId="school-a"><SubjectHeadSetup /></SchoolTenantScopeProvider>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Manage subject appointments' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByTestId('appointment-form')).toHaveAttribute('data-tenant', 'school-a');
  expect(screen.getByTestId('appointment-form')).toHaveAttribute('data-role', 'head_of_subject');
  expect(screen.getByTestId('appointment-form')).toHaveAttribute('data-tab', 'roles-curriculum');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('requires both a school context and appointment assignment permission', () => {
  mockPermission.mockReturnValue(true);
  const withoutSchool = render(<SubjectHeadSetup />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  withoutSchool.unmount();
  mockPermission.mockReturnValue(false);
  render(<SchoolTenantScopeProvider tenantId="school-a"><SubjectHeadSetup /></SchoolTenantScopeProvider>);
  expect(mockPermission).toHaveBeenCalledWith('academics:assign-teachers');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
