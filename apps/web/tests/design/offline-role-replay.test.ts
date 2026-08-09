import { canReplayOfflineRecord, type OfflineSyncRecord } from "@/lib/offline/sync-queue";

function record(roleId?: string): OfflineSyncRecord {
  return {
    id: "record-1",
    operationId: "operation-1",
    schoolId: "school-alpha",
    userId: "user-1",
    roleId,
    deviceId: "device-1",
    module: "attendance",
    action: "mark",
    payload: {},
    status: "Pending",
    retryCount: 0,
    createdAtLocal: "2026-08-09T08:00:00.000Z",
    type: "mutation",
  };
}

describe("offline active-role replay guard", () => {
  it("permits replay only for the same tenant, user and active role", () => {
    expect(canReplayOfflineRecord(record("teacher"), {
      schoolId: "school-alpha",
      userId: "user-1",
      roleId: "teacher",
    })).toBe(true);
    expect(canReplayOfflineRecord(record("teacher"), {
      schoolId: "school-alpha",
      userId: "user-1",
      roleId: "principal",
    })).toBe(false);
    expect(canReplayOfflineRecord(record("teacher"), {
      schoolId: "school-beta",
      userId: "user-1",
      roleId: "teacher",
    })).toBe(false);
    expect(canReplayOfflineRecord(record(), {
      schoolId: "school-alpha",
      userId: "user-1",
      roleId: "teacher",
    })).toBe(false);
    expect(canReplayOfflineRecord(record("teacher"), {
      schoolId: "school-alpha",
      userId: null,
      roleId: "teacher",
    })).toBe(false);
    expect(canReplayOfflineRecord(record("owner"), {
      schoolId: "school-alpha",
      userId: "user-1",
      roleId: "principal",
    })).toBe(false);
  });
});
