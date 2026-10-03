import { expect, test } from "@playwright/test";
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import { SCHOOL_SESSION_COOKIE, serializeExperienceSession } from "@/lib/auth/experience-routing";

for (const width of [1440, 390]) {
  test(`academic appointments update the existing switcher at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    page.setDefaultTimeout(15_000);
    await page.clock.install();
    let appointed = false;
    let saves = 0;
    let activeRole = "deputy_principal";
    const tenantSlug = "appointment-test-school";
    const session = () => {
      const roles = ["deputy_principal", "teacher", ...(appointed ? ["dean_academics"] : [])];
      const roleContext = normalizeDashboardRoleContext({ primary_role: "deputy_principal", active_role: activeRole,
        assigned_roles: roles, teacher_dashboard_eligible: true, available_roles: roles.map(role_code => ({ role_code,
          role_name: ({ deputy_principal: "Deputy Principal", teacher: "Teacher", dean_academics: "Dean of Academics" } as Record<string, string>)[role_code],
          is_primary: role_code === "deputy_principal", is_teacher_mode: role_code === "teacher",
          sources: ["primary_membership"] })) }, "deputy-principal");
      const user = { user_id: "staff-a", tenant_id: tenantSlug, role: activeRole, display_name: "Test Staff",
        email: "staff@example.test", session_id: "test-session", permissions: ["*:*"] };
      return { audience: "school", tenantSlug, userLabel: "Test Staff", role: roleContext.activeRole, roleContext, user,
        homePath: `/school/${roleContext.activeRole}`, redirectTo: `/school/${roleContext.activeRole}` };
    };
    const updateCookie = async () => {
      const current = session();
      await page.context().addCookies([{ name: SCHOOL_SESSION_COOKIE,
        value: serializeExperienceSession({ experience: "school", role: current.role,
          tenantSlug, userLabel: "Test Staff", homePath: current.homePath }), url: "http://127.0.0.1:3005" }]);
    };
    await updateCookie();
    await page.context().addCookies([{ name: "myshule_access", value: "local-appointment-test", url: "http://127.0.0.1:3005" }]);
    // These controlled gateway responses never create or change real school records.
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/me") return route.fulfill({ json: { session: session(), user: session().user } });
      if (path === "/api/auth/csrf") return route.fulfill({ json: { token: "local-test-csrf" } });
      if (path === "/api/auth/active-role") {
        activeRole = route.request().postDataJSON().role_code;
        await updateCookie();
        return route.fulfill({ json: { session: session(), user: session().user, roleContext: session().roleContext } });
      }
      if (path === "/api/school/modules/me") return route.fulfill({ json: ["deputy_dashboard", "teacher_dashboard", "academics", "timetable", "students", "reports"] });
      if (path === "/api/academics/foundation") return route.fulfill({ json: {
        years: [], terms: [], calendarPeriods: [], classes: [], streams: [], subjects: [], departments: [], teachers: [],
        hosStaff: [{ user_id: "staff-a", label: "Test Staff", display_name: "Test Staff", role_code: "deputy_principal" }],
        classSubjectAssignments: [], classTeachers: [], teacherAssignments: [], roleAppointments: [], curriculumConfigurations: [],
        gradingSystems: [], attendanceSettings: [], reportCardSettings: [],
      } });
      if (path === "/api/academics/academic-roles" && route.request().method() === "POST") {
        expect(route.request().postDataJSON()).toMatchObject({ role_type: "dean_of_academics", teacher_user_id: "staff-a" });
        appointed = true;
        saves += 1;
        return route.fulfill({ json: { appointment: { id: "test-appointment" } } });
      }
      return route.fulfill({ status: 503, json: { message: "Local workflow test: other services unavailable" } });
    });
    await page.goto("/school/deputy-principal/academics");
    await expect(page.getByLabel("Academic foundation setup")).toBeVisible();
    if (width < 768) await page.getByRole("combobox", { name: /^Setup area/ }).selectOption("roles-curriculum");
    else await page.getByRole("tab", { name: /Roles & Curriculum/ }).click();
    const role = page.getByRole("combobox", { name: "Role", exact: true });
    for (const excluded of ["Subject Coordinator", "Curriculum Coordinator", "Academic Year Coordinator"]) {
      await expect(role.getByRole("option", { name: excluded, exact: true })).toHaveCount(0);
    }
    await expect(role.getByRole("option", { name: "Timetable Coordinator", exact: true })).toHaveCount(1);
    await role.selectOption("dean_of_academics");
    await page.getByRole("combobox", { name: "Staff member", exact: true }).selectOption("staff-a");
    await page.getByRole("textbox", { name: "Reason", exact: true }).fill("Academic leadership appointment");
    await page.getByRole("button", { name: "Save role appointment", exact: true }).click();
    await expect.poll(() => saves).toBe(1);
    const switcher = page.getByRole("button", { name: /switch dashboard.*deputy principal/i });
    await switcher.click();
    await expect(page.getByRole("radio", { name: /Dean of Academics/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Teacher\b/ })).toBeVisible();
    appointed = false;
    await page.clock.runFor(30_100);
    await expect(page.getByRole("radio", { name: /Dean of Academics/i })).toHaveCount(0);
    await page.getByRole("radio", { name: /^Teacher\b/ }).click();
    await expect(page).toHaveURL(/\/school\/teacher$/);
    await expect(page.getByTestId("teacher-command-center")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../../tmp/academic-appointment-access-${width}.png`, fullPage: true });
  });
}
