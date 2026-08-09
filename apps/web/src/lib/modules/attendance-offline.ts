import { useEffect, useState, useCallback, useMemo } from "react";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { withSession, type LiveAuthSession } from "@/lib/dashboard/api-client";

export interface OfflineAttendanceRecord {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
}

export interface OfflineAttendanceTask {
  id: string; // queue ID
  streamId: string;
  tenantId: string;
  userId: string;
  roleId: string;
  records: OfflineAttendanceRecord[];
  timestamp: number;
}

const STORAGE_KEY = "myshule_offline_attendance_queue";
const attendanceSyncInFlight = new Map<string, Promise<AttendanceSyncResult>>();

export type AttendanceReplayContext = {
  tenantId: string;
  userId: string;
  roleId: string;
};

type AttendanceRequestSender = (
  session: LiveAuthSession,
  path: string,
  options: {
    method: "POST";
    body: { streamId: string; records: OfflineAttendanceRecord[] };
  },
) => Promise<unknown>;

function normalizeReplayContext(context: AttendanceReplayContext): AttendanceReplayContext {
  return {
    tenantId: context.tenantId.trim(),
    userId: context.userId.trim(),
    roleId: context.roleId.trim(),
  };
}

function replayContextFromSession(session: LiveAuthSession): AttendanceReplayContext {
  return normalizeReplayContext({
    tenantId: session.tenantId,
    userId: session.user.user_id,
    roleId: session.user.role,
  });
}

export function canReplayAttendanceTask(
  task: OfflineAttendanceTask,
  rawContext: AttendanceReplayContext,
) {
  const context = normalizeReplayContext(rawContext);
  return Boolean(
    context.tenantId
      && context.userId
      && context.roleId
      && task.tenantId?.trim() === context.tenantId
      && task.userId?.trim() === context.userId
      && task.roleId?.trim() === context.roleId,
  );
}

function readAttendanceQueue(): OfflineAttendanceTask[] {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) return [];

    const parsed = JSON.parse(existing) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((candidate): candidate is OfflineAttendanceTask => Boolean(
      candidate
        && typeof candidate === "object"
        && typeof (candidate as OfflineAttendanceTask).id === "string"
        && typeof (candidate as OfflineAttendanceTask).streamId === "string"
        && typeof (candidate as OfflineAttendanceTask).tenantId === "string"
        && Array.isArray((candidate as OfflineAttendanceTask).records),
    ));
  } catch {
    return [];
  }
}

function writeAttendanceQueue(queue: OfflineAttendanceTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function saveAttendanceOffline(
  rawContext: AttendanceReplayContext,
  streamId: string,
  records: OfflineAttendanceRecord[],
) {
  try {
    const context = normalizeReplayContext(rawContext);
    if (!context.tenantId || !context.userId || !context.roleId) return false;

    const queue = readAttendanceQueue();

    // Replace only this actor's same-role register. Never overwrite another
    // user's, tenant's, or dashboard role's queued work on a shared device.
    const filteredQueue = queue.filter((task) => !(
      task.streamId === streamId
        && canReplayAttendanceTask(task, context)
    ));
    
    filteredQueue.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      ...context,
      streamId,
      records,
      timestamp: Date.now(),
    });
    
    writeAttendanceQueue(filteredQueue);
    return true;
  } catch (err) {
    console.error("Failed to save attendance offline:", err);
    return false;
  }
}

type AttendanceSyncResult = { synced: number; failed: number; skipped: number };

async function performAttendanceSync(
  session: LiveAuthSession,
  sender: AttendanceRequestSender,
  rawContext: AttendanceReplayContext,
): Promise<AttendanceSyncResult> {
  const context = normalizeReplayContext(rawContext);
  const queue = readAttendanceQueue();
  const syncedIds = new Set<string>();
  let failed = 0;
  let skipped = 0;

  for (const task of queue) {
    if (!canReplayAttendanceTask(task, context)) {
      skipped += 1;
      continue;
    }

    try {
      await sender(session, "/class-teacher/attendance", {
        method: "POST",
        body: { streamId: task.streamId, records: task.records },
      });
      syncedIds.add(task.id);
    } catch (err) {
      failed += 1;
      console.error("Sync failed for task", task.id, err);
    }
  }

  if (syncedIds.size > 0) {
    writeAttendanceQueue(queue.filter((task) => !syncedIds.has(task.id)));
  }

  return { synced: syncedIds.size, failed, skipped };
}

export function syncPendingAttendanceTasks(
  session: LiveAuthSession,
  sender: AttendanceRequestSender = withSession,
  rawContext: AttendanceReplayContext = replayContextFromSession(session),
): Promise<AttendanceSyncResult> {
  const context = normalizeReplayContext(rawContext);
  const ownerKey = `${context.tenantId}:${context.userId}:${context.roleId}`;
  const existing = attendanceSyncInFlight.get(ownerKey);
  if (existing) return existing;

  const syncPromise = performAttendanceSync(session, sender, context).finally(() => {
    if (attendanceSyncInFlight.get(ownerKey) === syncPromise) {
      attendanceSyncInFlight.delete(ownerKey);
    }
  });
  attendanceSyncInFlight.set(ownerKey, syncPromise);
  return syncPromise;
}

export function useOfflineAttendanceSync(session: LiveAuthSession | null) {
  const dashboardRoleState = useOptionalSchoolDashboardRole();
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const replayContext = useMemo<AttendanceReplayContext | null>(() => {
    if (dashboardRoleState) {
      return normalizeReplayContext({
        tenantId: dashboardRoleState.tenantSlug ?? "",
        userId: dashboardRoleState.userId ?? "",
        roleId: dashboardRoleState.activeAuthorizationRoleCode,
      });
    }
    return session ? replayContextFromSession(session) : null;
  }, [
    dashboardRoleState,
    session,
  ]);

  const checkQueue = useCallback(() => {
    try {
      if (!session || !replayContext) {
        setQueueCount(0);
        return [];
      }

      const queue = readAttendanceQueue().filter((task) => canReplayAttendanceTask(task, replayContext));
      setQueueCount(queue.length);
      return queue;
    } catch {
      // ignore
    }
    setQueueCount(0);
    return [];
  }, [replayContext, session]);

  const syncQueue = useCallback(async () => {
    if (!session || !replayContext || !isOnline || syncing) return;
    
    const queue = checkQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    try {
      const result = await syncPendingAttendanceTasks(session, withSession, replayContext);
      if (result.synced > 0) {
        checkQueue();
      }
    } finally {
      setSyncing(false);
      checkQueue();
    }
  }, [session, replayContext, isOnline, syncing, checkQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    checkQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, checkQueue]);

  return {
    isOnline,
    syncing,
    queueCount,
    syncQueue,
    saveLocallyAndQueue: (streamId: string, records: OfflineAttendanceRecord[]) => {
      if (!session || !replayContext) return;
      saveAttendanceOffline(replayContext, streamId, records);
      checkQueue();
      if (isOnline) {
        syncQueue();
      }
    }
  };
}
