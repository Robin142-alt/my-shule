import { Eye, FileDown, Printer, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import {
  downloadCsvFile,
  openPrintDocument,
  type PrintableRow,
} from "@/lib/dashboard/export";
import type { StatusTone } from "@/lib/dashboard/types";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

import { OperationalStatePanel } from "./operational-state-panel";

export type OperationalTableColumn = {
  key: string;
  label: string;
};

export type OperationalTableRow = {
  id: string;
  cells: Record<string, string>;
  status?: {
    label: string;
    tone: StatusTone;
  };
  actions: string[];
};

export type OperationalTableContract = {
  title: string;
  description: string;
  searchPlaceholder: string;
  filters: string[];
  sortOptions: string[];
  columns: OperationalTableColumn[];
  rows: OperationalTableRow[];
  bulkActions: string[];
  exportLabel: string;
  printLabel: string;
};

function resolveOperationalSchoolId() {
  if (typeof window === "undefined") {
    return "default-school";
  }

  try {
    const configuredSchoolId = window.localStorage.getItem("myshule.currentSchoolId")?.trim();
    const routeSchoolId = window.location.pathname.match(/^\/school\/([^/?#]+)/)?.[1]?.trim();

    return configuredSchoolId || routeSchoolId || "default-school";
  } catch {
    return "default-school";
  }
}

export function OperationalTable({
  contract,
  emptyMessage = "No records require action.",
  onAction,
  showStatePanels = true,
}: {
  contract: OperationalTableContract;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  onAction?: (
    action: string,
    context: { scope: "export" | "print" | "filter" | "sort" | "bulk" | "row"; rowId?: string },
  ) => void | Promise<void>;
  showStatePanels?: boolean;
}) {
  const [rows, setRows] = useState<OperationalTableRow[]>(contract.rows);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<string>(contract.sortOptions[0] ?? "Newest");
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"success" | "warning" | "danger">("success");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const [detailRow, setDetailRow] = useState<OperationalTableRow | null>(null);
  const [editRow, setEditRow] = useState<OperationalTableRow | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [deleteRow, setDeleteRow] = useState<OperationalTableRow | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedFilter = activeFilter?.trim().toLowerCase() ?? "";
  const visibleRows = useMemo(() => {
    const searchedRows = normalizedSearch
      ? rows.filter((row) =>
        Object.values(row.cells).some((value) => value.toLowerCase().includes(normalizedSearch))
        || row.id.toLowerCase().includes(normalizedSearch)
        || row.actions.some((action) => action.toLowerCase().includes(normalizedSearch)),
      )
      : rows;

    const filteredRows = normalizedFilter
      ? searchedRows.filter((row) => {
        const haystack = [
          row.id,
          row.status?.label ?? "",
          ...Object.values(row.cells),
          ...row.actions,
        ].join(" ").toLowerCase();

        if (/urgent|high|priority/.test(normalizedFilter)) {
          return /urgent|high|critical|needs action|due/.test(haystack);
        }

        if (/pending|status|open/.test(normalizedFilter)) {
          return /pending|open|needs action|in progress|review/.test(haystack);
        }

        if (/today|due|sla|follow/.test(normalizedFilter)) {
          return /today|due|now|follow|pending/.test(haystack);
        }

        return haystack.includes(normalizedFilter);
      })
      : searchedRows;

    const priorityScore = (row: OperationalTableRow) => {
      const haystack = [
        row.status?.label ?? "",
        ...Object.values(row.cells),
      ].join(" ").toLowerCase();

      if (/critical|urgent|high|needs action|failed/.test(haystack)) return 0;
      if (/warning|pending|due|review|in progress/.test(haystack)) return 1;
      return 2;
    };

    if (/highest|priority/i.test(activeSort)) {
      return [...filteredRows].sort((a, b) => priorityScore(a) - priorityScore(b));
    }

    if (/due/i.test(activeSort)) {
      return [...filteredRows].sort((a, b) => {
        const aText = Object.values(a.cells).join(" ").toLowerCase();
        const bText = Object.values(b.cells).join(" ").toLowerCase();
        const aDue = /due|today|now/.test(aText) ? 0 : 1;
        const bDue = /due|today|now/.test(bText) ? 0 : 1;

        return aDue - bDue || priorityScore(a) - priorityScore(b);
      });
    }

    return filteredRows;
  }, [activeSort, rows, normalizedFilter, normalizedSearch]);
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selectedRows.has(row.id));

  function filenameFromTitle(extension: "csv" | "print") {
    const base = contract.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    return `${base || "school-records"}.${extension === "csv" ? "csv" : "html"}`;
  }

  function rowPrintRows(row: OperationalTableRow): PrintableRow[] {
    return contract.columns.map((column) => ({
      label: column.label,
      value: row.cells[column.key] ?? "-",
    }));
  }

  function rowDisplayName(row: OperationalTableRow) {
    const preferredKeys = [
      "student",
      "learner",
      "parent",
      "visitor",
      "book",
      "item",
      "asset",
      "route",
      "vehicle",
      "admission",
      "receipt",
    ];

    for (const key of preferredKeys) {
      const value = row.cells[key];

      if (value) {
        return value;
      }
    }

    return Object.values(row.cells).find(Boolean) ?? row.id;
  }

  function printRows(targetRows: OperationalTableRow[], title = contract.title) {
    const printableRows: PrintableRow[] = targetRows.flatMap((row, index) => [
      { label: `Record ${index + 1}`, value: row.id },
      ...rowPrintRows(row),
    ]);

    openPrintDocument({
      eyebrow: "School records printout",
      title,
      subtitle: contract.description,
      rows: printableRows.length ? printableRows : [{ label: "Result", value: "No rows matched the current view." }],
      footer: "Generated from MyShule. Confirm signatures where needed.",
    });
  }

  function exportRows(targetRows: OperationalTableRow[]) {
    downloadCsvFile({
      filename: filenameFromTitle("csv"),
      headers: contract.columns.map((column) => column.label),
      rows: targetRows.map((row) => contract.columns.map((column) => row.cells[column.key] ?? "")),
    });
  }

  function operationalEventType(action: string, scope: string) {
    return `operational_table.${scope}.${action.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "action"}`;
  }

  function publishTableAction(
    action: string,
    context: { scope: "export" | "print" | "filter" | "sort" | "bulk" | "row"; rowId?: string },
  ) {
    const selectedIds = selectedRows.size ? Array.from(selectedRows) : visibleRows.map((row) => row.id);
    const targetRows = context.rowId
      ? rows.filter((row) => row.id === context.rowId)
      : context.scope === "bulk"
        ? rows.filter((row) => selectedIds.includes(row.id))
        : visibleRows;
    const schoolId = getCurrentSchoolId(resolveOperationalSchoolId());
    const lowerAction = action.toLowerCase();

    return publishSchoolOperationalEvent({
      schoolId,
      type: operationalEventType(action, context.scope),
      module: "operational-table",
      actorRole: "school-staff",
      entityId: context.rowId ?? `${contract.title}:${context.scope}`,
      title: `${contract.title}: ${action}`,
      body: `${action} accepted for ${targetRows.length} ${targetRows.length === 1 ? "record" : "records"} in ${contract.title}.`,
      severity: /delete|reject|remove|deactivate|failed/.test(lowerAction) ? "warning" : "info",
      payload: {
        tableTitle: contract.title,
        action,
        scope: context.scope,
        rowId: context.rowId,
        selectedRowIds: context.scope === "bulk" ? selectedIds : undefined,
        visibleRecordCount: visibleRows.length,
        targetRecordCount: targetRows.length,
      },
      notifications: /sms|notify|reminder|alert|approve|reject|assign|escalate/.test(lowerAction)
        ? [
            {
              audienceRoles: ["Principal", "Deputy Principal", "System Monitor"],
              title: `${contract.title}: ${action}`,
              body: `${action} was recorded for ${targetRows.length} ${targetRows.length === 1 ? "record" : "records"}.`,
              severity: /reject|escalate|failed/.test(lowerAction) ? "warning" : "info",
              relatedModule: "operational-table",
              relatedRecordId: context.rowId,
              requiresAction: /approve|reject|assign|escalate/.test(lowerAction),
            },
          ]
        : undefined,
      sms: /sms/.test(lowerAction)
        ? targetRows.map((row) => ({
            recipient: row.cells.phone ?? row.cells.parentPhone ?? row.cells.contact ?? rowDisplayName(row),
            message: `${contract.title}: ${action} has been recorded for ${rowDisplayName(row)}.`,
          }))
        : undefined,
    });
  }

  function updateRowStatus(rowId: string, label: string, tone: StatusTone = "ok") {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              cells: {
                ...row.cells,
                status: label,
              },
              status: { label, tone },
            }
          : row,
      ),
    );
  }

  async function runRowAction(action: string, row: OperationalTableRow) {
    const normalized = action.toLowerCase();

    if (/view|open|review|details|audit|history/.test(normalized)) {
      setDetailRow(row);
    } else if (/edit|update|assign|verify|reconcile/.test(normalized)) {
      setEditRow(row);
      setEditValues(row.cells);
    } else if (/delete|remove|deactivate/.test(normalized)) {
      setDeleteRow(row);
      return;
    } else if (/approve/.test(normalized)) {
      updateRowStatus(row.id, "Approved", "ok");
    } else if (/reject/.test(normalized)) {
      updateRowStatus(row.id, "Rejected", "critical");
    } else if (/resolve|mark returned|return|check out|checkout/.test(normalized)) {
      updateRowStatus(row.id, "Resolved", "ok");
    } else if (/sms|notify|reminder|alert/.test(normalized)) {
      setNoticeTone("warning");
      setNotice(`${action} is being queued for ${row.cells.student ?? row.cells.parent ?? row.cells.visitor ?? row.id}.`);
    } else if (/print|slip|receipt|letter/.test(normalized)) {
      printRows([row], `${action} - ${row.id}`);
    } else if (/export/.test(normalized)) {
      exportRows([row]);
    } else {
      updateRowStatus(row.id, `${action} done`, "ok");
    }

    await runAction(action, { scope: "row", rowId: row.id });
  }

  async function runAction(
    action: string,
    context: { scope: "export" | "print" | "filter" | "sort" | "bulk" | "row"; rowId?: string },
  ) {
    const selectedCount = selectedRows.size;
    const suffix = context.rowId
      ? ` for ${context.rowId}`
      : context.scope === "bulk"
        ? selectedCount > 0
          ? ` for ${selectedCount} selected record${selectedCount === 1 ? "" : "s"}`
          : " after selecting records"
        : "";

    setBusyAction(`${context.scope}:${context.rowId ?? "all"}:${action}`);
    setNoticeTone("warning");
    setNotice(`${action}${suffix} is being processed...`);

    try {
      if (onAction) {
        await onAction(action, context);
      } else {
        publishTableAction(action, context);
      }
      setNoticeTone("success");
      setNotice(
        onAction
          ? `${action}${suffix} returned from the connected workflow.`
          : `${action}${suffix} was recorded for this school and queued for dashboard sync.`,
      );
    } catch (error) {
      setNoticeTone("danger");
      setNotice(error instanceof Error ? error.message : `${action}${suffix} failed. Try again.`);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBulkAction(action: string) {
    const targetIds = selectedRows.size ? selectedRows : new Set(visibleRows.map((row) => row.id));

    if (/approve/i.test(action)) {
      setRows((current) =>
        current.map((row) => targetIds.has(row.id) ? { ...row, cells: { ...row.cells, status: "Approved" }, status: { label: "Approved", tone: "ok" } } : row),
      );
    } else if (/sms|reminder|notify/i.test(action)) {
      setNoticeTone("warning");
      setNotice(`${action} is being queued for ${targetIds.size} record${targetIds.size === 1 ? "" : "s"}.`);
    }

    await runAction(action, { scope: "bulk" });
  }

  function toggleRow(rowId: string, checked: boolean) {
    setSelectedRows((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }

      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedRows((current) => {
      const next = new Set(current);

      visibleRows.forEach((row) => {
        if (checked) {
          next.add(row.id);
        } else {
          next.delete(row.id);
        }
      });

      return next;
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">School records</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">{contract.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{contract.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={contract.exportLabel}
            onClick={() => {
              exportRows(visibleRows);
              void runAction(contract.exportLabel, { scope: "export" });
            }}
            className="inline-flex items-center gap-2 rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground transition hover:-translate-y-0.5"
          >
            <FileDown className="h-3.5 w-3.5 text-accent" />
            {contract.exportLabel}
          </button>
          <button
            type="button"
            aria-label={contract.printLabel}
            onClick={() => {
              printRows(visibleRows);
              void runAction(contract.printLabel, { scope: "print" });
            }}
            className="inline-flex items-center gap-2 rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground transition hover:-translate-y-0.5"
          >
            <Printer className="h-3.5 w-3.5 text-accent" />
            {contract.printLabel}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Search records</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void runAction(`Search ${event.currentTarget.value}`, { scope: "filter" });
              }
            }}
            placeholder={contract.searchPlaceholder}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface-muted px-9 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {contract.filters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-label={`Filter ${filter}`}
              aria-pressed={activeFilter === filter}
              onClick={() => {
                setActiveFilter((current) => current === filter ? null : filter);
                void runAction(filter, { scope: "filter" });
              }}
              className={`rounded-[var(--radius-xs)] border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                activeFilter === filter
                  ? "border-accent/25 bg-accent-soft text-accent"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {filter}
            </button>
          ))}
          {contract.sortOptions.map((sort) => (
            <button
              key={sort}
              type="button"
              aria-label={`Sort ${sort}`}
              aria-pressed={activeSort === sort}
              onClick={() => {
                setActiveSort(sort);
                void runAction(sort, { scope: "sort" });
              }}
              className={`rounded-[var(--radius-xs)] border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                activeSort === sort
                  ? "border-primary/20 bg-primary-soft text-primary"
                  : "border-border bg-primary-soft/40 text-muted"
              }`}
            >
              {sort}
            </button>
          ))}
          <button
            type="button"
            aria-label="Columns"
            onClick={() => void runAction("Column display checked", { scope: "filter" })}
            className="inline-flex items-center gap-2 rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-muted transition hover:-translate-y-0.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Columns
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {contract.bulkActions.map((action) => (
          <button
            key={action}
            type="button"
            aria-label={`Bulk ${action}`}
            disabled={busyAction !== null}
            onClick={() => void handleBulkAction(action)}
            className="rounded-[var(--radius-xs)] border border-accent/25 bg-accent-soft px-3 py-2 text-xs font-bold text-accent transition hover:-translate-y-0.5"
          >
            {action}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-sm)] border border-border">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-primary-soft/45 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleAllVisible(event.currentTarget.checked)}
                  className="h-4 w-4 rounded border-border"
                />
              </th>
              {contract.columns.map((column) => (
                <th key={column.key} className="px-3 py-3">
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface/70">
            {visibleRows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.id}`}
                    checked={selectedRows.has(row.id)}
                    onChange={(event) => toggleRow(row.id, event.currentTarget.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </td>
                {contract.columns.map((column) => (
                  <td key={column.key} className="px-3 py-3 text-foreground">
                    {column.key === "status" && row.status ? (
                      <StatusPill label={row.status.label} tone={row.status.tone} compact />
                    ) : (
                      row.cells[column.key] ?? "-"
                    )}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    {row.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        aria-label={`Row ${row.id} ${action}`}
                        disabled={busyAction !== null}
                        onClick={() => void runRowAction(action, row)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:-translate-y-0.5"
                      >
                        <Eye className="h-3 w-3 text-accent" />
                        {action}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleRows.length === 0 ? (
          <div className="border-t border-border bg-surface px-4 py-8 text-center text-sm font-semibold text-muted">
            {rows.length === 0
              ? emptyMessage
              : search.trim()
                ? `No records matched ${search}. Clear the search or try another school reference.`
                : "No records match the active filters. Clear the filters to review all records."}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-muted">
        <span>Page 1 of 1</span>
        <span>
          {visibleRows.length} of {rows.length} record{rows.length === 1 ? "" : "s"}
          {selectedRows.size ? ` | ${selectedRows.size} selected` : ""}
        </span>
      </div>

      {notice ? (
        <div className={`mt-3 rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-bold ${
          noticeTone === "danger"
            ? "border-danger/20 bg-danger-soft text-danger"
            : noticeTone === "warning"
              ? "border-warning/20 bg-warning-soft text-warning"
              : "border-success/20 bg-success-soft text-success"
        }`}>
          {notice}
        </div>
      ) : null}

      {showStatePanels && rows.length === 0 ? (
        <div className="mt-4">
          <OperationalStatePanel state="EMPTY" message={emptyMessage} />
        </div>
      ) : null}
      <Modal
        open={Boolean(detailRow)}
        title={detailRow ? rowDisplayName(detailRow) : "Record details"}
        description="Review this school record before taking action."
        onClose={() => setDetailRow(null)}
        footer={
          <button
            type="button"
            onClick={() => setDetailRow(null)}
            className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
          >
            Close
          </button>
        }
      >
        <div className="space-y-3">
          {detailRow
            ? contract.columns.map((column) => (
                <div key={column.key} className="rounded-[var(--radius-xs)] border border-border bg-surface-muted px-3 py-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">{column.label}</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{detailRow.cells[column.key] ?? "-"}</p>
                </div>
              ))
            : null}
        </div>
      </Modal>
      <Modal
        open={Boolean(editRow)}
        title={editRow ? `Edit ${rowDisplayName(editRow)}` : "Edit record"}
        description="Update the visible school record and record the change for school dashboard sync."
        onClose={() => setEditRow(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditRow(null)}
              className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!editRow) return;
                setRows((current) =>
                  current.map((row) => row.id === editRow.id ? { ...row, cells: { ...row.cells, ...editValues } } : row),
                );
                setNoticeTone("warning");
                void runAction("Update record", { scope: "row", rowId: editRow.id });
                setEditRow(null);
              }}
              className="rounded-[var(--radius-xs)] border border-accent/25 bg-accent-soft px-3 py-2 text-xs font-bold text-accent"
            >
              Save changes
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {contract.columns.map((column) => (
            <label key={column.key} className="text-xs font-bold text-muted">
              {column.label}
              <input
                value={editValues[column.key] ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;

                  setEditValues((current) => ({ ...current, [column.key]: value }));
                }}
                className="mt-1 w-full rounded-[var(--radius-xs)] border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-accent"
              />
            </label>
          ))}
        </div>
      </Modal>
      <Modal
        open={Boolean(deleteRow)}
        title="Confirm delete"
        description="Remove this record from the visible school desk and record the action for audit."
        onClose={() => setDeleteRow(null)}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteRow(null)}
              className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!deleteRow) return;
                const deletedId = deleteRow.id;
                setRows((current) => current.filter((row) => row.id !== deletedId));
                setSelectedRows((current) => {
                  const next = new Set(current);
                  next.delete(deletedId);
                  return next;
                });
                setNoticeTone("warning");
                setNotice(`${deletedId} removed from this working list. Sending delete action...`);
                void runAction("Delete", { scope: "row", rowId: deletedId });
                setDeleteRow(null);
              }}
              className="rounded-[var(--radius-xs)] border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-bold text-danger"
            >
              Yes, remove record
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted">
          {deleteRow ? Object.values(deleteRow.cells).filter(Boolean).join(" | ") : "This record"} will be removed from the current table.
        </p>
      </Modal>
    </Card>
  );
}
