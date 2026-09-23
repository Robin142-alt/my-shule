import { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { RecordTable as ResponsiveRecordTable } from "@/components/ui/record-table";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel({ title, description, icon: Icon, headerEnd, children }: { title: string; description: string; icon: LucideIcon; headerEnd?: ReactNode; children: ReactNode }) {
  return (
    <section className="app-workspace-panel rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-[0_18px_50px_rgba(7,29,73,0.08)] sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#071D49] sm:text-xl">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
          </div>
        </div>
        {headerEnd && <div className="flex min-w-0 flex-wrap gap-2 sm:shrink-0">{headerEnd}</div>}
      </div>
      {children}
    </section>
  );
}

export function RecordTable({
  columns,
  rows,
  emptyState = "No rows yet. Use this workspace's primary action or complete the required school setup so records can appear here.",
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyState?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-5 text-center">
        <p className="max-w-xl text-sm font-semibold text-[#64748B]">{emptyState}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#D8E0EC]">
        <ResponsiveRecordTable className="min-w-full divide-y divide-[#E2E8F0] bg-white text-sm">
          <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                {columns.map((_, cellIndex) => <td key={cellIndex} className="px-4 py-3 font-semibold text-[#071D49]">{row[cellIndex] ?? "-"}</td>)}
              </tr>
            ))}
          </tbody>
        </ResponsiveRecordTable>
    </div>
  );
}

export function StatusPill({ status, type = "default" }: { status: string; type?: "default" | "success" | "warning" | "error" | "info" }) {
  const styles = {
    default: "border-[#D8E0EC] bg-[#F8FAFC] text-[#64748B]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-black", styles[type])}>{status}</span>;
}
