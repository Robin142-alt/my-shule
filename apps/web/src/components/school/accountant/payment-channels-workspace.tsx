"use client";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@/components/providers/permission-context";
import { publishSchoolDataUpdate } from "@/lib/school/school-operational-store";
import { PaymentSetupCounts, paymentSetupFilters, paymentSetupStatus, usePaymentSetupSummary } from "./payment-setup-summary";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import {
  decideCollectionChannel,
  requestCollectionChannel,
  type CollectionChannelRevision,
  type CollectionProvider,
} from "@/lib/finance/payment-channels-client";

export function SchoolPaymentChannels(props: { mode?: "request" | "review"; pendingOnly?: boolean }) {
  return <Suspense fallback={<p role="status">Loading payment setup…</p>}><PaymentChannelsWorkspace {...props} /></Suspense>;
}

function PaymentChannelsWorkspace({
  mode,
  pendingOnly = false,
}: {
  mode?: "request" | "review";
  pendingOnly?: boolean;
}) {
  const tenant = useOptionalSchoolTenantId();
  const role = useOptionalSchoolDashboardRole()?.activeRole;
  const { hasPermission } = usePermissions();
  const params = useSearchParams();
  const revision = params.get("revision");
  const validRevision = revision && /^[0-9a-f-]{36}$/i.test(revision) ? revision : null;
  const [status, setStatus] = useState(pendingOnly ? "pending_approval" : "all");
  const [offset, setOffset] = useState(0);
  const summary = usePaymentSetupSummary();
  const review = mode === "review" || (!mode && role === "principal");
  const canRequest = (mode === "request" || (!mode && (role === "accountant" || role === "bursar"))) && hasPermission("billing:write");
  const canReview = review && hasPermission("principal:write");
  const channels = useSchoolQuery<CollectionChannelRevision[]>(
    `/tenant-finance/collection-channels?limit=50&offset=${validRevision ? 0 : offset}&status=${validRevision ? "all" : status}${validRevision ? `&revision=${encodeURIComponent(validRevision)}` : ""}`,
    { refetchInterval: 30_000 },
  );
  const catalog = useSchoolQuery<CollectionProvider[]>(
    "/tenant-finance/collection-providers",
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CollectionChannelRevision | null>(
    null,
  );
  const [provider, setProvider] = useState("");
  const [kind, setKind] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const providers = catalog.data ?? [];
  const chosen =
    providers.find((item) => item.code === provider) ?? providers[0];
  const chosenKind = kind || chosen?.channel_kinds[0] || "bank_account";
  function close() {
    if (!busy) {
      setOpen(false);
      setSelected(null);
      setError("");
      setConfirmed(false);
      setDecisionReason("");
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant || !chosen || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestCollectionChannel(tenant, {
        provider_code: chosen.code,
        channel_kind: chosenKind,
        display_name: data.get("display_name"),
        account_name: data.get("account_name"),
        account_number: data.get("account_number"),
        bank_name: chosen.name,
        reason: data.get("reason"),
        ...(chosenKind === "bank_paybill"
          ? { paybill_number: data.get("paybill_number") }
          : {}),
        ...(selected ? { replaces_revision_id: selected.id } : {}),
      });
      setOpen(false);
      setSelected(null);
      setNotice(
        "Sent to the Principal for approval. Your existing channels continue operating.",
      );
      setOffset(0);
      publishSchoolDataUpdate(tenant, "finance");
      await Promise.all([channels.refetch(), summary.refetch()]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to submit the request.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function decide(decision: "approve" | "reject") {
    if (!tenant || !selected || busy || !canReview) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await decideCollectionChannel(
        tenant,
        selected.id,
        decision,
        decisionReason,
      );
      setSelected(null);
      setNotice(
        decision === "approve"
          ? "Approved for technical connection by Super Admin."
          : "Request rejected. The Accountant can submit a corrected setup.",
      );
      publishSchoolDataUpdate(tenant, "finance");
      await Promise.all([channels.refetch(), summary.refetch()]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save the decision.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">School payment channels</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Fees go directly to your school&apos;s Paybill or bank account.{" "}
            {review
              ? "Review the exact account details before approving a connection."
              : "Add your school payment details, then send them to the Principal for approval."}
          </p>
        </div>
        {canRequest && (
          <Button
            onClick={() => {
              setSelected(null);
              setProvider("");
              setKind("");
              setOpen(true);
              setError("");
            }}
          >
            Add payment channel
          </Button>
        )}
      </div>
      {summary.error ? <p role="alert">Payment setup counts could not be loaded. <Button variant="ghost" onClick={() => void summary.refetch()}>Retry counts</Button></p>
        : summary.data ? <PaymentSetupCounts data={summary.data} /> : <p role="status">Loading payment setup counts…</p>}
      <div className="flex flex-wrap items-center gap-3">
        {!validRevision && !pendingOnly && <label className="flex flex-wrap items-center gap-2">Show setups
          <select className="input-base" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
            {paymentSetupFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>}
        {validRevision && <><p className="text-sm">Showing the setup linked from your notification.</p><Button variant="secondary" onClick={() => { window.history.replaceState(null, "", window.location.pathname); setOffset(0); }}>View all setups</Button></>}
        <Button variant="secondary" onClick={() => { void channels.refetch(); void summary.refetch(); }} disabled={channels.isFetching || busy}>Refresh setups</Button>
      </div>
      {notice && (
        <p role="status" className="rounded-lg bg-success-soft p-3 text-sm">
          {notice}
        </p>
      )}
      {(channels.error || catalog.error) && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border p-3"
        >
          {(channels.error || catalog.error)?.message}
          <Button
            variant="secondary"
            onClick={() => {
              void channels.refetch();
              void catalog.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {channels.isLoading ? (
        <p role="status">Loading payment channels…</p>
      ) : !channels.error && !channels.data?.length ? (
        <p className="rounded-lg bg-surface-muted p-4 text-sm">
          {validRevision ? "This setup is unavailable in your school. View all setups or contact the Accountant." : pendingOnly || status !== "all" ? "No payment setups match this queue. Refresh to check for new requests." : <>No payment channels yet.{" "}{canRequest
            ? "Add a school account to begin approval."
            : "The Accountant can submit the school’s collection account for review."}</>}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {channels.data?.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{row.display_name}</h3>
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs">
                  {paymentSetupStatus(row)}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {row.account_name} · {row.bank_name || "M-PESA"}
              </p>
              {row.paybill_number && <p>Bank Paybill: {row.paybill_number}</p>}
              <p className="font-mono text-lg">{row.account_number}</p>
              <p className="mt-1 text-sm text-muted">Requested {new Date(row.created_at).toLocaleString()} · {row.reason}</p>
              {row.reviewed_at && <p className="text-sm text-muted">Reviewed {new Date(row.reviewed_at).toLocaleString()}</p>}
              {row.decision_reason && (
                <p className="mt-2 text-sm">Decision: {row.decision_reason}</p>
              )}
              {row.last_error && (
                <p className="mt-2 text-sm text-danger">{row.last_error}</p>
              )}
              {review && row.status === "pending_approval" && (
                <Button
                  disabled={!canReview}
                  className="mt-3"
                  onClick={() => {
                    setSelected(row);
                    setError("");
                    setConfirmed(false);
                    setDecisionReason("");
                  }}
                >
                  Review request
                </Button>
              )}
              {canRequest &&
                ["active", "suspended", "rejected"].includes(row.status) && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={() => {
                      setSelected(row);
                      setProvider(row.provider_code);
                      setKind(row.channel_kind);
                      setOpen(true);
                      setError("");
                    }}
                  >
                    Request change
                  </Button>
                )}
            </article>
          ))}
        </div>
      )}
      {!validRevision && <div className="flex items-center justify-end gap-3"><span className="text-sm">Page {offset / 50 + 1}</span>
        <Button variant="secondary" disabled={!offset || channels.isFetching || busy} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous setups</Button>
        <Button variant="secondary" disabled={(channels.data?.length ?? 0) < 50 || channels.isFetching || busy} onClick={() => setOffset(offset + 50)}>Next setups</Button></div>}
      <Modal
        open={open}
        title={selected ? "Change payment channel" : "Add payment channel"}
        onClose={close}
      >
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <label className="block space-y-1">
            <span>Provider</span>
            <select
              className="input-base w-full"
              value={chosen?.code ?? ""}
              onChange={(event) => {
                setProvider(event.target.value);
                setKind("");
              }}
            >
              {providers.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span>Payment channel</span>
            <select
              className="input-base w-full"
              value={chosenKind}
              onChange={(event) => setKind(event.target.value)}
            >
              {chosen?.channel_kinds.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span>Channel name</span>
            <input
              name="display_name"
              className="input-base w-full"
              required
              minLength={2}
              maxLength={100}
              defaultValue={selected?.display_name}
            />
          </label>
          <label className="block space-y-1">
            <span>Account holder name</span>
            <input
              name="account_name"
              className="input-base w-full"
              required
              minLength={2}
              maxLength={150}
              defaultValue={selected?.account_name}
            />
          </label>
          {chosenKind === "bank_paybill" && (
            <label className="block space-y-1">
              <span>Bank Paybill number</span>
              <input
                name="paybill_number"
                className="input-base w-full"
                required
                pattern="[0-9]{5,10}"
                defaultValue={selected?.paybill_number ?? ""}
              />
            </label>
          )}
          <label className="block space-y-1">
            <span>
              {chosenKind === "mpesa_paybill"
                ? "Paybill number"
                : "Account number"}
            </span>
            <input
              name="account_number"
              className="input-base w-full"
              required
              minLength={3}
              maxLength={40}
              defaultValue={selected?.account_number}
            />
          </label>
          <label className="block space-y-1">
            <span>Reason for this request</span>
            <textarea
              name="reason"
              className="input-base w-full"
              required
              minLength={5}
              maxLength={1000}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !chosen || !tenant}>
              {busy ? "Submitting…" : "Send to Principal"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={review && Boolean(selected) && !open}
        title="Review school payment destination"
        onClose={close}
      >
        {selected && (
          <div className="space-y-4">
            <p>{selected.account_name}</p>
            {selected.paybill_number && (
              <p>Bank Paybill: {selected.paybill_number}</p>
            )}
            <p className="font-mono text-xl">{selected.account_number}</p>
            <p>
              {selected.bank_name || "M-PESA"} · {selected.display_name}
            </p>
            <p>Request reason: {selected.reason}</p>
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            <label className="block space-y-1">
              <span>Decision reason</span>
              <textarea
                className="input-base w-full"
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                I have verified these account details against the school&apos;s
                records.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  busy || !canReview || !confirmed || decisionReason.trim().length < 5
                }
                onClick={() => void decide("approve")}
              >
                Approve destination
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !canReview || decisionReason.trim().length < 5}
                onClick={() => void decide("reject")}
              >
                Reject request
              </Button>
              <Button variant="ghost" disabled={busy} onClick={close}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
