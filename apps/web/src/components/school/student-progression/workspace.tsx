"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, GraduationCap, LoaderCircle, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { runProgression, type ProgressionAction, type ProgressionCommandResult, type ProgressionOverview, type ProgressionStatus, type ProgressionStudent, type ProgressionStudentDetail } from "@/lib/modules/student-progression";
import { ProgressionActionDialog } from "./action-dialog";
import { ProgressionApprovalDialog } from "./approval-dialog";
import { ProgressionStudentDialog } from "./student-detail";
import { ACTIONS, availableActions, displayDate, STATUS_LABELS } from "./presentation";
import styles from "./progression.module.css";

type ActionSelection = { action: ProgressionAction; students: ProgressionStudent[]; detail?: ProgressionStudentDetail; transitionId?: string };
const PAGE_SIZE = 25;
const stats: Array<{ key: string; label: string; status: ProgressionStatus }> = [
  { key: "upcoming", label: "Upcoming", status: "upcoming" }, { key: "promoted", label: "Promoted", status: "promoted" },
  { key: "repeating", label: "Repeating", status: "repeating" }, { key: "held", label: "On hold", status: "held" },
  { key: "exceptions", label: "Needs attention", status: "exception" },
];

export function StudentProgressionWorkspace({ onOpenCalendar }: { onOpenCalendar?: () => void }) {
  const tenantId = useOptionalSchoolTenantId();
  return <ProgressionWorkspaceContent key={tenantId ?? "unverified-tenant"} tenantId={tenantId} onOpenCalendar={onOpenCalendar} />;
}

