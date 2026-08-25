import { act, screen, waitFor } from "@testing-library/react";

import { SchoolPages } from "@/components/school/school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/dashboard/api-client", () => ({
  ...jest.requireActual("@/lib/dashboard/api-client"),
  requestDashboardApi: jest.fn(),
}));

jest.mock("@/components/dashboard/dashboard-engine", () => ({
  DashboardEngine: () => <div>Operational widgets</div>,
}));

class EventSourceMock {
  static instances: EventSourceMock[] = [];

  readonly listeners = new Map<string, Set<EventListener>>();
  readonly close = jest.fn();
  onerror: ((event: Event) => void) | null = null;

  constructor(
    readonly url: string,
    readonly options?: EventSourceInit,
  ) {
    EventSourceMock.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const requestDashboardApiMock = jest.mocked(requestDashboardApi);
const originalEventSource = global.EventSource;
const originalFetch = global.fetch;

function principalDashboard(alertTitle: string, moduleCodes = ["finance"]) {
  return {
    tenant_id: "maranda-high",
    generated_at: "2026-08-25T08:00:00.000Z",
    enabled_modules: moduleCodes,
    alerts: [
      {
        id: `alert-${alertTitle}`,
        module_code: moduleCodes[0] ?? "principal_dashboard",
        title: alertTitle,
        message: `${alertTitle} requires Principal review.`,
        severity: "warning" as const,
      },
    ],
    notifications: [],
    realtime_channels: ["principal.dashboard"],
  };
}

describe("Principal executive insight stream", () => {
  beforeEach(() => {
    EventSourceMock.instances = [];
    Object.defineProperty(global, "EventSource", {
      configurable: true,
      writable: true,
      value: EventSourceMock,
    });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: ["principal:read"] }),
    } as Response));

    requestDashboardApiMock.mockReset();
    requestDashboardApiMock.mockImplementation(async (path) => {
      if (path === "/admin-command/principal/dashboard") {
        return principalDashboard("Initial finance risk") as never;
      }
      if (path === "/admin-command/principal/overview") {
        return {
          status: "active",
          totalStudents: 400,
          totalStaff: 40,
          activeIssues: 2,
          pendingApprovals: 1,
          recentActivity: [],
        } as never;
      }
      if (path === "/admin-command/principal/school-profile") {
        return { schoolName: "Maranda High", logoUrl: null } as never;
      }
      if (path === "/admin-command/principal/settings") {
        return { dashboard: { defaultView: "overview", theme: "system" } } as never;
      }

      return {} as never;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    Object.defineProperty(global, "EventSource", {
      configurable: true,
      writable: true,
      value: originalEventSource,
    });
  });

  it("applies tenant-scoped snapshots, reports reconnecting truthfully, and recovers without closing the stream", async () => {
    const view = renderWithProviders(
      <SchoolPages role="principal" tenantSlug="maranda-high" userLabel="Principal Wanjiku" />,
    );

    expect(await screen.findByText("Initial finance risk")).toBeVisible();

    const stream = await waitFor(() => {
      const principalStream = EventSourceMock.instances.find((candidate) =>
        candidate.url.startsWith("/api/admin-command/principal/dashboard/stream"),
      );
      expect(principalStream).toBeDefined();
      return principalStream!;
    });
    expect(stream.url).toBe(
      "/api/admin-command/principal/dashboard/stream?tenantSlug=maranda-high",
    );
    expect(stream.options).toEqual({ withCredentials: true });

    act(() => {
      stream.emit("principal.dashboard", principalDashboard("Attendance risk", ["attendance"]));
    });
    expect(await screen.findByText("Attendance risk")).toBeVisible();
    expect(screen.getByText("1 modules enabled")).toBeVisible();

    act(() => {
      stream.onerror?.(new Event("error"));
    });
    expect(await screen.findByText("Live updates reconnecting")).toBeVisible();
    expect(stream.close).not.toHaveBeenCalled();

    act(() => {
      stream.emit(
        "principal.dashboard",
        principalDashboard("Recovered live risk", ["attendance", "finance"]),
      );
    });
    expect(await screen.findByText("Recovered live risk")).toBeVisible();
    expect(screen.getByText("2 modules enabled")).toBeVisible();
    expect(screen.queryByText("Live updates reconnecting")).not.toBeInTheDocument();

    view.unmount();
    expect(stream.close).toHaveBeenCalledTimes(1);
  });
});
