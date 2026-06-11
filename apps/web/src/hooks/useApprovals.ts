import { useState, useEffect, useCallback } from 'react';
import { DashboardApi } from '../lib/client/dashboard-api';

export function useApprovals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DashboardApi.getApprovals();
      setApprovals(data);
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approve = async (id: string, userId: string, comment?: string) => {
    try {
      await DashboardApi.approveRequest(id, userId, comment);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to approve', err);
      throw err;
    }
  };

  const reject = async (id: string, userId: string, reason?: string) => {
    try {
      await DashboardApi.rejectRequest(id, userId, reason);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to reject', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return { approvals, isLoading, approve, reject, refetch: fetchApprovals };
}
