import { connectDashboardEventSource } from "@/lib/dashboard-communication/reconnecting-event-source";

class SourceMock extends EventTarget {
  static instances: SourceMock[] = [];
  close = jest.fn();
  constructor(readonly url: string, readonly options: EventSourceInit) {
    super();
    SourceMock.instances.push(this);
  }
}

describe("dashboard SSE recovery", () => {
  const original = global.EventSource;
  beforeEach(() => {
    jest.useFakeTimers();
    SourceMock.instances = [];
    global.EventSource = SourceMock as unknown as typeof EventSource;
  });
  afterEach(() => {
    global.EventSource = original;
    jest.useRealTimers();
  });

  it("bounds a persistent reconnect failure over ten minutes without resetting on open", () => {
    const degraded = jest.fn();
    const stop = connectDashboardEventSource({ url: "/api/events/dashboard/stream?tenantSlug=a", eventType: "dashboard.events", onMessage: () => true, onDegraded: degraded });
    let elapsed = 0;
    // Simulate an immediately closed HTTP 200 stream after every connection.
    for (let attempt = 0; attempt < 13; attempt++) {
      const source = SourceMock.instances.at(-1)!;
      source.dispatchEvent(new Event("open"));
      source.dispatchEvent(new Event("error"));
      expect(source.close).toHaveBeenCalledTimes(1);
      const delay = Math.min(60_000, 5_000 * 2 ** Math.min(attempt, 4));
      jest.advanceTimersByTime(delay - 1);
      expect(SourceMock.instances).toHaveLength(attempt + 1);
      jest.advanceTimersByTime(1);
      elapsed += delay;
    }
    expect(elapsed).toBe(615_000);
    expect(SourceMock.instances).toHaveLength(14); // 13 attempts within the first 600s
    expect(degraded).toHaveBeenCalledWith(true);
    expect(SourceMock.instances[0].options).toEqual({ withCredentials: true });
    stop();
    jest.advanceTimersByTime(120_000);
    expect(SourceMock.instances).toHaveLength(14);
  });

  it("resets recovery only after a valid tenant snapshot and cancels retry on unmount", () => {
    const accepted = jest.fn().mockReturnValue(false);
    const degraded = jest.fn();
    const stop = connectDashboardEventSource({ url: "/events", eventType: "dashboard.events", onMessage: accepted, onDegraded: degraded });
    SourceMock.instances[0].dispatchEvent(new Event("error"));
    jest.advanceTimersByTime(5000);
    SourceMock.instances[1].dispatchEvent(new Event("dashboard.events"));
    SourceMock.instances[1].dispatchEvent(new Event("error"));
    jest.advanceTimersByTime(9999);
    expect(SourceMock.instances).toHaveLength(2);
    jest.advanceTimersByTime(1);
    accepted.mockReturnValue(true);
    SourceMock.instances[2].dispatchEvent(new Event("dashboard.events"));
    expect(degraded).toHaveBeenLastCalledWith(false);
    SourceMock.instances[2].dispatchEvent(new Event("dashboard.events.error"));
    jest.advanceTimersByTime(5000);
    expect(SourceMock.instances).toHaveLength(4);
    SourceMock.instances[3].dispatchEvent(new Event("error"));
    stop();
    jest.advanceTimersByTime(120_000);
    expect(SourceMock.instances).toHaveLength(4);
  });
});
