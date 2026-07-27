import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

describe("academic office production readiness", () => {
  it("keeps report-card publication under principal authority", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="exams-manager" section="exams" tenantSlug="kisumu-boys" liveDataEnabled={false} />);

    await screen.findByRole("heading", { name: /exams manager dashboard/i });
    await user.click(screen.getByRole("button", { name: /report card handoff/i }));

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
