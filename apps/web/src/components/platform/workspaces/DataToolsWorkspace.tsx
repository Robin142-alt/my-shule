/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { fetchPlatformBackups, type PlatformBackup } from "@/lib/platform/school-onboarding-client";
import { Database } from "lucide-react";


export function DataToolsWorkspace() {
  const router = useRouter();
  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformBackups();
        if (!cancelled) {
          setGateways(liveRows);
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

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformBackup>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "lastBackup",
      header: "Last Backup Date",
      render: () => <span className="text-muted">Not backed up</span>,
    },
    {
      id: "size",
      header: "Size",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "status",
      header: "Status",
      render: () => <StatusPill label="Pending" tone="warning" />,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            <Database className="h-4 w-4 mr-2" /> Trigger Backup
          </Button>
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
      />
      
      <DataTable
        title="Tenant Backups"
        subtitle="Manage isolated data backups for each school."
        columns={columns}
        rows={gateways}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading backup status..." : "No tenant data found."}
      />
    </div>
  );
}