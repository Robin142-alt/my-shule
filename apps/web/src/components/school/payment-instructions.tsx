"use client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Button } from "@/components/ui/button";

interface PaymentDestination {
  id: string;
  display_name: string;
  account_name: string;
  account_number: string;
  channel_kind: string;
  paybill_number: string | null;
  bank_name: string | null;
}

export function SchoolPaymentInstructions({
  reference,
}: {
  reference?: string | null;
}) {
  const query = useSchoolQuery<PaymentDestination[]>(
    "/tenant-finance/collection-instructions",
  );
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h3 className="font-semibold">Pay your school directly</h3>
      {query.isLoading ? (
        <p role="status">Loading approved school accounts…</p>
      ) : query.error ? (
        <div role="alert">
          Payment instructions could not be loaded.
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : !query.data?.length ? (
        <p className="text-sm text-muted">
          The school has not published an approved collection account yet.
          Contact the school office before making a payment.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {query.data.map((row) => (
              <div key={row.id} className="rounded-lg bg-surface-muted p-3">
                <p className="font-medium">{row.display_name}</p>
                <p className="text-sm">
                  {row.account_name} · {row.bank_name || "M-PESA"}
                </p>
                {row.paybill_number && (
                  <p>
                    Bank Paybill: <strong>{row.paybill_number}</strong>
                  </p>
                )}
                <p>
                  {row.channel_kind === "mpesa_paybill"
                    ? "Paybill"
                    : "School account"}
                  : <strong className="font-mono">{row.account_number}</strong>
                </p>
              </div>
            ))}
          </div>
          {reference && (
            <p className="text-sm">
              Learner reference:{" "}
              <strong className="font-mono">{reference}</strong>. Include this
              reference so the school can allocate your payment.
            </p>
          )}
          <p className="text-xs text-muted">
            Your bank or M-PESA pays the school directly. The receipt appears
            after the payment is confirmed and allocated.
          </p>
        </>
      )}
    </section>
  );
}
