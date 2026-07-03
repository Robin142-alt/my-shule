"use client";

import { useEffect, useState } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { DataTable } from "@/components/ui/data-table";
import { buildBillingApiPath, formatActivityDate, formatMinorKes } from "@/lib/billing/billing-utils";
import { StatusPill } from "@/components/ui/status-pill";
import { 
  buildFinanceSummaryItems, 
  FinanceActivityResponse, 
  FinanceActivityRow 
} from "@/components/school/school-pages";

type SchoolRouteMode = "hosted" | "public";

export function OverviewWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [activities, setActivities] = useState<FinanceActivityResponse[]>([]);
  const [rows, setRows] = useState<FinanceActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          buildBillingApiPath("/api/billing/finance-activity?limit=10&offset=0", tenantSlug),
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load finance data.");
        }

        const data = (await response.json()) as FinanceActivityResponse[];
        setActivities(data);
        
        setRows(
          data.map((activity) => ({
            id: activity.id,
            student: activity.student_name ?? activity.student_id ?? "Unknown",
            amount: formatMinorKes(activity.amount_minor),
            method: activity.method,
            date: formatActivityDate(activity.occurred_at),
            reference: activity.reference,
            status: activity.status,
            statusTone: activity.status === "completed" || activity.status === "cleared" ? "ok" : "warning",
          }))
        );
      } catch (e: any) {
        setError(e.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tenantSlug]);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Finance Overview"
        description="A high-level view of fee collection, outstanding balances, and recent financial activity."
      />

      <MetricGrid items={buildFinanceSummaryItems(activities, loading)} />

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-slate-900">Recent Transactions</h3>
        {error ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <DataTable
            rows={rows}
            getRowKey={(row: any) => row.id || row.reference || `${row.date}-${row.student}-${row.amount}`}
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
            ]}
            emptyMessage="No recent transactions found."
          />
        )}
      </div>
    </div>
  );
}
