/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchApiObservabilityHealth, fetchApiObservabilityAlerts } from "@/lib/dashboard/api-client";

export function TenantHealthWorkspace() {
  const [health, setHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [healthData, alertsData, metricsData] = await Promise.all([
          fetchApiObservabilityHealth().catch(() => null),
          fetchApiObservabilityAlerts().catch(() => null),
          fetch("/api/observability/metrics")
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null)
        ]);

        const combinedHealth = {
          ...healthData,
          failed_jobs: metricsData?.failedBackgroundJobs ?? metricsData?.failed_jobs ?? healthData?.failed_jobs ?? 0,
          sync_queue: metricsData?.syncQueueCount ?? metricsData?.sync_queue ?? healthData?.sync_queue ?? 0,
          pending_emails: metricsData?.pendingEmailsCount ?? metricsData?.pending_emails ?? healthData?.pending_emails ?? 0,
          pending_sms: metricsData?.pendingSmsCount ?? metricsData?.pending_sms ?? healthData?.pending_sms ?? 0,
          api_errors_1h: metricsData?.apiErrorsCount ?? metricsData?.api_errors_1h ?? healthData?.api_errors_1h ?? 0,
        };

        setHealth(combinedHealth);
        
        let alertsList = [];
        if (alertsData) {
          if (Array.isArray(alertsData)) {
            alertsList = alertsData;
          } else if (Array.isArray(alertsData.alerts)) {
            alertsList = alertsData.alerts;
          }
        }
        setAlerts(alertsList);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, []);

  const columns: DataTableColumn<any>[] = [
    {
      id: "time",
      header: "Time",
      render: (row) => {
        const dateVal = row.triggered_at || row.last_evaluated_at || row.timestamp;
        return dateVal ? new Date(dateVal).toLocaleString() : "N/A";
      }
    },
    { id: "tenant", header: "Tenant", render: (row) => row.tenant_id || "Platform" },
    { id: "service", header: "Subsystem", render: (row) => row.subsystem || row.service || "Background Jobs" },
    { id: "errorType", header: "Severity", render: (row) => row.severity || row.error_type || "Timeout" },
    { id: "message", header: "Message", render: (row) => row.message || "Job queue exceeded maximum latency." },
    { id: "count", header: "Count", render: (row) => row.count || "1" },
    { id: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm">View Log</Button> }
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Tenant Health & System Queues" 
        description="Monitor asynchronous background jobs, sync failures, and API errors across all tenants." 
      />
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Failed Background Jobs</div>
          <div className="mt-2 text-2xl font-bold text-red-600">{health?.failed_jobs || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Offline Sync Queue</div>
          <div className="mt-2 text-2xl font-bold">{health?.sync_queue || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Pending Emails</div>
          <div className="mt-2 text-2xl font-bold">{health?.pending_emails || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Pending SMS</div>
          <div className="mt-2 text-2xl font-bold">{health?.pending_sms || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">API Errors (Last 1h)</div>
          <div className="mt-2 text-2xl font-bold text-red-600">{health?.api_errors_1h || 0}</div>
        </Card>
      </div>
      <DataTable
        title="Recent Errors"
        subtitle="System-wide error logs."
        columns={columns}
        rows={alerts}
        getRowKey={(row) => row.id || row.timestamp || Math.random().toString()}
        emptyMessage={isLoading ? "Loading health data..." : "No recent errors detected."}
      />
    </div>
  );
}
