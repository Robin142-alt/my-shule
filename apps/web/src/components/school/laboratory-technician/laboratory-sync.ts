import { requestDashboardApi } from "@/lib/dashboard/api-client";
import {
  canReplayOfflineRecord,
  type OfflineSyncRecord,
  syncQueue,
} from "@/lib/offline/sync-queue";

export type QueuedLaboratoryRequest = {
  __laboratory_request: true;
  path: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: Record<string, unknown>;
};

const activeSyncs = new Map<string, Promise<{ synced: number; failed: number }>>();
const recoveryTimers = new Map<string, { handle: number; dueAt: number }>();

export const LABORATORY_SYNC_LEASE_MS = 30_000;

export function isStaleLaboratorySync(record: OfflineSyncRecord, now = Date.now()) {
  const updatedAt = Date.parse(record.statusUpdatedAt ?? record.createdAtLocal);
  return !Number.isFinite(updatedAt) || now - updatedAt >= LABORATORY_SYNC_LEASE_MS;
}

function actorSyncKey(schoolId: string, userId: string, roleId: string) {
  return `${schoolId}:${userId}:${roleId}`;
}

function scheduleStaleRecovery(schoolId: string, userId: string, roleId: string, syncingRecords: OfflineSyncRecord[], now: number) {
  if (typeof window === "undefined" || syncingRecords.length === 0) return;
  const syncKey = actorSyncKey(schoolId, userId, roleId);
  const dueAt = Math.min(...syncingRecords.map((record) => {
    const updatedAt = Date.parse(record.statusUpdatedAt ?? record.createdAtLocal);
    return Number.isFinite(updatedAt) ? updatedAt + LABORATORY_SYNC_LEASE_MS : now;
  }));
  const existing = recoveryTimers.get(syncKey);
  if (existing && existing.dueAt <= dueAt) return;
  if (existing) window.clearTimeout(existing.handle);
  const handle = window.setTimeout(() => {
    recoveryTimers.delete(syncKey);
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    void syncPendingLaboratoryOperations(schoolId, userId, roleId);
  }, Math.max(0, dueAt - now) + 25);
  recoveryTimers.set(syncKey, { handle, dueAt });
}

function queuedRequest(record: OfflineSyncRecord): QueuedLaboratoryRequest | null {
  const payload = record.payload as Partial<QueuedLaboratoryRequest> | null;
  const allowedMethods: QueuedLaboratoryRequest["method"][] = ["POST", "PATCH", "PUT", "DELETE"];
  if (
    !payload?.__laboratory_request
    || typeof payload.path !== "string"
    || !payload.path.startsWith("/labs/")
    || typeof payload.method !== "string"
    || !allowedMethods.includes(payload.method as QueuedLaboratoryRequest["method"])
  ) {
    return null;
  }
  return {
    __laboratory_request: true,
    path: payload.path,
    method: payload.method as QueuedLaboratoryRequest["method"],
    body: payload.body && typeof payload.body === "object" ? payload.body : {},
  };
}

async function runLaboratorySync(schoolId: string, userId: string, roleId: string) {
  const [pending, failedRecords, syncingRecords] = await Promise.all([
    syncQueue.getRecordsBySchoolAndStatus(schoolId, "Pending"),
    syncQueue.getRecordsBySchoolAndStatus(schoolId, "Failed"),
    syncQueue.getRecordsBySchoolAndStatus(schoolId, "Syncing"),
  ]);
  const now = Date.now();
  const activeLaboratorySyncs = syncingRecords.filter(
    (record) => record.userId === userId
      && record.module === "labs"
      && canReplayOfflineRecord(record, { schoolId, userId, roleId })
      && queuedRequest(record)
      && !isStaleLaboratorySync(record, now),
  );
  scheduleStaleRecovery(schoolId, userId, roleId, activeLaboratorySyncs, now);
  const candidateRecords = [
    ...pending,
    ...failedRecords,
    ...syncingRecords.filter((record) => isStaleLaboratorySync(record, now)),
  ]
    .filter((record) => record.userId === userId && record.module === "labs" && queuedRequest(record));
  // Records created under another authorized working role remain untouched so
  // switching back can resume them. Replay never changes ownership metadata.
  const laboratoryRecords = candidateRecords.filter((record) =>
    canReplayOfflineRecord(record, { schoolId, userId, roleId }),
  );
  let synced = 0;
  let failed = 0;

  for (const record of laboratoryRecords) {
    const request = queuedRequest(record);
    if (!request) continue;
    await syncQueue.updateStatus(record.id, "Syncing");
    try {
      await requestDashboardApi(request.path, {
        method: request.method,
        tenantId: schoolId,
        body: request.body,
      });
      await syncQueue.updateStatus(record.id, "Synced");
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Laboratory sync failed";
      await syncQueue.updateStatus(record.id, "Failed", message);
      failed += 1;
    }
  }

  if (typeof window !== "undefined" && laboratoryRecords.length > 0) {
    window.dispatchEvent(new CustomEvent(failed > 0 ? "myshule:lab-sync-failed" : "myshule:lab-sync-complete", {
      detail: { schoolId, synced, failed },
    }));
  }
  return { synced, failed };
}

export function syncPendingLaboratoryOperations(schoolId: string, userId: string, roleId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return Promise.reject(new Error("Laboratory sync requires the authenticated user ID"));
  }
  const normalizedRoleId = roleId.trim();
  if (!normalizedRoleId) {
    return Promise.reject(new Error("Laboratory sync requires the active dashboard role"));
  }
  const syncKey = actorSyncKey(schoolId, normalizedUserId, normalizedRoleId);
  const existing = activeSyncs.get(syncKey);
  if (existing) return existing;
  const running = runLaboratorySync(schoolId, normalizedUserId, normalizedRoleId).finally(() => activeSyncs.delete(syncKey));
  activeSyncs.set(syncKey, running);
  return running;
}
