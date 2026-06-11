"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, FileText, CheckCircle2, Plus, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type PrincipalWorkspaceData = {
  status: "active" | "degraded" | "setup_required";
  collectionsToday: string;
  outstandingInvoices: string;
  collectionData: Array<{ label: string; value: number; amount: string }>;
  pendingWaivers: Array<{ id: string; student: string; class: string; amount: string; reason: string; date: string }>;
};

export function PrincipalFinanceOverviewWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalWorkspaceData>('/admin-command/principal/finance-overview');
  const { data: feeCategoriesData } = useSchoolQuery<any[]>('/finance/fee-categories');

  const [isFeeCategoryModalOpen, setIsFeeCategoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreateFeeCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/finance/fee-categories', {
        method: "POST",
        body: {
          name: formData.get("name"),
          description: formData.get("description"),
        }
      });
      setIsFeeCategoryModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to create fee category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveFeeCategory = async (id: string) => {
    if (!confirm("Are you sure you want to archive this fee category?")) return;
    try {
      await requestDashboardApi(`/finance/fee-categories/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive fee category");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Finance Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Summary Cards */}
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Status</div>
          <div className="mt-2 text-2xl font-black text-white capitalize">{data.status}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Collections Today</div>
          <div className="mt-2 text-2xl font-black text-white">{data.collectionsToday}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Outstanding Invoices</div>
          <div className="mt-2 text-2xl font-black text-white">{data.outstandingInvoices}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Waivers</div>
          <div className="mt-2 text-2xl font-black text-white">{data.pendingWaivers?.length || 0}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Collection Trend</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.collectionData?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-blue-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-blue-400/60"
                    style={{ height: `${item.value}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.amount}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-4">Pending Waivers</h2>
          {(!data.pendingWaivers || data.pendingWaivers.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No pending waivers</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.pendingWaivers.map((waiver) => (
                <div key={waiver.id} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{waiver.student}</h4>
                      <p className="text-sm text-white/60">{waiver.class} • {waiver.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{waiver.amount}</div>
                      <div className="text-xs text-white/40">{waiver.date}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded hover:bg-green-500/30 transition-colors">Approve</button>
                    <button className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Fee Categories</h2>
            <Button size="sm" variant="outline" onClick={() => setIsFeeCategoryModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </div>
          {!feeCategoriesData || feeCategoriesData.length === 0 ? (
            <div className="text-white/60 text-sm py-4 text-center">No fee categories configured yet.</div>
          ) : (
            <div className="space-y-2">
              {feeCategoriesData.map((category: any) => (
                <div key={category.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">{category.name}</div>
                    <div className="text-xs text-white/50">{category.description || 'No description'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveFeeCategory(category.id)}>
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isFeeCategoryModalOpen} onClose={() => setIsFeeCategoryModalOpen(false)} title="Create Fee Category">
        <form onSubmit={handleCreateFeeCategory} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Tuition Fee" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea name="description" className="w-full border rounded p-2 text-sm" placeholder="Optional details..." />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
