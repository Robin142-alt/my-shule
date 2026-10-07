import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { SchoolPages } from "@/components/school/school-pages";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(30000);

describe("exams manager dashboard routing", () => {
  it.each(["public", "hosted"] as const)("opens dedicated Exam Analytics from its %s route", async (routeMode) => {
    renderWithProviders(createElement(SchoolPages, {role:"exams-manager",section:"exam-analytics",tenantSlug:"homabay-high",routeMode,liveDataEnabled:false}));
    expect(await screen.findByRole("heading",{name:"Exam Analytics"})).toBeVisible();
    expect(screen.getByRole("button",{name:"Exam Analytics"})).toHaveAttribute("aria-current","page");
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
  });
  it("registers the workflow route and requires the Exams module", () => {
    expect(isSchoolSection("exam-workflow")).toBe(true);
    expect(isSchoolSectionEnabled("exam-workflow", ["exams"])).toBe(true);
    expect(isSchoolSectionEnabled("exam-workflow", ["academics", "reports"])).toBe(false);
  });

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: {}, items: [], exams: [], marks: [], reports: [] }),
    }) as unknown as typeof fetch;
  });

  it("routes canonical exams manager sections into the new exams manager command center", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "exams-manager",
        section: "exam-setup",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    expect(await screen.findByRole("heading", { name: /Exams Manager Dashboard/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Exam Setup \/ Exam Builder$/i })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
  });

  it("routes legacy exams action links into the new exams manager command center", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "exams-manager",
        section: "exams",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    expect(await screen.findByRole("heading", { name: /Exams Manager Dashboard/i })).toBeVisible();
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
  });

  it.each(["public", "hosted"] as const)("opens the dedicated workflow route in %s mode", async (routeMode) => {
    renderWithProviders(createElement(SchoolPages, {
      role: "exams-manager", section: "exam-workflow", tenantSlug: "homabay-high",
      routeMode, liveDataEnabled: false,
    }));

    expect(await screen.findByRole("heading", { name: "Exam Workflow" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Exam Workflow" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Examination overview" })).not.toBeInTheDocument();
  });

  it("opens the workflow from the sidebar and navigates to its next workspaces", async () => {
    const user = userEvent.setup();
    renderWithProviders(createElement(SchoolPages, {
      role: "exams-manager", section: "exam-setup", tenantSlug: "homabay-high",
      routeMode: "public", liveDataEnabled: false,
    }));

    await user.click(await screen.findByRole("button", { name: "Exam Workflow" }));
    expect(window.location.pathname).toBe("/school/exams-manager/exam-workflow");
    expect(screen.getByRole("heading", { name: "Exam Workflow" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Open marks entry" }));
    expect(window.location.pathname).toBe("/school/exams-manager/marks-entry");
    expect(screen.getByRole("button", { name: "Marks Entry Hub" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Exam Workflow" }));
    await user.click(screen.getByRole("button", { name: "Open exam setup" }));
    expect(window.location.pathname).toBe("/school/exams-manager/exam-setup");
    await user.click(screen.getByRole("button", { name: "Exam Workflow" }));
    await user.click(screen.getByRole("button", { name: "Open report cards" }));
    expect(window.location.pathname).toBe("/school/exams-manager/report-cards");
  });
});
