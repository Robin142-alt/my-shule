"use client";

import { useEffect, useState } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { StudentFeeBalanceResponse } from "@/components/school/school-pages";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { buildBillingApiPath, formatActivityDate, formatMinorKes, toMinorUnits } from "@/lib/billing/billing-utils";
import { StatusPill } from "@/components/ui/status-pill";
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
};

export function WaiversDiscountsWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [waivers, setWaivers] = useState<WaiverRow[]>([]);
  const [students, setStudents] = useState<StudentFeeBalanceResponse[]>([]);
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
      const [waiverResponse, studentResponse] = await Promise.all([
        fetch(buildBillingApiPath("/api/finance/waivers", tenantSlug), { cache: "no-store" }),
        fetch(buildBillingApiPath("/api/billing/student-balances?limit=50", tenantSlug), { cache: "no-store" }),
      ]);

      if (!waiverResponse.ok) {
        throw new Error("Unable to load fee waivers for this school.");
      }

      const data = await waiverResponse.json();
      const studentData = studentResponse.ok ? await studentResponse.json() : [];
      setWaivers(Array.isArray(data) ? data : data?.items ?? data?.waivers ?? []);
      setStudents(Array.isArray(studentData) ? studentData : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "An error occurred");
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
      const selectedStudent = students.find((student) => student.student_id === formDraft.studentId);
      if (!selectedStudent) {
        setSubmitError("Select a learner from this school's live fee accounts.");
        return;
      }
      const response = await requestDashboardApi<{ message?: string; waiver?: any; request?: any }>("/finance/waivers", {
        method: "POST",
        body: {
          student_id: formDraft.studentId.trim(),
          student_name: selectedStudent.student_name || "Student",
          amount_minor: amountMinor,
          reason: formDraft.reason.trim(),
          source_dashboard: "accountant-waivers-discounts-workspace",
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
                    label={row.status.replaceAll("_", " ")}
                  />
                ),
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
            <label htmlFor="waiver-student" className="text-sm font-medium">Learner fee account</label>
            <select
              id="waiver-student"
              className="w-full rounded border border-slate-300 p-2 text-sm"
              value={formDraft.studentId}
              onChange={(e) => setFormDraft({ ...formDraft, studentId: e.target.value })}
            >
              <option value="">Select learner</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.student_name || "Unnamed student"} · Balance {formatMinorKes(student.balance_amount_minor)}
                </option>
              ))}
            </select>
            {students.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">No invoiced learner accounts are available. Generate student invoices before requesting a waiver.</p>
            ) : null}
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
            <Button type="submit" disabled={submitting || students.length === 0}>
              {submitting ? "Applying..." : "Apply Waiver"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
