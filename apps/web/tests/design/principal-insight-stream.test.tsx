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
    jest.useRealTimers();
  });

  afterAll(() => {
    Object.defineProperty(global, "EventSource", {
      configurable: true,
      writable: true,
      value: originalEventSource,
    });
  });

  it("applies snapshots and closes failed streams before retrying with backoff", async () => {
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

    jest.useFakeTimers();
    act(() => stream.emit("principal.error", { message: "Temporarily unavailable" }));
    expect(await screen.findByText("Live updates reconnecting")).toBeVisible();
    expect(stream.close).toHaveBeenCalledTimes(1);
    const streamCount = EventSourceMock.instances.length;
    act(() => jest.advanceTimersByTime(4_999));
    expect(EventSourceMock.instances).toHaveLength(streamCount);
    act(() => jest.advanceTimersByTime(1));
    const retry = EventSourceMock.instances.at(-1)!;
    expect(retry).not.toBe(stream);
    act(() => retry.emit("error", {}));
    expect(retry.close).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(9_999));
    expect(EventSourceMock.instances).toHaveLength(streamCount + 1);
    act(() => jest.advanceTimersByTime(1));
    const recovered = EventSourceMock.instances.at(-1)!;

    act(() => {
      recovered.emit(
        "principal.dashboard",
        principalDashboard("Recovered live risk", ["attendance", "finance"]),
      );
    });
    expect(await screen.findByText("Recovered live risk")).toBeVisible();
    expect(screen.getByText("2 modules enabled")).toBeVisible();
    expect(screen.queryByText("Live updates reconnecting")).not.toBeInTheDocument();

    view.unmount();
    expect(stream.close).toHaveBeenCalledTimes(1);
    expect(recovered.close).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(60_000));
    expect(EventSourceMock.instances).toHaveLength(streamCount + 2);
  });

  it("does not load executive insights in a different workspace", async () => {
    renderWithProviders(<SchoolPages role="principal" section="school-profile" tenantSlug="maranda-high" />);
    expect(await screen.findByRole("navigation", { name: "Principal dashboard sidebar" })).toBeVisible();
    expect(requestDashboardApiMock).toHaveBeenCalledWith("/admin-command/principal/school-profile", expect.anything());
    expect(requestDashboardApiMock).not.toHaveBeenCalledWith("/admin-command/principal/dashboard", expect.anything());
    expect(EventSourceMock.instances.some((stream) => stream.url.includes("/principal/dashboard/stream"))).toBe(false);
  });
});
