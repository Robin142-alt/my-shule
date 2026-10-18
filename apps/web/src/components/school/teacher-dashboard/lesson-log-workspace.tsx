"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutList } from "lucide-react";
import { usePermissions } from "@/components/providers/permission-context";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchLessonLogsLive, createLessonLogLive, fetchTeacherClassesLive, type LessonLog } from "@/lib/modules/teacher-live";
import { Modal } from "@/components/ui/modal";
import { Panel, RecordTable } from "./shared-components";
const input = "mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm text-foreground";
const button = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-50";
const empty = { allocationId: "", date: "", lessonStatus: "taught", topics: "", challenges: "", notes: "" };
export function LessonLogWorkspace() {
  const { session } = useLiveTenantSession("school");
  const { hasPermission } = usePermissions();
  const client = useQueryClient();
  const [form, setForm] = useState(empty);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<LessonLog | null>(null);
  const [notice, setNotice] = useState("");
  const logs = useQuery({ queryKey: ["teacher-lesson-logs", session?.tenantId, session?.user.user_id], queryFn: () => fetchLessonLogsLive(session!), enabled: !!session });
  const allocations = useQuery({ queryKey: ["teacher-classes", session?.tenantId, session?.user.user_id], queryFn: () => fetchTeacherClassesLive(session!), enabled: !!session });
  const allocation = allocations.data?.classes.find(row => row.id === form.allocationId);
  const save = useMutation({
    mutationFn: () => createLessonLogLive(session!, { classId: allocation!.classSectionId, subjectId: allocation!.subjectId, streamId: allocation?.streamId ?? undefined, date: form.date, lessonStatus: form.lessonStatus, topics: form.topics.trim(), challenges: form.challenges.trim(), notes: form.notes.trim() }),
    onSuccess: () => { setCreating(false); setNotice("Lesson delivery recorded."); setForm(empty); void client.invalidateQueries({ queryKey: ["teacher-lesson-logs"] }); void client.invalidateQueries({ queryKey: ["teacher-syllabus-coverage"] }); void client.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] }); },
  });
  const canWrite = !!session && hasPermission("teacher:write");
  return <Panel title="Lesson Log" description="Record whether each lesson was taught, topics covered, or why it was not taught. Attendance registers are managed by Class Teachers." icon={LayoutList} headerEnd={<>
    <button type="button" className={button} disabled={!session || logs.isFetching} onClick={() => void logs.refetch()}>Refresh lesson logs</button>
    <button type="button" className={button} disabled={!canWrite} onClick={() => { save.reset(); setForm({ ...empty, date: new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }) }); setCreating(true); }}>Record Lesson</button>
  </>}>
    {notice && <p role="status" className="mb-3 text-success">{notice}</p>}
    {logs.isError && <p role="alert" className="mb-3 text-danger">{logs.error.message} Refresh lesson logs to retry.</p>}
    {!canWrite && <p className="mb-3 text-sm text-muted">Teacher write permission is required to record lesson delivery.</p>}
    <RecordTable columns={["Date", "Class", "Subject", "Delivery", "Topics / Reason", "Action"]} rows={(logs.data ?? []).map(row => [row.date, row.class, row.subject, row.status, row.status === "Not taught" ? row.reason : row.topics,
      <button key={row.id} type="button" className={button} onClick={() => setSelected(row)}>View Lesson</button>])} emptyState={logs.isLoading ? "Loading lesson records…" : "No lesson delivery recorded yet. Use Record Lesson once your class and subject allocation is active."} />
    {creating && <Modal open title="Record Lesson" onClose={() => { if (!save.isPending) setCreating(false); }}>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (allocation && !save.isPending && canWrite) save.mutate(); }}>
        <label className="block text-sm font-bold">Assigned class and subject<select className={input} required value={form.allocationId} onChange={e => setForm({ ...form, allocationId: e.target.value })}>
          <option value="">{allocations.isLoading ? "Loading classes…" : "Select class and subject"}</option>
          {allocations.data?.classes.map(row => <option key={row.id} value={row.id}>{row.className} — {row.subjectName}</option>)}
        </select></label>
        {(allocations.isError || (!allocations.isLoading && !allocations.data?.classes.length)) && <p className="text-sm text-muted">{allocations.error?.message || "No teaching allocation. Ask the Deputy Principal or HOD to assign your class and subject."} <button type="button" className={button} onClick={() => void allocations.refetch()}>Retry allocations</button></p>}
        <label className="block text-sm font-bold">Lesson date<input type="date" required className={input} max={new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" })} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label className="block text-sm font-bold">Was the lesson taught?<select className={input} value={form.lessonStatus} onChange={e => setForm({ ...form, lessonStatus: e.target.value })}><option value="taught">Taught</option><option value="not_taught">Not taught</option></select></label>
        {form.lessonStatus === "taught" ? <label className="block text-sm font-bold">Topics covered<textarea required maxLength={10000} className={input} value={form.topics} onChange={e => setForm({ ...form, topics: e.target.value })} /></label>
          : <label className="block text-sm font-bold">Reason not taught<textarea required maxLength={5000} className={input} value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} /></label>}
        <label className="block text-sm font-bold">Notes<textarea maxLength={5000} className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
        <div className="flex flex-wrap justify-end gap-3"><button type="button" className={button} disabled={save.isPending} onClick={() => setCreating(false)}>Cancel</button><button type="submit" className={button} disabled={save.isPending || !allocation || !canWrite || !(form.lessonStatus === "taught" ? form.topics.trim() : form.challenges.trim())}>{save.isPending ? "Saving…" : "Save Lesson"}</button></div>
      </form>
    </Modal>}
    {selected && <Modal open title="Lesson record" onClose={() => setSelected(null)}><p className="font-bold">{selected.class} · {selected.subject} · {selected.date}</p><p className="mt-3 font-bold">{selected.status}</p><p className="mt-3 whitespace-pre-wrap">{selected.status === "Not taught" ? selected.reason : selected.topics}</p><p className="mt-3 whitespace-pre-wrap text-sm text-muted">{selected.notes}</p></Modal>}
  </Panel>;
}
