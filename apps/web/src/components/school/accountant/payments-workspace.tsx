import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import { getMonthStartInputValue, getTodayInputValue } from "@/lib/date-utils";
import {
  downloadCsvFile,
  downloadTextFile,
  openPrintDocument,
  type CsvReportArtifactResponse,
} from "@/lib/dashboard/export";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { redirectOnExpiredSessionResponse } from "@/lib/auth/session-expiry-client";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import { buildBillingApiPath, toMinorUnits, formatMinorKes, formatActivityDate } from "@/lib/billing/billing-utils";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { LearnerPicker } from "@/components/common/learner-picker";
import { getMissingFieldError } from "@/lib/forms/validation";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { buildFeeStructureLineItems, buildBulkFeeStudents, type BulkFeeInvoiceGenerationResponse, SubscriptionLifecyclePanel, buildFinanceSummaryItems, type FinanceActivityResponse, type FinanceActivityRow, type StudentFeeBalanceResponse, type StudentFeeStatementResponse, type FinanceReconciliationResponse, type FeeStructureResponse, type FeeLineItemDraft, type BillableFeeStudentResponse, type BulkFeeStudentDraft, toBulkFeeStudentDraft } from "@/components/school/school-pages";

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

const manualReceiptSelectableMethods: ManualReceiptMethod[] = [
  "cash",
  "cheque",
  "bank_deposit",
  "eft",
  "mpesa_c2b",
];

import type { StatusTone } from "@/lib/dashboard/types";

const financeReconciliationBucketTone: Record<string, StatusTone> = {
  cleared: "ok",
  pending: "warning",
  exception: "critical",
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

function getStatementEntryTone(entry: { status: string; debit_amount_minor: string; credit_amount_minor: string }): import("@/lib/dashboard/types").StatusTone | import("@/lib/dashboard/types").SyncState {
  if (entry.status === "voided" || entry.status === "reversed") return "warning";
  if (entry.status === "pending" || entry.status === "processing") return "warning";
  if (entry.status === "failed") return "critical";
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

export function PaymentsWorkspace({
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
        | { message?: string }
        | null;

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.message
            ? payload.message
            : "Fee structures could not be loaded.",
        );
      }

      setFeeStructures(payload);
      setBulkDraft((current) => ({
        ...current,
        fee_structure_id: current.fee_structure_id || payload[0]?.id || "",
      }));
    } catch (caught) {
      setFeeStructures([]);
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structures could not be loaded.");
    } finally {
      setFeeStructuresLoading(false);
    }
  }

    async function loadActivity() {
    setActivityLoading(true);
    try {
      const response = await fetch(buildBillingApiPath("/api/billing/finance-activity", tenantSlug), { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (response.ok && Array.isArray(payload)) {
        setActivity(payload);
        setRows(payload.map((item) => ({
          id: item.id,
          student: item.student_name ?? item.student_id ?? "Unknown",
          amount: formatMinorKes(item.amount_minor),
          method: item.method,
          date: formatActivityDate(item.occurred_at),
          reference: item.reference,
          status: item.status,
          statusTone: item.status === "cleared" ? "ok" : item.status === "failed" ? "critical" : "warning",
        })));
      } else {
        setActivity([]);
        setRows([]);
      }
    } catch (e) {
      setActivity([]);
      setRows([]);
    } finally {
      setActivityLoading(false);
    }
  }

  useEffect(() => {
    void loadActivity();
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
      current.map((student) => (student.id === id ? { ...student, [field]: value } : student)),
    );
    setBulkError(null);
  }

  function removeBulkStudent(id: string) {
    setBulkStudents((current) =>
      current.length === 1 ? [] : current.filter((student) => student.id !== id),
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
    const validationError = getMissingFieldError([
      { label: "Fee name", value: feeStructureDraft.name },
      { label: "Academic year", value: feeStructureDraft.academic_year },
      { label: "Term", value: feeStructureDraft.term },
      { label: "Grade level", value: feeStructureDraft.grade_level },
    ]);
    const dueDays = Number(feeStructureDraft.due_days);
    const lineItemResult = buildFeeStructureLineItems(feeLineItems);

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
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("id" in payload)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Fee structure could not be saved.");
      }

      setFeeStructureError(null);
      setFinanceMessage(`${payload.name} saved for ${payload.grade_level}.`);
      setBulkDraft((current) => ({ ...current, fee_structure_id: payload.id }));
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
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("id" in payload)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Fee structure could not be archived.");
      }

      setFeeStructureError(null);
      setFinanceMessage(`${payload.name} archived.`);
      setBillableStudents([]);
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);
      setBulkDraft((current) => ({
        ...current,
        fee_structure_id: current.fee_structure_id === payload.id ? "" : current.fee_structure_id,
      }));
      await loadFeeStructures();
    } catch (caught) {
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structure could not be archived.");
    }
  }

  async function generateBulkFeeInvoices() {
    const selectedFeeStructureId = bulkDraft.fee_structure_id.trim();
    const studentResult = buildBulkFeeStudents(bulkStudents);

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
        `bulk-fees-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("generated_count" in payload)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Bulk invoices could not be generated.");
      }

      setBulkError(null);
      setFinanceMessage(`${payload.generated_count} invoices generated; ${payload.skipped_count} duplicate rows skipped.`);
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
        | { message?: string }
        | null;

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.message
            ? payload.message
            : "Billable roster could not be loaded.",
        );
      }

      setBillableStudents(payload);
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);

      if (payload.length === 0) {
        setFinanceMessage("No active roster students matched this fee structure.");
        return;
      }

      setFinanceMessage(`${payload.length} roster students loaded. Select learners to bill.`);
    } catch (caught) {
      setBillableStudents([]);
      setBulkError(caught instanceof Error ? caught.message : "Billable roster could not be loaded.");
    } finally {
      setBillableStudentsLoading(false);
    }
  }

  async function saveInvoice() {
    const validationError = getMissingFieldError([
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
    const validationError = getMissingFieldError([
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
          idempotency_key: `finance-quick-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      <SubscriptionLifecyclePanel subscription={subscription} role={role} routeMode={routeMode} />
      <DataTable
        title="Payment history"
        subtitle={activityLoading ? "Loading persisted finance activity..." : "Invoices and ledger-backed receipts from the live billing system."}
        columns={[
          { id: "student", header: "Student", render: (row) => row.student },
          { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "method", header: "Method", render: (row) => row.method },
          { id: "date", header: "Date", render: (row) => row.date },
          { id: "reference", header: "Reference", render: (row) => row.reference },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={activityLoading ? "Loading finance activity..." : "No finance activity has been posted yet."}
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
                  { id: "date", header: "Date", render: (row) => formatActivityDate(row.occurred_at) },
                  { id: "type", header: "Type", render: (row) => row.kind },
                  { id: "reference", header: "Reference", render: (row) => row.reference },
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








