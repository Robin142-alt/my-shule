import { screen } from "@testing-library/react";

import { renderDashboardScreen } from "./test-utils";

describe("STEP 1: Layout tests", () => {
  it("keeps the dashboard information hierarchy in the correct DOM order", () => {
    renderDashboardScreen({ role: "admin" });

    const alertsSection = screen.getByTestId("alerts-section");
    const kpiSection = screen.getByTestId("kpi-section");
    const quickActionsSection = screen.getByTestId("quick-actions-section");
    const coreWidgets = screen.getByTestId("core-widgets");

    expect(
      alertsSection.compareDocumentPosition(kpiSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      kpiSection.compareDocumentPosition(quickActionsSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      quickActionsSection.compareDocumentPosition(coreWidgets) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps quick actions visible in the dashboard shell", () => {
    renderDashboardScreen({ role: "admin" });

    expect(screen.getByTestId("quick-actions")).toBeVisible();
    expect(screen.getAllByTestId("quick-action").length).toBeGreaterThan(0);
  });

  it("matches the dashboard regression snapshots", () => {
    renderDashboardScreen({ role: "admin" });

    expect(screen.getByTestId("dashboard-view")).toMatchSnapshot();
    expect(screen.getByTestId("alerts-panel")).toMatchSnapshot();
    expect(screen.getByTestId("kpi-strip")).toMatchSnapshot();
  });
});
