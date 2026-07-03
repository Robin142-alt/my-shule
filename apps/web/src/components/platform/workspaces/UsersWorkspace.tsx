/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { fetchPlatformUsers, updatePlatformUserStatus } from "@/lib/platform/school-onboarding-client";
import { RefreshCw } from "lucide-react";

export function UsersWorkspace() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"roles" | "activity" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadData = useCallback(async (options: { cancelled?: () => boolean } = {}) => {
    setIsLoading(true);
    try {
      const liveRows = await fetchPlatformUsers();
      if (!options.cancelled?.()) {
        setUsers(liveRows);
      }
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }
    } finally {
      if (!options.cancelled?.()) {
        setIsLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      void loadData({ cancelled: () => cancelled });
    });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  function openUserModal(row: any, mode: "roles" | "activity") {
    setSelectedUser(row);
    setModalMode(mode);
  }

  async function setUserStatus(row: any, status: "active" | "disabled") {
    setBusyUserId(row.id);
    setStatusMessage(null);
    try {
      const updated = await updatePlatformUserStatus(row.id, status);
      setUsers((current) => current.map((user) => user.id === row.id ? { ...user, ...updated } : user));
      setStatusMessage(`${row.name || row.email} is now ${status === "active" ? "active" : "disabled"}.`);
    } catch (error) {
      if (!redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to update platform user status.");
      }
    } finally {
      setBusyUserId(null);
    }
  }

  const columns: DataTableColumn<any>[] = [
    { id: "name", header: "User Name", render: (row) => <span className="font-semibold">{row.name || "N/A"}</span> },
    { id: "role", header: "Role", render: (row) => row.role || "N/A" },
    {
      id: "status",
      header: "Status",
      render: (row) => {
        const status = row.status || "Active";
        const tone = (status === "Active" || status === "active") ? "ok" : "warning";
        return <StatusPill label={status} tone={tone} />;
      }
    },
    { id: "lastActive", header: "Last Active", render: (row) => row.lastActive || row.last_active || "N/A" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => openUserModal(row, "roles")}>View Roles</Button>
          <Button variant={String(row.status).toLowerCase() === "disabled" ? "secondary" : "danger"} size="sm" onClick={() => void setUserStatus(row, String(row.status).toLowerCase() === "disabled" ? "active" : "disabled")} disabled={busyUserId === row.id}>
            {busyUserId === row.id ? "Saving..." : String(row.status).toLowerCase() === "disabled" ? "Reactivate" : "Suspend"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openUserModal(row, "activity")}>View Activity</Button>
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
          <Button onClick={() => void loadData()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh Users
          </Button>
        }
      />
      {statusMessage ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          {statusMessage}
        </div>
      ) : null}
      <DataTable
        title="Platform Operators"
        subtitle="Manage the internal team responsible for MyShule operations."
        columns={columns}
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading users..." : "No platform users found."}
      />
      <Modal open={!!selectedUser && !!modalMode} title={modalMode === "roles" ? "Platform User Roles" : "Platform User Activity"} onClose={() => { setSelectedUser(null); setModalMode(null); }}>
        {selectedUser ? (
          <div className="space-y-3 text-sm">
            <div><span className="font-semibold">Name:</span> {selectedUser.name || "N/A"}</div>
            <div><span className="font-semibold">Email:</span> {selectedUser.email || "N/A"}</div>
            {modalMode === "roles" ? (
              <div className="rounded-md border p-3">
                <div className="font-semibold">Current role</div>
                <div className="mt-1 text-muted-foreground">{selectedUser.role || "No role recorded"}</div>
                <div className="mt-3 text-xs text-muted-foreground">Role changes are tenant-scoped and must be made from the relevant tenant staff/user management workspace.</div>
              </div>
            ) : (
              <div className="rounded-md border p-3">
                <div className="font-semibold">Last activity</div>
                <div className="mt-1 text-muted-foreground">{selectedUser.lastActive || selectedUser.last_active || "Never"}</div>
                <div className="mt-3 text-xs text-muted-foreground">Detailed audit events remain available in the platform audit logs workspace.</div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
