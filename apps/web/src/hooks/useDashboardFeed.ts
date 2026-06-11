import { useState, useEffect, useCallback } from 'react';
import { DashboardApi } from '../lib/client/dashboard-api';

export function useDashboardFeed(role: string) {
  const [feed, setFeed] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const [feedData, summaryData] = await Promise.all([
        DashboardApi.getFeed(role),
        DashboardApi.getSummary(role)
      ]);
      setFeed(feedData);
      setSummary(summaryData);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { feed, summary, isLoading, error, refetch: fetchFeed };
}