function ProgressionWorkspaceContent({ tenantId, onOpenCalendar }: { tenantId: string | null; onOpenCalendar?: () => void }) {
  const queryClient = useQueryClient();
  const [yearId, setYearId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<ProgressionAction | "">("");
  const [actionSelection, setActionSelection] = useState<ActionSelection | null>(null);
  const [studentDetail, setStudentDetail] = useState<ProgressionStudent | null>(null);
  const [approvalSelection, setApprovalSelection] = useState<{ approval: ProgressionOverview["approvals"][number]; decision: "approved" | "rejected" } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const runRequest = useRef<{ year: string; id: string } | null>(null);
  const runBusy = useRef(false);

  useEffect(() => { const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250); return () => clearTimeout(timeout); }, [search]);
  const path = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    for (const [key, value] of [["academic_year_id", yearId], ["search", debouncedSearch], ["class_section_id", classId], ["stream_id", streamId], ["status", status]]) if (value) params.set(key, value);
    return `/academics/progression?${params.toString()}`;
  }, [yearId, debouncedSearch, classId, streamId, status, offset]);
  const { data, isLoading, isFetching, error, refetch } = useSchoolQuery<ProgressionOverview>(path, { staleTime: 15_000, refetchInterval: 30_000 });
  const selectedYearId = yearId || data?.selected_year_id || "";
  const selectedYear = data?.years.find((year) => year.id === selectedYearId);
  const learners = data?.students ?? [];
  const selected = learners.filter((student) => selectedIds.includes(student.id));
  const bulkActions = selected.length ? availableActions(selected[0]).filter((action) => !["subjects", "reverse"].includes(action) && selected.every((student) => availableActions(student).includes(action))) : [];
  const canManage = data?.permissions.manage === true;

  function resetSelection() { setSelectedIds([]); setBulkAction(""); setOffset(0); }
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["school", tenantId || "unverified-tenant"] });
    void refetch();
  }
  function complete(result: ProgressionCommandResult) {
    setActionSelection(null); setApprovalSelection(null); setSelectedIds([]); setBulkAction("");
    setFeedback(result.message); setOperationError(null); refresh();
  }
  function openAction(action: ProgressionAction, detail: ProgressionStudentDetail, transitionId?: string) {
    setStudentDetail(null); setActionSelection({ action, students: [detail.student], detail, transitionId });
  }
  async function run() {
    if (!selectedYearId || runBusy.current) return;
    if (runRequest.current?.year !== selectedYearId) runRequest.current = { year: selectedYearId, id: crypto.randomUUID() };
    runBusy.current = true; setRunning(true); setOperationError(null); setFeedback(null);
    try { const result = await runProgression(selectedYearId, runRequest.current.id); setFeedback(result.message); runRequest.current = null; refresh(); }
    catch (cause) { setOperationError(cause instanceof Error ? cause.message : "Progression could not be started. Retry safely."); }
    finally { runBusy.current = false; setRunning(false); }
  }

  return <section className={styles.workspace} aria-label="Student progression workspace">
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>Academic continuity</div><h2 className={styles.title}>Student Progression &amp; Transitions</h2><p className={styles.muted}>Automatic year-end progression, with every learner accounted for.</p></div>
      <div className={styles.actions}>
        <label className={styles.label}>Academic year<select className={styles.input} aria-label="Academic year" value={selectedYearId} disabled={!data?.years.length} onChange={(event) => { setYearId(event.target.value); setClassId(""); setStreamId(""); resetSelection(); setFeedback(null); }}><option value="">Choose year</option>{data?.years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_current ? " · Current" : ""}</option>)}</select></label>
        <button className={styles.button} aria-label="Refresh progression" disabled={isFetching} onClick={refresh}><RefreshCw size={16} className={isFetching ? styles.spin : ""} /><span className="sr-only">Refresh progression</span></button>
      </div>
    </header>
    {feedback ? <div role="status" className={styles.success}>{feedback}</div> : null}
    {operationError ? <div role="alert" className={styles.alert}>{operationError}</div> : null}
    {error ? <div role="alert" className={styles.alert}>{error.message}<br /><button className={styles.button} onClick={() => void refetch()}>Retry loading</button></div> : null}
    {isLoading ? <div role="status" className={styles.loading}><LoaderCircle size={20} className={styles.spin} />Loading school progression…</div> : !data ? !error ? <div className={styles.empty}><h3>School context is required</h3><p>Sign in to your school workspace to view student progression.</p></div> : null : <>
      <div className={styles.automation}>
        <div className={styles.automationIcon}><CalendarDays size={20} /></div>
        <div style={{ flex: 1, minWidth: 0 }}><strong>{data.automation.status === "running" ? "Annual progression is running" : ["blocked", "attention", "failed"].includes(data.automation.status) ? "Progression needs attention" : "Your academic calendar leads the way"}</strong><p>{data.automation.message}</p>{selectedYear ? <p style={{ marginTop: 5 }}>Year ends {displayDate(selectedYear.ends_on, data.timezone)} · {data.timezone}</p> : null}</div>
      </div>
      <div className={styles.stats} aria-label="Progression summary">{stats.map((stat) => <button className={styles.stat} key={stat.key} aria-pressed={status === stat.status} onClick={() => { setStatus(status === stat.status ? "" : stat.status); resetSelection(); }}><span>{stat.label}</span><strong>{(data.counts[stat.key] ?? data.counts[stat.status] ?? 0).toLocaleString()}</strong></button>)}</div>
      <div className={styles.panel}>
        <div className={styles.filters}>
          <label className={`${styles.label} ${styles.search}`}>Find a learner<Search size={16} /><input className={styles.input} placeholder="Name or admission number" value={search} onChange={(event) => { setSearch(event.target.value); resetSelection(); }} /></label>
          <label className={styles.label}>Class / grade<select className={styles.input} value={classId} onChange={(event) => { setClassId(event.target.value); setStreamId(""); resetSelection(); }}><option value="">All classes</option>{data.classes.filter((item) => !selectedYearId || item.academic_year_id === selectedYearId).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.curriculum_model}</option>)}</select></label>
          <label className={styles.label}>Stream<select className={styles.input} value={streamId} onChange={(event) => { setStreamId(event.target.value); resetSelection(); }}><option value="">All streams</option>{data.streams.filter((stream) => classId ? stream.class_section_id === classId : data.classes.some((item) => item.id === stream.class_section_id && item.academic_year_id === selectedYearId)).map((stream) => <option key={stream.id} value={stream.id}>{stream.name}{!classId ? ` · ${data.classes.find((item) => item.id === stream.class_section_id)?.name ?? ""}` : ""}</option>)}</select></label>
          <label className={styles.label}>Progression status<select className={styles.input} value={status} onChange={(event) => { setStatus(event.target.value); resetSelection(); }}><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {canManage && selected.length ? <div className={styles.selection}><span><strong>{selected.length}</strong> selected on this page</span><select className={styles.input} aria-label="Action for selected learners" value={bulkAction} onChange={(event) => setBulkAction(event.target.value as ProgressionAction | "")}><option value="">Choose an action</option>{bulkActions.map((action) => <option key={action} value={action}>{ACTIONS[action].label}</option>)}</select><button className={`${styles.button} ${styles.primary}`} disabled={!bulkAction || !bulkActions.includes(bulkAction)} onClick={() => { if (bulkAction) setActionSelection({ action: bulkAction, students: selected }); }}>Continue</button><button className={styles.button} onClick={() => { setSelectedIds([]); setBulkAction(""); }}>Clear</button></div> : null}
        {learners.length ? <table className={styles.table}>
          <thead><tr>{canManage ? <th className={styles.checkCell}><input className={styles.checkbox} type="checkbox" aria-label="Select all learners on this page" checked={learners.length > 0 && selected.length === learners.length} onChange={(event) => setSelectedIds(event.target.checked ? learners.map((student) => student.id) : [])} /></th> : null}<th>Learner</th><th>Current placement</th><th>Status</th><th>Next step</th><th><span className="sr-only">Details</span></th></tr></thead>
          <tbody>{learners.map((student) => <tr key={student.id}>
            {canManage ? <td className={styles.checkCell}><input type="checkbox" className={styles.checkbox} aria-label={`Select ${student.name}`} checked={selectedIds.includes(student.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /></td> : null}
            <td className={styles.nameCell}><button className={styles.studentName} onClick={() => setStudentDetail(student)}>{student.name}</button><span className={styles.subline}>{student.admission_number}</span></td>
            <td className={styles.placementCell}>{student.class_name ?? "Not placed"}{student.stream_name ? ` / ${student.stream_name}` : ""}<span className={styles.subline}>{student.curriculum_model}{student.academic_year_name ? ` · ${student.academic_year_name}` : ""}</span></td>
            <td className={styles.statusCell}><span className={styles.badge} data-status={student.status}>{STATUS_LABELS[student.status]}</span>{student.message ? <span className={styles.subline}>{student.message}</span> : null}</td>
            <td className={styles.destinationCell}>{student.next_class_name ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ArrowRight size={13} />{student.next_class_name}</span> : "—"}</td>
            <td className={styles.actionCell}><button className={`${styles.button} ${styles.rowAction}`} aria-label={`View ${student.name}`} onClick={() => setStudentDetail(student)}>View</button></td>
          </tr>)}</tbody>
        </table> : <div className={styles.empty}><UsersRound size={26} style={{ margin: "auto", color: "#7593b2" }} /><h3>{search || classId || streamId || status ? "No learners match these filters" : "No learners found for this academic year"}</h3><p>{search || classId || streamId || status ? "Try a different class or status, or clear the filters to view all learners." : "Current enrolments and their year-end transitions appear here once learners are admitted and placed."}</p>{search || classId || streamId || status ? <button className={styles.button} onClick={() => { setSearch(""); setClassId(""); setStreamId(""); setStatus(""); resetSelection(); }}>Clear filters</button> : onOpenCalendar ? <button className={styles.button} onClick={onOpenCalendar}>Open academic calendar</button> : <button className={styles.button} onClick={refresh}>Refresh enrolments</button>}</div>}
        <div className={styles.pagination}><span>{data.total ? `${offset + 1}–${Math.min(offset + learners.length, data.total)} of ${data.total.toLocaleString()} learners` : "0 learners"}{isFetching ? " · Updating…" : ""}</span><div className={styles.actions}><button className={styles.button} aria-label="Previous page" disabled={offset === 0 || isFetching} onClick={() => { setOffset(Math.max(0, offset - PAGE_SIZE)); setSelectedIds([]); }}><ChevronLeft size={16} /></button><button className={styles.button} aria-label="Next page" disabled={offset + PAGE_SIZE >= data.total || isFetching} onClick={() => { setOffset(offset + PAGE_SIZE); setSelectedIds([]); }}><ChevronRight size={16} /></button></div></div>
      </div>
      <div className={styles.actions} style={{ marginTop: 14, justifyContent: "space-between" }}><span className={styles.muted}><ShieldCheck size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />Every decision is recorded in the learner&apos;s history.</span><div className={styles.actions}>{onOpenCalendar ? <button className={styles.button} onClick={onOpenCalendar}><CalendarDays size={15} />Academic calendar</button> : null}{canManage ? <button className={styles.button} disabled={running || !selectedYearId} onClick={run}>{running ? <LoaderCircle size={15} className={styles.spin} /> : <RefreshCw size={15} />}{running ? "Starting progression…" : "Run / retry progression"}</button> : null}</div></div>
      <div className={styles.footerGrid}>
        <section className={styles.panel}><h3 className={styles.sectionTitle}><Clock3 size={15} style={{ display: "inline", marginRight: 7, verticalAlign: "-2px" }} />Recent annual transitions</h3>{data.runs.length ? data.runs.slice(0, 5).map((run) => <div key={run.id} className={styles.run}><div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}><strong>{data.years.find((year) => year.id === run.academic_year_id)?.name ?? "Academic year"}</strong><span className={styles.badge} data-status={run.status === "failed" || run.status === "attention" ? "exception" : run.status}>{run.status.replaceAll("_", " ")}</span></div><p>{run.promoted} promoted · {run.repeated} repeating · {run.graduated} completed</p>{run.held || run.exceptions ? <p className={styles.muted}>{run.held} held · {run.exceptions} need attention</p> : null}{run.message ? <p className={styles.muted}>{run.message}</p> : null}<span className={styles.subline}>{displayDate(run.updated_at, data.timezone, true)}</span></div>) : <div className={styles.run}><p className={styles.muted}>The first annual transition will appear here when the configured school year ends.</p></div>}</section>
        <section className={styles.panel}><h3 className={styles.sectionTitle}><GraduationCap size={16} style={{ display: "inline", marginRight: 7, verticalAlign: "-2px" }} />{data.permissions.approve ? "Decisions awaiting approval" : "School oversight"}</h3>{data.permissions.approve && data.approvals.length ? data.approvals.map((approval) => <div className={styles.approval} key={approval.id}><strong>{ACTIONS[approval.action].label} · {approval.student_count} learners</strong><p>{approval.reason}</p><p className={styles.muted}>{approval.requested_by} · {displayDate(approval.created_at, data.timezone)}</p><div className={styles.actions}><button className={styles.button} onClick={() => setApprovalSelection({ approval, decision: "rejected" })}>Review rejection</button><button className={`${styles.button} ${styles.primary}`} onClick={() => setApprovalSelection({ approval, decision: "approved" })}>Review approval</button></div></div>) : <div className={styles.run}><CheckCircle2 size={20} style={{ color: "#497962", marginBottom: 8 }} /><p className={styles.muted}>{data.permissions.approve ? "No progression decisions are awaiting your approval." : "Ordinary progression follows the academic calendar. Use learner actions for exceptions; school approval rules remain in effect."}</p></div>}</section>
      </div>
      {studentDetail ? <ProgressionStudentDialog student={studentDetail} timezone={data.timezone} canManage={canManage} onClose={() => setStudentDetail(null)} onAction={openAction} /> : null}
      {actionSelection && canManage ? <ProgressionActionDialog {...actionSelection} overview={data} selectedYearId={selectedYearId} initialDetail={actionSelection.detail} onClose={() => setActionSelection(null)} onComplete={complete} onRefresh={refresh} /> : null}
      {approvalSelection && data.permissions.approve ? <ProgressionApprovalDialog {...approvalSelection} onClose={() => setApprovalSelection(null)} onComplete={complete} /> : null}
    </>}
  </section>;
}
