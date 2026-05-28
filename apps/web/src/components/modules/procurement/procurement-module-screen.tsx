"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ClipboardCheck,
  FileText,
  PackagePlus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { StatusTone } from "@/lib/dashboard/types";

type ProcurementRequestRow = {
  id: string;
  title: string;
  department?: string;
  status?: string;
  estimated_total_minor?: string | number;
};

type ProcurementSupplierRow = {
  id: string;
  name: string;
  category?: string;
  status?: string;
};

type ProcurementPurchaseOrderRow = {
  id: string;
  po_number: string;
  supplier_name?: string;
  status?: string;
  total_amount_minor?: string | number;
};

type ProcurementInvoiceRow = {
  id: string;
  invoice_number: string;
  supplier_name?: string;
  status?: string;
  amount_minor?: string | number;
};

export type ProcurementDashboard = {
  open_requests: number;
  pending_approvals: number;
  active_suppliers: number;
  purchase_order_count: number;
  invoices_attached: number;
  budget_committed_minor: string | number;
  requests: ProcurementRequestRow[];
  suppliers: ProcurementSupplierRow[];
  purchase_orders: ProcurementPurchaseOrderRow[];
  invoices: ProcurementInvoiceRow[];
};

type ProcurementAction = "supplier" | "request" | "approval" | "purchase-order" | "invoice";

const emptyDashboard: ProcurementDashboard = {
  open_requests: 0,
  pending_approvals: 0,
  active_suppliers: 0,
  purchase_order_count: 0,
  invoices_attached: 0,
  budget_committed_minor: 0,
  requests: [],
  suppliers: [],
  purchase_orders: [],
  invoices: [],
};

const fieldClassName =
  "w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/50 focus:shadow-[var(--shadow-focus)]";

function normalizeDashboard(payload: unknown): ProcurementDashboard {
  const source = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;
  const value = source && typeof source === "object" ? source as Partial<ProcurementDashboard> : {};

  return {
    ...emptyDashboard,
    ...value,
    requests: Array.isArray(value.requests) ? value.requests : [],
    suppliers: Array.isArray(value.suppliers) ? value.suppliers : [],
    purchase_orders: Array.isArray(value.purchase_orders) ? value.purchase_orders : [],
    invoices: Array.isArray(value.invoices) ? value.invoices : [],
  };
}

