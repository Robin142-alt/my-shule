"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { decideProgressionApproval, type ProgressionCommandResult, type ProgressionOverview } from "@/lib/modules/student-progression";
import { ACTIONS } from "./presentation";
import styles from "./progression.module.css";

export function ProgressionApprovalDialog({ approval, decision, onClose, onComplete }: {
  approval: ProgressionOverview["approvals"][number]; decision: "approved" | "rejected";
  onClose: () => void; onComplete: (result: ProgressionCommandResult) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function submit() {
    if (inFlight.current) return;
    if (!reason.trim()) { setError("Enter a reason for your decision."); return; }
    setError(null); inFlight.current = true; setBusy(true);
    let result: ProgressionCommandResult;
    try { result = await decideProgressionApproval(approval.id, decision, reason.trim()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The decision could not be saved. Retry."); return; }
    finally { inFlight.current = false; setBusy(false); }
    onComplete(result);
  }
  return <Modal open title={decision === "approved" ? "Approve progression decision" : "Reject progression decision"} onClose={() => { if (!busy) onClose(); }} footer={<><button className={styles.button} disabled={busy} onClick={onClose}>Cancel</button><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={submit}>{busy ? "Saving…" : decision === "approved" ? "Confirm approval" : "Confirm rejection"}</button></>}>
    <div className={styles.dialogBody}><div className={styles.learnerSummary}><strong>{ACTIONS[approval.action].label} · {approval.student_count} learners</strong>{approval.summary ? <p>{approval.summary}</p> : null}<p>{approval.reason}</p><p className={styles.muted}>Requested by {approval.requested_by}</p></div>
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      <label className={styles.label}>Decision reason<textarea className={styles.input} rows={3} maxLength={1000} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    </div>
  </Modal>;
}
