import { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel({ title, description, icon: Icon, headerEnd, children }: { title: string; description: string; icon: LucideIcon; headerEnd?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex gap-3 justify-between">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-[#071D49]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
          </div>
        </div>
        {headerEnd && <div>{headerEnd}</div>}
      </div>
      {children}
    </section>
  );
}

export function RecordTable({
  columns,
  rows,
  emptyState = "No records found.",
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyState?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
        <p className="text-sm font-semibold text-[#64748B]">{emptyState}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#D8E0EC]">
      <table className="min-w-full divide-y divide-[#E2E8F0] bg-white text-sm">
        <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 font-semibold text-[#071D49]">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
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
