import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { ExamsManagerCommandCenter } from "@/components/school/exams-manager-command-center";

import { renderWithProviders } from "./test-utils";

describe("academic office production readiness", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it.each(["public", "hosted"] as const)("opens legacy publishing links in the single Report Cards workspace (%s)", async (routeMode) => {
    const section = "publishing";
    window.history.replaceState({ preserved: true }, "", `/school/exams-manager/${section}?exam=latest#reports`);
    renderWithProviders(<SchoolPages role="exams-manager" section={section} routeMode={routeMode} tenantSlug="kisumu-boys" liveDataEnabled={false} />);

    expect(await screen.findByRole("heading", { name: "Report Cards" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Report Cards" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Report Cards" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Report Card Handoff" })).not.toBeInTheDocument();
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(`${routeMode === "public" ? "/school/exams-manager" : ""}/report-cards?exam=latest#reports`);
    expect(window.history.state).toEqual({ preserved: true });
  });

  it("keeps a single mobile Report Cards entry with both generation and recall", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExamsManagerCommandCenter activeSection="report-cards" routeMode="public" />);
    await user.click(screen.getByRole("button", { name: "Open Exams workspace sidebar" }));
    const menu = await screen.findByRole("dialog", { name: "Exams workspace" });
    expect(within(menu).getAllByRole("button", { name: /^Report Cards/ })).toHaveLength(1);
    expect(within(menu).queryByRole("button", { name: /Report Card Handoff/ })).not.toBeInTheDocument();
    await user.click(within(menu).getByRole("button", { name: /^Report Cards/ }));
    expect(screen.queryByRole("dialog", { name: "Exams workspace" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate class report cards" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recall all under review" })).toBeInTheDocument();
  });

  it("keeps report-card publication under principal authority", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="exams-manager" section="exams" tenantSlug="kisumu-boys" liveDataEnabled={false} />);

    await screen.findByRole("heading", { name: /exams manager dashboard/i });
    await user.click(screen.getByRole("button", { name: /^report cards$/i }));

    expect(document.body.textContent).toMatch(/only the principal can publish approved results/i);
    expect(screen.queryByRole("button", { name: /^publish\b/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(unpublish|withdraw)\b/i })).not.toBeInTheDocument();
  });

  it("opens exams manager lifecycle workspaces and avoids fake completion", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="exams-manager" section="exams" tenantSlug="kisumu-boys" liveDataEnabled={false} />);
    await screen.findByRole("heading", { name: /exams manager dashboard/i });

    await user.click(screen.getByRole("button", { name: /Exam Setup \/ Exam Builder/i }));

    expect(document.body.textContent).not.toMatch(/Action completed/i);
    expect(document.body.textContent).not.toMatch(/Workflow dispatched/i);
    expect(document.body.textContent).toMatch(/exam setup|configuration|term/i);
  });
});
