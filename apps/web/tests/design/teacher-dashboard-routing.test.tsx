import { screen, within } from "@testing-library/react";
import { createElement } from "react";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

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

    expect(await screen.findByRole("heading", { name: /Teacher Workspace/i })).toBeVisible();
    expect(screen.getByText(/Teacher Dash/i)).toBeVisible();
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

    const shell = await screen.findByRole("heading", { name: /Teacher Workspace/i });
    expect(shell).toBeVisible();
    expect(screen.getByRole("button", { name: /Assignments/i })).toHaveClass("bg-white/15");
    expect(within(document.body).queryByText(/Workspace Not Found/i)).not.toBeInTheDocument();
  });
});
