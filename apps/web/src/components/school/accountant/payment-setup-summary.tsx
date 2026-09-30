"use client";

import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type {
  CollectionChannelRevision,
  PaymentSetupSummary,
} from "@/lib/finance/payment-channels-client";

export const paymentSetupFilters = [
  ["all", "All setups and history"],
  ["pending_approval", "Awaiting Principal approval"],
  ["connection", "Awaiting connection or activation"],
  ["attention", "Needs follow-up"],
  ["active", "Active channels"],
  ["superseded", "Replaced setups"],
] as const;

export function paymentSetupStatus(row: CollectionChannelRevision) {
  const labels: Record<string, string> = {
    pending_approval: "Awaiting Principal approval",
    approved: "Awaiting Super Admin connection",
    connecting: "Connection checks in progress",
    ready: "Ready for Super Admin activation",
    rejected: "Rejected — correction required",
    suspended: "Suspended — follow-up required",
    superseded: "Replaced — history retained",
  };
  if (row.status === "active") {
    if (row.environment === "sandbox")
      return "Sandbox active — no live fee credit";
    return row.connection_mode === "statement"
      ? "Active — statement review required"
      : "Active — automatic collection";
  }
  if (row.last_error && row.status === "connecting")
    return "Connection check failed — Super Admin follow-up";
  return labels[row.status] ?? row.status;
}

export function usePaymentSetupSummary() {
  return useSchoolQuery<PaymentSetupSummary>(
    "/tenant-finance/collection-channel-summary",
    { refetchInterval: 30_000 },
  );
}

export function PaymentSetupCounts({ data }: { data: PaymentSetupSummary }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
      {[
        ["Awaiting Principal", data.pending_approval],
        ["Awaiting Super Admin", data.awaiting_connection],
        ["Ready to activate", data.ready],
        ["Live channels", data.active],
        ["Sandbox channels", data.sandbox],
        ["Needs follow-up", data.attention],
      ].map(([label, count]) => (
        <div key={label} className="rounded-lg bg-surface-muted p-3">
          <dt>{label}</dt>
          <dd className="mt-1 text-xl font-semibold">{count}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SchoolPaymentSetupSummary({
  onOpen,
  review = false,
}: {
  onOpen: () => void;
  review?: boolean;
}) {
  const query = usePaymentSetupSummary();
  return (
    <section
      aria-label="Payment setup follow-up"
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Payment setup</h2>
        <Button variant="secondary" onClick={onOpen}>
          {review ? "Review payment setups" : "Manage payment setup"}
        </Button>
      </div>
      {query.error ? (
        <div role="alert">
          Payment setup counts are unavailable.{" "}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry payment setup counts
          </Button>
        </div>
      ) : !query.data ? (
        <p role="status">Loading payment setup counts…</p>
      ) : (
        <>
          <PaymentSetupCounts data={query.data} />
          <p className="text-sm text-muted">
            {query.data.total === 0
              ? "No school account has been submitted. The Accountant can add one in Payment Setup."
              : review
                ? "Review the Accountant’s requests. Approved accounts pass to Super Admin for connection and activation."
                : "Track Principal decisions and Super Admin connection progress. Open rejected or suspended setups to follow up."}
          </p>
        </>
      )}
    </section>
  );
}
