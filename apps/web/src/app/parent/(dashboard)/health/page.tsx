"use client";

import { 
  AlertTriangle, 
  FileText, 
  CheckSquare, 
  Search, 
  Clock, 
  Download,
  Calendar,
  Banknote,
  Users,
  ShieldAlert,
  HeartPulse,
  Bus,
  BedDouble,
  BookOpen,
  MessageCircle,
  Bell
} from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: "success" | "info" | "warning" | "danger" | "neutral" }) {
  const toneClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const dotClasses = {
    success: "bg-emerald-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-slate-400",
  };

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold", toneClasses[tone] || toneClasses.neutral)}>
      <span className={cn("h-2 w-2 rounded-full", dotClasses[tone] || dotClasses.neutral)} />
      {label}
    </span>
  );
}

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#64748B]">
            <tr>
              {columns.map((column, i) => (
                <th key={i} className="px-4 py-3 font-black whitespace-nowrap">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row, i) => (
              <tr key={i} className="transition hover:bg-[#F8FAFC]">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 font-semibold text-[#334155] whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#64748B]">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ParentHealthPage() {
  const { data: dashboardResult } = useSchoolQuery<any>("/api/parent/dashboard");
  const children = dashboardResult?.data?.children || [];
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  const selectedChildId = activeChildId || (children.length > 0 ? children[0].id : null);
  
  const { data: moduleResult, isLoading } = useSchoolQuery<any>(
    selectedChildId ? "/api/parent/health/" + selectedChildId : null
  );

  const payload = moduleResult?.data || [];
  const columns = moduleResult?.columns || [];

  const mapRow = (record: any) => {
    return columns.map((col: string) => {
      const key = Object.keys(record).find(k => k.toLowerCase() === col.toLowerCase().replace(/ /g, '_'));
      const val = key ? record[key] : record[col.toLowerCase()] || "N/A";
      if (val === "Overdue" || val === "Cleared") {
        return <StatusChip key={col} label={val} tone={val === "Overdue" ? "danger" : "success"} />;
      }
      return val;
    });
  };

  const rows = payload.map((record: any) => mapRow(record));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {children.length > 1 && (
        <div className="flex gap-2 mb-6 bg-white p-3 rounded-2xl border border-[#D8E0EC]">
          {children.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setActiveChildId(child.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition",
                selectedChildId === child.id 
                  ? "bg-[#071D49] text-white" 
                  : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]"
              )}
            >
              {child.first_name} {child.last_name}
            </button>
          ))}
        </div>
      )}

      <Panel 
        title="Health" 
        description={moduleResult?.studentName ? "Viewing records for " + moduleResult.studentName : "Parent workspace"}
      >
        {isLoading ? (
          <div className="flex justify-center py-16 text-[#64748B]">Loading...</div>
        ) : rows.length > 0 ? (
          <DataTable columns={columns} rows={rows} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-[#64748B]/30 mb-4" />
            <p className="text-lg font-semibold text-[#071D49]">No Data Found</p>
            <p className="mt-2 text-sm text-[#64748B]">There are no health records available yet.</p>
          </div>
        )}
      </Panel>
    
    </div>
  );
}
