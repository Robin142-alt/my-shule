"use client";

import { useEffect, useState, useMemo } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { buildBillingApiPath, formatActivityDate, formatMinorKes } from "@/lib/billing/billing-utils";
import { StatusPill } from "@/components/ui/status-pill";
import { FinanceActivityResponse, FinanceActivityRow } from "@/components/school/school-pages";
import { Button } from "@/components/ui/button";

type SchoolRouteMode = "hosted" | "public";

export function ReceiptsWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [activities, setActivities] = useState<FinanceActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipts() {
      setLoading(true);
      setError(null);
      try {
        // Fetch up to 100 recent activities to filter receipts
        const response = await fetch(
          buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug || "demo"),
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load receipts.");
        }

        const data = (await response.json()) as FinanceActivityResponse[];
        setActivities(data);
      } catch (e: any) {
        setError(e.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadReceipts();
  }, [tenantSlug]);

  const rows = useMemo(() => {
    return activities
      .filter((activity) => activity.kind === "receipt")
      .map((activity) => ({
        id: activity.id,
        student: activity.student_name ?? activity.student_id ?? "Unknown",
        amount: formatMinorKes(activity.amount_minor),
        method: activity.method,
        date: formatActivityDate(activity.occurred_at),
        reference: activity.reference,
        status: activity.status,
        statusTone: activity.status === "completed" || activity.status === "cleared" ? "ok" : "warning",
      } as FinanceActivityRow));
  }, [activities]);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Receipts"
        description="View and manage all payment receipts."
        actions={
          <Button variant="default">
            Record Manual Receipt
          </Button>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        {error ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <DataTable
            rows={rows}
            getRowKey={(row: any) => row.id || String(Math.random())}
            columns={[
              { id: "date", header: "Date", render: (row: any) => row.date },
              { id: "student", header: "Student", render: (row: any) => row.student },
              { id: "amount", header: "Amount", render: (row: any) => row.amount },
              { id: "method", header: "Method", render: (row: any) => row.method },
              { id: "reference", header: "Reference", render: (row: any) => row.reference },
              {
                id: "status",
                header: "Status",
                render: (row: any) => <StatusPill tone={row.statusTone} label={row.status} />,
              },
              {
                id: "actions",
                header: "",
                render: () => (
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                )
              }
            ]}
            emptyMessage="No receipts found."
          />
        )}
      </div>
    </div>
  );
}
