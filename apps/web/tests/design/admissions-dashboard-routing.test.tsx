import { screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

describe("admissions dashboard routing", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
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

  it("routes legacy admissions desk URLs to the new applications workspace", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        section: "admissions",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(within(dashboard).getAllByRole("heading", { name: /^Applications$/i }).length).toBeGreaterThan(0);
    expect(within(dashboard).getByRole("button", { name: /start student admission/i })).toBeVisible();
    expect(within(dashboard).queryByText(/final admission-number generation/i)).not.toBeInTheDocument();
  });

  it("opens the new admissions command center when another school role enters the admissions module", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "principal",
        section: "admissions",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(within(dashboard).getAllByRole("heading", { name: /^Applications$/i }).length).toBeGreaterThan(0);
    expect(within(dashboard).getByRole("button", { name: /start student admission/i })).toBeVisible();
    expect(within(dashboard).queryByText(/Admissions Module/i)).not.toBeInTheDocument();
  });

  it("opens the student admission form from the routed start-admission action", async () => {
    window.history.pushState({}, "", "/school/admissions/applications?action=start-admission");

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

    expect(within(dashboard).getAllByRole("heading", { name: /^Applications$/i }).length).toBeGreaterThan(0);
    expect(await within(dashboard).findByRole("heading", { name: /new student admission/i })).toBeVisible();
    expect(within(dashboard).getByLabelText(/class applying/i)).toBeVisible();
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

  it("gives approved applications a real handoff action into enrolment", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: { total: 1, pending: 0, approved: 1, rejected: 0 },
        applicationsList: [
          {
            id: "application-approved-1",
            student_name: "Faith Anyango",
            guardian_name: "Rose Anyango",
            phone: "0700000000",
            grade_applied: "Grade 9",
            previous_school: "Lake Primary",
            status: "Approved",
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

    expect(await within(dashboard).findByText("Faith Anyango")).toBeVisible();
    const row = within(dashboard).getByRole("row", { name: /Faith Anyango.*Approved/i });
    expect(within(row).queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /open enrolment for Faith Anyango/i })).toHaveAttribute(
      "href",
      "/school/admissions/enrolment",
    );
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
      if (url.includes("/api/academics/class-sections")) {
        return {
          ok: true,
          json: async () => [
            { id: "class-1", name: "Grade 7 North", grade_level: "Grade 7", stream: "North", capacity: 45 },
            { id: "class-2", name: "Grade 8 South", grade_level: "Grade 8", stream: "South", capacity: 45 },
          ],
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
  }, 15000);

  it("loads class applying options from the current school's academic class sections", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/academics/class-sections")) {
        return {
          ok: true,
          json: async () => [
            { id: "class-10", name: "Form 1", grade_level: "Form 1", stream: "East", capacity: 45 },
            { id: "class-11", name: "Form 2 West", grade_level: "Form 2", stream: "West", capacity: 45 },
            { id: "class-12", name: "Archived Form 4", grade_level: "Form 4", stream: "Archived", capacity: 0, is_active: false },
          ],
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
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/academics/class-sections"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/admin-command/deputy/classes"), expect.anything());
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
  }, 15000);

  it("enrols approved applications through the command dashboard endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes("/api/admin-command/admissions/admissions/application-3/admit") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            student: { id: "student-3", admission_number: "ADM-2026-FAITH001" },
            application: { id: "application-3", status: "registered" },
          }),
        };
      }
      if (url.includes("/api/auth/csrf")) {
        return { ok: true, json: async () => ({ token: "csrf-token" }) };
      }
      return {
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
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

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
    await user.click(within(dashboard).getByRole("button", { name: /enrol Faith Anyango/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin-command/admissions/admissions/application-3/admit"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
