import { screen } from "@testing-library/react";
import { createElement } from "react";

import { PortalPages } from "@/components/portal/portal-pages";
import { SchoolPages } from "@/components/school/school-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";

import { renderDashboardScreen, renderWithProviders } from "./test-utils";

describe("STEP 1: Layout tests", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

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
    expect(screen.queryByTestId("alerts-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("kpi-strip")).toMatchSnapshot();
  });

  it("does not reuse the same shell across platform, school, and portal experiences", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ["students", "finance", "reports", "parent_portal"],
    } as Response);

    const firstRender = renderWithProviders(createElement(SuperadminPages));
    expect(screen.getByText(/platform owner desk/i)).toBeVisible();

    firstRender.unmount();
    const secondRender = renderWithProviders(
      createElement(SchoolPages, { role: "bursar" }),
    );
    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /accountant fee collection/i })).toBeVisible();
    expect(secondRender.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();
    expect(screen.queryByText(/platform owner desk/i)).not.toBeInTheDocument();

    secondRender.unmount();
    renderWithProviders(createElement(PortalPages, { viewer: "parent" }));
    expect(screen.getByText(/my shule portal/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /family dashboard/i })).toBeVisible();
  }, 30000);

  it("renders the parent portal as a MyShule family intelligence center", () => {
    renderWithProviders(createElement(PortalPages, { viewer: "parent" }));

    expect(screen.getByRole("heading", { name: /family dashboard/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /(good morning|good afternoon|good evening|welcome back), mrs\. wanjiku/i })).toBeVisible();
    expect(screen.getByText(/here's everything happening with brian today/i)).toBeVisible();
    expect(screen.getByText(/brian improved in mathematics this week/i)).toBeVisible();
    expect(screen.getByText(/parent intelligence/i)).toBeVisible();
    expect(screen.getAllByText(/brian otieno/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/aisha wanjiku/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: /ai assistant/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /emergency hotline/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /real-time alerts center/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /academic performance overview/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /attendance intelligence/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /fees & finance tracking/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /discipline & behaviour monitoring/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /transport tracking/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /clinic & health updates/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /communication center/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /homework & assignments/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /ai insights & recommendations/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /emergency panel/i })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /pay with m-pesa/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /download receipt/i }).length).toBeGreaterThan(0);
  });
});
