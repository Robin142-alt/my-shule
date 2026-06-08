import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PortalPages } from "@/components/portal/portal-pages";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("academic parent portal upgrade", () => {
  it("shows published child reports, results, comments, targets, and child switching in the parent academics page", () => {
    renderWithProviders(<PortalPages viewer="parent" section="academics" routeMode="public" />);

    expect(screen.getAllByRole("heading", { name: /^Academics$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Published report cards/i })).toBeVisible();
    expect(screen.getByText(/Published exam results/i)).toBeVisible();
    expect(screen.getByText(/Academic targets/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /Child Overview/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Academic Progress/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Parent Acknowledgement/i })).toBeVisible();
    expect(screen.getByText(/School Messages/i)).toBeVisible();
    expect(screen.getByText(/Teacher and school comments/i)).toBeVisible();
    expect(screen.getByText(/Latest Exam/i)).toBeVisible();
    expect(screen.getByText(/Overall Performance/i)).toBeVisible();
    expect(screen.getByText(/Report Acknowledgement Status/i)).toBeVisible();
    expect(screen.getByText(/Performance trend/i)).toBeVisible();
    expect(screen.getAllByText(/Improvement areas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Report published/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Brian Otieno/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Aisha Wanjiku/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CBC\/CBE Competency Report/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hybrid CBC Academic Report/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Legacy 8-4-4\/KCSE Report/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Term 2 Mid-term CAT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mathematics/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Strengthen algebra accuracy/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/unpublished/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/draft marks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal moderation/i)).not.toBeInTheDocument();
  });

  it("lets a parent acknowledge an existing published report without claiming a fake backend send", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalPages viewer="parent" section="academics" routeMode="public" />);

    await user.click(screen.getAllByRole("button", { name: /acknowledge report/i })[0]);

    expect(await screen.findByText(/Report acknowledged for Brian Otieno/i)).toBeVisible();
    expect(screen.getAllByText(/Acknowledged just now/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sent successfully/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
  });

  it("does not create or enhance a separate student dashboard for the exam/report-card flow", () => {
    renderWithProviders(<PortalPages viewer="student" section="academics" routeMode="public" />);

    expect(screen.queryByRole("heading", { name: /Published report cards/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/CBC\/CBE Competency Report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hybrid CBC Academic Report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy 8-4-4\/KCSE Report/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /acknowledge report/i })).not.toBeInTheDocument();
  });

  it("opens parent report viewers for CBC and legacy reports with child-scoped academic details", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalPages viewer="parent" section="academics" routeMode="public" />);

    await user.click(screen.getAllByRole("button", { name: /view report/i })[0]);

    let reportViewer = within(screen.getByTestId("parent-report-viewer"));
    expect(reportViewer.getByRole("heading", { name: /Parent report viewer/i })).toBeVisible();
    expect(reportViewer.getByText(/CBC\/CBE Competency Report/i)).toBeVisible();
    expect(reportViewer.getByText(/Learner bio/i)).toBeVisible();
    expect(reportViewer.getByText(/CBC competency summary/i)).toBeVisible();
    expect(reportViewer.getByText(/Teacher comments/i)).toBeVisible();
    expect(reportViewer.getByText(/Academic targets/i)).toBeVisible();
    expect(reportViewer.queryByText(/internal moderation/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /view report/i })[2]);

    reportViewer = within(screen.getByTestId("parent-report-viewer"));
    expect(reportViewer.getByText(/Legacy 8-4-4\/KCSE Report/i)).toBeVisible();
    expect(reportViewer.getByText(/Student bio/i)).toBeVisible();
    expect(reportViewer.getByText(/Legacy marks and grade summary/i)).toBeVisible();
    expect(reportViewer.queryByText(/CBC competency summary/i)).not.toBeInTheDocument();
  });

  it("uses proof-based parent report print, download, and child-switching feedback", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalPages viewer="parent" section="academics" routeMode="public" />);

    await user.click(screen.getAllByRole("button", { name: /view report/i })[0]);
    await user.click(within(screen.getByTestId("parent-report-viewer")).getByRole("button", { name: /^print$/i }));

    expect(screen.getByText(/print preview ready for brian otieno/i)).toBeVisible();
    expect(screen.getByText(/published subject rows loaded/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Print preview opened for|Download prepared for|academic record opened/i);

    await user.click(within(screen.getByTestId("parent-report-viewer")).getByRole("button", { name: /download pdf/i }));

    expect(screen.getByText(/report download created for brian otieno/i)).toBeVisible();
    expect(screen.getByText(/brian-otieno-report-brian-cbc\.txt/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Print preview opened for|Download prepared for|academic record opened/i);

    await user.click(screen.getByRole("button", { name: /Aisha Wanjiku/i }));

    expect(screen.getByText(/Aisha Wanjiku academic record selected/i)).toBeVisible();
    expect(screen.getByText(/1 published report, 1 result row loaded/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Print preview opened for|Download prepared for|academic record opened/i);
  });
});
