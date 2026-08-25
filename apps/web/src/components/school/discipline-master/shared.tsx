"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus, type LucideIcon } from "lucide-react";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import { toast } from "sonner";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, { chip: string; dot: string }> = {
  success: { chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  info: { chip: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  warning: { chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  danger: { chip: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  neutral: { chip: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" },
};

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function disciplineActionSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace-action";
}

async function persistDisciplineWorkspaceAction(title: string, description: string) {
  return requestDashboardApi("/api/discipline/workspace-actions", {
    method: "POST",
    body: {
      action: disciplineActionSlug(title),
      title,
      description,
      source: "discipline-master-dashboard",
    },
  });
}

export function DisciplineWorkspaceActions({
  title,
  records,
}: {
  title: string;
  records: Array<Record<string, unknown>>;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  function exportRecords() {
    const keys = Array.from(new Set(records.flatMap((record) => Object.keys(record)))).slice(0, 12);
    const headers = keys.length ? keys : ["workspace", "status"];
    const rows = records.length
      ? records.map((record) => headers.map((key) => stringifyCell(record[key])))
      : [[title, "No records available"]];

    downloadCsvFile({
      filename: `discipline-${title.toLowerCase().replaceAll(" ", "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    });
    setNotice(`${title} CSV exported with ${records.length} record${records.length === 1 ? "" : "s"}.`);
  }

  async function startNewRecord() {
    const description = `${title} intake is ready. Capture student, incident, action owner, parent contact, and approval status before saving.`;
    try {
      await persistDisciplineWorkspaceAction(`${title} new record intake`, description);
      setNotice(description);
    } catch (error) {
      toast.error("Discipline action was not saved", {
        description: error instanceof Error ? error.message : "The workspace action could not be persisted for audit and follow-up.",
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportRecords}><Download className="mr-2 h-4 w-4" /> Export</Button>
        <Button onClick={startNewRecord}><Plus className="mr-2 h-4 w-4" /> New Record</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs font-semibold text-blue-900">{notice}</div> : null}
    </div>
  );
}
