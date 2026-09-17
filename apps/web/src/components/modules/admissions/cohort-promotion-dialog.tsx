"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { commitPromotion, fetchPromotionOptions, previewPromotion, type PromotionCommand, type PromotionOptions, type PromotionPreview, type PromotionResult } from "@/lib/modules/admissions-promotions";

type MappingDraft = { sourceId: string; yearId: string; classId: string; streamId: string };
const emptyMapping = (): MappingDraft => ({ sourceId: "", yearId: "", classId: "", streamId: "" });
const fieldClass = "mt-1 w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function CohortPromotionDialog({ studentId, onClose, onPromoted }: {
  studentId?: string;
  onClose: () => void;
  onPromoted: (result: PromotionResult) => Promise<void> | void;
}) {
  const [options, setOptions] = useState<PromotionOptions | null>(null);
  const [mappings, setMappings] = useState<MappingDraft[]>([emptyMapping()]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"load" | "preview" | "commit" | null>("load");
  const [review, setReview] = useState<{ command: PromotionCommand; preview: PromotionPreview } | null>(null);
  const [result, setResult] = useState<PromotionResult | null>(null);
  const [reload, setReload] = useState(0);
  const requestId = useRef<string | null>(null);
  const requestBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchPromotionOptions().then((data) => {
      if (cancelled) return;
      setOptions(data);
      if (studentId) {
        const placement = data.placements.find((item) => item.students.some((student) => student.id === studentId));
        if (!placement) setError("This learner has no current cohort placement. Review their class allocation before promotion.");
        else setMappings([{ ...emptyMapping(), sourceId: placement.id }]);
      }
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load promotion options.");
    }).finally(() => { if (!cancelled) setBusy(null); });
    return () => { cancelled = true; };
  }, [reload, studentId]);

  function updateMapping(index: number, change: Partial<MappingDraft>) {
    setMappings((current) => current.map((item, position) => position === index ? { ...item, ...change } : item));
    setError(null);
  }

  async function prepareReview() {
    if (!options || requestBusy.current) return;
    setError(null);
    if (!reason.trim()) { setError("Enter a reason for this promotion."); return; }
    const selected = mappings.map((mapping) => options.placements.find((item) => item.id === mapping.sourceId));
    if (selected.some((item) => !item) || mappings.some((item) => !item.classId)) {
      setError("Choose a source cohort, destination academic year, and destination class for every mapping."); return;
    }
    if (new Set(mappings.map((item) => item.sourceId)).size !== mappings.length) {
      setError("Choose each source cohort once."); return;
    }
    if (mappings.some((item) => options.streams.some((stream) => stream.class_section_id === item.classId) && !item.streamId)) {
      setError("Choose the destination stream for every class that uses streams."); return;
    }
    const command: PromotionCommand = {
      request_id: requestId.current ?? crypto.randomUUID(),
      reason: reason.trim(),
      mappings: mappings.map((mapping, index) => ({
        source_placement_id: mapping.sourceId,
        expected_version: selected[index]!.version,
        ...(studentId ? { student_ids: [studentId] } : {}),
        target_class_section_id: mapping.classId,
        target_stream_id: mapping.streamId || null,
      })),
    };
    requestId.current = command.request_id;
    requestBusy.current = true;
    setBusy("preview");
    try { setReview({ command, preview: await previewPromotion(command) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Promotion could not be reviewed."); }
    finally { requestBusy.current = false; setBusy(null); }
  }

  async function confirmPromotion() {
    if (!review?.preview.can_commit || requestBusy.current) return;
    requestBusy.current = true;
    setBusy("commit");
    setError(null);
    try {
      const saved = await commitPromotion(review.command);
      setResult(saved);
      try { await onPromoted(saved); }
      catch { setError("Promotion completed. Reload the student directory to refresh its records."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Promotion failed. Retry this same request to check or complete it safely."); }
    finally { requestBusy.current = false; setBusy(null); }
  }

  return <Modal open title={studentId ? "Promote learner with cohort configuration" : "Annual cohort promotion"} description="Map each cohort to its next academic year, class, and stream. Subjects and teachers follow the learners. Historical academic records retain their original period." size="xl" mobileFullScreen onClose={() => { if (!busy) onClose(); }}>
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p> : null}
      {busy === "load" ? <p role="status">Loading current cohorts and destinations...</p> : !options ? <Button variant="secondary" onClick={() => { setBusy("load"); setError(null); setReload((value) => value + 1); }}>Retry loading</Button> : result ? <div role="status" className="space-y-3"><p>{result.promoted_students} learners promoted across {result.moved_cohorts} cohorts. Their teaching configuration continues at the destination.</p><Button onClick={onClose}>Done</Button></div> : <>
        {options.placements.length === 0 ? <p>No current cohorts are available. Place learners in their source classes before promotion.</p> : <>
          <fieldset disabled={busy !== null || review !== null} className="space-y-4 disabled:opacity-80">
            {mappings.map((mapping, index) => {
              const source = options.placements.find((item) => item.id === mapping.sourceId);
              const availableStreams = options.streams.filter((item) => item.class_section_id === mapping.classId);
              return <section key={index} aria-label={`Promotion mapping ${index + 1}`} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-semibold">Mapping {index + 1}</h3>{mappings.length > 1 ? <Button variant="secondary" onClick={() => setMappings((current) => current.filter((_, position) => position !== index))}>Remove mapping</Button> : null}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="min-w-0 text-sm font-semibold">Source cohort<select aria-label={`Source cohort ${index + 1}`} className={fieldClass} value={mapping.sourceId} disabled={Boolean(studentId)} onChange={(event) => updateMapping(index, { sourceId: event.target.value })}><option value="">Select current cohort</option>{options.placements.filter((item) => !studentId || item.students.some((student) => student.id === studentId)).map((item) => <option key={item.id} value={item.id}>{item.class_section_name}{item.stream_name ? ` / ${item.stream_name}` : ""} — {options.years.find(year => year.id === item.academic_year_id)?.name ?? ""} ({item.student_count} learners)</option>)}</select></label>
                  <label className="min-w-0 text-sm font-semibold">Destination academic year<select aria-label={`Destination academic year ${index + 1}`} className={fieldClass} value={mapping.yearId} onChange={(event) => updateMapping(index, { yearId: event.target.value, classId: "", streamId: "" })}><option value="">Select academic year</option>{options.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                  <label className="min-w-0 text-sm font-semibold">Destination class<select aria-label={`Destination class ${index + 1}`} className={fieldClass} value={mapping.classId} disabled={!mapping.yearId} onChange={(event) => updateMapping(index, { classId: event.target.value, streamId: "" })}><option value="">Select destination class</option>{options.classes.filter((item) => item.academic_year_id === mapping.yearId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="min-w-0 text-sm font-semibold">Destination stream<select aria-label={`Destination stream ${index + 1}`} className={fieldClass} value={mapping.streamId} disabled={!availableStreams.length} onChange={(event) => updateMapping(index, { streamId: event.target.value })}><option value="">{availableStreams.length ? "Select destination stream" : "No stream required"}</option>{availableStreams.map((stream) => <option key={stream.id} value={stream.id}>{stream.name}</option>)}</select></label>
                </div>
                {source ? <p className="mt-3 text-sm text-muted">{studentId ? "Only this learner moves; the remaining learners keep their current configuration." : `${source.student_count} learners and their current subjects and teachers will move together.`}</p> : null}
              </section>;
            })}
            {!studentId ? <Button variant="secondary" onClick={() => setMappings((current) => [...current, emptyMapping()])}>Add cohort mapping</Button> : null}
            <label className="block text-sm font-semibold">Promotion reason<textarea className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} /></label>
          </fieldset>
          {review ? <section aria-label="Promotion review" className="space-y-3 rounded-xl border border-border p-4"><h3 className="font-semibold">Review promotion</h3>{review.preview.mappings.map((item) => <p key={item.source_placement_id} className="text-sm">{options.placements.find((placement) => placement.id === item.source_placement_id)?.class_section_name}: {item.student_count} learners, {item.subject_count} subjects, {item.teacher_count} teacher assignments.</p>)}{review.preview.warnings.map((message, index) => <p key={index} className="text-sm text-amber-700">{message}</p>)}{review.preview.blockers.map((message, index) => <p key={index} role="alert" className="text-sm text-danger">{message}</p>)}<p className="text-sm text-muted">All selected mappings are applied together. Review any blockers before proceeding.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy !== null} onClick={() => { setReview(null); requestId.current = null; }}>Edit mappings</Button><Button disabled={busy !== null || !review.preview.can_commit || review.preview.blockers.length > 0} onClick={confirmPromotion}>{busy === "commit" ? "Promoting..." : "Confirm promotion"}</Button></div></section> : <Button disabled={busy !== null} onClick={prepareReview}>{busy === "preview" ? "Reviewing..." : "Review promotion"}</Button>}
        </>}
      </>}
    </div>
  </Modal>;
}
