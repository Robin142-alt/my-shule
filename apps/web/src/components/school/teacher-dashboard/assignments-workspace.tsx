"use client";

import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import {
  fetchAssignmentsLive, createAssignmentLive, fetchTeacherClassesLive,
  fetchTeacherSubmissions, reviewTeacherSubmission,
  type AssignmentTask, type TeacherSubmission, type TeacherSubmissionReview,
} from "@/lib/modules/teacher-live";

const input = "mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm text-foreground";
const primary = "min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50";
const message = (error: unknown) => error instanceof Error ? error.message : "The action could not be completed. Please retry.";
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-KE") : "—";

function CreateAssignmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { session } = useLiveTenantSession("school");
  const [allocationId, setAllocationId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const classes = useQuery({
    queryKey: ["teacher-classes", session?.tenantId, session?.user.user_id],
    queryFn: () => fetchTeacherClassesLive(session!), enabled: !!session,
  });
  const assignedClasses = classes.data?.classes ?? [];
  const allocation = assignedClasses.find(row => row.id === allocationId);
  const create = useMutation({
    mutationFn: () => createAssignmentLive(session!, {
      title: title.trim(), classId: allocation!.classSectionId, subjectId: allocation!.subjectId,
      streamId: allocation?.streamId ?? undefined, dueDate: `${dueDate}T23:59:59+03:00`,
      description: description.trim(), maxScore: Number(maxScore),
    }),
    onSuccess: onSaved,
  });
  return <Modal title="Create Assignment" open onClose={() => { if (!create.isPending) onClose(); }} size="md">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (allocation && title.trim() && !create.isPending) create.mutate(); }}>
      <label className="block text-sm font-bold">Title<input className={input} required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block text-sm font-bold">Assigned class and subject
        <select className={input} required value={allocationId} onChange={e => setAllocationId(e.target.value)} disabled={classes.isLoading}>
          <option value="">{classes.isLoading ? "Loading assigned classes…" : "Select assigned class"}</option>
          {assignedClasses.map(row => <option key={row.id} value={row.id}>{row.className} — {row.subjectName}</option>)}
        </select>
      </label>
      {classes.isError ? <div role="alert" className="text-sm text-danger">{message(classes.error)} <button type="button" className={secondary} onClick={() => void classes.refetch()}>Retry allocations</button></div>
        : !classes.isLoading && !assignedClasses.length ? <p className="text-sm text-muted">No active class-subject allocation. Ask the Deputy Principal or HOD to assign your classes, then retry.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Due date<input type="date" className={input} required value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
        <label className="block text-sm font-bold">Total marks<input type="number" min={1} max={10000} step="0.01" className={input} required value={maxScore} onChange={e => setMaxScore(e.target.value)} /></label>
      </div>
      <label className="block text-sm font-bold">Instructions<textarea className={input} rows={4} maxLength={10000} value={description} onChange={e => setDescription(e.target.value)} /></label>
      {create.isError && <p role="alert" className="text-sm text-danger">{message(create.error)}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className={secondary} disabled={create.isPending} onClick={onClose}>Cancel</button>
        <button type="submit" className={primary} disabled={!session || !allocation || !title.trim() || create.isPending}>{create.isPending ? "Publishing…" : "Publish Assignment"}</button>
      </div>
    </form>
  </Modal>;
}

function SubmissionEditor({ learner, maxScore, pending, onSave, onClose }: {
  learner: TeacherSubmission; maxScore: number; pending: boolean;
  onSave: (dto: TeacherSubmissionReview) => void; onClose: () => void;
}) {
  const [score, setScore] = useState(learner.score ?? "");
  const [feedback, setFeedback] = useState(learner.feedback ?? "");
  return <form className="mt-4 space-y-3 rounded-xl border border-border bg-surface-muted p-4"
    onSubmit={event => { event.preventDefault(); onSave({ studentId: learner.studentId, status: "graded", score: Number(score), feedback, expectedUpdatedAt: learner.updatedAt ?? undefined }); }}>
    <h3 className="font-bold">Review: {learner.name}</h3>
    <p className="text-sm text-muted">{learner.completionMode === "student_marked_done" ? "Learner marked this work complete. Review the submitted work before assigning a score." : "Review the learner work and record your feedback."}</p>
    <label className="block text-sm font-bold">Score out of {maxScore}<input className={input} type="number" required min={0} max={maxScore} step="0.01" value={score} onChange={e => setScore(e.target.value)} /></label>
    <label className="block text-sm font-bold">Feedback<textarea className={input} maxLength={5000} value={feedback} onChange={e => setFeedback(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2">
      <button type="submit" className={primary} disabled={pending || score === ""}>{pending ? "Saving…" : "Save Grade"}</button>
      <button type="button" className={secondary} disabled={pending || !feedback.trim()} onClick={() => onSave({ studentId: learner.studentId, status: "returned", feedback, expectedUpdatedAt: learner.updatedAt ?? undefined })}>Return for Revision</button>
      <button type="button" className={secondary} disabled={pending} onClick={onClose}>Cancel Review</button>
    </div>
  </form>;
}

function SubmissionsModal({ assignment, onClose, canWrite }: { assignment: AssignmentTask; onClose: () => void; canWrite: boolean }) {
  const { session } = useLiveTenantSession("school");
  const client = useQueryClient();
  const [selected, setSelected] = useState<TeacherSubmission | null>(null);
  const [notice, setNotice] = useState("");
  const queryKey = ["teacher-submissions", session?.tenantId, session?.user.user_id, assignment.id];
  const query = useQuery({ queryKey, queryFn: () => fetchTeacherSubmissions(session!, assignment.id), enabled: !!session });
  const review = useMutation({
    mutationFn: (dto: TeacherSubmissionReview) => reviewTeacherSubmission(session!, assignment.id, dto),
    onSuccess: async () => {
      setSelected(null); setNotice("Submission updated.");
      await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ queryKey: ["teacher-assignments"] }), client.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] })]);
    },
  });
  const rows = query.data?.students ?? [];
  return <Modal title={`Submissions: ${assignment.title}`} open onClose={() => { if (!review.isPending) onClose(); }} size="xl">
    <p className="whitespace-pre-wrap text-sm text-muted">{query.data?.assignment.description || assignment.description || "No additional instructions."}</p>
    <div className="my-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">{rows.filter(row => row.status === "graded").length} graded · {rows.filter(row => ["submitted", "completed"].includes(row.status)).length} awaiting grading · {rows.filter(row => row.status === "missing").length} missing</p>
      <button type="button" className={secondary} disabled={query.isFetching || review.isPending} onClick={() => void query.refetch()}>Refresh Submissions</button>
    </div>
    {notice && <p role="status" className="mb-3 text-sm text-success">{notice}</p>}
    {query.isError && <p role="alert" className="mb-3 text-sm text-danger">{message(query.error)}</p>}
    {review.isError && <p role="alert" className="mb-3 text-sm text-danger">{message(review.error)}</p>}
    <RecordTable columns={["Learner", "Admission", "Status", "Received", "Score", "Feedback", "Action"]} rows={rows.map(row => [
      row.name, row.admissionNo, row.status, date(row.submittedAt), row.score === null ? "—" : `${row.score} / ${query.data?.assignment.maxScore}`, row.feedback || "—",
      canWrite ? ["missing", "draft", "returned"].includes(row.status)
        ? <button key={row.studentId} type="button" className={secondary} disabled={review.isPending} onClick={() => review.mutate({ studentId: row.studentId, status: "submitted", expectedUpdatedAt: row.updatedAt ?? undefined })}>Record Received</button>
        : <button key={row.studentId} type="button" className={secondary} disabled={review.isPending} onClick={() => { setSelected(row); review.reset(); }}>Review Work</button>
        : "Read only",
    ])} emptyState={query.isLoading ? "Loading the assignment class register…" : query.isError ? "The register could not be loaded. Use Refresh Submissions to retry." : "No active learners in this assignment class or stream. Ask admissions to check learner allocations, then refresh."} />
    {selected && <SubmissionEditor key={selected.studentId} learner={selected} maxScore={query.data!.assignment.maxScore} pending={review.isPending} onSave={dto => review.mutate(dto)} onClose={() => setSelected(null)} />}
  </Modal>;
}

