import { useEffect, useState, useCallback } from "react";
import { withSession, type LiveAuthSession } from "@/lib/dashboard/api-client";

export interface OfflineAttendanceRecord {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
}

export interface OfflineAttendanceTask {
  id: string; // queue ID
  streamId: string;
  tenantId: string;
  records: OfflineAttendanceRecord[];
  timestamp: number;
}

const STORAGE_KEY = "myshule_offline_attendance_queue";

export function saveAttendanceOffline(tenantId: string, streamId: string, records: OfflineAttendanceRecord[]) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const queue: OfflineAttendanceTask[] = existing ? JSON.parse(existing) : [];
    
    // Check if there is already a queue for this stream today, and just overwrite
    const filteredQueue = queue.filter(q => q.streamId !== streamId);
    
    filteredQueue.push({
      id: `task_${Date.now()}`,
      tenantId,
      streamId,
      records,
      timestamp: Date.now(),
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredQueue));
  } catch (err) {
    console.error("Failed to save attendance offline:", err);
  }
}

export function useOfflineAttendanceSync(session: LiveAuthSession | null) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const checkQueue = useCallback(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) {
        const queue: OfflineAttendanceTask[] = JSON.parse(existing);
        setQueueCount(queue.length);
        return queue;
      }
    } catch {
      // ignore
    }
    setQueueCount(0);
    return [];
  }, []);

  const syncQueue = useCallback(async () => {
    if (!session || !isOnline || syncing) return;
    
    const queue = checkQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    let successCount = 0;
    
    const updatedQueue = [...queue];

    for (let i = queue.length - 1; i >= 0; i--) {
      const task = queue[i];
      try {
        await withSession(session, "/class-teacher/attendance", {
          method: "POST",
          body: { streamId: task.streamId, records: task.records }
        });
        // Remove from queue
        updatedQueue.splice(i, 1);
        successCount++;
      } catch (err) {
        console.error("Sync failed for task", task.id, err);
      }
    }

    if (successCount > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));
      checkQueue();
    }
    setSyncing(false);
  }, [session, isOnline, syncing, checkQueue]);

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
      if (!session) return;
      saveAttendanceOffline(session.tenantId, streamId, records);
      checkQueue();
      if (isOnline) {
        syncQueue();
      }
    }
  };
}
