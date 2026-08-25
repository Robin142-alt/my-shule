"use client";

import { Heart } from "lucide-react";

import { useSchoolQuery } from "@/lib/data/school-hooks";

import { MetricCard, Panel, WorkspaceFailure } from "./shared";

type OverviewData = {
  metrics: {
    active_cases: number;
    sessions_this_week: number;
    referrals_pending: number;
    follow_ups_due: number;
  };
};

export function OverviewWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<OverviewData>(
    "/admin-command/guidance-counselling/overview",
  );

  return (
    <Panel
      title="Counselling Overview"
      description="Live, school-scoped case, session, referral, and follow-up totals."
      icon={Heart}
    >
      {error ? (
        <WorkspaceFailure
          title="Counselling overview could not be loaded."
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Cases" value={isLoading ? "…" : data?.metrics.active_cases ?? 0} tone="info" />
          <MetricCard label="Sessions This Week" value={isLoading ? "…" : data?.metrics.sessions_this_week ?? 0} tone="success" />
          <MetricCard label="Referrals Pending" value={isLoading ? "…" : data?.metrics.referrals_pending ?? 0} tone="warning" />
          <MetricCard label="Follow-ups Due" value={isLoading ? "…" : data?.metrics.follow_ups_due ?? 0} tone="danger" />
        </div>
      )}
    </Panel>
  );
}
