"use client";
import { RecordTable } from "@/components/ui/record-table";
import { FileText } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { AdmissionsEmptyStateCell, APPLICATIONS_HREF } from "./empty-state-cell";

type TemplatesData = {
  metrics: Record<string, number>;
  items: any[];
};

export function TemplatesWorkspace() {
  const { data, isLoading, isError, refetch } = useSchoolQuery<TemplatesData>("/admin-command/admissions/templates");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">Templates</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Manage admission letter and form templates.</p>
        </div>
      </div>

      {isError ? <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-danger">Records could not be loaded. <button className="underline" onClick={() => void refetch()}>Retry</button></p> : null}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Templates</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.total ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Active</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.active ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Template Name</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Last Updated</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : isError ? <tr><td colSpan={8} className="p-4 text-danger">Retry to load records.</td></tr> : items.length === 0 ? (
              <AdmissionsEmptyStateCell
                colSpan={4}
                title="No admission templates yet"
                body="Open applications to see the active admission flow before preparing email, SMS, or letter templates."
                actionHref={APPLICATIONS_HREF}
                actionLabel="Open applications"
              />
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{row.type}</td>
                  <td className="px-4 py-3 text-muted">{row.updated_at}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </section>
  );
}
