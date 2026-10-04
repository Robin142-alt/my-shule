"use client";
import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes } from "@/lib/billing/billing-utils";

type Reversal = { id: string; receipt_number: string; amount_minor: string; reason: string };
export function ManualReversalQueue({ review = false }: { review?: boolean }) {
  const tenantId = useOptionalSchoolTenantId();
  const client = useQueryClient();
  const { hasPermission } = usePermissions();
  const query = useSchoolQuery<Reversal[]>("/billing/manual-fee-reversal-requests", { refetchInterval: 30_000 });
  const [decision, setDecision] = useState<{ row: Reversal; action: "approve" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !decision || inFlight.current) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await requestDashboardApi<{ message: string }>(`/billing/manual-fee-reversal-requests/${decision.row.id}/decision`, { tenantId, method: "POST", body: { decision: decision.action, reason } });
      setNotice(result.message); setDecision(null); await client.invalidateQueries({ queryKey: ["school", tenantId] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Reversal decision failed. Retry."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="space-y-3">
    {notice && <p role="status">{notice}</p>}
    {query.error && <p role="alert">{query.error.message} <Button variant="secondary" onClick={() => void query.refetch()}>Retry reversal queue</Button></p>}
    <DataTable title="Receipt reversals awaiting approval" subtitle="A different Principal must approve before a cleared receipt and its fee allocations are reversed." rows={Array.isArray(query.data) ? query.data : []} getRowKey={row => row.id}
      emptyMessage={query.isLoading ? "Loading reversals…" : query.error ? "The queue is unavailable. Retry above." : "No receipt reversals awaiting approval."} columns={[
        { id: "receipt", header: "Receipt", render: row => row.receipt_number }, { id: "amount", header: "Amount", render: row => formatMinorKes(row.amount_minor) },
        { id: "reason", header: "Reason", render: row => row.reason },
        { id: "action", header: "Next step", render: row => review && hasPermission("principal:write") ? <div className="flex flex-wrap gap-2">{(["approve", "reject"] as const).map(action => <Button size="sm" key={action} variant="secondary" onClick={() => { setError(""); setDecision({ row, action }); }}>{action === "approve" ? "Approve reversal" : "Reject"}</Button>)}</div> : "Awaiting Principal decision" },
      ]} />
    <Modal open={Boolean(decision)} title={`${decision?.action === "approve" ? "Approve reversal" : "Reject reversal"} · ${decision?.row.receipt_number || ""}`} onClose={() => { if (!busy) setDecision(null); }}>
      <form onSubmit={save} className="space-y-4"><p>{decision?.action === "approve" ? "This restores the learner’s invoice balance and records reversing ledger entries. It does not issue a cash refund." : "The cleared receipt will remain unchanged."}</p>
        {error && <p role="alert">{error}</p>}<label className="block">Decision notes<textarea required minLength={5} maxLength={512} name="reason" className="input-base mt-1 w-full" /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Confirm decision"}</Button></div>
      </form>
    </Modal>
  </section>;
}
