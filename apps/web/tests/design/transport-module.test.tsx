import { createElement } from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import { TransportModuleScreen } from "@/components/modules/transport/transport-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/auth/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-transport-token"),
}));

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
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ["transport"],
        } as Response);
      }

      if (String(input).includes("/api/auth/csrf")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: "csrf-transport-token" }),
        } as Response);
      }

      if (String(input).includes("/api/admissions/students")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: "student-aisha",
              admission_number: "ADM-001",
              first_name: "Aisha",
              last_name: "Njeri",
              class_name: "Grade 8",
              stream_name: "Unity",
              primary_guardian_phone: "+254700000001",
            },
          ],
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
        json: async () => ({ data: transportDashboard }),
      } as Response)
      );
    }) as unknown as typeof fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
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

  it("uses loaded transport records as selectable inputs instead of raw UUID fields", async () => {
    await act(async () => {
      renderWithProviders(
        <TransportModuleScreen tenantSlug="barakaacademy" initialDashboard={transportDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^manifest$/i }));
    expect(screen.queryByPlaceholderText(/route uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Route/i)).toHaveDisplayValue(/Eastlands AM/i);

    fireEvent.click(screen.getByRole("button", { name: /^trip$/i }));
    expect(screen.queryByPlaceholderText(/vehicle uuid/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/driver uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Vehicle/i)).toHaveDisplayValue(/KDA 123A/i);

    fireEvent.click(screen.getByRole("button", { name: /^event$/i }));
    expect(screen.queryByPlaceholderText(/trip uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Trip/i)).toHaveDisplayValue(/Eastlands AM/i);
  });

  it("submits only the selected transport record ids from the picker controls", async () => {
    await act(async () => {
      renderWithProviders(
        <TransportModuleScreen tenantSlug="barakaacademy" initialDashboard={transportDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^trip$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Post trip board/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/transport/trips",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-myshule-csrf": "csrf-transport-token" }),
          body: expect.stringContaining('"route_id":"route-1"'),
        }),
      );
    });

    const tripCall = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/transport/trips" && init?.method === "POST");
    expect(JSON.parse(String(tripCall?.[1]?.body))).toEqual(expect.objectContaining({
      route_id: "route-1",
      vehicle_id: "vehicle-1",
    }));
  });

  it("searches and selects real learners for transport manifests instead of pasted student ids", async () => {
    await act(async () => {
      renderWithProviders(
        <TransportModuleScreen tenantSlug="barakaacademy" initialDashboard={transportDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^manifest$/i }));
    expect(screen.queryByPlaceholderText(/student-1, student-2/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Search learners/i), { target: { value: "Aisha" } });
    fireEvent.click(screen.getByRole("button", { name: /Search learners/i }));

    expect(await screen.findByText(/Aisha Njeri/i)).toBeVisible();
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Aisha Njeri/i }));
    expect(screen.getByText(/1 learner selected/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Post learner manifests/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/transport/manifests",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"student_ids":["student-aisha"]'),
        }),
      );
    });
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
