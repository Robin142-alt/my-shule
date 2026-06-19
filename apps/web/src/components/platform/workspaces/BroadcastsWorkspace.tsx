/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { createPlatformBroadcast, deletePlatformBroadcast, fetchPlatformBroadcasts } from "@/lib/platform/school-onboarding-client";
import { Plus } from "lucide-react";

export function BroadcastsWorkspace() {
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ subject: '', target: 'all', message: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createPlatformBroadcast({ ...formData });
      const liveRows = await fetchPlatformBroadcasts();
      setBroadcasts(liveRows);
      setIsCreateOpen(false);
      setFormData({ subject: '', target: 'all', message: '' });
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRetract(id: string) {
    if (!window.confirm("Are you sure you want to retract this broadcast?")) return;
    try {
      await deletePlatformBroadcast(id);
      const liveRows = await fetchPlatformBroadcasts();
      setBroadcasts(liveRows);
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformBroadcasts();
        if (!cancelled) {
          setBroadcasts(liveRows);
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
    {
      id: "subject",
      header: "Broadcast Subject",
      render: (row) => <span className="font-semibold">{row.subject}</span>,
    },
    {
      id: "target",
      header: "Target",
      render: (row) => row.target,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.status === "Sent" ? "ok" : "warning"} />,
    },
    {
      id: "scheduledFor",
      header: "Scheduled For",
      render: (row) => row.scheduledFor,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            View
          </Button>
          <Button variant="secondary" size="sm">
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleRetract(row.id)}>
            Retract
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
        title="Platform Broadcasts" 
        description="Push system-wide notices to all schools (e.g., scheduled maintenance)." 
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Broadcast
          </Button>
        } 
      />
      
      <DataTable
        title="Announcements"
        subtitle="Manage alerts shown on the dashboards of all or specific schools."
        columns={columns}
        rows={broadcasts}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading broadcasts..." : "No broadcasts found."}
      />
      <Modal open={isCreateOpen} title="New Broadcast" onClose={() => !isSaving && setIsCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Subject</span>
            <input required className="input-base w-full" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} disabled={isSaving} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Target Audience</span>
            <select required className="input-base w-full" value={formData.target} onChange={(e) => setFormData({...formData, target: e.target.value})} disabled={isSaving}>
              <option value="all">All Schools</option>
              <option value="active">Active Schools</option>
              <option value="suspended">Suspended Schools</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Message Content</span>
            <textarea required rows={4} className="input-base w-full" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} disabled={isSaving} />
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send Broadcast"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
