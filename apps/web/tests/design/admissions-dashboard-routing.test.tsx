import { screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

describe("admissions dashboard routing", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: {}, items: [], recentActivity: [] }),
    }) as unknown as typeof fetch;
  });

  it("renders the newly built admissions dashboard shell for the admissions officer home", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(within(dashboard).getByRole("heading", { name: /^Admissions$/i })).toBeVisible();
    expect(within(dashboard).getByRole("heading", { name: /Overview/i })).toBeVisible();
    expect(within(dashboard).getByRole("link", { name: /Fee Clearance/i })).toHaveAttribute(
      "href",
      "/school/admissions/fee-clearance",
    );
    expect(within(dashboard).getByRole("link", { name: /Enrolment/i })).toHaveAttribute(
      "href",
      "/school/admissions/enrolment",
    );
    expect(within(dashboard).queryByText(/registrar command/i)).not.toBeInTheDocument();
  });

  it("routes admissions officer sidebar items to unique production-ready workspaces", () => {
    const workspace = getSchoolWorkspace("admissions");
    const expectedSections = [
      "enquiries",
      "applications",
      "applicant-profiles",
      "documents",
      "interviews",
      "appointments",
      "selection",
      "fee-clearance",
      "placement",
      "enrolment",
      "parents",
      "transfers",
      "imports",
      "templates",
      "tasks",
      "communication",
      "reports",
    ];
    const navIds = workspace.navItems.map((item) => item.id);

    for (const section of expectedSections) {
      expect(navIds).toContain(section);
      expect(isSchoolSection(section)).toBe(true);
    }

    expect(navIds).not.toContain("class-placement");
    expect(navIds).not.toContain("parent-linking");
  });

  it("opens routed admissions sidebar sections as workable dashboard workspaces", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        section: "fee-clearance",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(within(dashboard).getAllByRole("heading", { name: /Fee Clearance/i }).length).toBeGreaterThan(0);
    expect(within(dashboard).getByText(/Manage admission fee clearance/i)).toBeVisible();
    expect(within(dashboard).getByRole("link", { name: /Fee Clearance/i })).toHaveAttribute(
      "href",
      "/school/admissions/fee-clearance",
    );
  });

  it("renders live application rows returned by the admissions backend contract", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: { total: 1, pending: 1, approved: 0, rejected: 0 },
        applicationsList: [
          {
            id: "application-1",
            student_name: "Achieng Otieno",
            guardian_name: "Mary Otieno",
            phone: "0712345678",
            grade_applied: "Grade 7",
            previous_school: "Lake Primary",
            status: "Pending",
            submitted_at: "2026-07-13",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        section: "applications",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(await within(dashboard).findByText("Achieng Otieno")).toBeVisible();
    expect(within(dashboard).getByRole("button", { name: /start review for Achieng Otieno/i })).toBeVisible();
    expect(within(dashboard).queryByText(/No records found/i)).not.toBeInTheDocument();
  });

  it("lets admissions officers start the first student admission from an empty workspace", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/csrf")) {
        return { ok: true, json: async () => ({ token: "csrf-token" }) };
      }
      if (url.includes("/api/admin-command/admissions/applications") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            id: "application-2",
            full_name: "Brian Ouma",
            class_applying: "Grade 8",
            status: "pending",
          }),
        };
      }
      if (url.includes("/api/admin-command/admissions/applications")) {
        return {
          ok: true,
          json: async () => ({ metrics: { total: 0, pending: 0, approved: 0, rejected: 0 }, applicationsList: [] }),
        };
      }
      if (url.includes("/api/admin-command/deputy/classes")) {
        return {
          ok: true,
          json: async () => ({
            metrics: { active_classes: 2 },
            classesList: [
              { id: "class-1", name: "Grade 7 North", classTeacher: "Ms Achieng", studentCount: 24, status: "Active" },
              { id: "class-2", name: "Grade 8 South", classTeacher: "Mr Otieno", studentCount: 21, status: "Active" },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        section: "applications",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");
    await user.click(within(dashboard).getByRole("button", { name: /start student admission/i }));

    await user.type(within(dashboard).getByLabelText(/student full name/i), "Brian Ouma");
    await user.type(within(dashboard).getByLabelText(/date of birth/i), "2012-01-12");
    await user.selectOptions(within(dashboard).getByLabelText(/gender/i), "Male");
    await user.type(within(dashboard).getByLabelText(/birth certificate number/i), "BC123456");
    await user.selectOptions(within(dashboard).getByLabelText(/class applying/i), "Grade 8 South");
    await user.type(within(dashboard).getByLabelText(/guardian name/i), "Peter Ouma");
    await user.type(within(dashboard).getByLabelText(/guardian phone/i), "0799999999");
    await user.click(within(dashboard).getByRole("button", { name: /save application/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin-command/admissions/applications"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"full_name":"Brian Ouma"'),
        }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin-command/admissions/applications"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"class_applying":"Grade 8 South"'),
        }),
      );
    });
  });

  it("loads class applying options from the current school's deputy-created classes", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin-command/deputy/classes")) {
        return {
          ok: true,
          json: async () => ({
            metrics: { active_classes: 2 },
            classesList: [
              { id: "class-10", name: "Form 1 East", classTeacher: "Jane Moraa", studentCount: 32, status: "Active" },
              { id: "class-11", name: "Form 2 West", classTeacher: "Ali Hassan", studentCount: 29, status: "Active" },
              { id: "class-12", name: "Archived Form 4", classTeacher: "Old Teacher", studentCount: 0, status: "Inactive" },
            ],
          }),
        };
      }
      if (url.includes("/api/admin-command/admissions/applications") && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "application-4" }) };
      }
      if (url.includes("/api/admin-command/admissions/applications")) {
        return {
          ok: true,
          json: async () => ({ metrics: { total: 0, pending: 0, approved: 0, rejected: 0 }, applicationsList: [] }),
        };
      }
      if (url.includes("/api/auth/csrf")) {
        return { ok: true, json: async () => ({ token: "csrf-token" }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        section: "applications",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");
    await user.click(within(dashboard).getByRole("button", { name: /start student admission/i }));

    const classSelect = await within(dashboard).findByLabelText(/class applying/i);
    expect(within(classSelect).getByRole("option", { name: "Form 1 East" })).toBeVisible();
    expect(within(classSelect).getByRole("option", { name: "Form 2 West" })).toBeVisible();
    expect(within(classSelect).queryByRole("option", { name: "Archived Form 4" })).not.toBeInTheDocument();

    await user.type(within(dashboard).getByLabelText(/student full name/i), "Linet Wanjala");
    await user.type(within(dashboard).getByLabelText(/date of birth/i), "2013-02-14");
    await user.selectOptions(within(dashboard).getByLabelText(/gender/i), "Female");
    await user.type(within(dashboard).getByLabelText(/birth certificate number/i), "BC765432");
    await user.selectOptions(classSelect, "Form 2 West");
    await user.type(within(dashboard).getByLabelText(/guardian name/i), "Martha Wanjala");
    await user.type(within(dashboard).getByLabelText(/guardian phone/i), "0711111111");
    await user.click(within(dashboard).getByRole("button", { name: /save application/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin-command/admissions/applications"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"class_applying":"Form 2 West"'),
        }),
      );
    });
  });

  it("shows approved applications in enrolment for final admission-number generation", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: { total_applicants: 1, admitted: 0, pending: 0, rejected: 0 },
        admissionsList: [
          {
            id: "application-3",
            student_name: "Faith Anyango",
            application_date: "2026-07-13",
            class_applied: "Grade 9",
            parent_name: "Rose Anyango",
            phone: "0700000000",
            status: "Approved",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        section: "enrolment",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(await within(dashboard).findByText("Faith Anyango")).toBeVisible();
    expect(within(dashboard).getByRole("button", { name: /enrol Faith Anyango/i })).toBeVisible();
  });
});
