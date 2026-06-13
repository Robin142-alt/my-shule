const fs = require('fs');
const lines = fs.readFileSync('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-pages.tsx', 'utf8').split('\n');
const extractedPanels = lines.slice(3202, 3767).join('\n'); // ReviewPanel and ManualReceiptsPanel

const newWorkspaceContent = `export function MPesaReconciliationWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
}) {
  const [rows, setRows] = useState<MpesaC2bPaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      try {
        const response = await fetch(
          buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug),
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const payload = await response.json();
        const payments = unwrapApiData<MpesaC2bPaymentResponse[]>(payload);
        if (active && Array.isArray(payments)) {
          setRows(payments);
        }
      } catch (err) {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTransactions();
    return () => {
      active = false;
    };
  }, [tenantSlug]);

  const metrics = [
    { id: "received", label: "Total Transactions", value: rows.length.toString(), helper: "All time" },
    { id: "pending", label: "Pending Review", value: rows.filter((r) => r.status === "pending_review").length.toString(), helper: "Needs action" },
    { id: "matched", label: "Matched", value: rows.filter((r) => r.status === "reconciled").length.toString(), helper: "Fully cleared" },
  ];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="MPESA"
        title="Mobile money reconciliation"
        description="Handle auto-matching, manual review, callback confidence, and duplicate detection from one focused page."
      />
      <MetricGrid items={metrics} />
      <DataTable
        title="MPESA transactions"
        subtitle={loading ? "Loading transactions..." : "Phone, amount, receipt code, status, and matched learner."}
        columns={[
          { id: "phone", header: "Phone", render: (row) => row.phone_number || "-" },
          { id: "amount", header: "Amount", render: (row) => row.amount_minor, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "code", header: "Code", render: (row) => row.trans_id },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={row.status === "reconciled" ? "ok" : "warning"} /> },
          { id: "matchedStudent", header: "Matched Student", render: (row) => row.matched_student_id || "-" },
          { id: "receivedAt", header: "Received", render: (row) => new Date(row.received_at).toLocaleString() },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
      />
      <MpesaC2bReviewPanel tenantSlug={tenantSlug} />
      <ManualReceiptsPanel tenantSlug={tenantSlug} />
    </div>
  );
}
`;

const header = `"use client";

import { useState, useEffect } from "react";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/school/metric-grid";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/school/status-pill";
import { getMissingFieldError, getApiResponseMessage } from "@/lib/forms/validation";
import { buildBillingApiPath, buildPaymentsApiPath, unwrapApiData } from "@/lib/data/school-api-config";
import { useStudentSearch } from "@/lib/data/school-hooks";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, ArrowRight, Wallet, CheckCircle2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchoolExperienceRole } from "@/lib/auth/roles";
import type { LearnerLookupItem, MpesaC2bPaymentResponse, MpesaC2bStatus, ManualReceiptMethod, StatusTone, SyncState } from "@/lib/data/school-types";

`;

fs.writeFileSync('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/accountant/m-pesa-reconciliation-workspace.tsx', header + newWorkspaceContent + extractedPanels);

const newLines = [...lines.slice(0, 3046), ...lines.slice(3767)];
// Wait! We also need to remove `<SchoolMpesaPage role={role} tenantSlug={tenantSlug} />` which was further down.
const filteredLines = newLines.filter(line => !line.includes('<SchoolMpesaPage role={role} tenantSlug={tenantSlug} />'));

fs.writeFileSync('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-pages.tsx', filteredLines.join('\n'));
