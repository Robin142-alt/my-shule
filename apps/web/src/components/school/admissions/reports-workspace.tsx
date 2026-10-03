"use client";
import { useState } from "react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useSchoolCommandIdentity } from "../integrated-school-command-header";

type Export = { report_id: string; title: string; filename: string; generated_at: string; row_count: number; checksum_sha256: string; csv: string };
const reports = [{ id: "applications", label: "Admission register" }, { id: "allocations", label: "Class & stream allocations" }, { id: "documents", label: "Supporting documents" }, { id: "transfers", label: "Transfer history" }];
export function ReportsWorkspace() {
  const [selected, setSelected] = useState("applications");
  const [requested, setRequested] = useState<string | null>(null);
  const { schoolName, userLabel } = useSchoolCommandIdentity();
  const report = useSchoolQuery<Export>(requested ? `/admissions/reports/${requested}/export` : null, { staleTime: 0 });
  const artifact = report.data;
  function download() {
    if (!artifact) return;
    const url = URL.createObjectURL(new Blob([artifact.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = artifact.filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="rounded-2xl border border-border bg-white p-4">
    <h2 className="text-xl font-black">Admissions Reports</h2>
    <p className="mt-1 text-sm text-muted">Preview and download the school register, placements, documents, and transfers.</p>
    <div className="my-4 flex flex-wrap gap-3">
      <select aria-label="Admissions report" value={selected} onChange={e => { setSelected(e.target.value); setRequested(null); }} className="min-h-11 max-w-full rounded-xl border px-3">{reports.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <button disabled={report.isFetching} className="min-h-11 rounded-xl bg-primary px-4 font-bold text-white" onClick={() => { if (requested === selected) void report.refetch(); else setRequested(selected); }}>{report.isFetching ? "Preparing…" : "Preview report"}</button>
    </div>
    {report.isError ? <p role="alert" className="rounded-xl bg-danger-soft p-3 text-danger">{report.error?.message || "Report could not be prepared. Retry Preview report."}</p> : null}
    {artifact ? <><div className="my-3 flex flex-wrap gap-3"><button onClick={download} className="min-h-11 rounded-xl border px-4 font-bold">Download CSV</button><button onClick={() => window.print()} className="min-h-11 rounded-xl border px-4 font-bold">Print preview</button></div>
      <article className="admissions-report-preview rounded-xl border p-3">
        <h3 className="font-bold">{schoolName} · {artifact.title}</h3>
        <p className="text-sm">Document {artifact.report_id}-{artifact.checksum_sha256.slice(0, 12)} · {new Date(artifact.generated_at).toLocaleString()} · {userLabel}</p>
        <p className="my-2 text-sm">{artifact.row_count} records{artifact.row_count === 500 ? " (first 500 records)" : ""}</p>
        {artifact.row_count === 0 ? <p>No admissions reports yet for this register. Add school records, then preview again.</p> : <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6">{artifact.csv}</pre>}
      </article>
      <style>{`@media print { body * { visibility: hidden; } .admissions-report-preview, .admissions-report-preview * { visibility: visible; } .admissions-report-preview { position: absolute; left: 0; top: 0; width: 100%; border: 0; } }`}</style>
    </> : null}
  </section>;
}
