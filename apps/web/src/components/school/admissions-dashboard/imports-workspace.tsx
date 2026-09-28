"use client";
import { Upload } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { AdmissionsEmptyStateCell, START_ADMISSION_HREF } from "./empty-state-cell";

type ImportsData = {
  metrics: Record<string, number>;
  items: any[];
};

export function ImportsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ImportsData>("/admin-command/admissions/imports");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">Data Imports</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Import admission data in bulk.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Imports</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_imports ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">File</th>
              <th className="px-4 py-3 font-bold">Records</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Imported By</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <AdmissionsEmptyStateCell
                colSpan={5}
                title="No import batches yet"
                body="Use the live admission form first, then import applicant lists after confirming deputy-created class setup."
                actionHref={START_ADMISSION_HREF}
                actionLabel="Start student admission"
              />
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.filename}</td>
                  <td className="px-4 py-3 text-muted">{row.record_count}</td>
                  <td className="px-4 py-3 text-muted">{row.date}</td>
                  <td className="px-4 py-3 text-muted">{row.imported_by}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
