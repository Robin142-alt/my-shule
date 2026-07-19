import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  DashboardCommunicationProvider,
  isTenantQueryKey,
  useDashboardEventBus,
  useDashboardRefreshVersion,
} from "@/lib/dashboard-communication/dashboard-communication-provider";
import type { DashboardEvent } from "@/lib/dashboard-communication/dashboard-communication-system";

class EventSourceMock {
  static instances: EventSourceMock[] = [];

  readonly listeners = new Map<string, Set<EventListener>>();
  readonly close = jest.fn();

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

function EventSubscriber({ onEvent }: { onEvent: (event: DashboardEvent) => void }) {
  const eventBus = useDashboardEventBus();

  useEffect(() => eventBus.subscribe("STUDENT_ADMITTED", onEvent), [eventBus, onEvent]);
  return null;
}

function RefreshSubscriber({ onRefresh }: { onRefresh: (version: number) => void }) {
  const refreshVersion = useDashboardRefreshVersion();

  useEffect(() => onRefresh(refreshVersion), [onRefresh, refreshVersion]);
  return null;
}

function studentAdmittedEvent(tenantId: string, id: string): DashboardEvent {
  return {
    id,
    type: "STUDENT_ADMITTED",
    tenantId,
    sourceModule: "admissions",
    entityId: "student-1",
    occurredAt: "2026-07-19T10:00:00.000Z",
    payload: { student_id: "student-1" },
  };
}

describe("tenant-scoped dashboard communication", () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    EventSourceMock.instances = [];
    Object.defineProperty(global, "EventSource", {
      configurable: true,
      writable: true,
      value: EventSourceMock,
    });
  });

  afterAll(() => {
    Object.defineProperty(global, "EventSource", {
      configurable: true,
      writable: true,
      value: originalEventSource,
    });
  });

  it("propagates a same-school event and refreshes only tenant-owned queries", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = jest.spyOn(queryClient, "invalidateQueries");
    const onEvent = jest.fn();
    const onRefresh = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardCommunicationProvider tenantId="maranda-high">
          <EventSubscriber onEvent={onEvent} />
          <RefreshSubscriber onRefresh={onRefresh} />
        </DashboardCommunicationProvider>
      </QueryClientProvider>,
    );

    expect(EventSourceMock.instances[0]?.url).toBe(
      "/api/events/dashboard/stream?tenantSlug=maranda-high",
    );

    act(() => {
      EventSourceMock.instances[0].emit("dashboard.events", {
        tenant_id: "maranda-high",
        events: [studentAdmittedEvent("maranda-high", "event-1")],
      });
    });

    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRefresh).toHaveBeenLastCalledWith(1));
    expect(invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({
      predicate: expect.any(Function),
    }));

    const predicate = invalidateQueries.mock.calls[0][0]?.predicate;
    expect(predicate?.({ queryKey: ["school", "maranda-high", "/students"] } as never)).toBe(true);
    expect(predicate?.({ queryKey: ["school", "kisumu-boys", "/students"] } as never)).toBe(false);
  });

  it("rejects snapshots and events belonging to another school", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = jest.spyOn(queryClient, "invalidateQueries");
    const onEvent = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardCommunicationProvider tenantId="maranda-high">
          <EventSubscriber onEvent={onEvent} />
        </DashboardCommunicationProvider>
      </QueryClientProvider>,
    );

    act(() => {
      EventSourceMock.instances[0].emit("dashboard.events", {
        tenant_id: "kisumu-boys",
        events: [studentAdmittedEvent("kisumu-boys", "event-cross-tenant")],
      });
      EventSourceMock.instances[0].emit("dashboard.events", {
        tenant_id: "maranda-high",
        events: [studentAdmittedEvent("kisumu-boys", "event-mismatched-envelope")],
      });
    });

    await act(async () => undefined);
    expect(onEvent).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("recognizes tenant IDs in supported school query key shapes", () => {
    expect(isTenantQueryKey(["school", "maranda-high", "/fees"], "maranda-high")).toBe(true);
    expect(isTenantQueryKey(["dashboard", { schoolId: "maranda-high" }], "maranda-high")).toBe(true);
    expect(isTenantQueryKey(["dashboard", { tenantSlug: "kisumu-boys" }], "maranda-high")).toBe(false);
  });
});
