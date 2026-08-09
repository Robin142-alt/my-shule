import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolDashboardRoleSwitcher } from "@/components/school/school-dashboard-role-switcher";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";

jest.mock("@/lib/auth/school-dashboard-role-context", () => ({
  useOptionalSchoolDashboardRole: jest.fn(),
}));

const mockedUseRole = jest.mocked(useOptionalSchoolDashboardRole);

function roleState(overrides: Record<string, unknown> = {}) {
  return {
    activeRole: "principal",
    activeAuthorizationRoleCode: "owner",
    primaryRole: "principal",
    primaryAuthorizationRoleCode: "owner",
    assignedRoles: ["principal", "dean-academics"],
    assignedAuthorizationRoleCodes: ["owner", "dean-of-academics"],
    availableRoles: [
      {
        roleCode: "principal",
        authorizationRoleCode: "owner",
        roleName: "Principal Dashboard",
        isPrimary: true,
        isTeacherMode: false,
        sources: ["primary_membership"],
      },
      {
        roleCode: "dean-academics",
        authorizationRoleCode: "dean-of-academics",
        roleName: "Dean of Academics Dashboard",
        isPrimary: false,
        isTeacherMode: false,
        sources: ["additional_assignment"],
      },
      {
        roleCode: "teacher",
        authorizationRoleCode: "teacher",
        roleName: "Teacher Dashboard",
        isPrimary: false,
        isTeacherMode: true,
        sources: ["teacher_eligibility"],
      },
    ],
    teacherDashboardEligible: true,
    tenantSlug: "school-alpha",
    userId: "user-1",
    userLabel: "Jane Mwangi",
    liveDataEnabled: true,
    authenticatedSession: null,
    authenticatedUser: null,
    isLoading: false,
    isSwitching: false,
    switchingToAuthorizationRoleCode: null,
    error: null,
    clearError: jest.fn(),
    reloadDashboardRoles: jest.fn().mockResolvedValue(undefined),
    switchDashboardRole: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("SchoolDashboardRoleSwitcher", () => {
  it("shows only server-provided dashboards and switches through the governed action", async () => {
    const state = roleState();
    mockedUseRole.mockReturnValue(state as ReturnType<typeof useOptionalSchoolDashboardRole>);
    const user = userEvent.setup();
    render(<SchoolDashboardRoleSwitcher />);

    const trigger = screen.getByRole("button", { name: /switch dashboard.*principal dashboard/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveClass("min-h-11");
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Switch dashboard" })).toBeVisible();
    expect(screen.getByRole("radiogroup", { name: "Available dashboards" })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Teacher Dashboard/i })).toBeVisible();
    expect(screen.queryByText("Bursar Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Jane Mwangi")).toBeVisible();

    await user.click(screen.getByRole("radio", { name: /Teacher Dashboard/i }));
    expect(state.switchDashboardRole).toHaveBeenCalledWith("teacher");
  });

  it("keeps role-service failures visible and provides recovery for single-role users", async () => {
    const state = roleState({
      availableRoles: [roleState().availableRoles[0]],
      error: "Unable to load your dashboard roles.",
    });
    mockedUseRole.mockReturnValue(state as ReturnType<typeof useOptionalSchoolDashboardRole>);
    const user = userEvent.setup();
    render(<SchoolDashboardRoleSwitcher />);

    await user.click(screen.getByRole("button", { name: /dashboard access is degraded/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load your dashboard roles.");
    await user.click(screen.getByRole("button", { name: "Retry role access" }));
    expect(state.reloadDashboardRoles).toHaveBeenCalledTimes(1);
  });

  it("keeps alias-colliding authorization roles distinct and switches by raw code", async () => {
    const baseState = roleState();
    const state = roleState({
      availableRoles: [
        baseState.availableRoles[0],
        {
          roleCode: "principal",
          authorizationRoleCode: "principal",
          roleName: "Principal Dashboard",
          isPrimary: false,
          isTeacherMode: false,
          sources: ["additional_assignment"],
        },
      ],
    });
    mockedUseRole.mockReturnValue(state as ReturnType<typeof useOptionalSchoolDashboardRole>);
    const user = userEvent.setup();
    render(<SchoolDashboardRoleSwitcher />);

    await user.click(screen.getByRole("button", { name: /switch dashboard/i }));
    const principalAssignment = screen.getByRole("radio", {
      name: /Principal Dashboard.*principal.*additional role/i,
    });
    await user.click(principalAssignment);

    expect(state.switchDashboardRole).toHaveBeenCalledWith("principal");
  });
});
