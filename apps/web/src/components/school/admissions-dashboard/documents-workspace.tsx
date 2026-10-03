"use client";
import { RecordTable } from "@/components/ui/record-table";
import { FileCheck } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { AdmissionsEmptyStateCell, START_ADMISSION_HREF } from "./empty-state-cell";

type DocumentsData = {
  metrics: Record<string, number>;
  items: any[];
};

export function DocumentsWorkspace() {
  const { data, isLoading, isError, refetch } = useSchoolQuery<DocumentsData>("/admin-command/admissions/documents");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
          <FileCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">Documents</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Track required admission documents.</p>
        </div>
      </div>

      {isError ? <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-danger">Records could not be loaded. <button className="underline" onClick={() => void refetch()}>Retry</button></p> : null}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Pending Review</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.pending_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Verified</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.verified ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Student</th>
              <th className="px-4 py-3 font-bold">Document</th>
              <th className="px-4 py-3 font-bold">Submitted</th>
              <th className="px-4 py-3 font-bold">Verified</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : isError ? <tr><td colSpan={8} className="p-4 text-danger">Retry to load records.</td></tr> : items.length === 0 ? (
              <AdmissionsEmptyStateCell
                colSpan={5}
                title="No admission documents yet"
                body="Start an application first, then upload and verify the learner's required documents from the applicant record."
                actionHref={START_ADMISSION_HREF}
                actionLabel="Start student admission"
              />
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.student_name}</td>
                  <td className="px-4 py-3 text-muted">{row.document_type}</td>
                  <td className="px-4 py-3 text-muted">{row.submitted_date}</td>
                  <td className="px-4 py-3 text-muted">{row.verified_by}</td>
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
