"use client";

import { LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { ProgressionAction, ProgressionStudent, ProgressionStudentDetail } from "@/lib/modules/student-progression";
import { ACTIONS, availableActions, displayDate, STATUS_LABELS } from "./presentation";
import styles from "./progression.module.css";

export function ProgressionStudentDialog({ student, timezone, canManage, onClose, onAction }: {
  student: ProgressionStudent; timezone: string; canManage: boolean; onClose: () => void;
  onAction: (action: ProgressionAction, detail: ProgressionStudentDetail, transitionId?: string) => void;
}) {
  const { data, error, isLoading, refetch } = useSchoolQuery<ProgressionStudentDetail>(`/academics/progression/students/${encodeURIComponent(student.id)}`, { staleTime: 0 });
  const current = data?.student ?? student;
  const actions = availableActions(current).filter((action) => action !== "reverse");
  return <Modal open title={current.name} description={`${current.admission_number} · Progression history`} size="lg" mobileFullScreen onClose={onClose}>
    <div className={styles.dialogBody}>
      <div className={styles.learnerSummary}><span className={styles.badge} data-status={current.status}>{STATUS_LABELS[current.status]}</span><p style={{ marginTop: 8 }}>{current.class_name ?? "Placement needs review"}{current.stream_name ? ` / ${current.stream_name}` : ""} · {current.academic_year_name ?? "Year not assigned"}</p>{current.message ? <p className={styles.muted}>{current.message}</p> : null}</div>
      {error ? <div role="alert" className={styles.alert}>{error.message}<br /><button className={styles.button} onClick={() => void refetch()}>Retry loading details</button></div> : null}
      {isLoading ? <div role="status" className={styles.loading}><LoaderCircle size={19} className={styles.spin} />Loading learner history…</div> : data ? <>
        {canManage ? <div className={styles.actions} aria-label="Learner actions">{actions.map((action) => <button key={action} className={styles.button} onClick={() => onAction(action, data)}>{ACTIONS[action].label}</button>)}</div> : null}
        <h3 className={styles.sectionTitle} style={{ paddingLeft: 0, marginTop: 20 }}>Current subjects</h3>
        <p className={styles.muted} style={{ paddingTop: 10 }}>{data.subjects.filter((subject) => subject.selected).map((subject) => subject.name).join(" · ") || "No subjects selected for the current placement."}</p>
        <h3 className={styles.sectionTitle} style={{ paddingLeft: 0, marginTop: 12 }}>Progression timeline</h3>
        {data.timeline.length ? <ol className={styles.timeline}>{data.timeline.map((entry) => <li key={entry.id} className={styles.timelineItem}>
          <h4>{ACTIONS[entry.action as ProgressionAction]?.label ?? entry.action.replaceAll("_", " ")}</h4>
          <p>{entry.from_class ? `${entry.from_class}${entry.from_year ? ` (${entry.from_year})` : ""} → ` : ""}{entry.to_class ? `${entry.to_class}${entry.to_year ? ` (${entry.to_year})` : ""}` : entry.outcome}</p>
          <p>{entry.reason}</p><p>{entry.actor} · {displayDate(entry.created_at, timezone, true)}</p>
          {canManage && entry.reversible ? <button className={`${styles.button} ${styles.rowAction}`} style={{ marginTop: 8 }} onClick={() => onAction("reverse", data, entry.id)}>Reverse this transition</button> : null}
        </li>)}</ol> : <p className={styles.muted} style={{ paddingTop: 12 }}>No progression decisions have been recorded yet. Future transitions and corrections appear here.</p>}
      </> : null}
    </div>
  </Modal>;
}
