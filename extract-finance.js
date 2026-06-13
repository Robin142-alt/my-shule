const fs = require('fs');
const path = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-pages.tsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function SchoolFinancePage')) {
    startIndex = i;
  }
  if (lines[i].includes('function SchoolMpesaPage')) {
    endIndex = i - 1; // End right before SchoolMpesaPage
    break;
  }
}

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find start or end index');
  process.exit(1);
}

const financePageLines = lines.slice(startIndex, endIndex);
const newLines = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];

const imports = `import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type OpsTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import { getMonthStartInputValue, getTodayInputValue } from "@/lib/date-utils";
import {
  downloadCsvFile,
  downloadTextFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { redirectOnExpiredSessionResponse } from "@/lib/auth/session-expiry-client";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import { buildBillingApiPath, toMinorUnits, formatMinorKes, formatActivityDate } from "@/lib/billing/billing-utils";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { LearnerPicker } from "@/components/common/learner-picker";

type SchoolRouteMode = "hosted" | "public";
type ManualReceiptMethod = "cash" | "cheque" | "bank_deposit" | "eft" | "mpesa_c2b";
type ManualReceiptStatus = "received" | "deposited" | "cleared" | "bounced" | "reversed";

const manualReceiptMethodLabels: Record<ManualReceiptMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_deposit: "Bank Deposit",
  eft: "EFT",
  mpesa_c2b: "M-PESA",
};

const financeReconciliationBucketTone: Record<string, "ok" | "watch" | "danger" | "neutral"> = {
  cleared: "ok",
  pending: "watch",
  exception: "danger",
};

type FinanceActivityResponse = {
  id: string;
  kind: "invoice" | "receipt";
  student_id: string | null;
  student_name: string | null;
  invoice_id: string | null;
  amount_minor: string;
  method: string;
  status: string;
  reference: string;
  occurred_at: string;
  ledger_transaction_id: string | null;
};

type FinanceActivityRow = {
  id: string;
  student: string;
  amount: string;
  method: string;
  date: string;
  reference: string;
  status: string;
  statusTone: "ok" | "warning" | "danger" | "neutral";
};

type StudentFeeBalanceResponse = {
  tenant_id: string;
  student_id: string;
  student_name: string | null;
  currency_code: string;
  invoiced_amount_minor: string;
  paid_amount_minor: string;
  credit_amount_minor: string;
  balance_amount_minor: string;
  invoice_count: number;
  last_activity_at: string | null;
};

type StudentFeeStatementResponse = {
  summary: StudentFeeBalanceResponse;
  entries: Array<{
    id: string;
    kind: "invoice" | "receipt" | "credit_note" | "adjustment";
    occurred_at: string;
    reference: string;
    description: string;
    debit_amount_minor: string;
    credit_amount_minor: string;
    balance_after_minor: string;
    status: string;
  }>;
};

type FeeStructureResponse = {
  id: string;
  name: string;
  academic_year: string;
  term: string;
  grade_level: string;
  status: "draft" | "active" | "archived";
  due_days: number;
};

type FeeLineItemDraft = {
  id: string;
  code: string;
  label: string;
  amount: string;
};

type BulkFeeStudentDraft = {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  guardian_phone: string;
};

type BillableFeeStudentResponse = {
  id: string;
  full_name: string;
  admission_number: string;
  class_name: string;
  stream_name: string | null;
  parent_phone: string | null;
};

type ReconciliationResponse = {
  period: { start: string; end: string };
  totals: {
    cleared_amount_minor: string;
    pending_amount_minor: string;
    exception_amount_minor: string;
    transaction_count: number;
  };
  method_summaries: Array<{
    payment_method: ManualReceiptMethod;
    transaction_count: number;
    cleared_amount_minor: string;
    pending_amount_minor: string;
    exception_amount_minor: string;
  }>;
  rows: Array<{
    payment_id: string;
    receipt_number: string;
    payment_method: ManualReceiptMethod;
    amount_minor: string;
    occurred_at: string;
    reference: string;
    ledger_transaction_id: string | null;
    reversal_ledger_transaction_id: string | null;
    reconciliation_bucket: "cleared" | "pending" | "exception";
  }>;
};

function createEmptyFeeLineItemDraft(): FeeLineItemDraft {
  return { id: Math.random().toString(36).slice(2), code: "", label: "", amount: "" };
}

function createEmptyBulkFeeStudentDraft(): BulkFeeStudentDraft {
  return {
    id: Math.random().toString(36).slice(2),
    student_id: "",
    student_name: "",
    admission_number: "",
    class_name: "",
    guardian_phone: "",
  };
}

function getStatementEntryTone(entry: { status: string; debit_amount_minor: string; credit_amount_minor: string }) {
  if (entry.status === "voided" || entry.status === "reversed") return "neutral";
  if (entry.status === "pending" || entry.status === "processing") return "warning";
  if (entry.status === "failed") return "danger";
  return "ok";
}

function toFinanceActivityRow(activity: FinanceActivityResponse): FinanceActivityRow {
  return {
    id: activity.id,
    student: activity.student_name ?? activity.student_id ?? "Unknown",
    amount: formatMinorKes(activity.amount_minor),
    method: activity.method,
    date: formatActivityDate(activity.occurred_at),
    reference: activity.reference,
    status: activity.status,
    statusTone: activity.status === "completed" || activity.status === "cleared" ? "ok" : "warning",
  };
}

export ` + financePageLines.join('\n');


fs.writeFileSync('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-finance-page.tsx', imports);

const finalContent = 'import { SchoolFinancePage } from "./school-finance-page";\n' + newLines.join('\n');
fs.writeFileSync(path, finalContent);

console.log('Successfully extracted SchoolFinancePage!');
