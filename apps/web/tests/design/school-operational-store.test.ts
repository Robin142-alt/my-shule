import { waitFor } from "@testing-library/react";

import {
  addSchoolRecord,
  createNotification,
  getSchoolScopedStorageKey,
  publishSchoolOperationalEvent,
  publishSchoolOperationalEventAndSync,
  readSchoolData,
  retrySchoolOperationalEventSyncQueue,
  simulateSms,
  startSchoolOperationalEventSyncRetryWorker,
  subscribeToSchoolDataUpdates,
  listSchoolOperationalRequestsForRole,
  updateSchoolOperationalRequestStatus,
  type SchoolOperationalEventSyncStatus,
  type SchoolOperationalRequest,
} from "@/lib/school/school-operational-store";

function jsonResponse(body: unknown, init?: ResponseInit) {
  const status = init?.status ?? 200;

  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("school operational store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps school records isolated by school-scoped storage keys", () => {
    addSchoolRecord("finance-payments", { id: "pay-1", student: "Brian Otieno", amount: 12000 }, "kb-high");
    addSchoolRecord("finance-payments", { id: "pay-2", student: "Faith Akinyi", amount: 8000 }, "green-valley");

    expect(readSchoolData<{ id: string; student: string; schoolId?: string }>("finance-payments", "kb-high")).toEqual([
      expect.objectContaining({ id: "pay-1", schoolId: "kb-high" }),
    ]);
    expect(readSchoolData<{ id: string; student: string; schoolId?: string }>("finance-payments", "green-valley")).toEqual([
      expect.objectContaining({ id: "pay-2", schoolId: "green-valley" }),
    ]);
    expect(window.localStorage.getItem("finance-payments")).toBeNull();
    expect(window.localStorage.getItem(getSchoolScopedStorageKey("kb-high", "finance-payments"))).toContain("Brian Otieno");
  });

  it("publishes school events with audit logs, notifications, and SMS logs", () => {
    publishSchoolOperationalEvent({
      schoolId: "kb-high",
      type: "FEE_PAYMENT_RECORDED",
      module: "finance",
      actorRole: "accountant",
      title: "Brian Otieno fee payment recorded",
      body: "KSh 12,000 received by M-Pesa.",
      entityId: "pay-1",
      severity: "success",
      notifications: [{ audienceRoles: ["principal", "parent"], title: "Fee payment recorded" }],
      sms: [{ recipient: "0712345678", message: "Receipt KBI-RCPT-1100 is ready." }],
    });

    expect(readSchoolData("events", "kb-high")).toEqual([
      expect.objectContaining({ type: "FEE_PAYMENT_RECORDED", schoolId: "kb-high" }),
    ]);
    expect(readSchoolData("auditLogs", "kb-high")).toEqual([
      expect.objectContaining({ action: "FEE_PAYMENT_RECORDED", actorRole: "accountant" }),
    ]);
    expect(readSchoolData("notifications", "kb-high")).toEqual([
      expect.objectContaining({ audienceRoles: ["principal", "parent"], read: false }),
    ]);
    expect(readSchoolData("smsLogs", "kb-high")).toEqual([
      expect.objectContaining({ recipient: "0712345678", status: "Queued" }),
    ]);
  });

  it("syncs published school operations to the backend event endpoint with tenant metadata", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return jsonResponse({ token: "csrf-token" });
      }

      if (url === "/api/events/school-operations") {
        return jsonResponse({ status: "accepted" }, { status: 202 });
      }

      return jsonResponse({ message: "Unexpected request" }, { status: 404 });
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const event = publishSchoolOperationalEvent({
      schoolId: "kb-high",
      type: "FEE_REVERSAL_REQUESTED",
      module: "finance",
      actorRole: "accountant",
      title: "Fee reversal requested",
      body: "Receipt KBI-RCPT-400 needs approval.",
      entityId: "approval-400",
      severity: "warning",
      notifications: [
        {
          audienceRoles: ["principal", "deputy-principal"],
          relatedModule: "finance",
          relatedRecordId: "approval-400",
          title: "Fee reversal approval requested",
        },
      ],
    });

    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain("/api/events/school-operations"),
    );

    const backendCall = fetchMock.mock.calls.find(([url]) => String(url) === "/api/events/school-operations");
    expect(backendCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
    expect((backendCall?.[1]?.headers as Record<string, string>)["x-myshule-csrf"]).toBe("csrf-token");
    expect(JSON.parse(String(backendCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        schoolId: "kb-high",
        event: expect.objectContaining({
          id: event.id,
          schoolId: "kb-high",
          type: "FEE_REVERSAL_REQUESTED",
          module: "finance",
          entityId: "approval-400",
        }),
        notifications: [
          expect.objectContaining({
            audienceRoles: ["principal", "deputy-principal"],
            relatedModule: "finance",
            relatedRecordId: "approval-400",
          }),
        ],
      }),
    );
    expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
      expect.objectContaining({ eventId: event.id, status: "Synced" }),
    ]);
  });

  it("returns truthful sync status before UI claims a school operation is saved", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return jsonResponse({ token: "csrf-token" });
      }

      if (url === "/api/events/school-operations") {
        return jsonResponse({ status: "accepted" }, { status: 202 });
      }

      return jsonResponse({ message: "Unexpected request" }, { status: 404 });
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const result = await publishSchoolOperationalEventAndSync({
      schoolId: "kb-high",
      type: "DISCIPLINE_PARENT_SMS_REQUESTED",
      module: "discipline",
      actorRole: "discipline-master",
      title: "Parent notification requested",
      body: "Guardian should receive the discipline case notice.",
      entityId: "case-77",
      severity: "warning",
      notifications: [{ audienceRoles: ["parent"], title: "Discipline case notice" }],
      sms: [{ recipient: "0712345678", message: "Please check discipline notice for Brian Otieno." }],
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "Synced",
        event: expect.objectContaining({ type: "DISCIPLINE_PARENT_SMS_REQUESTED" }),
      }),
    );
    expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
      expect.objectContaining({ eventId: result.event.id, status: "Synced" }),
    ]);
  });

  it("returns queued sync status when backend persistence fails", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return jsonResponse({ token: "csrf-token" });
      }

      if (url === "/api/events/school-operations") {
        return jsonResponse({ message: "Database temporarily unavailable" }, { status: 503 });
      }

      return jsonResponse({ message: "Unexpected request" }, { status: 404 });
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const result = await publishSchoolOperationalEventAndSync({
      schoolId: "kb-high",
      type: "STORE_ITEM_REQUESTED",
      module: "inventory",
      actorRole: "teacher",
      title: "Exercise books requested",
      body: "Form 2 West needs exercise books.",
      entityId: "store-request-queued",
      severity: "warning",
      notifications: [{ audienceRoles: ["storekeeper"], title: "Store item requested" }],
    });

    expect(result.status).toBe("Queued");
    expect(result.error).toMatch(/Database temporarily unavailable/);
    expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
      expect.objectContaining({ eventId: result.event.id, status: "Queued" }),
    ]);
  });

  it("retries queued school operation syncs and clears them after backend acceptance", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const backendAttempts = fetchMock.mock.calls.filter(([requestUrl]) =>
        String(requestUrl) === "/api/events/school-operations"
      ).length;

      if (url === "/api/auth/csrf") {
        return jsonResponse({ token: "csrf-token" });
      }

      if (url === "/api/events/school-operations" && backendAttempts === 1) {
        return jsonResponse({ message: "API temporarily unavailable" }, { status: 503 });
      }

      if (url === "/api/events/school-operations") {
        return jsonResponse({ status: "accepted" }, { status: 202 });
      }

      return jsonResponse({ message: "Unexpected request" }, { status: 404 });
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const event = publishSchoolOperationalEvent({
      schoolId: "kb-high",
      type: "STORE_ITEM_REQUESTED",
      module: "inventory",
      actorRole: "teacher",
      title: "Chalk requested",
      body: "Form 2 West needs two boxes of chalk.",
      entityId: "stock-request-44",
      notifications: [{ audienceRoles: ["storekeeper"], title: "Store item requested" }],
    });

    await waitFor(() =>
      expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
        expect.objectContaining({ eventId: event.id, status: "Queued" }),
      ]),
    );

    const result = await retrySchoolOperationalEventSyncQueue("kb-high");

    expect(result).toEqual({ attempted: 1, synced: 1, failed: 0 });
    expect(readSchoolData("eventSyncQueue", "kb-high")).toEqual([]);
    expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
      expect.objectContaining({ eventId: event.id, status: "Synced" }),
    ]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/events/school-operations")).toHaveLength(2);
  });

  it("starts a retry worker for queued school operation syncs", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const backendAttempts = fetchMock.mock.calls.filter(([requestUrl]) =>
        String(requestUrl) === "/api/events/school-operations"
      ).length;

      if (url === "/api/auth/csrf") {
        return jsonResponse({ token: "csrf-token" });
      }

      if (url === "/api/events/school-operations" && backendAttempts === 1) {
        return jsonResponse({ message: "API temporarily unavailable" }, { status: 503 });
      }

      if (url === "/api/events/school-operations") {
        return jsonResponse({ status: "accepted" }, { status: 202 });
      }

      return jsonResponse({ message: "Unexpected request" }, { status: 404 });
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const event = publishSchoolOperationalEvent({
      schoolId: "kb-high",
      type: "VISITOR_CHECKED_IN",
      module: "visitors",
      actorRole: "security-officer",
      title: "Visitor checked in",
      body: "Grace Njeri checked in for Principal office.",
      notifications: [{ audienceRoles: ["principal", "secretary"], title: "Visitor checked in" }],
    });

    await waitFor(() =>
      expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
        expect.objectContaining({ eventId: event.id, status: "Queued" }),
      ]),
    );

    const stopWorker = startSchoolOperationalEventSyncRetryWorker("kb-high", { intervalMs: 1000 });
    await jest.advanceTimersByTimeAsync(1000);

    expect(readSchoolData("eventSyncQueue", "kb-high")).toEqual([]);
    expect(readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", "kb-high")).toEqual([
      expect.objectContaining({ eventId: event.id, status: "Synced" }),
    ]);

    stopWorker();
    jest.useRealTimers();
  });

  it("announces school-scoped updates so open dashboards can refresh", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSchoolDataUpdates(listener);

    createNotification({
      schoolId: "kb-high",
      audienceRoles: ["principal"],
      sourceModule: "visitors",
      title: "Visitor checked in",
      body: "Grace Njeri is inside the school.",
      severity: "info",
    });
    simulateSms({
      schoolId: "kb-high",
      recipient: "0712345678",
      message: "Visitor checked in.",
      sourceModule: "visitors",
    });

    expect(listener).toHaveBeenCalledWith({ schoolId: "kb-high", moduleName: "notifications" });
    expect(listener).toHaveBeenCalledWith({ schoolId: "kb-high", moduleName: "smsLogs" });

    unsubscribe();
  });

  it("keeps cross-dashboard requests visible to origin and target roles and reflects completion back", () => {
    publishSchoolOperationalEvent({
      schoolId: "kb-high",
      type: "STORE_ITEM_REQUESTED",
      module: "inventory",
      actorRole: "teacher",
      title: "Exercise books requested",
      body: "Form 2 West needs 40 exercise books.",
      entityId: "store-request-88",
      severity: "warning",
      notifications: [
        {
          audienceRoles: ["storekeeper"],
          relatedModule: "inventory",
          relatedRecordId: "store-request-88",
          title: "Store item requested",
          requiresAction: true,
        },
      ],
    });

    expect(listSchoolOperationalRequestsForRole("teacher", "kb-high")).toEqual([
      expect.objectContaining({
        schoolId: "kb-high",
        originRole: "teacher",
        targetRoles: ["storekeeper"],
        relatedRecordId: "store-request-88",
        status: "Pending",
      }),
    ]);
    expect(listSchoolOperationalRequestsForRole("storekeeper", "kb-high")).toEqual([
      expect.objectContaining({
        relatedRecordId: "store-request-88",
        status: "Pending",
      }),
    ]);

    updateSchoolOperationalRequestStatus({
      schoolId: "kb-high",
      relatedRecordId: "store-request-88",
      sourceModule: "inventory",
      status: "Issued",
      statusDetail: "Issued 40 exercise books for collection at the store.",
      actorRole: "storekeeper",
      payload: { quantityIssued: 40 },
    });

    expect(readSchoolData<SchoolOperationalRequest>("operationalRequests", "kb-high")).toEqual([
      expect.objectContaining({
        relatedRecordId: "store-request-88",
        status: "Issued",
        statusDetail: "Issued 40 exercise books for collection at the store.",
        lastActorRole: "storekeeper",
        payload: expect.objectContaining({ quantityIssued: 40 }),
      }),
    ]);
    expect(readSchoolData("notifications", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          audienceRoles: ["teacher"],
          relatedRecordId: "store-request-88",
          requestStatus: "Issued",
          requiresAction: false,
        }),
      ]),
    );
    expect(readSchoolData("notifications", "green-valley")).toEqual([]);
  });
});
