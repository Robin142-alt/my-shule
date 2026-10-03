"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

type Application = { id: string; student_id?: string; admission_number?: string; student_name: string; guardian_name: string; phone: string; grade_applied: string; status: string; submitted_at: string };
type Records = { metrics: { total: number; pending: number; admitted: number }; applicationsList: Application[] };
const pageSize = 30;

export function ApplicationsWorkspace() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => { setFilter(search.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({ search: filter, status, limit: String(pageSize), offset: String(page * pageSize) });
  const query = useSchoolQuery<Records>(`/admin-command/admissions/applications?${params}`, { staleTime: 30_000, retry: 1 });
  const statusMutation = useSchoolMutation<unknown, { id: string; status: string }>(v => `/admin-command/admissions/applications/${v.id}/status`, "POST", { queueNetworkFailures: false });
  const admit = useSchoolMutation<unknown, { id: string }>(v => `/admin-command/admissions/admissions/${v.id}/admit`, "POST", { queueNetworkFailures: false });
  const busy = statusMutation.isPending || admit.isPending;
  async function act(row: Application, nextStatus: string) {
    try {
      if (nextStatus === "admit") await admit.mutateAsync({ id: row.id });
      else await statusMutation.mutateAsync({ id: row.id, status: nextStatus });
      toast.success(nextStatus === "admit" ? "Student admitted." : "Application updated.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update this record. Retry."); }
  }
  return <section className="rounded-2xl border border-border bg-white p-3 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-black">Admission Records</h2><p className="mt-1 text-sm text-muted">Find admitted learners and complete existing applications.</p></div>
      <Link className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-bold text-white" href="/school/admissions/applications">Admit Student</Link>
    </div>
    <div className="my-4 grid gap-3 sm:grid-cols-[1fr_auto]">
      <input aria-label="Search admission records" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Student, admission number or guardian" className="min-h-11 w-full rounded-xl border border-border px-3" />
      <select aria-label="Admission status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="min-h-11 rounded-xl border border-border px-3"><option value="">All records</option><option value="registered">Admitted</option><option value="pending">Pending applications</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
    </div>
    {query.isError ? <div role="alert" className="mb-3 rounded-xl bg-danger-soft p-3 text-danger">Records could not be loaded. <button onClick={() => void query.refetch()} disabled={query.isFetching} className="underline">Retry</button></div> : null}
    {query.isLoading ? <p role="status" className="py-6">Loading admission records…</p> : null}
    {!query.isLoading && !query.isError && !query.data?.applicationsList?.length ? <div className="py-6 text-center"><p>{filter || status ? "No matching records. Change the search or status filter." : "No students admitted yet. Admit a student or import a class list to get started."}</p><Link className="mt-3 inline-flex min-h-11 items-center font-bold text-info" href="/school/admissions/imports">Open bulk admission</Link></div> : null}
    <ul className="divide-y divide-border">
      {query.data?.applicationsList?.map(row => <li key={row.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0"><p className="break-words font-bold">{row.student_name}</p>{row.admission_number ? <p className="text-sm font-semibold">Admission no. {row.admission_number}</p> : null}<p className="text-sm text-muted">{row.grade_applied} · {row.status} · {row.submitted_at}</p><p className="mt-1 break-words text-sm">{row.guardian_name || "Guardian not recorded"} · {row.phone || "Phone can be added later"}</p></div>
        <div className="flex flex-wrap items-center gap-2 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:border-border [&_button]:px-3 [&_button]:font-semibold [&_button]:disabled:opacity-50">
          {row.student_id ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 font-semibold" href={`/school/admissions/students/${row.student_id}`}>Open student</Link> : null}
          {["pending", "reviewing", "interview"].includes(row.status.toLowerCase()) ? <><button aria-label={`Approve ${row.student_name}`} disabled={busy} onClick={() => void act(row, "approved")}>Approve</button><button aria-label={`Reject ${row.student_name}`} disabled={busy} onClick={() => void act(row, "rejected")}>Reject</button></> : null}
          {row.status.toLowerCase() === "approved" ? <button aria-label={`Complete admission for ${row.student_name}`} disabled={busy} onClick={() => void act(row, "admit")}>Complete admission</button> : null}
        </div>
      </li>)}
    </ul>
    {query.data ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{query.data.metrics.total} matching records</span><div className="flex gap-2"><button className="min-h-11 rounded-lg border px-3" disabled={page === 0 || query.isFetching} onClick={() => setPage(p => p - 1)}>Previous</button><button className="min-h-11 rounded-lg border px-3" disabled={(page + 1) * pageSize >= query.data.metrics.total || query.isFetching} onClick={() => setPage(p => p + 1)}>Next</button></div></div> : null}
  </section>;
}
