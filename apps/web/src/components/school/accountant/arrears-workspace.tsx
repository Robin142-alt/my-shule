"use client";

import { useEffect, useState, useMemo } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { buildBillingApiPath, formatMinorKes } from "@/lib/billing/billing-utils";
import { StudentFeeBalanceResponse } from "@/components/school/school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

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
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    async function loadArrears() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          buildBillingApiPath("/api/billing/student-balances", tenantSlug),
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

  async function sendArrearsReminders() {
    setSendingReminders(true);
    try {
      await requestDashboardApi("/admin-command/accountant/actions", {
        method: "POST",
        body: {
          action: "arrears_reminders_requested",
          title: "Fee arrears reminders queued",
          message: `${arrears.length} arrears reminder${arrears.length === 1 ? "" : "s"} queued for linked guardian and parent-portal follow-up.`,
          entity_type: "student_arrears",
          source_dashboard: "accountant-arrears-workspace",
          target_roles: ["accountant", "principal", "class_teacher", "parent"],
          payload: {
            recipient_scope: "linked_guardians",
            arrears_count: arrears.length,
            total_balance_minor: arrears.reduce((sum, row) => sum + Number(row.balance_amount_minor || 0), 0),
            students: arrears.map((row) => ({
              student_id: row.student_id,
              student_name: row.student_name,
              balance_amount_minor: row.balance_amount_minor,
            })),
          },
        },
      });
      toast.success("Arrears reminders queued for linked guardians and parent portal follow-up.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to queue arrears reminders.");
    } finally {
      setSendingReminders(false);
    }
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Student Arrears"
        description="View and manage outstanding fee balances for all students."
        actions={
          <Button variant="default" disabled={loading || arrears.length === 0 || sendingReminders} onClick={sendArrearsReminders}>
            {sendingReminders ? "Sending..." : "Send Reminders"}
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
            getRowKey={(row: any) => row.student_id || `${row.student_name}-${row.balance_amount_minor}`}
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
