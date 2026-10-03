"use client";
import { RecordTable } from "@/components/ui/record-table";
import { HelpCircle } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { AdmissionsEmptyStateCell, START_ADMISSION_HREF } from "./empty-state-cell";

type EnquiriesData = {
  metrics: Record<string, number>;
  items: any[];
};

export function EnquiriesWorkspace() {
  const { data, isLoading, isError, refetch } = useSchoolQuery<EnquiriesData>("/admin-command/admissions/enquiries");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">Enquiries</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Manage admission enquiries from parents.</p>
        </div>
      </div>

      {isError ? <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-danger">Records could not be loaded. <button className="underline" onClick={() => void refetch()}>Retry</button></p> : null}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">New</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.new ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Responded</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.responded ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Parent</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Source</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : isError ? <tr><td colSpan={8} className="p-4 text-danger">Retry to load records.</td></tr> : items.length === 0 ? (
              <AdmissionsEmptyStateCell
                colSpan={6}
                title="No enquiries yet"
                body="Capture the first admission enquiry by starting a student admission from this school's applications desk."
                actionHref={START_ADMISSION_HREF}
                actionLabel="Start student admission"
              />
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.parent_name}</td>
                  <td className="px-4 py-3 text-muted">{row.phone}</td>
                  <td className="px-4 py-3 text-muted">{row.class_interested}</td>
                  <td className="px-4 py-3 text-muted">{row.date}</td>
                  <td className="px-4 py-3 text-muted">{row.source}</td>
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
