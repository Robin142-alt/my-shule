import { screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

function admissionFoundation(classes = [
  {
    id: "class-grade-7",
    academic_year_id: "year-2026",
    academic_level_id: "level-grade-7",
    name: "Grade 7 North",
    grade_level: "Grade 7",
    curriculum: "CBC",
    capacity: 45,
    enrolment_open: true,
    student_count: 0,
  },
]) {
  return {
    academic_years: [{ id: "year-2026", name: "2026", status: "active", is_current: true }],
    classes,
    streams: classes.map((item, index) => ({
      id: `stream-${index + 1}`,
      class_section_id: item.id,
      name: index === 0 ? "North" : "West",
      capacity: item.capacity,
      student_count: item.student_count,
    })),
    subjects: [{ id: "subject-mat", code: "MAT", name: "Mathematics", curriculum: "CBC", subject_type: "core", is_compulsory: true, is_examinable: true }],
    class_subject_assignments: classes.map((item) => ({ academic_year_id: "year-2026", class_section_id: item.id, subject_id: "subject-mat", is_compulsory: true, is_examinable: true })),
    admission_settings: {
      admission_number_mode: "suggested",
      admission_number_prefix: "MS",
      admission_number_separator: "-",
      admission_number_padding: 4,
      include_academic_year: true,
      strict_capacity: true,
      strict_age_rules: false,
      minimum_age: null,
      maximum_age: null,
      minimum_subjects: 1,
      maximum_subjects: 12,
      suggested_admission_number: "MS-2026-0001",
    },
  };
}

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

    expect(within(dashboard).getByRole("heading", { name: /Admissions Officer Dashboard/i })).toBeVisible();
    expect(within(dashboard).getByRole("link", { name: /Overview/i })).toBeVisible();
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
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admissions/foundation")) {
        return { ok: true, json: async () => admissionFoundation() };
      }
      if (url.includes("/api/admissions/drafts/current")) {
        return { ok: true, json: async () => null };
      }
      return { ok: true, json: async () => ({ metrics: {}, items: [], recentActivity: [] }) };
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

    expect(within(dashboard).getAllByRole("heading", { name: /^Applications$/i }).length).toBeGreaterThan(0);
    expect(await within(dashboard).findByRole("heading", { name: /new student admission/i })).toBeVisible();
    expect(await within(dashboard).findByLabelText(/^Admission number(?! mode)/i)).toBeVisible();
    expect(within(dashboard).getByLabelText(/^Date of birth/i)).toHaveAttribute("placeholder", "DD/MM/YYYY");
    expect(within(dashboard).queryByText(/birth certificate|NEMIS|passport photo/i)).not.toBeInTheDocument();
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

  it("lets admissions officers start the canonical guided admission from an empty workspace", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admissions/foundation")) return { ok: true, json: async () => admissionFoundation() };
      if (url.includes("/api/admissions/drafts/current")) return { ok: true, json: async () => null };
      return { ok: true, json: async () => ({ metrics: { total: 0, pending: 0, approved: 0, rejected: 0 }, applicationsList: [] }) };
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

    expect(await within(dashboard).findByLabelText(/^First name/i)).toBeVisible();
    expect(within(dashboard).getByText("Student Details")).toBeVisible();
    expect(within(dashboard).getByText("Class & Stream")).toBeVisible();
    expect(within(dashboard).getByText("Subjects")).toBeVisible();
    expect(within(dashboard).getAllByText("Guardian").length).toBeGreaterThan(0);
    expect(within(dashboard).getByText("Review & Admit")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/admissions/foundation"), expect.anything());
  }, 15000);

  it("loads placement options from the current school's academic foundation", async () => {
    const user = userEvent.setup();
    const classes = [
      { id: "class-10", academic_year_id: "year-2026", academic_level_id: "level-form-1", name: "Form 1 East", grade_level: "Form 1", curriculum: "CBC", capacity: 45, enrolment_open: true, student_count: 0 },
      { id: "class-11", academic_year_id: "year-2026", academic_level_id: "level-form-2", name: "Form 2 West", grade_level: "Form 2", curriculum: "CBC", capacity: 45, enrolment_open: true, student_count: 1 },
    ];
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admissions/foundation")) return { ok: true, json: async () => admissionFoundation(classes) };
      if (url.includes("/api/admissions/drafts/current")) return { ok: true, json: async () => null };
      return { ok: true, json: async () => ({ metrics: { total: 0, pending: 0, approved: 0, rejected: 0 }, applicationsList: [] }) };
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

    await user.type(await within(dashboard).findByLabelText(/^First name/i), "Linet");
    await user.type(within(dashboard).getByLabelText(/^Last name/i), "Wanjala");
    await user.selectOptions(within(dashboard).getByLabelText(/^Gender/i), "female");
    await user.type(within(dashboard).getByLabelText(/^Date of birth/i), "14/02/2013");
    await user.click(within(dashboard).getByRole("button", { name: /continue/i }));
    await user.selectOptions(within(dashboard).getByLabelText(/^Academic year/i), "year-2026");
    await user.selectOptions(within(dashboard).getByLabelText(/^Curriculum/i), "CBC");
    const classSelect = within(dashboard).getByLabelText(/^Class \/ form \/ grade/i);
    await user.selectOptions(classSelect, "class-11");

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/admissions/foundation"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/academics/class-sections"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/admin-command/deputy/classes"), expect.anything());
    expect(within(classSelect).getByRole("option", { name: "Form 2 West (1/45 learners)" })).toBeVisible();
    expect(within(classSelect).queryByRole("option", { name: "Archived Form 4" })).not.toBeInTheDocument();
  }, 15000);

  it("shows a retry action instead of claiming the school has no foundation when the shared read fails", async () => {
    const user = userEvent.setup();
    let foundationAttempts = 0;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admissions/foundation")) {
        foundationAttempts += 1;
        if (foundationAttempts <= 2) {
          return { ok: false, status: 500, json: async () => ({ message: "Foundation read failed" }) };
        }
        return { ok: true, json: async () => admissionFoundation() };
      }
      if (url.includes("/api/admissions/drafts/current")) return { ok: true, json: async () => null };
      if (url.includes("/api/admin-command/admissions/applications")) {
        return {
          ok: true,
          json: async () => ({ metrics: { total: 0, pending: 0, approved: 0, rejected: 0 }, applicationsList: [] }),
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
    expect(await within(dashboard).findByText(/academic foundation could not be loaded/i, {}, { timeout: 8_000 })).toBeVisible();
    expect(within(dashboard).queryByText(/no academic year is configured/i)).not.toBeInTheDocument();

    await user.click(within(dashboard).getByRole("button", { name: /^retry$/i }));
    expect(await within(dashboard).findByLabelText(/^Admission number(?! mode)/i)).toBeVisible();
  });

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
