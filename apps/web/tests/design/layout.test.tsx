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
      createElement(SchoolPages, { role: "bursar", tenantSlug: "lakeview-school" }),
    );
    expect(await screen.findByTestId("accountant-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /bursar dashboard/i })).toBeVisible();
    expect(secondRender.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();
    expect(screen.queryByText(/platform owner desk/i)).not.toBeInTheDocument();

    secondRender.unmount();
    renderWithProviders(createElement(PortalPages, {
      viewer: "parent",
      tenantSlug: "lakeview-school",
      userLabel: "Grace Parent",
    }));
    expect(screen.getByTestId("live-role-command-center")).toHaveAttribute("data-role", "parent");
    expect(screen.getAllByRole("heading", { name: /parent dashboard/i }).length).toBeGreaterThan(0);
  }, 30000);

  it("renders a fresh parent portal without demo learners or fabricated activity", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          metrics: {
            children: 0,
            pending_fees: 0,
            notifications: 0,
          },
          items: [],
        },
        meta: {},
      }),
    } as Response);

    renderWithProviders(createElement(PortalPages, {
      viewer: "parent",
      tenantSlug: "lakeview-school",
      userLabel: "Grace Parent",
    }));

    expect(screen.getByTestId("integrated-school-command-header")).toBeVisible();
    expect(screen.getByTestId("dashboard-time-greeting")).toHaveTextContent(
      /(good morning|good afternoon|good evening|welcome back), grace parent/i,
    );
    expect(screen.getByText(/lakeview school command center/i)).toBeVisible();
    expect(await screen.findByText(/no school-scoped records are loaded/i)).toBeVisible();
    expect(screen.queryByText(/brian otieno|aisha wanjiku|kisumu boys/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });
});
