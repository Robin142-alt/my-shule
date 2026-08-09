"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useOptionalSchoolDashboardRole } from '@/lib/auth/school-dashboard-role-context';
import { getCsrfToken } from '@/lib/auth/csrf-client';
import { canReplayOfflineRecord, syncQueue, OfflineSyncRecord } from '../../lib/offline/sync-queue';

// Minimal Sync Center UI to show queue status and retry failed items
export const SyncCenter: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [records, setRecords] = useState<OfflineSyncRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const dashboardRole = useOptionalSchoolDashboardRole();
  const activeAuthorizationRoleCode = dashboardRole?.activeAuthorizationRoleCode ?? null;
  const userId = dashboardRole?.userId ?? null;

  const loadRecords = useCallback(async () => {
    if (!activeAuthorizationRoleCode || !userId) {
      setRecords([]);
      return;
    }
    const allRecords = await syncQueue.getAllForSchool(schoolId);
    setRecords(allRecords.filter((record) => canReplayOfflineRecord(record, {
      schoolId,
      roleId: activeAuthorizationRoleCode,
      userId,
    })));
  }, [activeAuthorizationRoleCode, schoolId, userId]);

  useEffect(() => {
    void loadRecords();
    const interval = setInterval(loadRecords, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, [loadRecords]);

  const handleRetryAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    try {
      const failedRecords = await syncQueue.getRecordsBySchoolAndStatus(schoolId, 'Failed');
      for (const record of failedRecords) {
        if (!canReplayOfflineRecord(record, {
          schoolId,
          roleId: activeAuthorizationRoleCode,
          userId,
        })) {
          continue;
        }
        await syncQueue.updateStatus(record.id, 'Syncing');
        // Trigger actual backend sync call here
        try {
          const res = await fetch('/api/sync/retry', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-myshule-csrf': await getCsrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ operations: [record] })
          });
          if (res.ok) {
            await syncQueue.updateStatus(record.id, 'Synced');
          } else {
            await syncQueue.updateStatus(record.id, 'Failed', 'Backend rejected retry');
          }
        } catch (e: any) {
          await syncQueue.updateStatus(record.id, 'Failed', e.message);
        }
      }
    } finally {
      setIsSyncing(false);
      void loadRecords();
    }
  };

  const pendingCount = records.filter(r => ['Pending', 'Draft'].includes(r.status)).length;
  const failedCount = records.filter(r => r.status === 'Failed').length;

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Sync Center</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${failedCount > 0 ? 'bg-red-100 text-red-800' : pendingCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
          {failedCount > 0 ? 'Issues Detected' : pendingCount > 0 ? 'Pending Sync' : 'Up to Date'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-slate-700">{pendingCount}</p>
        </div>
        <div className="p-3 bg-red-50 rounded border border-red-100">
          <p className="text-sm text-red-500">Failed</p>
          <p className="text-2xl font-bold text-red-700">{failedCount}</p>
        </div>
      </div>

      {failedCount > 0 && (
        <button
          onClick={handleRetryAll}
          disabled={isSyncing}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
        >
          {isSyncing ? 'Syncing...' : 'Retry Failed Syncs'}
        </button>
      )}

      {records.length > 0 && (
        <div className="mt-4 max-h-48 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Module</th>
                <th className="py-2">Action</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id} className="border-b last:border-0">
                  <td className="py-2 capitalize">{record.module}</td>
                  <td className="py-2 capitalize">{record.action}</td>
                  <td className="py-2">
                    <span className={`text-xs ${record.status === 'Failed' ? 'text-red-600' : record.status === 'Synced' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