function formatMoney(value: string | number | undefined) {
  const numeric = Number(value ?? 0) / 100;

  return `KES ${numeric.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStatus(value: string | undefined) {
  return (value ?? "pending").replaceAll("_", " ");
}

function statusTone(status: string | undefined): StatusTone {
  if (["rejected", "disputed", "void", "cancelled"].includes(status ?? "")) {
    return "critical";
  }

  if (["submitted", "returned", "draft", "issued", "attached"].includes(status ?? "")) {
    return "warning";
  }

  return "ok";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "ok",
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof ShoppingCart;
  tone?: StatusTone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold leading-none text-foreground">{value}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-white">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[13px] leading-5 text-muted">{helper}</p>
        <StatusPill label={tone} tone={tone} compact />
      </div>
    </Card>
  );
}

function ActionPanel({
  action,
  saving,
  onSubmit,
}: {
  action: ProcurementAction;
  saving: boolean;
  onSubmit: (action: ProcurementAction, data: FormData) => void;
}) {
  const titleMap: Record<ProcurementAction, string> = {
    supplier: "Supplier",
    request: "Request",
    approval: "Approval",
    "purchase-order": "Purchase order",
    invoice: "Invoice",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Procurement workflow
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{titleMap[action]}</h3>
        </div>
        <StatusPill label={saving ? "Posting" : "Ready"} tone={saving ? "warning" : "ok"} />
      </div>

      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit(action, new FormData(event.currentTarget));
        }}
      >
        {action === "supplier" ? (
          <>
            <Field label="Supplier name">
              <input className={fieldClassName} name="name" placeholder="Acme Supplies" required />
            </Field>
            <Field label="Category">
              <input className={fieldClassName} name="category" placeholder="Laboratory" />
            </Field>
            <Field label="Contact">
              <input className={fieldClassName} name="contact_name" placeholder="Contact person" />
            </Field>
            <Field label="Phone">
              <input className={fieldClassName} name="phone" placeholder="+254..." />
            </Field>
          </>
        ) : null}

        {action === "request" ? (
          <>
            <Field label="Title">
              <input className={fieldClassName} name="title" placeholder="Science lab reagents" required />
            </Field>
            <Field label="Department">
              <input className={fieldClassName} name="department" placeholder="Science" required />
            </Field>
            <Field label="Budget code">
              <input className={fieldClassName} name="budget_code" placeholder="SCI-2026" />
            </Field>
            <Field label="Item">
              <input className={fieldClassName} name="item_name" placeholder="Reagent pack" required />
            </Field>
            <Field label="Quantity">
              <input className={fieldClassName} name="quantity" type="number" min="1" placeholder="3" required />
            </Field>
            <Field label="Unit cost">
              <input className={fieldClassName} name="unit_cost" type="number" min="0" placeholder="40000" required />
            </Field>
          </>
        ) : null}

        {action === "approval" ? (
          <>
            <Field label="Request id">
              <input className={fieldClassName} name="request_id" placeholder="request uuid" required />
            </Field>
            <Field label="Decision">
              <select className={fieldClassName} name="decision" defaultValue="approved">
                <option value="approved">Approved</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Reason">
                <input className={fieldClassName} name="reason" placeholder="Within budget" />
              </Field>
            </div>
          </>
        ) : null}

        {action === "purchase-order" ? (
          <>
            <Field label="Supplier id">
              <input className={fieldClassName} name="supplier_id" placeholder="supplier uuid" required />
            </Field>
            <Field label="Request id">
              <input className={fieldClassName} name="request_id" placeholder="request uuid" />
            </Field>
            <Field label="Item">
              <input className={fieldClassName} name="item_name" placeholder="Reagent pack" required />
            </Field>
            <Field label="Quantity">
              <input className={fieldClassName} name="quantity" type="number" min="1" placeholder="3" required />
            </Field>
            <Field label="Unit cost">
              <input className={fieldClassName} name="unit_cost" type="number" min="0" placeholder="40000" required />
            </Field>
            <Field label="Delivery date">
              <input className={fieldClassName} name="expected_delivery_date" type="date" />
            </Field>
          </>
        ) : null}

        {action === "invoice" ? (
          <>
            <Field label="Purchase order id">
              <input className={fieldClassName} name="purchase_order_id" placeholder="purchase order uuid" required />
            </Field>
            <Field label="Invoice number">
              <input className={fieldClassName} name="invoice_number" placeholder="INV-001" required />
            </Field>
            <Field label="Amount">
              <input className={fieldClassName} name="amount_minor" type="number" min="0" placeholder="120000" required />
            </Field>
            <Field label="Invoice date">
              <input className={fieldClassName} name="invoice_date" type="date" />
            </Field>
          </>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>
            <ClipboardCheck className="h-4 w-4" />
            {saving ? "Posting..." : `Post ${titleMap[action].toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ListPanel({
  title,
  icon: Icon,
  rows,
  emptyLabel,
  renderRow,
}: {
  title: string;
  icon: typeof ShoppingCart;
  rows: Array<{ id: string }>;
  emptyLabel: string;
  renderRow: (row: { id: string }) => React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <StatusPill label={`${rows.length}`} tone={rows.length > 0 ? "ok" : "warning"} />
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
            {emptyLabel}
          </div>
        ) : rows.slice(0, 5).map((row) => (
          <div key={row.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            {renderRow(row)}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ProcurementModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: ProcurementDashboard;
}) {
  const [dashboard, setDashboard] = useState<ProcurementDashboard>(() => initialDashboard ?? emptyDashboard);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ProcurementAction>("request");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const budgetCommitted = useMemo(
    () => formatMoney(dashboard.budget_committed_minor),
    [dashboard.budget_committed_minor],
  );

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/procurement/dashboard", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Procurement dashboard could not be loaded.");
      }

      const payload = await response.json().catch(() => ({}));
      setDashboard(normalizeDashboard(payload));
      setMessage("Live procurement API connected");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Procurement dashboard could not be loaded.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshDashboard]);

  function value(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
  }

  function actionPayload(nextAction: ProcurementAction, formData: FormData) {
    if (nextAction === "supplier") {
      return {
        path: "/suppliers",
        method: "POST",
        body: {
          name: value(formData, "name"),
          category: value(formData, "category") || undefined,
          contact_name: value(formData, "contact_name") || undefined,
          phone: value(formData, "phone") || undefined,
        },
      };
    }

    if (nextAction === "request") {
      return {
        path: "/requests",
        method: "POST",
        body: {
          title: value(formData, "title"),
          department: value(formData, "department"),
          budget_code: value(formData, "budget_code") || undefined,
          items: [{
            item_name: value(formData, "item_name"),
            quantity: Number(value(formData, "quantity")),
            estimated_unit_cost_minor: Number(value(formData, "unit_cost")),
          }],
        },
      };
    }

    if (nextAction === "approval") {
      const requestId = value(formData, "request_id");

      return {
        path: `/requests/${requestId}/approval`,
        method: "PATCH",
        body: {
          decision: value(formData, "decision"),
          reason: value(formData, "reason") || undefined,
        },
      };
    }

    if (nextAction === "purchase-order") {
      return {
        path: "/purchase-orders",
        method: "POST",
        body: {
          supplier_id: value(formData, "supplier_id"),
          request_id: value(formData, "request_id") || undefined,
          expected_delivery_date: value(formData, "expected_delivery_date") || undefined,
          items: [{
            item_name: value(formData, "item_name"),
            quantity: Number(value(formData, "quantity")),
            unit_cost_minor: Number(value(formData, "unit_cost")),
          }],
        },
      };
    }

    const purchaseOrderId = value(formData, "purchase_order_id");

    return {
      path: `/purchase-orders/${purchaseOrderId}/invoices`,
      method: "POST",
      body: {
        invoice_number: value(formData, "invoice_number"),
        amount_minor: Number(value(formData, "amount_minor")),
        invoice_date: value(formData, "invoice_date") || undefined,
      },
    };
  }

  async function postAction(nextAction: ProcurementAction, formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const csrfToken = await getCsrfToken();
      const request = actionPayload(nextAction, formData);
      const response = await fetch(`/api/procurement${request.path}`, {
        method: request.method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),
        },
        body: JSON.stringify(request.body),
      });

      if (!response.ok) {
        throw new Error("Procurement action was not accepted.");
      }

      setMessage("Procurement operation posted");
      await refreshDashboard();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Procurement action was not accepted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-border bg-surface px-5 py-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={message ?? (error ? "API attention" : "Procurement")} tone={error ? "critical" : "ok"} />
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          {tenantSlug || "school"}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              Procurement operations
            </h2>
          </div>
          <Button variant="secondary" onClick={refreshDashboard} disabled={refreshing}>
            <RefreshCw className="h-4 w-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {error ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Requests" value={dashboard.open_requests} helper="Open requests" icon={PackagePlus} />
        <StatCard label="Approvals" value={dashboard.pending_approvals} helper="Pending approvals" icon={ShieldCheck} tone={dashboard.pending_approvals > 0 ? "warning" : "ok"} />
        <StatCard label="Suppliers" value={dashboard.active_suppliers} helper="Active suppliers" icon={Store} />
        <StatCard label="Orders" value={dashboard.purchase_order_count} helper="Purchase orders" icon={ShoppingCart} />
        <StatCard label="Invoices" value={dashboard.invoices_attached} helper="Invoices attached" icon={FileText} />
        <StatCard label="Budget" value={budgetCommitted} helper="Committed" icon={ClipboardCheck} />
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {(["request", "supplier", "approval", "purchase-order", "invoice"] as ProcurementAction[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setAction(item)}
            className={`rounded-[var(--radius-sm)] border px-4 py-3 text-left text-sm font-semibold transition ${
              action === item
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-border bg-surface-muted text-foreground hover:border-accent/20"
            }`}
          >
            {item.replace("-", " ")}
          </button>
        ))}
      </section>

      <ActionPanel action={action} saving={saving} onSubmit={postAction} />

      <section className="grid gap-5 xl:grid-cols-2">
        <ListPanel
          title="Requests"
          icon={PackagePlus}
          rows={dashboard.requests}
          emptyLabel="No procurement requests."
          renderRow={(row) => {
            const request = row as ProcurementRequestRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{request.title}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {request.department ?? "Department"} - {formatMoney(request.estimated_total_minor)}
                  </p>
                </div>
                <StatusPill label={formatStatus(request.status)} tone={statusTone(request.status)} />
              </div>
            );
          }}
        />
        <ListPanel
          title="Suppliers"
          icon={Store}
          rows={dashboard.suppliers}
          emptyLabel="No active suppliers."
          renderRow={(row) => {
            const supplier = row as ProcurementSupplierRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{supplier.name}</p>
                  <p className="mt-1 text-[13px] text-muted">{supplier.category ?? "General"}</p>
                </div>
                <StatusPill label={formatStatus(supplier.status)} tone={statusTone(supplier.status)} />
              </div>
            );
          }}
        />
        <ListPanel
          title="Purchase orders"
          icon={ShoppingCart}
          rows={dashboard.purchase_orders}
          emptyLabel="No purchase orders."
          renderRow={(row) => {
            const order = row as ProcurementPurchaseOrderRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.po_number}</p>
                  <p className="mt-1 text-[13px] text-muted">{order.supplier_name ?? "Supplier pending"}</p>
                </div>
                <StatusPill label={formatStatus(order.status)} tone={statusTone(order.status)} />
              </div>
            );
          }}
        />
        <ListPanel
          title="Invoices"
          icon={FileText}
          rows={dashboard.invoices}
          emptyLabel="No supplier invoices."
          renderRow={(row) => {
            const invoice = row as ProcurementInvoiceRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{invoice.invoice_number}</p>
                  <p className="mt-1 text-[13px] text-muted">{invoice.supplier_name ?? "Supplier pending"}</p>
                </div>
                <StatusPill label={formatStatus(invoice.status)} tone={statusTone(invoice.status)} />
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
