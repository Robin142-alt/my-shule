"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPaymentIntegrationSummary } from "@/lib/finance/payment-channels-client";
import { PaymentSetupCounts } from "@/components/school/accountant/payment-setup-summary";

export const paymentIntegrationQueryKey = [
  "platform",
  "payment-integrations",
] as const;
export function usePaymentIntegrationSummary() {
  return useQuery({
    queryKey: [...paymentIntegrationQueryKey, "summary"],
    queryFn: getPaymentIntegrationSummary,
    refetchInterval: 30_000,
  });
}
export function PaymentIntegrationSummary({ href }: { href?: string }) {
  const query = usePaymentIntegrationSummary();
  return (
    <section
      aria-label="Payment integration queue"
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">School payment integrations</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold underline">
            Open connection queue
          </Link>
        )}
      </div>
      {query.error ? (
        <div role="alert">
          Payment integration counts are unavailable.{" "}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry integration counts
          </Button>
        </div>
      ) : !query.data ? (
        <p role="status">Loading integration queue…</p>
      ) : (
        <PaymentSetupCounts data={query.data} />
      )}
      <p className="text-sm text-muted">
        Connect approved accounts, resolve failed checks and activate verified
        channels. Ready accounts are included in the Super Admin queue.
      </p>
    </section>
  );
}
