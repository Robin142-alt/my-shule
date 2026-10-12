"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { usePermissions } from "@/components/providers/permission-context";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes, toMinorUnits } from "@/lib/billing/billing-utils";
import type { FeeStructureResponse } from "@/components/school/school-pages";

type RosterOption = { grade_level: string; class_name: string | null; student_count: number };
const emptyItem = () => ({ id: crypto.randomUUID(), label: "", amount: "" });

export function FeeStructureForm({ onClose, onSaved }: { onClose: () => void; onSaved: (row: FeeStructureResponse) => void }) {
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const options = useSchoolQuery<RosterOption[]>("/billing/fee-roster-options");
  const [grades, setGrades] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const rosterGrades = [...new Set((options.data ?? []).map(row => row.grade_level))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const total = items.reduce((sum, item) => sum + BigInt(toMinorUnits(item.amount) || "0"), BigInt(0));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !hasPermission("billing:write") || inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name || !grades.size) { setError("Enter a fee name and choose at least one grade or form."); return; }
    const lineItems = items.map((item, index) => ({ code: `charge_${index + 1}`, label: item.label.trim(), amount_minor: toMinorUnits(item.amount) }));
    if (lineItems.some(item => !item.label || !item.amount_minor)) { setError("Give every charge a name and a positive KES amount with up to two decimal places."); return; }
    inFlight.current = true; setBusy(true); setError("");
    try {
      const saved = await requestDashboardApi<FeeStructureResponse>("/billing/fee-structures", { tenantId, method: "POST", body: {
        name, academic_year: String(form.get("year")), term: String(form.get("term")), grade_level: [...grades][0], grade_levels: [...grades],
        status: "active", due_days: Number(form.get("due_days")), line_items: lineItems,
      } });
      onSaved(saved);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Fee structure could not be saved. Your entries are still here."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <Modal open size="lg" mobileFullScreen title="Create fee structure" description="Set the charges once. Choose classes or individual learners when issuing invoices."
    onClose={() => { if (!busy) onClose(); }} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" form="fee-structure-form" disabled={busy || !hasPermission("billing:write") || !grades.size || Boolean(options.error)}>{busy ? "Saving…" : "Save fee structure"}</Button></>}>
    <form id="fee-structure-form" onSubmit={save}><fieldset disabled={busy} className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error}</p>}
      <label className="block text-sm font-medium">Fee name<input required maxLength={160} name="name" className="input-base mt-1 w-full" placeholder="e.g. Term 3 day school fees" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm">Academic year<input required type="number" min="2000" max="2200" name="year" defaultValue={new Date().getFullYear()} className="input-base mt-1 w-full" /></label>
        <label className="block text-sm">Term<select required name="term" defaultValue={`Term ${Math.min(3, Math.floor(new Date().getMonth() / 4) + 1)}`} className="input-base mt-1 w-full">{[1, 2, 3].map(term => <option key={term}>Term {term}</option>)}</select></label></div>
      <fieldset><legend className="text-sm font-medium">Grades / forms</legend><p className="mt-1 text-xs text-muted">Choose one or more from your active school roster.</p>
        {options.isLoading && <p role="status" className="mt-3 text-sm">Loading school grades…</p>}
        {options.error && <p role="alert" className="mt-3 text-sm">{options.error.message} <Button type="button" variant="ghost" onClick={() => void options.refetch()}>Retry grades</Button></p>}
        {!options.isLoading && !options.error && !rosterGrades.length && <p className="mt-3 rounded-lg bg-surface-strong p-3 text-sm">No active learners have a current class. Ask Admissions to add or allocate learners, then refresh this list. <Button type="button" variant="ghost" onClick={() => void options.refetch()}>Refresh grades</Button></p>}
        {!!rosterGrades.length && <><input aria-label="Search grades or forms" type="search" className="input-base my-2 w-full" placeholder="Find a grade or form" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">{rosterGrades.filter(grade => grade.toLowerCase().includes(search.toLowerCase())).map(grade => <label key={grade} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={grades.has(grade)} onChange={() => setGrades(current => { const next = new Set(current); if (next.has(grade)) next.delete(grade); else next.add(grade); return next; })} /><span>{grade}<span className="ml-2 text-muted">({options.data!.filter(row => row.grade_level === grade).reduce((sum, row) => sum + row.student_count, 0)} learners)</span></span></label>)}</div><p className="mt-2 text-xs text-muted">{grades.size} grades / forms selected</p></>}
      </fieldset>
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Charges per learner</legend>{items.map((item, index) => <div key={item.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_auto]">
        <label className="text-sm">Charge {index + 1}<input required maxLength={120} className="input-base mt-1 w-full" value={item.label} placeholder="e.g. Tuition" onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, label: event.target.value } : row))} /></label>
        <label className="text-sm">Amount (KES)<input required inputMode="decimal" className="input-base mt-1 w-full" value={item.amount} placeholder="0.00" onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, amount: event.target.value } : row))} /></label>
        <Button type="button" variant="ghost" className="self-end" aria-label={`Remove charge ${index + 1}`} disabled={items.length === 1} onClick={() => setItems(current => current.filter(row => row.id !== item.id))}>Remove</Button>
      </div>)}<div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="secondary" disabled={items.length >= 40} onClick={() => setItems(current => [...current, emptyItem()])}>Add charge</Button><p className="text-sm">Per learner <strong>{formatMinorKes(total.toString())}</strong></p></div></fieldset>
      <label className="block text-sm">Days allowed to pay<input name="due_days" type="number" min="0" max="365" required defaultValue="14" className="input-base mt-1 w-full" /><span className="mt-1 block text-xs text-muted">You can choose a specific due date when issuing invoices.</span></label>
    </fieldset></form>
  </Modal>;
}
