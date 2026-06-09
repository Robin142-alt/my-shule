import { createElement } from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import { IotModuleScreen } from "@/components/modules/iot/iot-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/auth/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-iot-token"),
}));

const iotDashboard = {
  registered_devices: 3,
  online_devices: 2,
  offline_devices: 1,
  open_alerts: 1,
  commands_pending: 1,
  readings_today: 12,
  gateway_credentials: 1,
  gateway_ingestions_today: 4,
  devices: [
    {
      id: "device-1",
      name: "Smart meter A1",
      device_type: "smart_meter",
      location_name: "Administration block",
      status: "online",
      health_status: "ok",
    },
  ],
  readings: [
    {
      id: "reading-1",
      device_name: "Smart meter A1",
      metric_name: "power_kw",
      metric_value: 8.4,
      unit: "kw",
      severity: "normal",
    },
  ],
  commands: [
    {
      id: "command-1",
      device_name: "Smart meter A1",
      command_type: "sync",
      status: "queued",
    },
  ],
  alerts: [
    {
      id: "alert-1",
      device_name: "Gate scanner",
      title: "Gate scanner offline",
      severity: "warning",
      status: "open",
    },
  ],
};

describe("IoT and Smart Campus module workspace", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ["iot"],
        } as Response);
      }

      if (String(input).includes("/api/auth/csrf")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: "csrf-iot-token" }),
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
        json: async () => ({ data: iotDashboard }),
      } as Response)
      );
    }) as unknown as typeof fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("renders live IoT devices, telemetry, commands, and alerts", async () => {
    await act(async () => {
      renderWithProviders(
        <IotModuleScreen tenantSlug="barakaacademy" initialDashboard={iotDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText(/Live IoT API connected/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /IoT and Smart Campus/i })).toBeVisible();
    expect(screen.getAllByText(/Device registry/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Telemetry stream/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Command center/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gateway credentials/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Device gateway/i)).toBeVisible();
    expect(screen.getByText(/Command delivery/i)).toBeVisible();
    expect(screen.getAllByText(/Smart meter A1/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Gate scanner offline/i)).toBeVisible();
  });

  it("uses registered devices as selectable inputs instead of raw device UUID fields", async () => {
    await act(async () => {
      renderWithProviders(
        <IotModuleScreen tenantSlug="barakaacademy" initialDashboard={iotDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Telemetry stream$/i }));
    expect(screen.queryByPlaceholderText(/device uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Device/i)).toHaveDisplayValue(/Smart meter A1/i);

    fireEvent.click(screen.getByRole("button", { name: /^Command center$/i }));
    expect(screen.queryByPlaceholderText(/device uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Device/i)).toHaveDisplayValue(/Smart meter A1/i);

    fireEvent.click(screen.getByRole("button", { name: /^Gateway credentials$/i }));
    expect(screen.queryByPlaceholderText(/device uuid/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Device/i)).toHaveDisplayValue(/Smart meter A1/i);
  });

  it("submits selected device ids from the device picker", async () => {
    await act(async () => {
      renderWithProviders(
        <IotModuleScreen tenantSlug="barakaacademy" initialDashboard={iotDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Command center$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Post command center/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/iot/commands",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-myshule-csrf": "csrf-iot-token" }),
          body: expect.stringContaining('"device_id":"device-1"'),
        }),
      );
    });
  });

  it("opens the implemented IoT module from the school workspace when enabled", async () => {
    expect(isSchoolSection("iot")).toBe(true);
    expect(isProductionReadyModule("iot")).toBe(true);
    expect(isSchoolSectionEnabled("iot", ["iot"])).toBe(true);
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).not.toContain("iot");
    expect(getSchoolWorkspace("admin").navItems.map((item) => item.id)).toContain("iot");

    await act(async () => {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "admin",
          section: "iot",
          tenantSlug: "barakaacademy",
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getAllByRole("heading", { name: /IoT and Smart Campus/i }).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Smart meter A1/i)).length).toBeGreaterThan(0);
  });
});
