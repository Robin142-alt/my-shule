"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { buildBillingApiPath, formatActivityDate, formatMinorKes, toMinorUnits, unwrapBillingApiData } from "@/lib/billing/billing-utils";
import { StatusPill } from "@/components/ui/status-pill";
import { LearnerPicker } from "@/components/common/learner-picker";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { usePermissions } from "@/components/providers/permission-context";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type SchoolRouteMode = "hosted" | "public";

type WaiverRow = {
  id: string;
  waiver_number: string;
  student_id: string;
  student_name: string;
  class_name: string | null;
  amount_minor: string;
  reason: string;
  status: string;
  created_at: string;
  requires_administrator_review?: boolean;
};

export function WaiversDiscountsWorkspace({
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [waivers, setWaivers] = useState<WaiverRow[]>([]);
  const [learner, setLearner] = useState<LearnerLookupItem | null>(null);
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const submissionKey = useRef("");

  const [showModal, setShowModal] = useState(false);
  const [formDraft, setFormDraft] = useState({ studentId: "", amount: "", reason: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadWaivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const waiverResponse = await fetch(buildBillingApiPath("/api/finance/waivers", tenantSlug), { cache: "no-store", signal: AbortSignal.timeout(15_000) });

      if (!waiverResponse.ok) {
        throw new Error("Unable to load fee waivers for this school.");
      }

      const data = unwrapBillingApiData<WaiverRow[] | { items?: WaiverRow[]; waivers?: WaiverRow[] }>(await waiverResponse.json());
      const rows = Array.isArray(data) ? data : data?.items ?? data?.waivers;
      if (!Array.isArray(rows)) throw new Error("The waiver register could not be read. Please retry.");
      setWaivers(rows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadWaivers();
  }, [loadWaivers]);

  async function handleApplyWaiver(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !tenantId || !hasPermission("finance:write")) return;
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
      const selectedStudent = learner;
      if (!selectedStudent) {
        setSubmitError("Select a learner from this school's live fee accounts.");
        return;
      }
      const response = await requestDashboardApi<{ message?: string }>("/finance/waivers", {
        tenantId, method: "POST",
        body: {
          idempotency_key: submissionKey.current,
          student_id: formDraft.studentId.trim(),
          student_name: selectedStudent.name,
          amount_minor: amountMinor,
          reason: formDraft.reason.trim(),
        },
      });

      setShowModal(false);
      setFormDraft({ studentId: "", amount: "", reason: "" });
      await loadWaivers();
      setNotice(response?.message ?? "Fee waiver request submitted.");
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Failed to submit fee waiver request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Waivers & Discounts"
        description="Request fee reductions and follow their review. An approval request does not change a learner’s balance."
        actions={
          <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={loading} onClick={() => void loadWaivers()}>Refresh</Button><Button onClick={() => { submissionKey.current = `waiver-${crypto.randomUUID()}`; setSubmitError(null); setLearner(null); setFormDraft({ studentId: "", amount: "", reason: "" }); setShowModal(true); }} disabled={loading || !hasPermission("finance:write")}>
            Request fee waiver
          </Button></div>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        {waivers.some(row => row.requires_administrator_review) && <p role="status" className="mb-4 rounded-lg bg-warning-soft p-3 text-sm">Older waiver requests need administrator review to link them to current invoices. They remain visible below. New requests go to the Principal’s approval inbox.</p>}
        {notice ? (
          <div role="status" className="mb-4 rounded-md bg-success-soft p-4 text-sm text-success">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="rounded-md bg-danger-soft p-4 text-sm text-danger">
            {error} <Button variant="secondary" onClick={() => void loadWaivers()}>Retry waivers</Button>
          </div>
        ) : (
          <><label className="mb-4 block text-sm">Search recent waivers<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Learner, reason or status" className="input-base mt-1 w-full" /></label><DataTable
            rows={waivers.filter(row => `${row.student_name} ${row.reason} ${row.status}`.toLowerCase().includes(search.toLowerCase()))}
            getRowKey={(row: WaiverRow) => row.id}
            columns={[
              { id: "created_at", header: "Date", render: (row: WaiverRow) => formatActivityDate(row.created_at) },
              { id: "student_name", header: "Student", render: (row: WaiverRow) => row.student_name },
              { id: "amount", header: "Amount", render: (row: WaiverRow) => formatMinorKes(row.amount_minor) },
              { id: "reason", header: "Reason", render: (row: WaiverRow) => row.reason },
              {
                id: "status",
                header: "Status",
                render: (row: WaiverRow) => (
                  <StatusPill
                    tone={row.status === "approved" ? "ok" : row.status === "rejected" ? "critical" : "warning"}
                    label={row.requires_administrator_review ? "Administrator review" : row.status.replaceAll("_", " ")}
                  />
                ),
              },
            ]}
            emptyMessage={loading ? "Loading fee waivers…" : "No matching waiver requests. Request a fee waiver above or change your search."}
          /><p className="mt-3 text-xs text-muted">Showing the latest 100 waiver records.</p></>
        )}
      </div>

      <Modal open={showModal} onClose={() => { if (!submitting) setShowModal(false); }} title="Request fee waiver">
        <form onSubmit={handleApplyWaiver} className="space-y-4 py-4">
          {submitError && (
            <div role="alert" className="rounded bg-danger-soft p-3 text-sm text-danger">
              {submitError}
            </div>
          )}
          
          <LearnerPicker label="Learner name or admission number" tenantSlug={tenantSlug || ""} value={learner} onChange={value => { setLearner(value); setFormDraft(current => ({ ...current, studentId: value?.id || "" })); }} />
          <p className="text-sm text-muted">The Principal reviews the request against this learner’s outstanding fee balance.</p>
          <div className="space-y-1">
            <label htmlFor="waiver-amount" className="text-sm font-medium">Amount (KES)</label>
            <input
              id="waiver-amount" required inputMode="decimal"
              className="w-full rounded border border-slate-300 p-2 text-sm"
              value={formDraft.amount}
              onChange={(e) => setFormDraft({ ...formDraft, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="waiver-reason" className="text-sm font-medium">Reason</label>
            <textarea
              id="waiver-reason" required minLength={5} maxLength={500}
              className="w-full rounded border border-slate-300 p-2 text-sm"
              value={formDraft.reason}
              onChange={(e) => setFormDraft({ ...formDraft, reason: e.target.value })}
              placeholder="e.g. Merit scholarship"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !learner}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
