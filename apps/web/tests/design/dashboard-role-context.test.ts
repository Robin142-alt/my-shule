import {
  normalizeDashboardRoleContext,
  toDashboardRoleContextDto,
} from "@/lib/auth/dashboard-role-context";
import {
  getDefaultDashboardRolePath,
  isValidDashboardRolePath,
} from "@/lib/auth/school-dashboard-role-context";

describe("school dashboard role context", () => {
  it("normalizes route aliases while preserving the backend authorization role code", () => {
    const context = normalizeDashboardRoleContext({
      primary_role: "owner",
      active_role: "owner",
      assigned_roles: ["owner", "dean-of-academics"],
      available_roles: [
        {
          role_code: "owner",
          role_name: "Principal Dashboard",
          is_primary: true,
          is_teacher_mode: false,
          sources: ["primary_membership"],
        },
        {
          role_code: "dean-of-academics",
          role_name: "Dean of Academics Dashboard",
          is_primary: false,
          is_teacher_mode: false,
          sources: ["additional_assignment"],
        },
        {
          role_code: "teacher",
          role_name: "Teacher Dashboard",
          is_primary: false,
          is_teacher_mode: true,
          sources: ["teacher_eligibility"],
        },
      ],
      teacher_dashboard_eligible: true,
    }, "admin");

    expect(context.activeRole).toBe("principal");
    expect(context.activeAuthorizationRoleCode).toBe("owner");
    expect(context.primaryRole).toBe("principal");
    expect(context.primaryAuthorizationRoleCode).toBe("owner");
    expect(context.assignedRoles).toEqual(["principal", "dean-academics"]);
    expect(context.assignedAuthorizationRoleCodes).toEqual(["owner", "dean-of-academics"]);
    expect(context.availableRoles.map((option) => option.roleCode)).toEqual([
      "principal",
      "dean-academics",
      "teacher",
    ]);
    expect(context.availableRoles[0]).toMatchObject({
      authorizationRoleCode: "owner",
      isPrimary: true,
    });
    expect(toDashboardRoleContextDto(context).available_roles[0]?.role_code).toBe("owner");
  });

  it("keeps genuinely distinct authorization roles that share one dashboard route", () => {
    const context = normalizeDashboardRoleContext({
      primary_role: "owner",
      active_role: "principal",
      assigned_roles: ["owner", "principal"],
      available_roles: [
        {
          role_code: "owner",
          role_name: "School Owner Dashboard",
          is_primary: true,
          is_teacher_mode: false,
          sources: ["primary_membership"],
        },
        {
          role_code: "principal",
          role_name: "Principal Dashboard",
          is_primary: false,
          is_teacher_mode: false,
          sources: ["additional_assignment"],
        },
      ],
      teacher_dashboard_eligible: false,
    }, "principal");

    expect(context.activeRole).toBe("principal");
    expect(context.activeAuthorizationRoleCode).toBe("principal");
    expect(context.primaryAuthorizationRoleCode).toBe("owner");
    expect(context.availableRoles).toHaveLength(2);
    expect(context.availableRoles.map((option) => option.authorizationRoleCode))
      .toEqual(["owner", "principal"]);
    expect(context.availableRoles.map((option) => option.isPrimary))
      .toEqual([true, false]);
    expect(toDashboardRoleContextDto(context)).toMatchObject({
      primary_role: "owner",
      active_role: "principal",
      assigned_roles: ["owner", "principal"],
    });
  });

  it("preserves the raw staff authorization role while routing it to school administration", () => {
    const context = normalizeDashboardRoleContext({
      primary_role: "staff",
      active_role: "staff",
      assigned_roles: ["staff"],
      available_roles: [{
        role_code: "staff",
        role_name: "Staff Dashboard",
        is_primary: true,
        is_teacher_mode: false,
        sources: ["primary_membership"],
      }],
      teacher_dashboard_eligible: false,
    }, "admin");

    expect(context.activeRole).toBe("admin");
    expect(context.activeAuthorizationRoleCode).toBe("staff");
    expect(context.availableRoles[0]).toMatchObject({
      roleCode: "admin",
      authorizationRoleCode: "staff",
      isPrimary: true,
    });
  });

  it("filters unknown roles rather than converting them into School Admin access", () => {
    const context = normalizeDashboardRoleContext({
      primary_role: "principal",
      active_role: "principal",
      assigned_roles: ["principal", "invented-role"],
      available_roles: [
        {
          role_code: "invented-role",
          role_name: "Invented",
          is_primary: false,
          is_teacher_mode: false,
          sources: ["additional_assignment"],
        },
      ],
      teacher_dashboard_eligible: false,
    }, "principal");

    expect(context.assignedRoles).toEqual(["principal"]);
    expect(context.availableRoles).toHaveLength(1);
    expect(context.availableRoles[0]?.roleCode).toBe("principal");
  });

  it("restores only role-specific hosted paths", () => {
    expect(isValidDashboardRolePath("/my-timetable", "teacher", "hosted")).toBe(true);
    expect(isValidDashboardRolePath("/finance", "teacher", "hosted")).toBe(false);
    expect(isValidDashboardRolePath("/school/teacher/teacher-attendance", "teacher", "public")).toBe(true);
    expect(isValidDashboardRolePath("/school/teacher/finance", "teacher", "public")).toBe(false);
    expect(isValidDashboardRolePath("/school/principal/finance", "teacher", "public")).toBe(false);
    expect(getDefaultDashboardRolePath("teacher", "public")).toBe("/school/teacher");
    expect(getDefaultDashboardRolePath("teacher", "hosted")).toBe("/dashboard");
  });
});
