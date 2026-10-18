"use client";

import { ShieldAlert } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import type { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchDisciplineConcernsLive, raiseDisciplineConcernLive, fetchTeacherConcernOptions, fetchTeacherConcernDetail, type DisciplineConcern } from "@/lib/modules/teacher-live";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";

const input = "mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm text-foreground";
const primary = "min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "The concern could not be loaded. Please retry.";

function RaiseConcernModal({ onClose, onSaved }: { onClose: () => void; onSaved: (reference: string) => void }) {
  const { session } = useLiveTenantSession("school");
  const [form, setForm] = useState({ studentId: "", categoryId: "", title: "", description: "", severity: "medium" });
  const options = useQuery({
    queryKey: ["teacher-concern-options", session?.tenantId, session?.user.user_id],
    queryFn: () => fetchTeacherConcernOptions(session!), enabled: !!session,
  });
  const save = useMutation({
    mutationFn: () => raiseDisciplineConcernLive(session!, { ...form, title: form.title.trim(), description: form.description.trim() }),
    onSuccess: result => onSaved(result.reference),
  });
  return <Modal title="Raise Concern" open onClose={() => { if (!save.isPending) onClose(); }} size="md">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!save.isPending && form.title.trim() && form.description.trim()) save.mutate(); }}>
      {options.isError ? <div role="alert" className="text-sm text-danger">{errorMessage(options.error)} <button type="button" className={secondary} onClick={() => void options.refetch()}>Retry learners</button></div> : null}
      <label className="block text-sm font-bold">Learner<select className={input} required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
        <option value="">{options.isLoading ? "Loading allocated learners…" : "Select learner"}</option>
        {options.data?.students.map(row => <option key={row.id} value={row.id}>{row.name} — {row.className} ({row.admissionNo})</option>)}
      </select></label>
      {!options.isLoading && !options.isError && !options.data?.students.length && <p className="text-sm text-muted">No learners are allocated to your current teaching classes or streams. Ask the Deputy Principal to review your allocations, then retry.</p>}
      <label className="block text-sm font-bold">Concern type<select className={input} required value={form.categoryId} onChange={e => {
        const category = options.data?.categories.find(row => row.id === e.target.value);
        setForm({ ...form, categoryId: e.target.value, severity: category?.defaultSeverity ?? "medium" });
      }}>
        <option value="">Select school concern category</option>
        {options.data?.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <label className="block text-sm font-bold">Title<input className={input} required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label className="block text-sm font-bold">Severity<select className={input} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
      </select></label>
      <label className="block text-sm font-bold">Description<textarea className={input} required maxLength={10000} rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <p className="text-sm text-muted">The school discipline team receives this concern. Parent notices follow the school category settings.</p>
      {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className={secondary} disabled={save.isPending} onClick={onClose}>Cancel</button>
        <button type="submit" className={primary} disabled={save.isPending || !session || !form.studentId || !form.categoryId || options.isError}>{save.isPending ? "Submitting…" : "Submit Concern"}</button>
      </div>
    </form>
  </Modal>;
}

function ConcernStatus({ concern, onClose }: { concern: DisciplineConcern; onClose: () => void }) {
  const { session } = useLiveTenantSession("school");
  const query = useQuery({
    queryKey: ["teacher-concern", session?.tenantId, session?.user.user_id, concern.id],
    queryFn: () => fetchTeacherConcernDetail(session!, concern.id), enabled: !!session,
  });
  const incident = query.data?.incident;
  return <Modal open title={concern.reference || "Concern Status"} onClose={onClose} size="lg">
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{incident?.title || concern.title} · {incident?.status || concern.status}</h3>
        <button type="button" className={secondary} disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh Status</button>
      </div>
      <p className="text-sm text-muted">{concern.learner} · {concern.className} · {concern.sentTo}</p>
      <p className="whitespace-pre-wrap text-sm">{incident?.description || concern.description}</p>
      {query.isLoading && <p role="status">Loading follow-up…</p>}
      {query.isError && <p role="alert" className="text-sm text-danger">{errorMessage(query.error)}</p>}
      {incident?.action_taken && <p className="text-sm"><strong>Action taken: </strong>{incident.action_taken}</p>}
      {query.data && <>
        <RecordTable columns={["Follow-up action", "Status", "Completion notes"]} rows={query.data.actions.map(action => [action.title, action.status, action.completion_notes || "—"])}
          emptyState="No follow-up actions recorded yet. The school discipline team can review this concern and assign the next step." />
        <h4 className="font-bold">Updates shared with you</h4>
        {query.data.comments.length ? query.data.comments.map(comment => <p key={comment.id} className="rounded-xl border border-border p-3 text-sm">{comment.body}</p>)
          : <p className="text-sm text-muted">No shared updates yet. Refresh Status to check for a response.</p>}
      </>}
    </div>
  </Modal>;
}

export function DisciplineWelfareWorkspace({ onStartAction: _onStartAction }: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const live = useLiveTenantSession("school");
  const { hasPermission } = usePermissions();
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<DisciplineConcern | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["discipline-concerns", live.session?.tenantId, live.session?.user.user_id],
    queryFn: () => fetchDisciplineConcernsLive(live.session!), enabled: !!live.session,
  });
  const concerns = query.data ?? [];
  const filtered = concerns.filter(row => `${row.title} ${row.learner} ${row.reference}`.toLowerCase().includes(search.toLowerCase())
    && (status === "all" || (status === "open" ? !["closed", "resolved"].includes(row.status) : ["closed", "resolved"].includes(row.status))));
  return <Panel title="Discipline & Welfare" description="Raise a concern for an allocated learner and track the school's response." icon={ShieldAlert}
    headerEnd={<><button type="button" className={secondary} disabled={!live.session || query.isFetching} onClick={() => void query.refetch()}>Refresh</button>
      <button type="button" className={primary} disabled={!live.session || !hasPermission("teacher:write")} onClick={() => setCreating(true)}>Raise Concern</button></>}>
    {!live.session && <p className="mb-4 text-sm text-muted">{live.isLoading ? "Loading your school session…" : live.error || "Sign in to your school account to raise and track concerns."}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-success">{notice}</p>}
    {query.isError && <p role="alert" className="mb-4 text-sm text-danger">{errorMessage(query.error)} Use Refresh to retry.</p>}
    <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
      <label className="text-sm font-bold">Search concerns<input type="search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Learner, title or reference" /></label>
      <label className="text-sm font-bold">Status<select className={input} value={status} onChange={e => setStatus(e.target.value)}>
        <option value="all">All concerns</option><option value="open">Open concerns</option><option value="closed">Resolved / Closed</option>
      </select></label>
    </div>
    <RecordTable columns={["Reference", "Learner", "Class", "Concern", "Severity", "Sent To", "Status", "Action"]}
      rows={filtered.map(row => [row.reference, row.learner, row.className, row.title || row.type, row.severity, row.sentTo, row.status,
        <button key={row.id} type="button" className={secondary} onClick={() => setSelected(row)}>View Status</button>])}
      emptyState={query.isLoading ? "Loading concerns…" : query.isError ? "Concerns are unavailable. Refresh to retry." : search || status !== "all" ? "No concerns match these filters. Clear the search or choose All concerns." : "No concerns raised yet. Use Raise Concern when a learner needs discipline or welfare follow-up."} />
    {creating && <RaiseConcernModal onClose={() => setCreating(false)} onSaved={reference => {
      setCreating(false); setNotice(`Concern ${reference} recorded and sent for school follow-up.`);
      void client.invalidateQueries({ queryKey: ["discipline-concerns"] });
      void client.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] });
    }} />}
    {selected && <ConcernStatus concern={selected} onClose={() => setSelected(null)} />}
  </Panel>;
}
