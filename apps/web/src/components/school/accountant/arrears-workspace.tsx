"use client";

import { useEffect, useState, useMemo } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { buildBillingApiPath, formatMinorKes } from "@/lib/billing/billing-utils";
import { StudentFeeBalanceResponse } from "@/components/school/school-pages";

type SchoolRouteMode = "hosted" | "public";

export function ArrearsWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [balances, setBalances] = useState<StudentFeeBalanceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArrears() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          buildBillingApiPath("/api/billing/student-balances", tenantSlug || "demo"),
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load student balances.");
        }

        const data = (await response.json()) as StudentFeeBalanceResponse[];
        setBalances(data);
      } catch (e: any) {
        setError(e.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadArrears();
  }, [tenantSlug]);

  const arrears = useMemo(() => {
    return balances.filter(b => {
      try {
        return BigInt(b.balance_amount_minor) > BigInt(0);
      } catch {
        return false;
      }
    });
  }, [balances]);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Student Arrears"
        description="View and manage outstanding fee balances for all students."
        actions={
          <Button variant="default" disabled={loading || arrears.length === 0}>
            Send Reminders
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
            rows={arrears}
            getRowKey={(row: any) => row.student_id || String(Math.random())}
            columns={[
              { id: "student_id", header: "Student ID", render: (row: any) => row.student_id },
              { id: "student_name", header: "Student Name", render: (row: any) => row.student_name || "Unknown" },
              { id: "invoiced_amount_minor", header: "Total Invoiced", render: (row: any) => formatMinorKes(row.invoiced_amount_minor) },
              { id: "paid_amount_minor", header: "Total Paid", render: (row: any) => formatMinorKes(row.paid_amount_minor) },
              { 
                id: "balance_amount_minor", 
                header: "Arrears Balance", 
                render: (row: any) => (
                  <span className="font-semibold text-red-600">
                    {formatMinorKes(row.balance_amount_minor)}
                  </span>
                )
              }
            ]}
            emptyMessage="No students currently in arrears."
          />
        )}
      </div>
    </div>
  );
}
