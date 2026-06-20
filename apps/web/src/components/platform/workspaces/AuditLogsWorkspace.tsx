/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { fetchPlatformAuditLogs } from "@/lib/platform/school-onboarding-client";


export function AuditLogsWorkspace() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformAuditLogs();
        if (!cancelled) setLogs(liveRows);
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  const columns: DataTableColumn<any>[] = [
    { id: "timestamp", header: "Timestamp", render: (row) => row.timestamp ?? "N/A" },
    { id: "actor", header: "Actor", render: (row) => row.actor ?? "System" },
    { id: "action", header: "Action", render: (row) => row.action ?? "Unknown" },
    { id: "target", header: "Target", render: (row) => row.target ?? "N/A" },
    { id: "details", header: "Details", render: (row) => row.details ?? "" },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader title="Audit Logs" description="Immutable record of every sensitive platform action." />
      <DataTable
        title="Platform Audit Trail"
        subtitle="All governance-tracked events."
        columns={columns}
        rows={logs}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading audit logs..." : "No audit events recorded."}
      />
    </div>
  );
}
