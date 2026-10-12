"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes } from "@/lib/billing/billing-utils";
import type { FeeStructureResponse, BillableFeeStudentResponse, BulkFeeInvoiceGenerationResponse } from "@/components/school/school-pages";

type Audience = "grade" | "classes" | "learners";
const classKey = (row: BillableFeeStudentResponse) => JSON.stringify([row.grade_level, row.class_name]);

/** One governed billing flow shared by fee setup and the invoice register. */
export function BulkFeeBillingDialog({ initialStructureId = "", onClose, onComplete }: {
  initialStructureId?: string;
  onClose: () => void;
  onComplete: (result: BulkFeeInvoiceGenerationResponse) => void;
}) {
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const client = useQueryClient();
  const structures = useSchoolQuery<FeeStructureResponse[]>("/billing/fee-structures");
  const [structureId, setStructureId] = useState(initialStructureId);
  const structure = structures.data?.find(row => row.id === structureId && row.status === "active");
  const roster = useSchoolQuery<BillableFeeStudentResponse[]>(structureId ? `/billing/fee-structures/${encodeURIComponent(structureId)}/billable-students` : null);
  const [audience, setAudience] = useState<Audience>("grade");
  const [grade, setGrade] = useState("");
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [learners, setLearners] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [due, setDue] = useState("");
  const [review, setReview] = useState<{ structure: FeeStructureResponse; students: BillableFeeStudentResponse[]; due: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const [attempt, setAttempt] = useState<{ path: string; body: Record<string, unknown> } | null>(null);
  const rows = roster.data ?? [];
  const grades = [...new Set(rows.map(row => row.grade_level))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const groups = [...new Map(rows.map(row => [classKey(row), row])).entries()];
  const selected = rows.filter(row => audience === "grade" ? !grade || row.grade_level === grade : audience === "classes" ? classes.has(classKey(row)) : learners.has(row.student_id));
  const matching = rows.filter(row => `${row.student_name} ${row.admission_number} ${row.grade_level} ${row.class_name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const total = structure ? formatMinorKes((BigInt(structure.total_amount_minor) * BigInt(selected.length)).toString()) : "";
  const ready = Boolean(tenantId && hasPermission("billing:write") && structure && !structures.error && !roster.error && !roster.isFetching && selected.length > 0 && selected.length <= 1000);

  function toggle(current: Set<string>, key: string) {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }
  async function issue() {
    if (!tenantId || !hasPermission("billing:write") || inFlight.current || !review || (!attempt && !ready)) return;
    const submission = attempt ?? {
      path: `/billing/fee-structures/${encodeURIComponent(review!.structure.id)}/generate-invoices`,
      body: {
        idempotency_key: `fee-billing-${crypto.randomUUID()}`,
        ...(review!.due ? { due_at: new Date(`${review!.due}T23:59:59+03:00`).toISOString() } : {}),
        target_students: review!.students.map(row => ({ student_id: row.student_id, student_name: row.student_name })),
      },
    };
    inFlight.current = true; setAttempt(submission); setBusy(true); setError("");
    try {
      const result = await requestDashboardApi<BulkFeeInvoiceGenerationResponse>(submission.path, { tenantId, method: "POST", body: submission.body });
      await client.invalidateQueries({ queryKey: ["school", tenantId] });
      onComplete(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invoices could not be confirmed. Retry the same submission.");
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <Modal open size="lg" mobileFullScreen title={review ? "Review invoices" : "Bill learners"} description="Choose a fee plan and who should receive it. Existing invoices for this plan are skipped automatically."
    onClose={() => { if (!busy) onClose(); }} footer={<>
      <Button variant="secondary" disabled={busy} onClick={onClose}>Close</Button>
      {review && !attempt && <Button variant="secondary" disabled={busy} onClick={() => setReview(null)}>Change selection</Button>}
      {review ? <Button disabled={busy || (!attempt && !ready)} onClick={() => void issue()}>{busy ? "Issuing invoices…" : attempt ? "Retry issuing invoices" : `Issue ${review.students.length} invoices`}</Button>
        : <Button disabled={!ready} onClick={() => { if (structure) setReview({ structure, students: [...selected], due }); }}>Review {selected.length} invoices</Button>}
    </>}>
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm"><p>{error}</p><p className="mt-2">Retry keeps the same learners, amounts and reference. If you close this window, check the invoice register before billing again.</p></div>}
      {!hasPermission("billing:write") && <p role="alert">You can view fee plans, but do not have permission to issue invoices.</p>}
      {review ? <>
        <div className="rounded-xl border border-border bg-surface-strong p-4">
          <h3 className="font-semibold">{review.structure.name}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt>Learners selected</dt><dd className="font-semibold">{review.students.length}</dd></div>
            <div className="flex justify-between gap-4"><dt>Per learner</dt><dd>{formatMinorKes(review.structure.total_amount_minor)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Maximum to issue</dt><dd className="font-semibold">{formatMinorKes((BigInt(review.structure.total_amount_minor) * BigInt(review.students.length)).toString())}</dd></div>
            <div className="flex justify-between gap-4"><dt>Due date</dt><dd>{review.due || `${review.structure.due_days} days after issuing`}</dd></div>
          </dl>
        </div>
        <p className="text-sm text-muted">Each new invoice updates the learner’s statement and balance. Learners already billed for this fee plan are skipped, so the final total may be lower.</p>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">View selected learners ({review.students.length})</summary><ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">{review.students.map(row => <li key={row.student_id}>{row.student_name} · {row.admission_number} · {row.grade_level} {row.class_name}</li>)}</ul></details>
      </> : <>
        <label className="block text-sm font-medium">Fee structure<select className="input-base mt-1 w-full" value={structureId} onChange={event => {
          setStructureId(event.target.value); setClasses(new Set()); setLearners(new Set()); setGrade(""); setSearch(""); setError("");
        }}><option value="">Choose a fee structure</option>{structures.data?.filter(row => row.status === "active").map(row => <option key={row.id} value={row.id}>{row.name} · {formatMinorKes(row.total_amount_minor)}</option>)}</select></label>
        {structures.isLoading && <p role="status">Loading fee structures…</p>}
        {structures.error && <p role="alert">{structures.error.message} <Button variant="ghost" onClick={() => void structures.refetch()}>Retry fee structures</Button></p>}
        {!structures.isLoading && !structures.error && !structures.data?.some(row => row.status === "active") && <p className="text-sm">Create an active fee structure in Fee structures, then return here to bill learners.</p>}
        {structureId && <>
          {roster.isLoading && <p role="status">Loading eligible school learners…</p>}
          {roster.error && <p role="alert">{roster.error.message} <Button variant="ghost" onClick={() => void roster.refetch()}>Retry roster</Button></p>}
          {!roster.isLoading && !roster.error && !rows.length && <p className="rounded-lg bg-surface-strong p-3 text-sm">No active learners match this fee plan. Check their current grade and class with Admissions, or choose another plan.</p>}
          {rows.length > 0 && !roster.error && <>
            <fieldset><legend className="mb-2 text-sm font-medium">Who should receive these fees?</legend><div className="grid gap-2 sm:grid-cols-3">{([
              ["grade", "Whole grade / form"], ["classes", "Selected classes / streams"], ["learners", "Individual learners"],
            ] as const).map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${audience === value ? "border-primary bg-primary-soft" : "border-border"}`}><input type="radio" name="billing-audience" value={value} checked={audience === value} onChange={() => setAudience(value)} />{label}</label>)}</div></fieldset>
            {audience === "grade" && <label className="block text-sm">Grade / form<select className="input-base mt-1 w-full" value={grade} onChange={event => setGrade(event.target.value)}><option value="">All grades in this fee plan ({rows.length} learners)</option>{grades.map(value => <option key={value} value={value}>{value} ({rows.filter(row => row.grade_level === value).length} learners)</option>)}</select></label>}
            {audience === "classes" && <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-2 text-sm">Select one or more classes</legend>{groups.map(([key, row]) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={classes.has(key)} onChange={() => setClasses(current => toggle(current, key))} />{row.grade_level} · {row.class_name || "No stream"} ({rows.filter(student => classKey(student) === key).length})</label>)}</fieldset>}
            {audience === "learners" && <div className="space-y-2"><label className="block text-sm">Search learners<input type="search" className="input-base mt-1 w-full" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, admission number or class" /></label>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{learners.size} selected across all results</span><Button variant="ghost" onClick={() => setLearners(new Set())}>Clear selection</Button></div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">{matching.slice(0, 100).map(row => <label key={row.student_id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border p-3 text-sm last:border-0"><input type="checkbox" aria-label={`Select ${row.student_name} (${row.admission_number})`} checked={learners.has(row.student_id)} onChange={() => setLearners(current => toggle(current, row.student_id))} /><span>{row.student_name} · {row.admission_number}<span className="block text-xs text-muted">{row.grade_level} {row.class_name}</span></span></label>)}{!matching.length && <p className="p-3 text-sm">No matching learners. Try a name or admission number.</p>}</div>
              {matching.length > 100 && <p className="text-xs text-muted">Showing 100 matches. Refine your search to find another learner.</p>}
            </div>}
            <div className="rounded-lg bg-primary-soft p-3 text-sm" role="status"><strong>{selected.length} learners</strong> · Maximum {total}</div>
            {selected.length > 1000 && <p role="alert" className="text-sm">Issue up to 1,000 invoices at a time. Choose fewer grades, classes or learners.</p>}
          </>}
          <label className="block text-sm">Due date (optional)<input type="date" className="input-base mt-1 w-full" value={due} onChange={event => setDue(event.target.value)} /><span className="mt-1 block text-xs text-muted">Leave blank to use the fee plan’s {structure?.due_days ?? 14}-day payment period.</span></label>
        </>}
      </>}
    </div>
  </Modal>;
}
