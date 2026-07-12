import { screen, within } from "@testing-library/react";
import { createElement } from "react";

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
});
