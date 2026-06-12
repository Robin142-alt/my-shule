/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { fetchPlatformUsers } from "@/lib/platform/school-onboarding-client";
import { Plus } from "lucide-react";


export function UsersWorkspace() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformUsers();
        if (!cancelled) {
          setUsers(liveRows);
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

  const columns: DataTableColumn<any>[] = [
    { id: "name", header: "User Name", render: (row) => <span className="font-semibold">{row.name}</span> },
    { id: "role", header: "Role", render: (row) => row.role },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "Active" ? "ok" : "warning"} /> },
    { id: "lastActive", header: "Last Active", render: (row) => row.lastActive },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">Edit Roles</Button>
          <Button variant="danger" size="sm">Suspend</Button>
          <Button variant="ghost" size="sm">View Activity</Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Platform Users & Admins"
        description="Platform team members, operational scope, and who is actively handling support and school workflows."
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Invite Platform User
          </Button>
        }
      />
      <DataTable
        title="Platform Operators"
        subtitle="Manage the internal team responsible for MyShule operations."
        columns={columns}
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading users..." : "No platform users found."}
      />
    </div>
  );
}
