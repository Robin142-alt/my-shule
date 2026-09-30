"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LearnerPicker } from "@/components/common/learner-picker";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import type { CollectionChannelRevision } from "@/lib/finance/payment-channels-client";

interface Collection {
  id: string;
  provider_transaction_id: string;
  account_reference: string;
  amount_minor: string;
  status: string;
  channel_name: string | null;
  receipt_number: string | null;
  evidence_reference: string | null;
  occurred_at: string;
  source: string;
}
interface Reversal {
  id: string;
  provider_transaction_id: string;
  amount_minor: string;
  status: string;
  reason: string;
}
interface IngressPayment {
  id:string;provider_transaction_id:string;provider_code:string;environment:string;amount_minor:string;
  account_reference:string;state:string;review_reason:string|null;student_id:string|null;has_conflict:boolean;
}
type Action =
  | { kind: "statement" }
  | { kind: "match" | "decision" | "reversal"; payment: Collection }
  | { kind: "reversal-decision"; reversal: Reversal };

function money(value: string) {
  const amount = BigInt(value);
  return `KES ${(amount / BigInt(100)).toLocaleString()}.${(amount % BigInt(100)).toString().padStart(2, "0")}`;
}

export function CollectionsWorkspace({
  mode = "manage",
  tenantSlug,
}: {
  mode?: "manage" | "review";
  tenantSlug?: string | null;
}) {
  const tenantId = useOptionalSchoolTenantId();
  const [offset, setOffset] = useState(0);
  const payments = useSchoolQuery<Collection[]>(
    `/payments/collections?limit=50&offset=${offset}`,
  );
  const reversals = useSchoolQuery<Reversal[]>(
    "/payments/collections/reversals",
  );
  const channels = useSchoolQuery<CollectionChannelRevision[]>(
    "/tenant-finance/collection-channels?status=active&limit=100",
  );
  const inbox = useSchoolQuery<IngressPayment[]>('/payments/ingress');
  const [action, setAction] = useState<Action | null>(null);
  const [learner, setLearner] = useState<LearnerLookupItem | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const destinations = (channels.data ?? []).filter((row) =>
    row.environment === 'production' && ["active", "suspended", "superseded"].includes(row.status),
  );

  function open(next: Action) {
    setAction(next);
    setReason("");
    setConfirmed(false);
    setLearner(null);
    setError("");
    setNotice("");
  }
  function close() {
    if (!busy) {
      setAction(null);
      setError("");
    }
  }
  async function mutate(
    path: string,
    body: Record<string, unknown>,
    message: string,
  ) {
    if (!tenantId || busy) return;
    setBusy(true);
    setError("");
    try {
      await requestDashboardApi(`/payments/collections/${path}`, {
        tenantId,
        method: "POST",
        body,
      });
      setAction(null);
      setNotice(message);
      await Promise.all([payments.refetch(), reversals.refetch()]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The payment action could not be saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  function statement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = String(data.get("amount") ?? "");
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount)) {
      setError("Enter a positive KES amount with at most two decimal places.");
      return;
    }
    const [major, fraction = ""] = amount.split(".");
    const minor = BigInt(major) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
    if (minor <= BigInt(0)) {
      setError("The payment amount must be positive.");
      return;
    }
    void mutate(
      "statement",
      {
        revision_id: data.get("revision_id"),
        provider_transaction_id: data.get("transaction_id"),
        amount_minor: minor.toString(),
        account_reference: data.get("reference"),
        occurred_at: new Date(String(data.get("occurred_at"))).toISOString(),
        evidence_reference: data.get("evidence"),
      },
      "Statement entry sent to the Principal. The balance changes only after confirmation.",
    );
  }
  function decision(choice: "approve" | "reject") {
    if (!action) return;
    const path =
      action.kind === "decision"
        ? `${action.payment.id}/decision`
        : action.kind === "reversal-decision"
          ? `reversals/${action.reversal.id}/decision`
          : null;
    if (path)
      void mutate(
        path,
        { decision: choice, reason },
        choice === "reject"
          ? "Request rejected and retained in the audit history."
          : "Decision saved. Posted balances and receipts now reflect the approved action.",
      );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">School collections</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Confirmed provider payments and school bank statements share one
            history. Unmatched payments wait here until the correct learner is
            identified.
          </p>
        </div>
        {mode === "manage" && (
          <Button onClick={() => open({ kind: "statement" })}>
            Record statement entry
          </Button>
        )}
      </div>
      <section className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Provider verification inbox</h3>
          <Button variant="secondary" disabled={inbox.isLoading || busy} onClick={()=>void inbox.refetch()}>Refresh verification</Button></div>
        <p className="text-sm text-muted">Only verified production collections affect fees. Sandbox entries show matching results only. Never credit a review item from a callback alone; verify independent provider evidence before using the statement approval workflow.</p>
        {inbox.error && <p role="alert">{inbox.error.message}</p>}
        {inbox.isLoading ? <p role="status">Loading verification…</p> : !inbox.data?.length ? <p>No provider callbacks received yet.</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Provider / receipt','Reference / amount','Verification','Action'].map(t=><th className="p-2" key={t}>{t}</th>)}</tr></thead>
            <tbody>{inbox.data.map(row=><tr key={row.id} className="border-t border-border">
              <td className="p-2">{row.provider_code} · {row.environment}<span className="block font-mono">{row.provider_transaction_id}</span></td>
              <td className="p-2">{row.account_reference || 'No reference'}<span className="block">{money(row.amount_minor)}</span></td>
              <td className="p-2">{row.state.replaceAll('_',' ')}{row.student_id && <span className="block">Matched student: {row.student_id}</span>}{row.review_reason && <span className="block text-muted">{row.review_reason}</span>}</td>
              <td className="p-2">{row.state==='review' && !row.has_conflict ? <Button disabled={busy} variant="secondary" onClick={async()=>{
                if(!tenantId)return;setBusy(true);setError('');try{await requestDashboardApi(`/payments/ingress/${row.id}/retry`,{tenantId,method:'POST'});await inbox.refetch();setNotice('Provider verification queued. No fee credit has been posted.');}
                catch(cause){setError(cause instanceof Error?cause.message:'Retry failed');}finally{setBusy(false);}
              }}>Retry verification</Button>:row.has_conflict?'Conflicting evidence — accountant review':row.state==='unmatched'?'Match in collections below':'—'}</td>
            </tr>)}</tbody></table></div>}
      </section>
      {error && !action && <p role="alert" className="text-danger">{error}</p>}
      {notice && (
        <p role="status" className="rounded-lg bg-success-soft p-3">
          {notice}
        </p>
      )}
      {(payments.error || reversals.error || channels.error) && (
        <div role="alert">
          {(payments.error || reversals.error || channels.error)?.message}
          <Button
            variant="secondary"
            onClick={() => {
              void payments.refetch();
              void reversals.refetch();
              void channels.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {payments.isLoading ? (
        <p role="status">Loading collections…</p>
      ) : !payments.data?.length ? (
        <p className="rounded-lg bg-surface-muted p-4">
          No collections on this page.{" "}
          {mode === "manage"
            ? "After activating a payment channel, record a statement entry or wait for a confirmed provider payment."
            : "Statement confirmations will appear after the Accountant submits them."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  "Transaction",
                  "Channel / reference",
                  "Amount",
                  "Status / receipt",
                  "Action",
                ].map((label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.data.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3 font-mono">
                    {row.provider_transaction_id}
                    <span className="block font-sans text-xs text-muted">
                      {new Date(row.occurred_at).toLocaleDateString("en-KE")}
                    </span>
                  </td>
                  <td className="p-3">
                    {row.channel_name ?? "Historical collection"}
                    <span className="block text-muted">
                      {row.account_reference || "No reference"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {money(row.amount_minor)}
                  </td>
                  <td className="p-3">
                    {row.status.replaceAll("_", " ")}
                    <span className="block text-muted">
                      {row.receipt_number}
                    </span>
                  </td>
                  <td className="p-3">
                    {mode === "review" && row.status === "pending_review" && (
                      <Button
                        variant="secondary"
                        onClick={() => open({ kind: "decision", payment: row })}
                      >
                        Review statement
                      </Button>
                    )}
                    {mode === "manage" &&
                      ["verified", "unmatched"].includes(row.status) && (
                        <Button
                          variant="secondary"
                          onClick={() => open({ kind: "match", payment: row })}
                        >
                          Match learner
                        </Button>
                      )}
                    {mode === "manage" && row.status === "posted" && (
                      <Button
                        variant="ghost"
                        onClick={() => open({ kind: "reversal", payment: row })}
                      >
                        Request reversal
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={offset === 0 || payments.isLoading}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={payments.isLoading || (payments.data?.length ?? 0) < 50}
          onClick={() => setOffset(offset + 50)}
        >
          Next
        </Button>
      </div>
      {Boolean(reversals.data?.length) && (
        <div className="space-y-2">
          <h3 className="font-semibold">Reversal requests</h3>
          {reversals.data?.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <p>
                {row.provider_transaction_id} · {money(row.amount_minor)} ·{" "}
                {row.status}
                <span className="block text-sm text-muted">{row.reason}</span>
              </p>
              {mode === "review" && row.status === "pending" && (
                <Button
                  onClick={() =>
                    open({ kind: "reversal-decision", reversal: row })
                  }
                >
                  Review reversal
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal
        open={Boolean(action)}
        title={
          action?.kind === "statement"
            ? "Record school statement entry"
            : action?.kind === "match"
              ? "Match confirmed payment"
              : action?.kind === "reversal"
                ? "Request payment reversal"
                : "Review financial action"
        }
        onClose={close}
      >
        {error && (
          <p role="alert" className="mb-3 text-danger">
            {error}
          </p>
        )}
        {action?.kind === "statement" ? (
          <form className="space-y-4" onSubmit={statement}>
            {!destinations.length && (
              <p>
                No activated channels are available. Complete Payment Setup
                first.
              </p>
            )}
            <label className="block">
              <span>School collection account</span>
              <select name="revision_id" required className="input-base w-full">
                {destinations.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.display_name} · {row.account_number} · {row.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span>Provider transaction number</span>
              <input
                name="transaction_id"
                required
                maxLength={100}
                className="input-base w-full"
              />
            </label>
            <label className="block">
              <span>Amount received (KES)</span>
              <input
                name="amount"
                required
                inputMode="decimal"
                className="input-base w-full"
              />
            </label>
            <label className="block">
              <span>Learner admission or invoice reference</span>
              <input
                name="reference"
                maxLength={120}
                className="input-base w-full"
              />
            </label>
            <label className="block">
              <span>Payment date and time</span>
              <input
                name="occurred_at"
                type="datetime-local"
                required
                className="input-base w-full"
              />
            </label>
            <label className="block">
              <span>Statement evidence</span>
              <textarea
                name="evidence"
                required
                minLength={5}
                maxLength={500}
                placeholder="Statement date, page and transaction line for the Principal to verify"
                className="input-base w-full"
              />
            </label>
            <Button
              type="submit"
              disabled={busy || !destinations.length || !tenantId}
            >
              {busy ? "Saving…" : "Send for confirmation"}
            </Button>
          </form>
        ) : (
          action && (
            <div className="space-y-4">
              {"payment" in action && (
                <p>
                  {action.payment.provider_transaction_id} ·{" "}
                  {money(action.payment.amount_minor)}
                  <span className="block">
                    Reference: {action.payment.account_reference || "None"}
                  </span>
                  {action.payment.evidence_reference && (
                    <span className="block">
                      Evidence: {action.payment.evidence_reference}
                    </span>
                  )}
                </p>
              )}
              {action.kind === "reversal-decision" && (
                <p>
                  {action.reversal.provider_transaction_id} ·{" "}
                  {money(action.reversal.amount_minor)}
                  <span className="block">{action.reversal.reason}</span>
                </p>
              )}
              {action.kind === "match" && (
                <LearnerPicker
                  label="Learner receiving this payment"
                  tenantSlug={tenantSlug ?? tenantId ?? ""}
                  value={learner}
                  onChange={setLearner}
                />
              )}
              <label className="block">
                <span>Reason</span>
                <textarea
                  className="input-base w-full"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={1000}
                />
              </label>
              {(action.kind === "decision" ||
                action.kind === "reversal-decision") && (
                <>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>
                      I verified the school statement and the financial effect
                      of this action.
                    </span>
                  </label>
                  <p className="text-sm text-muted">
                    A reversal corrects the school ledger. Any movement of money
                    must be confirmed separately with the school&apos;s
                    provider.
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                {action.kind === "match" ? (
                  <Button
                    disabled={busy || !learner || reason.trim().length < 5}
                    onClick={() =>
                      void mutate(
                        `${action.payment.id}/match`,
                        { student_id: learner?.id, reason },
                        "Payment matched. The learner’s balance and receipt have been updated.",
                      )
                    }
                  >
                    Allocate payment
                  </Button>
                ) : action.kind === "reversal" ? (
                  <Button
                    disabled={busy || reason.trim().length < 5}
                    onClick={() =>
                      void mutate(
                        `${action.payment.id}/reversal`,
                        { reason },
                        "Reversal request sent to the Principal.",
                      )
                    }
                  >
                    Send reversal request
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={busy || !confirmed || reason.trim().length < 5}
                      onClick={() => decision("approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || reason.trim().length < 5}
                      onClick={() => decision("reject")}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button variant="ghost" disabled={busy} onClick={close}>
                  Cancel
                </Button>
              </div>
            </div>
          )
        )}
      </Modal>
    </section>
  );
}
