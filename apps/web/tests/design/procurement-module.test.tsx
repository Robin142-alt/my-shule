import { createElement } from "react";
import { act, screen } from "@testing-library/react";

import { ProcurementModuleScreen } from "@/components/modules/procurement/procurement-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

const procurementDashboard = {
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
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ data: procurementDashboard }),
      } as Response),
    ) as unknown as typeof fetch;
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

  it("opens the implemented procurement module from the school workspace when enabled", async () => {
    expect(isSchoolSection("procurement")).toBe(true);
    expect(isProductionReadyModule("procurement")).toBe(true);
    expect(isSchoolSectionEnabled("procurement", ["procurement"])).toBe(true);
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).toContain("procurement");

    await act(async () => {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "principal",
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
