import { requestDashboardApi } from "@/lib/dashboard/api-client";
import {
  createLaboratoryQueueDedupeKey,
} from "@/components/school/laboratory-technician/use-laboratory-mutation";
import {
  LABORATORY_SYNC_LEASE_MS,
  syncPendingLaboratoryOperations,
} from "@/components/school/laboratory-technician/laboratory-sync";
import { syncQueue } from "@/lib/offline/sync-queue";

if (typeof global.structuredClone !== "function") {
  global.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}

jest.mock("@/lib/dashboard/api-client", () => ({
  requestDashboardApi: jest.fn(),
}));

const requestDashboardApiMock = jest.mocked(requestDashboardApi);

describe("laboratory offline mutation reliability", () => {
  const recordIds = new Set<string>();

  afterEach(async () => {
    jest.restoreAllMocks();
    requestDashboardApiMock.mockReset();
    for (const id of recordIds) await syncQueue.removeRecord(id);
    recordIds.clear();
  });

  it("stores one tenant-scoped queue record for repeated clicks with the same submission ID", async () => {
    const operation = {
      schoolId: "lab-school-dedupe",
      userId: "technician-1",
      deviceId: "ordinary-school-computer",
      module: "labs",
      action: "import-stock-list",
      dedupeKey: "POST:/labs/items/import:stock-list-2026-08-09",
      payload: {
        __laboratory_request: true,
        path: "/labs/items/import",
        method: "POST",
        body: { submission_id: "stock-list-2026-08-09", items: [] },
      },
    } as const;

    const [first, repeated] = await Promise.all([
      syncQueue.enqueue(operation),
      syncQueue.enqueue(operation),
    ]);
    recordIds.add(first.id);
    recordIds.add(repeated.id);

    const records = await syncQueue.getAllForSchool(operation.schoolId);
    expect(repeated.id).toBe(first.id);
    expect(records.filter((record) => record.dedupeKey === operation.dedupeKey)).toHaveLength(1);

    await syncQueue.updateStatus(first.id, "Synced");
    const laterRetry = await syncQueue.enqueue(operation);
    const otherUser = await syncQueue.enqueue({ ...operation, userId: "technician-2" });
    recordIds.add(laterRetry.id);
    recordIds.add(otherUser.id);
    expect(laterRetry.id).not.toBe(first.id);
    expect(otherUser.id).not.toBe(laterRetry.id);
  });

  it("deduplicates an exact laboratory request without a submission ID but not changed counts", () => {
    const first = createLaboratoryQueueDedupeKey("PATCH", "/labs/stocktakes/count-1", {
      notes: "Cupboard 1 complete",
      items: [{ counted_quantity: 37, line_id: "test-tubes" }],
    });
    const reordered = createLaboratoryQueueDedupeKey("PATCH", "/labs/stocktakes/count-1", {
      items: [{ line_id: "test-tubes", counted_quantity: 37 }],
      notes: "Cupboard 1 complete",
    });
    const changedCount = createLaboratoryQueueDedupeKey("PATCH", "/labs/stocktakes/count-1", {
      notes: "Cupboard 1 complete",
      items: [{ counted_quantity: 38, line_id: "test-tubes" }],
    });

    expect(reordered).toBe(first);
    expect(changedCount).not.toBe(first);
  });

  it("reclaims a laboratory record whose Syncing lease was abandoned by an interrupted tab", async () => {
    const record = await syncQueue.enqueue({
      schoolId: "lab-school-stale-sync",
      userId: "technician-1",
      deviceId: "android-phone",
      module: "labs",
      action: "add-stock",
      dedupeKey: "POST:/labs/items/equipment/item-1/stock:add-stock-1",
      payload: {
        __laboratory_request: true,
        path: "/labs/items/equipment/item-1/stock",
        method: "POST",
        body: { submission_id: "add-stock-1", quantity_added: 20 },
      },
    });
    recordIds.add(record.id);
    await syncQueue.updateStatus(record.id, "Syncing");
    requestDashboardApiMock.mockResolvedValue({ message: "20 pieces added" });

    const currentTime = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(currentTime + LABORATORY_SYNC_LEASE_MS + 1);
    const result = await syncPendingLaboratoryOperations(record.schoolId, record.userId);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/labs/items/equipment/item-1/stock",
      expect.objectContaining({
        method: "POST",
        tenantId: record.schoolId,
        body: { submission_id: "add-stock-1", quantity_added: 20 },
      }),
    );
    const synced = await syncQueue.getRecordsBySchoolAndStatus(record.schoolId, "Synced");
    expect(synced.map((item) => item.id)).toContain(record.id);
  });

  it("never replays another user's queued laboratory mutation in the current session", async () => {
    const schoolId = "shared-computer-school";
    const firstTechnician = await syncQueue.enqueue({
      schoolId,
      userId: "technician-first-shift",
      deviceId: "shared-lab-computer",
      module: "labs",
      action: "add-stock",
      payload: {
        __laboratory_request: true,
        path: "/labs/items/equipment/beaker-1/stock",
        method: "POST",
        body: { submission_id: "first-shift-stock", quantity_added: 20 },
      },
    });
    const currentTechnician = await syncQueue.enqueue({
      schoolId,
      userId: "technician-current-shift",
      deviceId: "shared-lab-computer",
      module: "labs",
      action: "add-stock",
      payload: {
        __laboratory_request: true,
        path: "/labs/items/equipment/test-tube-1/stock",
        method: "POST",
        body: { submission_id: "current-shift-stock", quantity_added: 100 },
      },
    });
    recordIds.add(firstTechnician.id);
    recordIds.add(currentTechnician.id);
    requestDashboardApiMock.mockResolvedValue({ message: "Stock added" });

    const result = await syncPendingLaboratoryOperations(schoolId, currentTechnician.userId);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(requestDashboardApiMock).toHaveBeenCalledTimes(1);
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/labs/items/equipment/test-tube-1/stock",
      expect.any(Object),
    );
    const pending = await syncQueue.getRecordsBySchoolAndStatus(schoolId, "Pending");
    expect(pending.map((item) => item.id)).toContain(firstTechnician.id);
  });
});
