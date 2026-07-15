import { screen } from "@testing-library/react";
import { createElement } from "react";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(30000);

describe("exams manager dashboard routing", () => {
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

    expect(await screen.findByRole("heading", { name: /Exams Manager Desk/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Exam Setup \/ Exam Builder$/i })).toHaveClass("bg-white");
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

    expect(await screen.findByRole("heading", { name: /Exams Manager Desk/i })).toBeVisible();
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
  });
});
