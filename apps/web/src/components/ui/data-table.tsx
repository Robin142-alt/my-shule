"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  className?: string;
  headerClassName?: string;
  mobileLabel?: string;
  render: (row: T) => ReactNode;
}

const PAGE_SIZE = 10;

export function DataTable<T>({
  title,
  subtitle,
  actions,
  columns,
  rows,
  getRowKey,
  emptyMessage = "No records available.",
  pageSize = PAGE_SIZE,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  pageSize?: number;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const totalPages = Math.max(1, Math.ceil(safeRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);

  const paginatedRows = useMemo(() => {
    const start = safeCurrentPage * pageSize;
    return safeRows.slice(start, start + pageSize);
  }, [safeRows, pageSize, safeCurrentPage]);

  return (
    <Card className="overflow-hidden">
      {title || subtitle || actions ? (
        <div className="border-b border-border bg-surface px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              {title ? (
                <h3 className="section-title text-lg">
                  {title}
                </h3>
              ) : null}
              {subtitle ? (
                <p className="mt-0.5 text-[13px] text-muted line-clamp-1">{subtitle}</p>
              ) : null}
            </div>
            {actions || safeRows.length > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
                {actions}
                {safeRows.length > 0 ? (
                  <span className="badge badge-neutral">
                    {safeRows.length} {safeRows.length === 1 ? "record" : "records"}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {safeRows.length === 0 ? (
        <div className="p-3 sm:px-5 sm:py-6">
          <EmptyState
            title="Nothing to show yet"
            description={emptyMessage}
          />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="app-table-scroll hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label={title ?? "Records table"}>
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-strong">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`sticky top-0 z-10 bg-surface-strong px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-primary select-none ${column.headerClassName ?? ""}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRows.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    className="table-row-hover group"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-4 py-2.5 align-middle text-[13px] text-foreground ${column.className ?? ""}`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-border md:hidden">
            {paginatedRows.map((row) => (
              <div
                key={getRowKey(row)}
                className="bg-white px-4 py-4"
              >
                <dl className="space-y-2.5">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="app-record-field grid min-w-0 grid-cols-[minmax(80px,0.75fr)_minmax(0,1.4fr)] items-baseline gap-3"
                    >
                      <dt className="text-xs font-medium text-muted">
                        {column.mobileLabel ?? column.header}
                      </dt>
                      <dd className="min-w-0 break-words text-[13px] leading-5 text-foreground">
                        {column.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex flex-col gap-2 border-t border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2.5">
              <p className="text-[13px] text-muted">
                <span className="font-medium text-foreground">
                  {safeCurrentPage * pageSize + 1}
                </span>
                –
                <span className="font-medium text-foreground">
                  {Math.min((safeCurrentPage + 1) * pageSize, safeRows.length)}
                </span>
                {" "}of{" "}
                <span className="font-medium text-foreground">{safeRows.length}</span>
              </p>
              <div className="flex items-center justify-between gap-0.5 sm:justify-end">
                <button
                  type="button"
                  disabled={safeCurrentPage === 0}
                  onClick={() => setCurrentPage(0)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-xs)] text-muted transition-colors hover:bg-white hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 xl:h-9 xl:w-9"
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPage === 0}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(0, Math.min(page, totalPages - 1) - 1))
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-xs)] text-muted transition-colors hover:bg-white hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 xl:h-9 xl:w-9"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="shrink-0 px-1 text-[13px] font-medium text-foreground tabular-nums sm:px-2">
                  {safeCurrentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages - 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages - 1, Math.min(page, totalPages - 1) + 1))
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-xs)] text-muted transition-colors hover:bg-white hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 xl:h-9 xl:w-9"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(totalPages - 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-xs)] text-muted transition-colors hover:bg-white hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 xl:h-9 xl:w-9"
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
