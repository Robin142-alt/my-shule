/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { requestPlatformReport, fetchPlatformReports } from "@/lib/platform/school-onboarding-client";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

export function PlatformReportsWorkspace() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ reportName: '', format: 'pdf' });
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const liveRows = await fetchPlatformReports();
      setReports(liveRows);
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await requestPlatformReport({ ...formData });
      await loadData();
      setIsCreateOpen(false);
      setFormData({ reportName: '', format: 'pdf' });
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initLoad() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformReports();
        if (!cancelled) {
          setReports(liveRows);
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

  const columns: DataTableColumn<any>[] = [
    {
      id: "reportName",
      header: "Report Name",
      render: (row) => <span className="font-semibold">{row.reportName || "Unnamed Report"}</span>,
    },
    {
      id: "date",
      header: "Date Generated",
      render: (row) => row.date || row.created_at || "N/A",
    },
    {
      id: "status",
      header: "Status",
      render: (row) => {
        const status = row.status || "Pending";
        const tone = status === "Ready" || status === "Completed" || status === "Success" ? "ok" : "warning";
        return <StatusPill label={status} tone={tone} />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            Download
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
        title="Platform Reports" 
        description="Aggregate stats: active schools, MRR/billing, total students, SMS usage." 
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Generate Report
          </Button>
        } 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold">KSH 0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Total SMS Sent</div>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Active Tenants</div>
          <div className="mt-2 text-2xl font-bold">{reports.length > 0 ? "Active" : "0"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Total Users</div>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
      </div>
      
      <DataTable
        title="Generated Reports"
        subtitle="Download historical and scheduled platform metric reports."
        columns={columns}
        rows={reports}
        getRowKey={(row) => row.id || row.reportName}
        emptyMessage={isLoading ? "Loading reports..." : "No reports generated."}
      />
      <Modal open={isCreateOpen} title="Generate Platform Report" onClose={() => !isSaving && setIsCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Name</label>
            <input
              type="text"
              required
              value={formData.reportName}
              onChange={(e) => setFormData({ ...formData, reportName: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Monthly Active Users"
            />
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Format</span>
            <select required className="input-base w-full" value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value})} disabled={isSaving}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV Export</option>
              <option value="json">JSON API Payload</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Generating..." : "Request Report"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
