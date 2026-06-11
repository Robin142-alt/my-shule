import { createElement } from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import { ProcurementModuleScreen } from "@/components/modules/procurement/procurement-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/auth/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-procurement-module-token"),
}));

const procurementDashboard: any = {
  open_requests: 2,
  pending_approvals: 1,
  active_suppliers: 3,
  purchase_order_count: 4,
  invoices_attached: 5,
  budget_committed_minor: "240000",
  requests: [
    {
      id: "request-1",
      title: "Science lab reagents",
      department: "Science",
      status: "submitted",
      estimated_total_minor: "120000",
    },
  ],
  suppliers: [
    {
      id: "supplier-1",
      name: "Acme Supplies",
      category: "Laboratory",
      status: "active",
    },
  ],
  purchase_orders: [
    {
      id: "po-1",
      po_number: "PO-001",
      supplier_name: "Acme Supplies",
      status: "issued",
    },
  ],
  invoices: [
    {
      id: "invoice-1",
      invoice_number: "INV-001",
      supplier_name: "Acme Supplies",
      status: "attached",
    },
  ],
};

describe("procurement module workspace", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ["procurement"],
        } as Response);
      }

      if (String(input).includes("/api/auth/csrf")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: "csrf-procurement-module-token" }),
        } as Response);
      }

      if (init?.method && init.method !== "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        } as Response);
      }

      return (
      Promise.resolve({
        ok: true,
        json: async () => ({ data: procurementDashboard }),
      } as Response)
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("renders live procurement requests, suppliers, purchase orders, invoices, and budget linkage", async () => {
    await act(async () => {
      renderWithProviders(
        <ProcurementModuleScreen tenantSlug="barakaacademy" initialDashboard={procurementDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText(/Live procurement API connected/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /procurement operations/i })).toBeVisible();
    expect(screen.getAllByText(/Science lab reagents/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Acme Supplies/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PO-001/i)).toBeVisible();
    expect(screen.getByText(/INV-001/i)).toBeVisible();
    expect(screen.getByText(/KES 2,400\.00/i)).toBeVisible();
  });

  it("uses loaded procurement records as selectable inputs instead of raw UUID fields", async () => {
    await act(async () => {
      renderWithProviders(
        <ProcurementModuleScreen tenantSlug="barakaacademy" initialDashboard={procurementDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^approval$/i }));
    expect(screen.queryByPlaceholderText(/request uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Request/i)).toHaveDisplayValue(/Science lab reagents/i);

    fireEvent.click(screen.getByRole("button", { name: /^purchase order$/i }));
    expect(screen.queryByPlaceholderText(/supplier uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Supplier/i)).toHaveDisplayValue(/Acme Supplies/i);

    fireEvent.click(screen.getByRole("button", { name: /^invoice$/i }));
    expect(screen.queryByPlaceholderText(/purchase order uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Purchase order/i)).toHaveDisplayValue(/PO-001/i);
  });

  it("submits selected procurement record ids from picker controls", async () => {
    await act(async () => {
      renderWithProviders(
        <ProcurementModuleScreen tenantSlug="barakaacademy" initialDashboard={procurementDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^purchase order$/i }));
    fireEvent.change(screen.getByLabelText(/Request/i), { target: { value: "request-1" } });
    fireEvent.change(screen.getByLabelText(/Item/i), { target: { value: "Graph books" } });
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText(/Unit cost/i), { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: /Post purchase order/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/procurement/purchase-orders",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-myshule-csrf": "csrf-procurement-module-token" }),
          body: expect.stringContaining('"supplier_id":"supplier-1"'),
        }),
      );
    });

    const orderCall = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/procurement/purchase-orders" && init?.method === "POST");
    expect(JSON.parse(String(orderCall?.[1]?.body))).toEqual(expect.objectContaining({
      supplier_id: "supplier-1",
      request_id: "request-1",
    }));
  });

  it("opens the implemented procurement module from the school workspace when enabled", async () => {
    expect(isSchoolSection("procurement")).toBe(true);
    expect(isProductionReadyModule("procurement")).toBe(true);
    expect(isSchoolSectionEnabled("procurement", ["procurement"])).toBe(true);
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).not.toContain("procurement");
    expect(getSchoolWorkspace("admin").navItems.map((item) => item.id)).toContain("procurement");

    await act(async () => {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "admin",
          section: "procurement",
          tenantSlug: "barakaacademy",
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: /procurement operations/i })).toBeVisible();
  });
});
