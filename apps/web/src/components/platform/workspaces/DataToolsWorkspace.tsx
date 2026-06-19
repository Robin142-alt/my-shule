/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { fetchPlatformBackups, triggerPlatformBackup } from "@/lib/platform/school-onboarding-client";
import { Database } from "lucide-react";

export function DataToolsWorkspace() {
  const router = useRouter();
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const liveRows = await fetchPlatformBackups();
      setBackups(liveRows);
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initLoad() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformBackups();
        if (!cancelled) {
          setBackups(liveRows);
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void initLoad();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleTriggerBackup() {
    setIsTriggering(true);
    try {
      await triggerPlatformBackup();
      await loadData();
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsTriggering(false);
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      id: "backupName",
      header: "Backup Name / School",
      render: (row) => <span className="font-semibold">{row.backupName || row.schoolName || "Platform Snapshot"}</span>,
    },
    {
      id: "lastBackup",
      header: "Last Backup Date",
      render: (row) => row.lastBackup || "N/A",
    },
    {
      id: "size",
      header: "Size",
      render: (row) => row.size || "N/A",
    },
    {
      id: "status",
      header: "Status",
      render: (row) => {
        const tone = row.status === "Completed" || row.status === "Success" || row.status === "active" ? "ok" : "warning";
        return <StatusPill label={row.status || "Pending"} tone={tone} />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm">
            Download Snapshot
          </Button>
          <Button variant="danger" size="sm">
            Restore
          </Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Data Tools & Backups" 
        description="Platform database snapshots, migrations, and tenant data export tools." 
        actions={
          <Button onClick={handleTriggerBackup} disabled={isTriggering || isLoading}>
            <Database className="h-4 w-4 mr-2" /> {isTriggering ? "Triggering..." : "Trigger Backup"}
          </Button>
        }
      />
      
      <DataTable
        title="Tenant Backups"
        subtitle="Manage isolated data backups for each school."
        columns={columns}
        rows={backups}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading backup status..." : "No tenant data found."}
      />
    </div>
  );
}