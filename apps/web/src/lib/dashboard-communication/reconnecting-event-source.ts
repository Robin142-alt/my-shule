type Options = {
  url: string;
  eventType: string;
  errorEventType?: string;
  // Only a valid, tenant-checked snapshot confirms successful recovery.
  onMessage: (event: Event) => boolean;
  onDegraded: (degraded: boolean) => void;
};

/** Keep native cookie-backed SSE, but bound retries after a broken connection. */
export function connectDashboardEventSource(options: Options) {
  let source: EventSource | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let disposed = false;
  let cursor = "";
  const errorEventType = options.errorEventType ?? `${options.eventType}.error`;

  const closeSource = () => {
    source?.removeEventListener(options.eventType, handleMessage);
    source?.removeEventListener("error", handleError);
    source?.removeEventListener(errorEventType, handleError);
    source?.close();
    source = undefined;
  };
  const handleMessage = (event: Event) => {
    if (options.onMessage(event)) {
      const eventId = (event as MessageEvent).lastEventId;
      if (typeof eventId === "string" && eventId.length <= 128 && eventId.includes("|")) {
        cursor = eventId;
      }
      failures = 0;
      options.onDegraded(false);
    }
  };
  const connect = () => {
    if (disposed) return;
    const url = new URL(options.url, window.location.origin);
    if (cursor) url.searchParams.set("since", cursor);
    source = new EventSource(cursor ? url.toString() : options.url, { withCredentials: true });
    source.addEventListener(options.eventType, handleMessage);
    source.addEventListener("error", handleError);
    source.addEventListener(errorEventType, handleError);
  };
  const handleError = () => {
    if (disposed || retryTimer !== undefined) return;
    // Stop the browser's ~3-second automatic reconnect before scheduling ours.
    closeSource();
    options.onDegraded(true);
    const delay = Math.min(60_000, 5_000 * 2 ** Math.min(failures++, 4));
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, delay);
  };

  connect();
  return () => {
    disposed = true;
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    closeSource();
  };
}
