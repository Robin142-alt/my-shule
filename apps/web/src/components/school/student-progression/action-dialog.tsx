"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { submitProgressionCommand, type ProgressionAction, type ProgressionCommand, type ProgressionCommandResult, type ProgressionOverview, type ProgressionStudent, type ProgressionStudentDetail } from "@/lib/modules/student-progression";
import { ACTIONS, displayDate } from "./presentation";
import styles from "./progression.module.css";

export function ProgressionActionDialog({ action, students, overview, selectedYearId, initialDetail, transitionId, onClose, onComplete, onRefresh }: {
  action: ProgressionAction; students: ProgressionStudent[]; overview: ProgressionOverview; selectedYearId: string;
  initialDetail?: ProgressionStudentDetail; transitionId?: string;
  onClose: () => void; onComplete: (result: ProgressionCommandResult) => void; onRefresh: () => void;
}) {
  const actionInfo = ACTIONS[action];
  const needsDestination = ["place", "reinstate"].includes(action);
  const needsDetail = action === "subjects" || action === "reverse";
  const details = useSchoolQuery<ProgressionStudentDetail>(needsDetail ? `/academics/progression/students/${encodeURIComponent(students[0].id)}` : null, { enabled: needsDetail, staleTime: 0 });
  // Keep the displayed form and expected version from the same snapshot. A
  // background refetch must not silently authorise overwriting another edit.
  const [detailSnapshot, setDetailSnapshot] = useState(initialDetail);
  const detail = detailSnapshot ?? details.data;
  const [destinationYear, setDestinationYear] = useState(action === "place" ? students[0].academic_year_id ?? selectedYearId : "");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [reason, setReason] = useState("");
  const [destinationSchool, setDestinationSchool] = useState("");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [reverseId, setReverseId] = useState(transitionId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const prepared = useRef<ProgressionCommand | null>(null);
  const inFlight = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!detail || initialized.current) return;
    initialized.current = true;
    setDetailSnapshot(detail);
    setSubjectIds(detail.subjects.filter((subject) => subject.selected || subject.compulsory).map((subject) => subject.id));
    setReverseId((current) => current || detail.timeline.find((entry) => entry.reversible)?.id || "");
  }, [detail]);

  const destinationClasses = overview.classes.filter((item) => item.academic_year_id === destinationYear);
  const destinationStreams = overview.streams.filter((item) => item.class_section_id === classId);
  const reversible = detail?.timeline.filter((entry) => entry.reversible) ?? [];
  const consequential = ["expel", "transfer", "withdraw", "reverse"].includes(action);
  const sourceYearId = action === "repeat" || action === "reverse" ? selectedYearId || students[0].academic_year_id || "" : students[0].academic_year_id || selectedYearId || "";

  async function submit() {
    if (inFlight.current || stale) return;
    setError(null);
    if (!prepared.current) {
      if (!reason.trim()) { setError("Enter a reason for this decision."); return; }
      if (!sourceYearId) { setError("Select the academic year before changing learner records."); return; }
      if (needsDestination && (!classId || !destinationClasses.some((item) => item.id === classId))) { setError("Choose the destination academic year and class."); return; }
      if (needsDestination && destinationStreams.length > 0 && !streamId) { setError("Choose the destination stream."); return; }
      if (action === "subjects" && (!detail || details.error)) { setError("Load the current subject offerings before saving."); return; }
      if (action === "reverse" && !reversible.some((entry) => entry.id === reverseId)) { setError("This transition is no longer available for reversal. Refresh the learner's records."); return; }
      prepared.current = {
        request_id: crypto.randomUUID(), action, reason: reason.trim(), academic_year_id: sourceYearId,
        students: students.map((student) => ({ id: student.id, expected_version: needsDetail && detail?.student.id === student.id ? detail.student.version : student.version })),
        ...(needsDestination ? { target_class_section_id: classId, target_stream_id: streamId || null } : {}),
        ...(action === "subjects" ? { subject_ids: subjectIds } : {}),
        ...(action === "reverse" ? { transition_id: reverseId } : {}),
        ...(action === "transfer" && destinationSchool.trim() ? { destination_school_name: destinationSchool.trim() } : {}),
      };
    }
    inFlight.current = true; setBusy(true); setAttempted(true);
    let result: ProgressionCommandResult;
    try { result = await submitProgressionCommand(prepared.current); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : "The action could not be completed. Retry safely.";
      setError(message);
      if (/changed|stale|version|refresh|no longer/i.test(message)) { setStale(true); onRefresh(); }
      return;
    } finally { inFlight.current = false; setBusy(false); }
    onComplete(result);
  }

  return <Modal open title={actionInfo.label} description={students.length === 1 ? students[0].name : `${students.length} selected learners`} size="md" mobileFullScreen onClose={() => { if (!busy) onClose(); }} footer={<>
    <button className={styles.button} disabled={busy} onClick={onClose}>Cancel</button>
    {stale ? <button className={`${styles.button} ${styles.primary}`} onClick={() => { onRefresh(); onClose(); }}>Reload latest records</button> : <button className={`${styles.button} ${consequential ? styles.danger : styles.primary}`} disabled={busy || (needsDetail && !detail) || (action === "reverse" && reversible.length === 0)} onClick={submit}>
      {busy ? <><LoaderCircle className={styles.spin} size={16} />Saving…</> : attempted ? "Retry action" : actionInfo.confirm}
    </button>}
  </>}>
    <div className={styles.dialogBody}>
      <p>{actionInfo.description}</p>
      {action === "promote" && students.length === 1 && students[0].next_class_name ? <p className={styles.muted}>Next placement: {students[0].next_class_name}{students[0].stream_name ? ` / ${students[0].stream_name}` : ""}</p> : null}
      {error ? <div role="alert" className={styles.alert}>{error}</div> : null}
      {needsDetail && details.error && !error ? <div role="alert" className={styles.alert}>{details.error.message}<br /><button className={styles.button} onClick={() => void details.refetch()}>Retry loading details</button></div> : null}
      <div className={styles.learnerSummary}>{students.length === 1 ? <><strong>{students[0].name}</strong><br />{students[0].admission_number} · {students[0].class_name ?? "No class recorded"}{students[0].stream_name ? ` / ${students[0].stream_name}` : ""}</> : <><strong>{students.length} learners selected</strong><br />{students.slice(0, 3).map((student) => student.name).join(", ")}{students.length > 3 ? ` and ${students.length - 3} more` : ""}</>}</div>
      <fieldset disabled={busy || attempted}>
        {action === "transfer" ? <label className={styles.label}>Receiving school (optional)<input className={styles.input} maxLength={200} value={destinationSchool} onChange={(event) => setDestinationSchool(event.target.value)} /></label> : null}
        {needsDestination ? <div className={styles.formGrid}>
          <label className={styles.label}>Destination academic year<select className={styles.input} value={destinationYear} onChange={(event) => { setDestinationYear(event.target.value); setClassId(""); setStreamId(""); }}><option value="">Choose year</option>{overview.years.filter((year) => !["archived", "inactive"].includes(year.status)).map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
          <label className={styles.label}>Destination class<select className={styles.input} value={classId} disabled={!destinationYear} onChange={(event) => { setClassId(event.target.value); setStreamId(""); }}><option value="">Choose class</option>{destinationClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.curriculum_model}</option>)}</select></label>
          <label className={styles.label}>Destination stream<select className={styles.input} value={streamId} disabled={!destinationStreams.length} onChange={(event) => setStreamId(event.target.value)}><option value="">{destinationStreams.length ? "Choose stream" : "No stream required"}</option>{destinationStreams.map((stream) => <option key={stream.id} value={stream.id}>{stream.name}</option>)}</select></label>
        </div> : null}
        {action === "subjects" ? !detail ? <p className={styles.muted}>Loading current subjects…</p> : <div className={styles.subjectList}>{detail.subjects.length ? detail.subjects.map((subject) => <label className={styles.subject} key={subject.id}><input type="checkbox" className={styles.checkbox} checked={subjectIds.includes(subject.id)} disabled={subject.compulsory} onChange={(event) => setSubjectIds((current) => event.target.checked ? [...current, subject.id] : current.filter((id) => id !== subject.id))} /><span>{subject.name} <small>{subject.compulsory ? "Required" : subject.code}</small></span></label>) : <p className={styles.muted}>No subject offerings are configured for this placement. Add the class subjects in Academic Foundation first.</p>}</div> : null}
        {action === "reverse" && detail ? reversible.length ? <label className={styles.label}>Transition to reverse<select className={styles.input} value={reverseId} onChange={(event) => setReverseId(event.target.value)}>{reversible.map((entry) => <option key={entry.id} value={entry.id}>{entry.from_class ?? "Previous placement"} → {entry.to_class ?? entry.outcome} · {displayDate(entry.created_at, overview.timezone)}</option>)}</select></label> : <p className={styles.alert}>No transition can currently be reversed. Review the timeline and use an authorised placement correction where appropriate.</p> : null}
        <label className={styles.label}>Reason<textarea className={styles.input} rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Briefly record the school decision" /></label>
      </fieldset>
      {attempted && !stale ? <p className={styles.muted} style={{ marginTop: 12 }}>Retry checks this same saved request, so an interrupted connection cannot apply it twice.</p> : null}
    </div>
  </Modal>;
}