export function AssignmentsWorkspace({ onStartAction: _onStartAction }: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const { hasPermission } = usePermissions();
  const live = useLiveTenantSession("school");
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<AssignmentTask | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["teacher-assignments", live.session?.tenantId, live.session?.user.user_id],
    queryFn: () => fetchAssignmentsLive(live.session!), enabled: !!live.session,
  });
  const assignments = query.data ?? [];
  const canWrite = !!live.session && hasPermission("teacher:write");
  const filtered = assignments.filter(row => `${row.title} ${row.className} ${row.subject}`.toLowerCase().includes(search.toLowerCase()));
  return <Panel title="Assignments & Homework" description="Publish class work, record received work, review submissions and give feedback." icon={ClipboardCheck}
    headerEnd={<><button type="button" className={secondary} disabled={!live.session || query.isFetching} onClick={() => void query.refetch()}>Refresh</button>
      <button type="button" className={primary} disabled={!canWrite} onClick={() => setCreating(true)}>Create Assignment</button></>}>
    <p className="mb-4 text-sm text-muted">{assignments.length} assignments · {assignments.reduce((sum, row) => sum + Number(row.submitted ?? 0) - Number(row.graded ?? 0), 0)} submissions awaiting grading</p>
    {!canWrite && <p className="mb-4 text-sm text-muted">{live.isLoading ? "Loading your school session…" : live.session ? "Your current role can view assignments. Teacher write permission is required to publish or grade." : live.error || "Sign in to your school account to load assignments."}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-success">{notice}</p>}
    {query.isError && <p role="alert" className="mb-4 text-sm text-danger">{message(query.error)} Use Refresh to retry.</p>}
    <label className="mb-4 block text-sm font-bold">Search assignments<input type="search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Title, class or subject" /></label>
    <RecordTable columns={["Title", "Class", "Subject", "Assigned", "Due Date", "Submissions", "Graded", "Status", "Action"]}
      rows={filtered.map(row => [row.title, row.className, row.subject, date(row.createdAt), row.dueDate,
        `${row.submitted ?? 0} / ${row.total ?? 0}`, row.graded ?? 0, row.status,
        <button key={row.id} type="button" className={secondary} onClick={() => setSelected(row)}>View / Grade</button>])}
      emptyState={query.isLoading ? "Loading assignments…" : query.isError ? "Assignments are unavailable. Refresh to retry." : search ? "No assignments match. Clear your search to see all class work." : "No assignments yet. Create your first assignment after your class-subject allocation is active."} />
    {creating && <CreateAssignmentModal onClose={() => setCreating(false)} onSaved={() => {
      setCreating(false); setNotice("Assignment published to the allocated learners.");
      void client.invalidateQueries({ queryKey: ["teacher-assignments"] });
      void client.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] });
    }} />}
    {selected && <SubmissionsModal assignment={selected} onClose={() => setSelected(null)} canWrite={canWrite} />}
  </Panel>;
}
