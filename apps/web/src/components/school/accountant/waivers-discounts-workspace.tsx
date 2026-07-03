"use client";

import { useEffect, useState } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { buildBillingApiPath, toMinorUnits } from "@/lib/billing/billing-utils";
import { StatusPill } from "@/components/ui/status-pill";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type SchoolRouteMode = "hosted" | "public";

export function WaiversDiscountsWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [waivers, setWaivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formDraft, setFormDraft] = useState({ studentId: "", amount: "", reason: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadWaivers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        buildBillingApiPath("/api/billing/waivers", tenantSlug),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Unable to load fee waivers for this school.");
      }

      const data = await response.json();
      setWaivers(Array.isArray(data) ? data : data?.items ?? data?.waivers ?? []);
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWaivers();
  }, [tenantSlug]);

  async function handleApplyWaiver(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formDraft.studentId || !formDraft.amount || !formDraft.reason) {
      setSubmitError("Please fill out all fields.");
      return;
    }
    const amountMinor = toMinorUnits(formDraft.amount);
    if (!amountMinor) {
      setSubmitError("Enter a valid waiver amount greater than zero.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    try {
      const response = await requestDashboardApi<{ message?: string; waiver?: any; request?: any }>("/finance/waivers", {
        method: "POST",
        body: {
          student_id: formDraft.studentId.trim(),
          student_name: formDraft.studentId.trim(),
          amount_minor: amountMinor,
          reason: formDraft.reason.trim(),
          source_dashboard: "accountant-waivers-discounts-workspace",
        },
      });

      setShowModal(false);
      setFormDraft({ studentId: "", amount: "", reason: "" });
      await loadWaivers();
      setNotice(response?.message ?? "Fee waiver request submitted.");
    } catch (e: any) {
      setSubmitError(e.message || "Failed to submit fee waiver request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Waivers & Discounts"
        description="Manage fee waivers, discounts, and bursary allocations."
        actions={
          <Button onClick={() => setShowModal(true)} disabled={loading}>
            Apply Waiver
          </Button>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        {notice ? (
          <div className="mb-4 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <DataTable
            rows={waivers}
            getRowKey={(row: any) => row.id || `${row.created_at}-${row.student_name}-${row.amount}`}
            columns={[
              { id: "created_at", header: "Date", render: (row: any) => row.created_at },
              { id: "student_name", header: "Student", render: (row: any) => row.student_name },
              { id: "amount", header: "Amount", render: (row: any) => row.amount },
              { id: "reason", header: "Reason", render: (row: any) => row.reason },
              {
                id: "status",
                header: "Status",
                render: (row: any) => <StatusPill tone={row.status === "approved" ? "ok" : "warning"} label={row.status} />,
              },
            ]}
            emptyMessage="No waivers or discounts found."
          />
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Apply Fee Waiver">
        <form onSubmit={handleApplyWaiver} className="space-y-4 py-4">
          {submitError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600">
              {submitError}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Student ID / Name</label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 p-2 text-sm"
              value={formDraft.studentId}
              onChange={(e) => setFormDraft({ ...formDraft, studentId: e.target.value })}
              placeholder="e.g. STU-123"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Amount (KES)</label>
            <input
              type="number"
              className="w-full rounded border border-slate-300 p-2 text-sm"
              value={formDraft.amount}
              onChange={(e) => setFormDraft({ ...formDraft, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Reason</label>
            <textarea
              className="w-full rounded border border-slate-300 p-2 text-sm"
              value={formDraft.reason}
              onChange={(e) => setFormDraft({ ...formDraft, reason: e.target.value })}
              placeholder="e.g. Merit scholarship"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Applying..." : "Apply Waiver"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
