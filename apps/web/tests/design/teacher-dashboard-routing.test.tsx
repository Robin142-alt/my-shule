import { fireEvent, screen, within } from "@testing-library/react";
import { createElement } from "react";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(30000);

describe("teacher dashboard routing", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: {}, items: [], classes: [], assignments: [] }),
    }) as unknown as typeof fetch;
  });

  it("renders the newly built teacher dashboard shell for the teacher home route", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "teacher",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    expect(await screen.findByTestId("teacher-command-center")).toBeVisible();
    expect(screen.getAllByText(/Teacher Dash/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Assignments/i })).toBeVisible();
    expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
  });

  it("opens routed teacher sections inside the new teacher dashboard", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "teacher",
        section: "assignments",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    const shell = await screen.findByTestId("teacher-command-center");
    expect(shell).toBeVisible();
    expect(screen.getByRole("button", { name: /Assignments/i })).toHaveClass("bg-white/15");
    expect(within(document.body).queryByText(/Workspace Not Found/i)).not.toBeInTheDocument();
  });

  it("finds and opens a workspace from the header search, with a recoverable empty result", async () => {
    renderWithProviders(createElement(SchoolPages, {
      role: "teacher", tenantSlug: "homabay-high", routeMode: "public", liveDataEnabled: false,
    }));
    await screen.findByTestId("teacher-command-center");
    const search = screen.getByRole("textbox", { name: "Search teacher workspaces" });
    fireEvent.change(search, { target: { value: "unmatched-workspace" } });
    expect(screen.getByText(/No workspace matches/)).toBeVisible();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    fireEvent.change(search, { target: { value: "Exams & Marks" } });
    const results = screen.getByLabelText("Workspace search results");
    fireEvent.click(within(results).getByRole("button", { name: "Exams & Marks" }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: "Exams & Marks" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { name: "Exams & Marks", level: 2 })).toBeVisible();
  });

  it.each([
    ["students", /Learner Progress/i],
    ["academics", /Exams & Marks/i],
    ["communication", /^Parents$/i],
    ["reports-downloads", /^Reports$/i],
    ["reports-analytics", /Academic Intelligence/i],
  ] as const)(
    "routes legacy teacher sidebar section %s into the new teacher shell",
    async (section, activeButton) => {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "teacher",
          section,
          tenantSlug: "homabay-high",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      expect(await screen.findByTestId("teacher-command-center")).toBeVisible();
      expect(screen.getByRole("button", { name: activeButton })).toHaveClass("bg-white/15");
      expect(within(document.body).queryByText(/Workspace Not Found/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
    },
  );

  it("updates the active teacher workspace when the routed section changes client-side", async () => {
    const view = renderWithProviders(
      createElement(SchoolPages, {
        role: "teacher",
        section: "overview",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    expect(await screen.findByTestId("teacher-command-center")).toBeVisible();
    expect(screen.getByRole("button", { name: /Overview/i })).toHaveClass("bg-white/15");

    view.rerender(
      createElement(SchoolPages, {
        role: "teacher",
        section: "exams-marks",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
    );

    expect(await screen.findByRole("button", { name: /Exams & Marks/i })).toHaveClass("bg-white/15");
    expect(screen.getByRole("heading", { name: "Exams & Marks", level: 2 })).toBeVisible();
    expect(screen.getByText(/Enter scores, save your draft, then submit results/i)).toBeVisible();
    expect(within(document.body).queryByText(/Workspace Not Found/i)).not.toBeInTheDocument();
  });
});
