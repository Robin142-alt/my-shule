// @ts-nocheck

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type OpsTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import { MetricGrid } from "@/components/experience/metric-grid";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { getMonthStartInputValue, getTodayInputValue } from "@/lib/date-utils";
import {
  downloadCsvFile,
  downloadTextFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { redirectOnExpiredSessionResponse } from "@/lib/auth/session-expiry-client";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import { buildBillingApiPath, toMinorUnits, formatMinorKes, formatActivityDate, unwrapBillingApiData } from "@/lib/billing/billing-utils";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { LearnerPicker } from "@/components/common/learner-picker";
import { SubscriptionLifecyclePanel } from "@/components/school/school-pages";

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
  student_id: string;
  student_name: string;
  admission_number: string;
  grade_level: string;
  class_name: string | null;
  guardian_phone: string | null;
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
  return { id: crypto.randomUUID(), code: "", label: "", amount: "" };
}

function createEmptyBulkFeeStudentDraft(): BulkFeeStudentDraft {
  return {
    id: crypto.randomUUID(),
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

export function SchoolFinancePage({
  role,
  tenantSlug,
  routeMode,
  activeSection,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode: SchoolRouteMode;
  activeSection?: string;
}) {
  const { subscription } = getSchoolWorkspace(role, tenantSlug);
  const [activity, setActivity] = useState<FinanceActivityResponse[]>([]);
  const [rows, setRows] = useState<FinanceActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [balances, setBalances] = useState<StudentFeeBalanceResponse[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [statement, setStatement] = useState<StudentFeeStatementResponse | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<FinanceReconciliationResponse | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(true);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);
  const [reconciliationFilters, setReconciliationFilters] = useState<{
    from: string;
    to: string;
    method: ManualReceiptMethod | "all";
  }>(() => ({
    from: getMonthStartInputValue(),
    to: getTodayInputValue(),
    method: "all",
  }));
  const [feeStructures, setFeeStructures] = useState<FeeStructureResponse[]>([]);
  const [feeStructuresLoading, setFeeStructuresLoading] = useState(true);
  const [feeStructureError, setFeeStructureError] = useState<string | null>(null);
  const [feeStructureDraft, setFeeStructureDraft] = useState({
    name: "",
    academic_year: String(new Date().getFullYear()),
    term: "",
    grade_level: "",
    class_name: "",
    status: "active" as FeeStructureResponse["status"],
    due_days: "14",
  });
  const [feeLineItems, setFeeLineItems] = useState<FeeLineItemDraft[]>(() => [
    createEmptyFeeLineItemDraft(),
  ]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [billableStudents, setBillableStudents] = useState<BillableFeeStudentResponse[]>([]);
  const [billableStudentsLoading, setBillableStudentsLoading] = useState(false);
  const [bulkDraft, setBulkDraft] = useState({
    fee_structure_id: "",
    idempotency_key: "",
    due_at: "",
  });
  const [bulkStudents, setBulkStudents] = useState<BulkFeeStudentDraft[]>(() => [
    createEmptyBulkFeeStudentDraft(),
  ]);
  const [selectedBulkStudentIds, setSelectedBulkStudentIds] = useState<Set<string>>(() => new Set());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState({ studentId: "", studentName: "", amount: "", dueAt: "" });
  const [selectedInvoiceLearner, setSelectedInvoiceLearner] = useState<LearnerLookupItem | null>(null);
  const [paymentDraft, setPaymentDraft] = useState({
    payment_method: "cash" as ManualReceiptMethod,
    student_id: "",
    invoice_id: "",
    payer_name: "",
    amount: "",
    reference: "",
  });
  const [selectedPaymentLearner, setSelectedPaymentLearner] = useState<LearnerLookupItem | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [financeMessage, setFinanceMessage] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      const response = await fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
        cache: "no-store",
      });
      if (response.ok) {
        setSummaryData(await response.json());
      }
    } catch (e) {
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadFinanceActivity() {
    setActivityLoading(true);

    try {
      const response = await fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Finance activity could not be loaded.");
      }

      const payload = (await response.json()) as FinanceActivityResponse[];
      setActivity(payload);
      setRows(payload.map(toFinanceActivityRow));
    } catch (caught) {
      setActivity([]);
      setRows([]);
      setFinanceMessage(caught instanceof Error ? caught.message : "Finance activity could not be loaded.");
    } finally {
      setActivityLoading(false);
    }
  }

  async function loadStudentBalances() {
    setBalancesLoading(true);

    try {
      const response = await fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Student balances could not be loaded.");
      }

      const payload = (await response.json()) as StudentFeeBalanceResponse[];
      setBalances(payload);
    } catch (caught) {
      setBalances([]);
      setFinanceMessage(caught instanceof Error ? caught.message : "Student balances could not be loaded.");
    } finally {
      setBalancesLoading(false);
    }
  }

  async function loadReconciliationReport() {
    setReconciliationLoading(true);
    setReconciliationError(null);

    const params = new URLSearchParams();

    if (reconciliationFilters.from) {
      params.set("from", reconciliationFilters.from);
    }

    if (reconciliationFilters.to) {
      params.set("to", reconciliationFilters.to);
    }

    if (reconciliationFilters.method !== "all") {
      params.set("method", reconciliationFilters.method);
    }

    try {
      const response = await fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | FinanceReconciliationResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("rows" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Reconciliation report could not be loaded.",
        );
      }

      setReconciliation(payload);
    } catch (caught) {
      setReconciliation(null);
      setReconciliationError(caught instanceof Error ? caught.message : "Reconciliation report could not be loaded.");
    } finally {
      setReconciliationLoading(false);
    }
  }

  async function loadFeeStructures() {
    setFeeStructuresLoading(true);
    setFeeStructureError(null);

    try {
      const response = await fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | FeeStructureResponse[]
        | { data?: FeeStructureResponse[]; message?: string }
        | { message?: string }
        | null;
      const feeStructuresPayload = unwrapBillingApiData<FeeStructureResponse[]>(payload);

      if (!response.ok || !Array.isArray(feeStructuresPayload)) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.message
            ? payload.message
            : "Fee structures could not be loaded.",
        );
      }

      setFeeStructures(feeStructuresPayload);
      setBulkDraft((current) => ({
        ...current,
        fee_structure_id: current.fee_structure_id || feeStructuresPayload[0]?.id || "",
      }));
    } catch (caught) {
      setFeeStructures([]);
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structures could not be loaded.");
    } finally {
      setFeeStructuresLoading(false);
    }
  }

  useEffect(() => {
    void loadFeeStructures();
  }, [tenantSlug]);

  function openInvoiceModal() {
    setInvoiceDraft({ studentId: "", studentName: "", amount: "", dueAt: "" });
    setSelectedInvoiceLearner(null);
    setInvoiceError(null);
    setShowInvoiceModal(true);
  }

  function closeInvoiceModal() {
    setShowInvoiceModal(false);
    setInvoiceError(null);
  }

  function openPaymentModal() {
    setPaymentDraft({
      payment_method: "cash",
      student_id: "",
      invoice_id: "",
      payer_name: "",
      amount: "",
      reference: "",
    });
    setSelectedPaymentLearner(null);
    setPaymentError(null);
    setShowPaymentModal(true);
  }

  function closePaymentModal() {
    setShowPaymentModal(false);
    setPaymentError(null);
  }

  function closeStatementModal() {
    setStatement(null);
    setStatementError(null);
    setStatementLoading(false);
  }

  async function openStudentStatement(balance: StudentFeeBalanceResponse) {
    setStatementError(null);
    setStatementLoading(true);

    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | StudentFeeStatementResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("entries" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Student statement could not be loaded.",
        );
      }

      setStatement(payload);
    } catch (caught) {
      setStatement(null);
      setStatementError(caught instanceof Error ? caught.message : "Student statement could not be loaded.");
    } finally {
      setStatementLoading(false);
    }
  }

  async function exportStudentStatement(studentId: string) {
    setStatementError(null);

    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | CsvReportArtifactResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("csv" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Student statement export could not be prepared.",
        );
      }

      downloadTextFile({
        filename: payload.filename,
        content: payload.csv,
        mimeType: payload.content_type,
      });
    } catch (caught) {
      setStatementError(caught instanceof Error ? caught.message : "Student statement export could not be prepared.");
    }
  }

  async function exportReconciliationReport() {
    setReconciliationError(null);

    const params = new URLSearchParams();

    if (reconciliationFilters.from) {
      params.set("from", reconciliationFilters.from);
    }

    if (reconciliationFilters.to) {
      params.set("to", reconciliationFilters.to);
    }

    if (reconciliationFilters.method !== "all") {
      params.set("method", reconciliationFilters.method);
    }

    try {
      const response = await fetch(
        buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | CsvReportArtifactResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("csv" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Reconciliation export could not be prepared.",
        );
      }

      downloadTextFile({
        filename: payload.filename,
        content: payload.csv,
        mimeType: payload.content_type,
      });
    } catch (caught) {
      setReconciliationError(caught instanceof Error ? caught.message : "Reconciliation export could not be prepared.");
    }
  }

  function updateFeeLineItem(
    id: string,
    field: keyof Omit<FeeLineItemDraft, "id">,
    value: string,
  ) {
    setFeeLineItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setFeeStructureError(null);
  }

  function removeFeeLineItem(id: string) {
    setFeeLineItems((current) =>
      current.length === 1 ? [createEmptyFeeLineItemDraft()] : current.filter((item) => item.id !== id),
    );
    setFeeStructureError(null);
  }

  function updateBulkStudent(
    id: string,
    field: keyof Omit<BulkFeeStudentDraft, "id">,
    value: string,
  ) {
    setBulkStudents((current) =>
      current.map((student) => (student.student_id === id ? { ...student, [field]: value } : student)),
    );
    setBulkError(null);
  }

  function removeBulkStudent(id: string) {
    setBulkStudents((current) =>
      current.length === 1 ? [] : current.filter((student) => student.student_id !== id),
    );
    setSelectedBulkStudentIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setBulkError(null);
  }

  function toggleBulkRosterStudent(student: BillableFeeStudentResponse) {
    setSelectedBulkStudentIds((current) => {
      const next = new Set(current);

      if (next.has(student.student_id)) {
        next.delete(student.student_id);
        setBulkStudents((drafts) => drafts.filter((draft) => draft.id !== student.student_id));
      } else {
        next.add(student.student_id);
        setBulkStudents((drafts) => {
          const manualDrafts = drafts.filter((draft) => !billableStudents.some((row) => row.student_id === draft.id));
          const rosterDrafts = billableStudents
            .filter((row) => next.has(row.student_id))
            .map(toBulkFeeStudentDraft);
          return [...rosterDrafts, ...manualDrafts];
        });
      }

      return next;
    });
    setBulkError(null);
  }

  function selectAllVisibleBulkRosterStudents() {
    const next = new Set(billableStudents.map((student) => student.student_id));
    setSelectedBulkStudentIds(next);
    setBulkStudents((drafts) => {
      const manualDrafts = drafts.filter((draft) => !billableStudents.some((row) => row.student_id === draft.id));
      return [...billableStudents.map(toBulkFeeStudentDraft), ...manualDrafts];
    });
    setBulkError(null);
  }

  function clearBulkRosterSelection() {
    setSelectedBulkStudentIds(new Set());
    setBulkStudents((drafts) => drafts.filter((draft) => !billableStudents.some((row) => row.student_id === draft.id)));
    setBulkError(null);
  }

  const hasBulkBillingStudents = bulkStudents.some((student) =>
    [student.student_id, student.student_name, student.admission_number, student.class_name, student.guardian_phone].some(
      (value) => value.trim().length > 0,
    ),
  );
  const canGenerateBulkInvoices = bulkDraft.fee_structure_id.trim().length > 0 && hasBulkBillingStudents;

  async function saveFeeStructure() {
    const validationError = (field: string) => `Missing ${field}`([
      { label: "Fee name", value: feeStructureDraft.name },
      { label: "Academic year", value: feeStructureDraft.academic_year },
      { label: "Term", value: feeStructureDraft.term },
      { label: "Grade level", value: feeStructureDraft.grade_level },
    ]);
    const dueDays = Number(feeStructureDraft.due_days);
    const lineItemResult = ((structure: any) => [])(feeLineItems);

    if (validationError) {
      setFeeStructureError(validationError);
      return;
    }

    if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) {
      setFeeStructureError("Due days must be a whole number between 0 and 365.");
      return;
    }

    if (lineItemResult.error) {
      setFeeStructureError(lineItemResult.error);
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          name: feeStructureDraft.name.trim(),
          academic_year: feeStructureDraft.academic_year.trim(),
          term: feeStructureDraft.term.trim(),
          grade_level: feeStructureDraft.grade_level.trim(),
          class_name: feeStructureDraft.class_name.trim() || undefined,
          status: feeStructureDraft.status,
          due_days: dueDays,
          line_items: lineItemResult.lineItems,
          metadata: {
            source: "school_finance_fee_setup",
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | FeeStructureResponse
        | { data?: FeeStructureResponse; message?: string }
        | { message?: string }
        | null;
      const savedFeeStructure = unwrapBillingApiData<FeeStructureResponse>(payload);

      if (!response.ok || !savedFeeStructure || !("id" in savedFeeStructure)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Fee structure could not be saved.");
      }

      setFeeStructureError(null);
      setFinanceMessage(`${savedFeeStructure.name} saved for ${savedFeeStructure.grade_level}.`);
      setBulkDraft((current) => ({ ...current, fee_structure_id: savedFeeStructure.id }));
      setFeeStructureDraft((current) => ({
        ...current,
        name: "",
        term: "",
        grade_level: "",
        class_name: "",
      }));
      setFeeLineItems([createEmptyFeeLineItemDraft()]);
      await loadFeeStructures();
    } catch (caught) {
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structure could not be saved.");
    }
  }

  async function archiveFeeStructure(feeStructure: FeeStructureResponse) {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | FeeStructureResponse
        | { data?: FeeStructureResponse; message?: string }
        | { message?: string }
        | null;
      const archivedFeeStructure = unwrapBillingApiData<FeeStructureResponse>(payload);

      if (!response.ok || !archivedFeeStructure || !("id" in archivedFeeStructure)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Fee structure could not be archived.");
      }

      setFeeStructureError(null);
      setFinanceMessage(`${archivedFeeStructure.name} archived.`);
      setBillableStudents([]);
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);
      setBulkDraft((current) => ({
        ...current,
        fee_structure_id: current.fee_structure_id === archivedFeeStructure.id ? "" : current.fee_structure_id,
      }));
      await loadFeeStructures();
    } catch (caught) {
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structure could not be archived.");
    }
  }

  async function generateBulkFeeInvoices() {
    const selectedFeeStructureId = bulkDraft.fee_structure_id.trim();
    const studentResult = ((data: any) => [])(bulkStudents);

    if (!selectedFeeStructureId) {
      setBulkError("Select a fee structure before generating invoices.");
      return;
    }

    if (studentResult.error) {
      setBulkError(studentResult.error);
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const idempotencyKey =
        bulkDraft.idempotency_key.trim() ||
        `bulk-fees-${crypto.randomUUID()}`;
      const response = await fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            due_at: bulkDraft.due_at.trim()
              ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()
              : undefined,
            target_students: studentResult.students.map((student) => ({
              student_id: student.student_id,
              student_name: student.student_name,
              admission_number: student.admission_number || undefined,
              class_name: student.class_name || undefined,
              guardian_phone: student.guardian_phone || undefined,
            })),
            metadata: {
              source: "school_finance_bulk_billing",
            },
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | BulkFeeInvoiceGenerationResponse
        | { data?: BulkFeeInvoiceGenerationResponse; message?: string }
        | { message?: string }
        | null;
      const generationResult = unwrapBillingApiData<BulkFeeInvoiceGenerationResponse>(payload);

      if (!response.ok || !generationResult || !("generated_count" in generationResult)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Bulk invoices could not be generated.");
      }

      setBulkError(null);
      setFinanceMessage(`${generationResult.generated_count} invoices generated; ${generationResult.skipped_count} duplicate rows skipped.`);
      setBulkDraft((current) => ({ ...current, idempotency_key: "", due_at: "" }));
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);
      await loadFinanceActivity();
      await loadStudentBalances();
      await loadReconciliationReport();
    } catch (caught) {
      setBulkError(caught instanceof Error ? caught.message : "Bulk invoices could not be generated.");
    }
  }

  async function loadBillableStudentsForSelectedFeeStructure() {
    const selectedFeeStructureId = bulkDraft.fee_structure_id.trim();

    if (!selectedFeeStructureId) {
      setBulkError("Select a fee structure before loading roster students.");
      return;
    }

    setBillableStudentsLoading(true);
    setBulkError(null);

    try {
      const response = await fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | BillableFeeStudentResponse[]
        | { data?: BillableFeeStudentResponse[]; message?: string }
        | { message?: string }
        | null;
      const billableStudentsPayload = unwrapBillingApiData<BillableFeeStudentResponse[]>(payload);

      if (!response.ok || !Array.isArray(billableStudentsPayload)) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.message
            ? payload.message
            : "Billable roster could not be loaded.",
        );
      }

      setBillableStudents(billableStudentsPayload);
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);

      if (billableStudentsPayload.length === 0) {
        setFinanceMessage("No active roster students matched this fee structure.");
        return;
      }

      setFinanceMessage(`${billableStudentsPayload.length} roster students loaded. Select learners to bill.`);
    } catch (caught) {
      setBillableStudents([]);
      setBulkError(caught instanceof Error ? caught.message : "Billable roster could not be loaded.");
    } finally {
      setBillableStudentsLoading(false);
    }
  }

  async function saveInvoice() {
    const validationError = (field: string) => `Missing ${field}`([
      { label: "Learner", value: invoiceDraft.studentId },
      { label: "Student name", value: invoiceDraft.studentName },
      { label: "Amount", value: invoiceDraft.amount },
    ]);
    const amountMinor = toMinorUnits(invoiceDraft.amount);

    if (validationError) {
      setInvoiceError(validationError);
      return;
    }

    if (!amountMinor) {
      setInvoiceError("Amount must be a number greater than zero.");
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()}`,
          total_amount_minor: amountMinor,
          due_at: invoiceDraft.dueAt.trim()
            ? new Date(invoiceDraft.dueAt.trim()).toISOString()
            : undefined,
          metadata: {
            student_id: invoiceDraft.studentId.trim(),
            student_name: invoiceDraft.studentName.trim(),
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Invoice could not be created.");
      }

      setInvoiceError(null);
      setFinanceMessage(`Invoice created for ${invoiceDraft.studentName.trim()}.`);
      setInvoiceDraft({ studentId: "", studentName: "", amount: "", dueAt: "" });
      setSelectedInvoiceLearner(null);
      setShowInvoiceModal(false);
      await loadFinanceActivity();
      await loadStudentBalances();
    } catch (caught) {
      setInvoiceError(caught instanceof Error ? caught.message : "Invoice could not be created.");
    }
  }

  async function savePayment() {
    const validationError = (field: string) => `Missing ${field}`([
      { label: "Student or invoice", value: paymentDraft.student_id || paymentDraft.invoice_id },
      { label: "Amount", value: paymentDraft.amount },
      { label: "Reference", value: paymentDraft.reference },
    ]);
    const amountMinor = toMinorUnits(paymentDraft.amount);

    if (validationError) {
      setPaymentError(validationError);
      return;
    }

    if (!amountMinor) {
      setPaymentError("Amount must be a number greater than zero.");
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          idempotency_key: `finance-quick-${crypto.randomUUID()}`,
          payment_method: paymentDraft.payment_method,
          amount_minor: amountMinor,
          student_id: paymentDraft.student_id.trim() || undefined,
          invoice_id: paymentDraft.invoice_id.trim() || undefined,
          payer_name: paymentDraft.payer_name.trim() || undefined,
          deposit_reference: paymentDraft.reference.trim(),
          external_reference: paymentDraft.reference.trim(),
          metadata: {
            source: "school_finance_quick_entry",
            student_name: paymentDraft.payer_name.trim() || undefined,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Payment could not be recorded.");
      }

      setPaymentError(null);
      setFinanceMessage("Payment recorded and posted to finance activity.");
      setPaymentDraft({
        payment_method: "cash",
        student_id: "",
        invoice_id: "",
        payer_name: "",
        amount: "",
        reference: "",
      });
      setSelectedPaymentLearner(null);
      setShowPaymentModal(false);
      await loadFinanceActivity();
      await loadStudentBalances();
      await loadReconciliationReport();
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : "Payment could not be recorded.");
    }
  }

  const invoiceOptions = activity
    .filter((entry) => entry.kind === "invoice")
    .map((entry) => ({
      id: entry.invoice_id ?? entry.id,
      reference: entry.reference,
      studentId: entry.student_id,
      studentName: entry.student_name,
      amount: formatMinorKes(entry.amount_minor),
      status: entry.status,
    }));
  const filteredInvoiceOptions = invoiceOptions.filter(
    (invoice) => !selectedPaymentLearner || invoice.studentId === selectedPaymentLearner.id,
  );

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Fees and payments"
        title="Collections desk"
        description="Record payments, generate statements, and keep balances obvious enough for bursars and admins to trust instantly."
        actions={
          <>
            <Button variant="secondary" onClick={openInvoiceModal}>
              Create invoice
            </Button>
            <Button onClick={openPaymentModal}>Record payment</Button>
          </>
        }
      />
      {financeMessage ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground"
        >
          {financeMessage}
        </div>
      ) : null}
      {!summaryLoading && summaryData ? (
        <MetricGrid
          columns="three"
          items={[
            {
              id: "collections",
              label: "Today Collections",
              value: summaryData.collectionsToday || "KES 0",
              helper: "Ledger activity",
              trend: summaryData.trendLabel || "Stable",
            },
            {
              id: "outstanding",
              label: "Outstanding Invoices",
              value: summaryData.outstandingInvoices || "KES 0",
              helper: "To be collected",
              trend: "Needs review",
            },
            {
              id: "failed",
              label: "Failed Payments",
              value: summaryData.failedPayments || "0",
              helper: "Requires follow-up",
              trend: "Action required",
            },
          ]}
        />
      ) : (
        <MetricGrid items={buildFinanceSummaryItems(activity, activityLoading)} />
      )}
      <SubscriptionLifecyclePanel subscription={subscription} role={role} routeMode={routeMode} tenantSlug={tenantSlug} />
      <section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fee setup</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Term billing control</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Build structured fees, then generate controlled invoices for the selected student rows.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadFeeStructures()}>
            Refresh
          </Button>
        </div>
        {feeStructureError ? (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {feeStructureError}
          </div>
        ) : null}
        {bulkError ? (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {bulkError}
          </div>
        ) : null}
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-foreground md:col-span-2">
                <span className="font-medium">Fee name</span>
                <input
                  aria-label="Fee structure name"
                  className="input-base"
                  value={feeStructureDraft.name}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, name: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Academic year</span>
                <input
                  aria-label="Fee structure academic year"
                  className="input-base"
                  value={feeStructureDraft.academic_year}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, academic_year: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Term</span>
                <input
                  aria-label="Fee structure term"
                  className="input-base"
                  value={feeStructureDraft.term}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, term: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Grade level</span>
                <input
                  aria-label="Fee structure grade level"
                  className="input-base"
                  value={feeStructureDraft.grade_level}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, grade_level: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Class</span>
                <input
                  aria-label="Fee structure class"
                  className="input-base"
                  value={feeStructureDraft.class_name}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, class_name: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Status</span>
                <select
                  aria-label="Fee structure status"
                  className="input-base"
                  value={feeStructureDraft.status}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({
                      ...current,
                      status: event.target.value as FeeStructureResponse["status"],
                    }));
                    setFeeStructureError(null);
                  }}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Due days</span>
                <input
                  aria-label="Fee structure due days"
                  className="input-base"
                  inputMode="numeric"
                  value={feeStructureDraft.due_days}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, due_days: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Line items</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFeeLineItems((current) => [...current, createEmptyFeeLineItemDraft()])}
                >
                  Add line
                </Button>
              </div>
              {feeLineItems.map((item) => (
                <div key={item.id} className="grid gap-2 md:grid-cols-[0.8fr_1.2fr_0.8fr_auto]">
                  <input
                    aria-label="Fee line item code"
                    className="input-base"
                    value={item.code}
                    onChange={(event) => updateFeeLineItem(item.id, "code", event.target.value)}
                  />
                  <input
                    aria-label="Fee line item label"
                    className="input-base"
                    value={item.label}
                    onChange={(event) => updateFeeLineItem(item.id, "label", event.target.value)}
                  />
                  <input
                    aria-label="Fee line item amount"
                    className="input-base"
                    inputMode="decimal"
                    value={item.amount}
                    onChange={(event) => updateFeeLineItem(item.id, "amount", event.target.value)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeFeeLineItem(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={() => void saveFeeStructure()}>Save fee structure</Button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-foreground md:col-span-2">
                <span className="font-medium">Fee structure</span>
                <select
                  aria-label="Bulk billing fee structure"
                  className="input-base"
                  value={bulkDraft.fee_structure_id}
                  onChange={(event) => {
                    setBulkDraft((current) => ({ ...current, fee_structure_id: event.target.value }));
                    setBillableStudents([]);
                    setSelectedBulkStudentIds(new Set());
                    setBulkStudents([]);
                    setBulkError(null);
                  }}
                >
                  <option value="">Select fee structure</option>
                  {feeStructures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name} - {structure.grade_level} {structure.term}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Due date</span>
                <input
                  aria-label="Bulk billing due date"
                  className="input-base"
                  type="date"
                  value={bulkDraft.due_at}
                  onChange={(event) => {
                    setBulkDraft((current) => ({ ...current, due_at: event.target.value }));
                    setBulkError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Batch key</span>
                <input
                  aria-label="Bulk billing idempotency key"
                  className="input-base"
                  value={bulkDraft.idempotency_key}
                  onChange={(event) => {
                    setBulkDraft((current) => ({ ...current, idempotency_key: event.target.value }));
                    setBulkError(null);
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void loadBillableStudentsForSelectedFeeStructure()}
                disabled={billableStudentsLoading}
              >
                {billableStudentsLoading ? "Loading roster" : "Load roster"}
              </Button>
              <Button onClick={() => void generateBulkFeeInvoices()} disabled={!canGenerateBulkInvoices}>
                Generate invoices
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Selected students</p>
                  <p className="text-xs text-muted-foreground">
                    {bulkStudents.length > 0
                      ? `${bulkStudents.length} selected for invoice generation`
                      : "Select roster learners or add a manual row before generating invoices."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBulkStudents((current) => [...current, createEmptyBulkFeeStudentDraft()])}
                >
                  Add student
                </Button>
              </div>
              {bulkStudents.map((student) => (
                <div key={student.student_id} className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.9fr_auto]">
                  <input
                    aria-label="Bulk billing learner roster key"
                    className="input-base"
                    value={student.student_id}
                    onChange={(event) => updateBulkStudent(student.student_id, "student_id", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing student name"
                    className="input-base"
                    value={student.student_name}
                    onChange={(event) => updateBulkStudent(student.student_id, "student_name", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing admission number"
                    className="input-base"
                    value={student.admission_number}
                    onChange={(event) => updateBulkStudent(student.student_id, "admission_number", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing class"
                    className="input-base"
                    value={student.class_name}
                    onChange={(event) => updateBulkStudent(student.student_id, "class_name", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing guardian phone"
                    className="input-base"
                    value={student.guardian_phone}
                    onChange={(event) => updateBulkStudent(student.student_id, "guardian_phone", event.target.value)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeBulkStudent(student.student_id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <DataTable
              title="Billable roster"
              subtitle={billableStudentsLoading ? "Loading active students..." : "Active students matched to the selected fee structure."}
              actions={
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{selectedBulkStudentIds.size} selected</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAllVisibleBulkRosterStudents}
                    disabled={billableStudents.length === 0}
                  >
                    Select all visible
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearBulkRosterSelection}
                    disabled={selectedBulkStudentIds.size === 0}
                  >
                    Clear selection
                  </Button>
                </div>
              }
              columns={[
                {
                  id: "select",
                  header: "Select",
                  render: (row) => (
                    <input
                      aria-label={`Select ${row.student_name} for bulk billing`}
                      className="h-4 w-4 rounded border-border text-primary focus-ring"
                      type="checkbox"
                      checked={selectedBulkStudentIds.has(row.student_id)}
                      onChange={() => toggleBulkRosterStudent(row)}
                    />
                  ),
                },
                { id: "student", header: "Student", render: (row) => row.student_name },
                { id: "admission", header: "Admission", render: (row) => row.admission_number },
                {
                  id: "class",
                  header: "Class",
                  render: (row) => `${row.grade_level}${row.class_name ? ` / ${row.class_name}` : ""}`,
                },
                { id: "guardian", header: "Guardian phone", render: (row) => row.guardian_phone ?? "Not set" },
              ]}
              rows={billableStudents}
              getRowKey={(row) => row.student_id}
              emptyMessage={billableStudentsLoading ? "Loading roster students..." : "No roster students loaded for this fee structure."}
            />
          </div>
        </div>
        <DataTable
          title="Fee structures"
          subtitle={feeStructuresLoading ? "Loading fee structures..." : "School fee plans available for bulk billing."}
          columns={[
            { id: "name", header: "Name", render: (row) => row.name },
            {
              id: "scope",
              header: "Scope",
              render: (row) => `${row.academic_year} / ${row.term} / ${row.grade_level}${row.class_name ? ` / ${row.class_name}` : ""}`,
            },
            { id: "items", header: "Items", render: (row) => String(row.line_items.length), className: "text-right", headerClassName: "text-right" },
            { id: "total", header: "Total", render: (row) => formatMinorKes(row.total_amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "due", header: "Due days", render: (row) => String(row.due_days), className: "text-right", headerClassName: "text-right" },
            {
              id: "status",
              header: "Status",
              render: (row) => (
                <StatusPill
                  label={row.status}
                  tone={row.status === "active" ? "ok" : row.status === "draft" ? "warning" : "critical"}
                />
              ),
            },
            {
              id: "actions",
              header: "Actions",
              render: (row) =>
                row.status === "archived" ? (
                  <span className="text-xs text-muted-foreground">Archived</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => void archiveFeeStructure(row)}>
                    Archive
                  </Button>
                ),
            },
          ]}
          rows={feeStructures}
          getRowKey={(row) => row.id}
          emptyMessage={feeStructuresLoading ? "Loading fee structures..." : "No fee structures have been created yet."}
        />
      </section>
      <section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reconciliation</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Accountant collection control</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Match cleared collections, pending bank work, and exception receipts across payment channels.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <input
              aria-label="Reconciliation from date"
              className="input-base"
              type="date"
              value={reconciliationFilters.from}
              onChange={(event) =>
                setReconciliationFilters((current) => ({ ...current, from: event.target.value }))
              }
            />
            <input
              aria-label="Reconciliation to date"
              className="input-base"
              type="date"
              value={reconciliationFilters.to}
              onChange={(event) =>
                setReconciliationFilters((current) => ({ ...current, to: event.target.value }))
              }
            />
            <select
              aria-label="Reconciliation payment method"
              className="input-base"
              value={reconciliationFilters.method}
              onChange={(event) =>
                setReconciliationFilters((current) => ({
                  ...current,
                  method: event.target.value as ManualReceiptMethod | "all",
                }))
              }
            >
              <option value="all">All methods</option>
              {Object.entries(manualReceiptMethodLabels).map(([method, label]) => (
                <option key={method} value={method}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void loadReconciliationReport()}>
              Run
            </Button>
            <Button onClick={() => void exportReconciliationReport()}>
              Export
            </Button>
          </div>
        </div>
        {reconciliationError ? (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {reconciliationError}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cleared</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : formatMinorKes(reconciliation?.totals.cleared_amount_minor ?? "0")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : formatMinorKes(reconciliation?.totals.pending_amount_minor ?? "0")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exceptions</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : formatMinorKes(reconciliation?.totals.exception_amount_minor ?? "0")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transactions</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : String(reconciliation?.totals.transaction_count ?? 0)}
            </p>
          </div>
        </div>
        <DataTable
          title="Method summary"
          subtitle={reconciliationLoading ? "Loading channel totals..." : "Cleared, pending, and exception totals by collection channel."}
          columns={[
            { id: "method", header: "Method", render: (row: any) => manualReceiptMethodLabels[row.payment_method as ManualReceiptMethod] },
            { id: "count", header: "Count", render: (row: any) => String(row.transaction_count), className: "text-right", headerClassName: "text-right" },
            { id: "cleared", header: "Cleared", render: (row: any) => formatMinorKes(row.cleared_amount_minor), className: "text-right", headerClassName: "text-right" },
            { id: "pending", header: "Pending", render: (row: any) => formatMinorKes(row.pending_amount_minor), className: "text-right", headerClassName: "text-right" },
            { id: "exceptions", header: "Exceptions", render: (row: any) => formatMinorKes(row.exception_amount_minor), className: "text-right", headerClassName: "text-right" },
          ]}
          rows={reconciliation?.method_summaries ?? []}
          getRowKey={(row) => row.payment_method}
          emptyMessage={reconciliationLoading ? "Loading reconciliation method totals..." : "No method totals for this period."}
        />
        <DataTable
          title="Reconciliation register"
          subtitle={reconciliationLoading ? "Loading receipt register..." : "Receipt-level accountant control for the selected period."}
          columns={[
            { id: "occurred", header: "Occurred", render: (row: any) => formatActivityDate(row.occurred_at) },
            { id: "receipt", header: "Receipt", render: (row: any) => row.receipt_number },
            { id: "method", header: "Method", render: (row: any) => manualReceiptMethodLabels[row.payment_method as ManualReceiptMethod] },
            { id: "amount", header: "Amount", render: (row: any) => formatMinorKes(row.amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "reference", header: "Reference", render: (row: any) => row.reference },
            { id: "ledger", header: "Ledger", render: (row: any) => row.ledger_transaction_id ?? row.reversal_ledger_transaction_id ?? "Pending" },
            {
              id: "bucket",
              header: "Bucket",
              render: (row: any) => (<StatusPill label={row.reconciliation_bucket} tone={(financeReconciliationBucketTone[row.reconciliation_bucket] as any) ?? "neutral"} />),
            },
          ]}
          rows={reconciliation?.rows ?? []}
          getRowKey={(row) => row.payment_id}
          emptyMessage={reconciliationLoading ? "Loading reconciliation receipts..." : "No receipts match this reconciliation period."}
        />
      </section>
      <DataTable
        title="Payment history"
        subtitle={activityLoading ? "Loading persisted finance activity..." : "Invoices and ledger-backed receipts from the live billing system."}
        columns={[
          { id: "student", header: "Student", render: (row) => row.student },
          { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "method", header: "Method", render: (row) => row.method },
          { id: "date", header: "Date", render: (row) => row.date },
          { id: "reference", header: "Reference", render: (row: any) => row.reference },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={activityLoading ? "Loading finance activity..." : "No finance activity has been posted yet."}
      />
      <DataTable
        title="Student balances"
        subtitle={balancesLoading ? "Loading persisted student statements..." : "Outstanding balances from live invoices, cleared allocations, and unapplied credits."}
        columns={[
          {
            id: "student",
            header: "Student",
            render: (row) => row.student_name ?? row.student_id,
          },
          {
            id: "invoiced",
            header: "Invoiced",
            render: (row) => formatMinorKes(row.invoiced_amount_minor),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "paid",
            header: "Paid",
            render: (row) => formatMinorKes(row.paid_amount_minor),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "credit",
            header: "Credit",
            render: (row) => formatMinorKes(row.credit_amount_minor),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "balance",
            header: "Balance",
            render: (row) => formatMinorKes(row.balance_amount_minor),
            className: "text-right font-semibold",
            headerClassName: "text-right",
          },
          {
            id: "invoiceCount",
            header: "Invoices",
            render: (row) => String(row.invoice_count),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "lastActivity",
            header: "Last activity",
            render: (row) => (row.last_activity_at ? formatActivityDate(row.last_activity_at) : "No activity"),
          },
          {
            id: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void openStudentStatement(row)}>
                  View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void exportStudentStatement(row.student_id)}>
                  Export
                </Button>
              </div>
            ),
          },
        ]}
        rows={balances}
        getRowKey={(row) => row.student_id}
        emptyMessage={balancesLoading ? "Loading student balances..." : "No student balances have been created yet."}
      />
      <Modal
        open={Boolean(statement || statementLoading || statementError)}
        title={statement ? `${statement.summary.student_name ?? statement.summary.student_id} fee statement` : "Student statement"}
        description="Invoice debits, receipt credits, pending payments, and running balance from persisted billing records."
        onClose={closeStatementModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeStatementModal}>
              Close
            </Button>
            {statement ? (
              <Button onClick={() => void exportStudentStatement(statement.summary.student_id)}>
                Export CSV
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-5">
          {statementError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {statementError}
            </div>
          ) : null}
          {statementLoading ? (
            <div className="rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm text-muted-foreground">
              Loading statement activity...
            </div>
          ) : null}
          {statement ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoiced</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.invoiced_amount_minor)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.paid_amount_minor)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credit</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.credit_amount_minor)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.balance_amount_minor)}</p>
                </div>
              </div>
              <DataTable
                title="Statement activity"
                subtitle="Running balance from invoice debits and receipt credits."
                columns={[
                  { id: "date", header: "Date", render: (row: any) => formatActivityDate(row.occurred_at) },
                  { id: "type", header: "Type", render: (row) => row.kind },
                  { id: "reference", header: "Reference", render: (row: any) => row.reference },
                  { id: "description", header: "Description", render: (row) => row.description },
                  {
                    id: "debit",
                    header: "Debit",
                    render: (row) => formatMinorKes(row.debit_amount_minor),
                    className: "text-right",
                    headerClassName: "text-right",
                  },
                  {
                    id: "credit",
                    header: "Credit",
                    render: (row) => formatMinorKes(row.credit_amount_minor),
                    className: "text-right",
                    headerClassName: "text-right",
                  },
                  {
                    id: "balance",
                    header: "Balance",
                    render: (row) => formatMinorKes(row.balance_after_minor),
                    className: "text-right font-semibold",
                    headerClassName: "text-right",
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={getStatementEntryTone(row)} />,
                  },
                ]}
                rows={statement.entries}
                getRowKey={(row) => row.id}
                emptyMessage="No statement activity found."
              />
            </>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={showInvoiceModal}
        title="Create invoice"
        description="Generate a new fee invoice that appears in the collections desk immediately."
        onClose={closeInvoiceModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeInvoiceModal}>
              Cancel
            </Button>
            <Button onClick={saveInvoice}>Create invoice</Button>
          </>
        }
      >
        <div className="space-y-4">
          {invoiceError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {invoiceError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <LearnerPicker
              label="Learner"
              tenantSlug={tenantSlug ?? ""}
              value={selectedInvoiceLearner}
              onChange={(learner) => {
                setSelectedInvoiceLearner(learner);
                setInvoiceDraft((current) => ({
                  ...current,
                  studentId: learner?.id ?? "",
                  studentName: learner?.name ?? "",
                }));
                setInvoiceError(null);
              }}
              hint="Search name or admission number, then enter the invoice amount."
            />
          </div>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Student name</span>
            <input
              aria-label="Invoice student"
              value={invoiceDraft.studentName}
              onChange={(event) => {
                setInvoiceDraft((current) => ({ ...current, studentName: event.target.value }));
                setInvoiceError(null);
              }}
              className="input-base"
              placeholder="Learner full name"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Amount</span>
            <input
              aria-label="Invoice amount"
              value={invoiceDraft.amount}
              onChange={(event) => {
                setInvoiceDraft((current) => ({ ...current, amount: event.target.value }));
                setInvoiceError(null);
              }}
              className="input-base"
              inputMode="numeric"
              placeholder="Amount in KES"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground md:col-span-2">
            <span className="font-medium">Due date</span>
            <input
              aria-label="Invoice due date"
              value={invoiceDraft.dueAt}
              onChange={(event) => {
                setInvoiceDraft((current) => ({ ...current, dueAt: event.target.value }));
                setInvoiceError(null);
              }}
              className="input-base"
              type="date"
            />
          </label>
        </div>
        </div>
      </Modal>
      <Modal
        open={showPaymentModal}
        title="Record payment"
        description="Post a payment reference straight into the fee history ledger."
        onClose={closePaymentModal}
        footer={
          <>
            <Button variant="secondary" onClick={closePaymentModal}>
              Cancel
            </Button>
            <Button onClick={savePayment}>Save payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          {paymentError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {paymentError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Method</span>
            <select
              aria-label="Payment method"
              value={paymentDraft.payment_method}
              onChange={(event) => {
                setPaymentDraft((current) => ({
                  ...current,
                  payment_method: event.target.value as ManualReceiptMethod,
                }));
                setPaymentError(null);
              }}
              className="input-base"
            >
              {manualReceiptSelectableMethods
                .filter((method) => method !== "cheque")
                .map((method) => (
                  <option key={method} value={method}>
                    {manualReceiptMethodLabels[method]}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Amount</span>
            <input
              aria-label="Payment amount"
              value={paymentDraft.amount}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, amount: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
              inputMode="numeric"
              placeholder="Amount in KES"
            />
          </label>
          <div className="space-y-2 text-sm text-foreground">
            <LearnerPicker
              label="Payment student or admission number"
              tenantSlug={tenantSlug ?? ""}
              value={selectedPaymentLearner}
              onChange={(learner) => {
                setSelectedPaymentLearner(learner);
                setPaymentDraft((current) => ({
                  ...current,
                  student_id: learner?.id ?? "",
                }));
                setPaymentError(null);
              }}
            />
          </div>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Select invoice</span>
            <select
              aria-label="Payment invoice"
              value={paymentDraft.invoice_id}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, invoice_id: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
            >
              <option value="">Match automatically or select invoice</option>
              {filteredInvoiceOptions.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.reference} - {invoice.studentName ?? "Learner"} - {invoice.amount}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-foreground md:col-span-2">
            <span className="font-medium">Payer name</span>
            <input
              aria-label="Payment payer name"
              value={paymentDraft.payer_name}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, payer_name: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
              placeholder="Parent or payer name"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground md:col-span-2">
            <span className="font-medium">Reference</span>
            <input
              aria-label="Payment reference"
              value={paymentDraft.reference}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, reference: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
              placeholder="Payment reference"
            />
          </label>
        </div>
        </div>
      </Modal>
    </div>
  );
}
