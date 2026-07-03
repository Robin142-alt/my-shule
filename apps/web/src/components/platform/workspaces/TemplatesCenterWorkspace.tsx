/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { createPlatformTemplate, fetchPlatformTemplates, deletePlatformTemplate } from "@/lib/platform/school-onboarding-client";
import { Blocks, Plus, Trash2 } from "lucide-react";

export function TemplatesCenterWorkspace() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'pdf', htmlContent: '', cssContent: '' });

  async function loadData() {
    setIsLoading(true);
    try {
      const liveRows = await fetchPlatformTemplates();
      setTemplates(liveRows);
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createPlatformTemplate({ ...formData });
      await loadData();
      setIsCreateOpen(false);
      setFormData({ name: '', type: 'pdf', htmlContent: '', cssContent: '' });
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await deletePlatformTemplate(id);
      await loadData();
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initLoad() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformTemplates();
        if (!cancelled) setTemplates(liveRows);
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void initLoad();
    return () => { cancelled = true; };
  }, [router]);

  const columns: DataTableColumn<any>[] = [
    { id: "name", header: "Template Name", render: (row) => <span className="font-semibold">{row.name}</span> },
    { id: "type", header: "Type", render: (row) => row.type },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status || "Active"} tone={(row.status === "Active" || row.status === "active") ? "ok" : "warning"} /> },
    { id: "assigned", header: "Assigned Schools", render: (row) => row.assignedCount || 0 },
    {
      id: "actions", header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm"><Blocks className="h-4 w-4 mr-2" /> Edit HTML/CSS</Button>
          <Button variant="ghost" size="sm">Duplicate</Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Templates Center" 
        description="Manage platform-wide PDF templates (Report Cards, Receipts, Invoices, Certificates)." 
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create New Template
          </Button>
        } 
      />
      <DataTable
        title="Platform Templates"
        subtitle="HTML/CSS templates available to schools for PDF generation."
        columns={columns}
        rows={templates}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading templates..." : "No templates configured."}
      />
      <Modal open={isCreateOpen} title="Create Template" onClose={() => !isSaving && setIsCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Template Name</span>
            <input required className="input-base w-full" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isSaving} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Template Type</span>
            <select required className="input-base w-full" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} disabled={isSaving}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="pdf">PDF Document</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">HTML Content</span>
            <textarea className="input-base w-full font-mono text-xs" rows={4} value={formData.htmlContent} onChange={(e) => setFormData({...formData, htmlContent: e.target.value})} disabled={isSaving} placeholder="<html>...</html>" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">CSS Content</span>
            <textarea className="input-base w-full font-mono text-xs" rows={3} value={formData.cssContent} onChange={(e) => setFormData({...formData, cssContent: e.target.value})} disabled={isSaving} placeholder="body { ... }" />
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Create Template"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
