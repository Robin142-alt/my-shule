"use client";
import { useEffect, useState } from "react";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
type Student = { id: string; first_name: string; last_name: string; admission_number: string };
type Transfer = { id: string; student_id: string; transfer_type: string; school_name: string; reason: string; requested_on: string; status: string };
export function TransfersWorkspace() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => { const timer = setTimeout(() => setFilter(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const [page, setPage] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("outgoing");
  const [school, setSchool] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const students = useSchoolQuery<Student[]>(`/admissions/students?limit=50&search=${encodeURIComponent(filter)}`, { enabled: filter.length >= 2, retry: 1 });
  const transfers = useSchoolQuery<Transfer[]>(`/admissions/transfers?limit=50&offset=${page * 50}`);
  const create = useSchoolMutation<Transfer, { student_id: string; transfer_type: string; school_name: string; reason: string }>("/admissions/transfers", "POST", { queueNetworkFailures: false });
  return <section className="rounded-2xl border border-border bg-white p-4">
    <h2 className="text-xl font-black">Transfers</h2><p className="mt-1 text-sm text-muted">Record incoming, outgoing, and returning learners. Requests remain pending until the school completes its transfer process.</p>
    <details className="my-4 rounded-xl border p-3"><summary className="min-h-11 cursor-pointer font-bold">New transfer request</summary>
      <form className="grid gap-3" onSubmit={async e => { e.preventDefault(); setFeedback(""); try { await create.mutateAsync({ student_id: studentId, transfer_type: type, school_name: school, reason }); setFeedback("Transfer request saved as pending."); setReason(""); } catch { /* Keep form available for retry. */ } }}>
        <label className="grid gap-1 text-sm">Find learner<input value={search} onChange={e => { setSearch(e.target.value); setStudentId(""); }} placeholder="At least 2 letters or admission number" className="min-h-11 rounded-lg border p-2" /></label>
        {students.isLoading ? <p role="status">Finding learners…</p> : null}{students.isError ? <p role="alert">Learners could not be loaded. <button type="button" onClick={() => void students.refetch()}>Retry</button></p> : null}
        <label className="grid gap-1 text-sm">Learner<select required value={studentId} onChange={e => setStudentId(e.target.value)} className="min-h-11 rounded-lg border p-2"><option value="">Select learner</option>{students.data?.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.admission_number}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Transfer type<select value={type} onChange={e => setType(e.target.value)} className="min-h-11 rounded-lg border p-2"><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option><option value="readmission">Readmission</option></select></label>
        <label className="grid gap-1 text-sm">Other school<input required value={school} onChange={e => setSchool(e.target.value)} className="min-h-11 rounded-lg border p-2" /></label>
        <label className="grid gap-1 text-sm">Reason<textarea required value={reason} onChange={e => setReason(e.target.value)} className="rounded-lg border p-2" /></label>
        <button disabled={create.isPending} className="min-h-11 rounded-xl bg-primary px-4 font-bold text-white">{create.isPending ? "Saving…" : "Save transfer request"}</button>
      </form>
    </details>
    {feedback ? <p role="status" className="my-3 rounded-xl bg-success-soft p-3">{feedback}</p> : null}
    {create.isError ? <p role="alert">{create.error.message}</p> : null}
    {transfers.isError ? <p role="alert">Transfers could not be loaded. <button onClick={() => void transfers.refetch()}>Retry</button></p> : transfers.isLoading ? <p role="status">Loading transfers…</p> : !transfers.data?.length ? <p>No transfer requests yet. Start a request above after adding the learner.</p> : null}
    <ul className="divide-y divide-border">{transfers.data?.map(row => <li key={row.id} className="py-3"><p className="font-bold">{row.school_name} · {row.transfer_type}</p><p className="text-sm text-muted">{row.reason} · {row.requested_on.slice(0,10)} · {row.status}</p></li>)}</ul>
    <div className="mt-3 flex gap-2"><button className="min-h-11 rounded-lg border px-3" disabled={!page || transfers.isFetching} onClick={() => setPage(p => p - 1)}>Previous</button><button className="min-h-11 rounded-lg border px-3" disabled={(transfers.data?.length ?? 0) < 50 || transfers.isFetching} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </section>;
}
