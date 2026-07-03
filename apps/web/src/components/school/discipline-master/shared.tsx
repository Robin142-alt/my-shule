"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import { toast } from "sonner";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
