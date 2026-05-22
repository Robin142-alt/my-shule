import { createElement } from "react";
import { act, screen } from "@testing-library/react";

import { TransportModuleScreen } from "@/components/modules/transport/transport-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

const transportDashboard = {
  active_routes: 2,
  active_vehicles: 3,
  active_manifests: 4,
  trips_today: 5,
  open_alerts: 1,
  service_due_vehicles: 1,
  routes: [
    {
      id: "route-1",
      name: "Eastlands AM",
      direction: "morning",
      learner_count: 32,
      active_stops: 6,
    },
  ],
  vehicles: [
    {
      id: "vehicle-1",
      registration_number: "KDA 123A",
      capacity: 33,
      status: "active",
      service_status: "due",
    },
  ],
  manifests: [
    {
      id: "manifest-1",
      route_name: "Eastlands AM",
      learner_count: 32,
      status: "active",
    },
  ],
  trips: [
    {
      id: "trip-1",
      route_name: "Eastlands AM",
      vehicle_registration: "KDA 123A",
      driver_name: "Peter Otieno",
      status: "in_progress",
    },
  ],
  alerts: [
    {
      id: "alert-1",
      title: "KDA 123A service due",
      severity: "warning",
      status: "open",
    },
  ],
};

describe("transport module workspace", () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ["transport"],
        } as Response);
      }

      return (
      Promise.resolve({
        ok: true,
        json: async () => ({ data: transportDashboard }),
      } as Response)
      );
    }) as unknown as typeof fetch;
  });

  it("renders live transport routes, vehicles, manifests, trips, and alerts", async () => {
    await act(async () => {
      renderWithProviders(
        <TransportModuleScreen tenantSlug="barakaacademy" initialDashboard={transportDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText(/Live transport API connected/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /transport operations/i })).toBeVisible();
    expect(screen.getAllByText(/route control/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/vehicle readiness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/learner manifests/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/trip board/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Eastlands AM/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KDA 123A/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/service due/i).length).toBeGreaterThan(0);
  });

  it("opens the implemented transport module from the school workspace when enabled", async () => {
    expect(isSchoolSection("transport")).toBe(true);
    expect(isProductionReadyModule("transport")).toBe(true);
    expect(isSchoolSectionEnabled("transport", ["transport"])).toBe(true);
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).not.toContain("transport");
    expect(getSchoolWorkspace("admin").navItems.map((item) => item.id)).toContain("transport");

    await act(async () => {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "admin",
          section: "transport",
          tenantSlug: "barakaacademy",
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: /transport operations/i })).toBeVisible();
  });
});
