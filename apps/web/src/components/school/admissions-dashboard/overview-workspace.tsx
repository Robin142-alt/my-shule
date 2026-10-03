"use client";
import Link from "next/link";
import { useSchoolQuery } from "@/lib/data/school-hooks";
type Overview = { applicationsPending: number; admitted: number; documentsMissing: number; recentActivity: Array<{ id: string; action: string; applicant: string; time: string }> };
export function AdmissionsOverviewWorkspace() {
  const query = useSchoolQuery<Overview>("/admin-command/admissions/overview");
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
    <h2 className="text-xl font-black">Admissions overview</h2>
    <p className="mt-1 text-sm text-muted">Admit learners, resume your saved draft, and keep guardian details up to date.</p>
    <div className="my-4 grid gap-2 sm:grid-cols-3">
      <Link className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-bold text-white" href="/school/admissions/applications">Admit Student / resume draft</Link>
      <Link className="flex min-h-12 items-center justify-center rounded-xl border border-border px-4 font-bold" href="/school/admissions/imports">Bulk Admission</Link>
      <Link className="flex min-h-12 items-center justify-center rounded-xl border border-border px-4 font-bold" href="/school/admissions/enrolment">Admission Records</Link>
    </div>
    {query.isError ? <p role="alert">Admissions summary could not be loaded. <button onClick={() => void query.refetch()} className="min-h-11 underline">Retry</button></p> : <div className="grid gap-2 sm:grid-cols-3">
      {[["Admitted", query.data?.admitted], ["Pending applications", query.data?.applicationsPending], ["Documents to review", query.data?.documentsMissing]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3 sm:block"><p className="text-sm text-muted">{label}</p><p className="text-xl font-bold">{query.isLoading ? "…" : value ?? 0}</p></div>)}
    </div>}
    <h3 className="mb-2 mt-5 font-bold">Recent admissions</h3>
    {query.isLoading ? <p role="status">Loading recent admissions…</p> : !query.isError && !query.data?.recentActivity?.length ? <p className="text-sm text-muted">No admissions yet. Add the first learner or upload a class list.</p> : null}
    <ul className="divide-y divide-border">{query.data?.recentActivity?.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold">{item.applicant}</span><span>{item.action} · {new Date(item.time).toLocaleDateString()}</span></li>)}</ul>
  </section>;
}
