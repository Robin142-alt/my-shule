"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";

type Student = {
  id: string; admission_number: string; first_name: string; middle_name: string | null; last_name: string;
  date_of_birth: string | null; gender: string | null; status: string; nationality: string | null;
  birth_certificate_number: string | null; upi_number: string | null; nemis_number: string | null;
  updated_at: string; class_section_id: string | null; stream_id: string | null; academic_year_id: string | null;
  class_name: string | null; stream_name: string | null; curriculum: string | null;
  guardian_name: string | null; guardian_relationship: string | null; guardian_phone: string | null; guardian_linked_students: number;
};
type Subject = { id: string; name: string; code: string; is_compulsory: boolean };
type StudentRecord = { student: Student; subjects: Subject[]; can_edit: boolean };
type Foundation = {
  academic_years: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string; academic_year_id: string; curriculum: string }>;
  streams: Array<{ id: string; name: string; class_section_id: string }>;
  subjects: Subject[];
  class_subject_assignments: Array<{ class_section_id: string; stream_id?: string | null; subject_id: string; is_compulsory: boolean }>;
};
const detailFields = [
  ["first_name", "First name", true], ["middle_name", "Middle name (optional)", false], ["last_name", "Last name", true],
  ["date_of_birth", "Date of birth (optional)", false], ["nationality", "Nationality (optional)", false],
  ["birth_certificate_number", "Birth certificate number (optional)", false],
  ["upi_number", "UPI (optional)", false], ["nemis_number", "NEMIS number (optional)", false],
] as const;
type Field = typeof detailFields[number][0] | "gender" | "class_section_id" | "stream_id" | "guardian_name" | "guardian_relationship" | "guardian_phone";
type Draft = Record<Field, string> & { subject_ids: string[]; reason: string };
const fields: Field[] = [...detailFields.map(([key]) => key), "gender", "class_section_id", "stream_id", "guardian_name", "guardian_relationship", "guardian_phone"];
const inputClass = "min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-base";
const buttonClass = "min-h-11 rounded-xl border border-border px-4 py-2 font-semibold disabled:opacity-50";

function toDraft(record: StudentRecord): Draft {
  return { ...Object.fromEntries(fields.map(key => [key, record.student[key] ?? ""])),
    subject_ids: record.subjects.map(subject => subject.id).filter(Boolean), reason: "" } as Draft;
}

function configuredSubjects(foundation: Foundation | undefined, classId: string, streamId: string): Subject[] {
  const assignments = foundation?.class_subject_assignments.filter(row => row.class_section_id === classId && (row.stream_id || "") === streamId) ?? [];
  return (foundation?.subjects ?? []).filter(subject => assignments.some(row => row.subject_id === subject.id))
    .map(subject => ({ ...subject, is_compulsory: assignments.some(row => row.subject_id === subject.id && row.is_compulsory) }));
}

export function StudentRecordWorkspace({ studentId, backHref, guardiansHref }: { studentId: string; backHref: string; guardiansHref: string }) {
  const tenant = useOptionalSchoolTenantId();
  const client = useQueryClient();
  const path = `/students/${studentId}/record`;
  const recordQuery = useSchoolQuery<StudentRecord>(path, { retry: false });
  const [editing, setEditing] = useState<{ baseline: StudentRecord; draft: Draft } | null>(null);
  const options = useSchoolQuery<Foundation>(editing ? `${path}/options` : null, { retry: false, staleTime: 60_000 });
  const save = useSchoolMutation<StudentRecord, Record<string, unknown>>(path, "PATCH", { queueNetworkFailures: false, invalidateSchoolQueries: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const saving = useRef(false);
  const record = recordQuery.data;
  const draft = editing?.draft;
  const subjects = configuredSubjects(options.data, draft?.class_section_id ?? "", draft?.stream_id ?? "");
  const selectedClass = options.data?.classes.find(item => item.id === draft?.class_section_id);
  const setField = (field: Field | "reason", value: string) => setEditing(current => current ? { ...current, draft: { ...current.draft, [field]: value } } : null);

  function selectPlacement(classId: string, streamId: string) {
    setEditing(current => current ? { ...current, draft: { ...current.draft, class_section_id: classId, stream_id: streamId,
      subject_ids: configuredSubjects(options.data, classId, streamId).map(subject => subject.id) } } : null);
  }

  async function submit() {
    if (!editing || saving.current) return;
    const initial = toDraft(editing.baseline);
    const body: Record<string, unknown> = { expected_updated_at: editing.baseline.student.updated_at, reason: editing.draft.reason };
    for (const field of fields) if (initial[field] !== editing.draft[field]) body[field] = editing.draft[field];
    if ([...initial.subject_ids].sort().join() !== [...editing.draft.subject_ids].sort().join()) body.subject_ids = editing.draft.subject_ids;
    if (Object.keys(body).length === 2) { setError("Change at least one field before saving."); return; }
    saving.current = true;
    setError(null);
    try {
      const saved = await save.mutateAsync(body);
      // All role views of this school must reload the same committed record.
      client.setQueriesData({ predicate: query => query.queryKey[0] === "school" && query.queryKey[1] === tenant && query.queryKey[4] === path }, saved);
      void client.invalidateQueries({ queryKey: ["school", tenant] });
      setEditing(null);
      setSuccess(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The changes could not be saved. Your entries are still here."); }
    finally { saving.current = false; }
  }

  return <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
    <Link href={backHref} className="inline-flex min-h-11 items-center font-semibold text-primary">← Back to students</Link>
    {recordQuery.isLoading ? <p role="status">Loading student record…</p> : null}
    {recordQuery.isError ? <div role="alert" className="rounded-xl border border-danger p-4">
      <p>{recordQuery.error.message || "The student record could not be loaded."}</p>
      <button className={buttonClass} onClick={() => void recordQuery.refetch()}>Retry</button>
    </div> : null}
    {record ? <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{[record.student.first_name, record.student.middle_name, record.student.last_name].filter(Boolean).join(" ")}</h1>
          <p className="text-muted">Admission no. {record.student.admission_number} · {record.student.status}</p>
          <p>{[record.student.class_name, record.student.stream_name].filter(Boolean).join(" · ") || "Class not recorded"}</p></div>
        {record.can_edit && !editing ? <button className={`${buttonClass} bg-primary text-white`} onClick={() => { setEditing({ baseline: record, draft: toDraft(record) }); setError(null); setSuccess(false); }}>Edit student</button> : null}
      </header>
      {success ? <p role="status" className="rounded-xl bg-success-soft p-3">Student record saved. Class lists, subject registers and guardian contacts use the updated information.</p> : null}
      {editing && draft ? <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-5">
        <fieldset disabled={save.isPending} className="space-y-5">
          <div><h2 className="mb-3 text-lg font-bold">Student details</h2><div className="grid gap-3 sm:grid-cols-2">
            {detailFields.map(([field, label, required]) => <label key={field} className="grid gap-1">{label}<input className={inputClass} required={required} maxLength={80}
              type={field === "date_of_birth" ? "date" : "text"} value={draft[field]} onChange={event => setField(field, event.target.value)} /></label>)}
            <label className="grid gap-1">Gender<select className={inputClass} value={draft.gender} onChange={event => setField("gender", event.target.value)}>
              <option value="" disabled>Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="undisclosed">Undisclosed</option>
            </select></label>
          </div></div>
          <div><h2 className="mb-3 text-lg font-bold">Class and subjects</h2>
            {options.isLoading ? <p role="status">Loading class configuration…</p> : null}
            {options.isError ? <p role="alert">Class options could not be loaded. <button type="button" className="underline" onClick={() => void options.refetch()}>Retry class options</button></p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">Class<select aria-label="Class" className={inputClass} disabled={!options.data} value={draft.class_section_id} onChange={event => selectPlacement(event.target.value, "")}>
                <option value="">Select class</option>
                {draft.class_section_id && !options.data?.classes.some(item => item.id === draft.class_section_id) ? <option value={draft.class_section_id}>{record.student.class_name || "Current class"}</option> : null}
                {options.data?.classes.filter(item => !record.student.academic_year_id || item.academic_year_id === record.student.academic_year_id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>
              <label className="grid gap-1">Stream<select aria-label="Stream" className={inputClass} disabled={!options.data} value={draft.stream_id} onChange={event => selectPlacement(draft.class_section_id, event.target.value)}>
                <option value="">No stream / select stream</option>
                {options.data?.streams.filter(item => item.class_section_id === draft.class_section_id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>
            </div>
            <p className="my-3 text-sm text-muted">{selectedClass?.curriculum || record.student.curriculum} · {options.data?.academic_years.find(year => year.id === selectedClass?.academic_year_id)?.name}. Subjects follow the class setup. Existing marks and invoices keep their history. Use promotion for a new academic year.</p>
            <div className="grid gap-2 sm:grid-cols-2">{subjects.map(subject => <label key={subject.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-border p-3">
              <input type="checkbox" className="h-5 w-5" checked={draft.subject_ids.includes(subject.id)} disabled={subject.is_compulsory}
                onChange={event => setEditing(current => current ? { ...current, draft: { ...current.draft, subject_ids: event.target.checked ? [...current.draft.subject_ids, subject.id] : current.draft.subject_ids.filter(id => id !== subject.id) } } : null)} />
              <span>{subject.name}{subject.is_compulsory ? " (compulsory)" : ""}</span>
            </label>)}</div>
            {options.data && !subjects.length ? <p className="mt-2 text-muted">No subjects are configured for this selection. Select a stream or ask school administration to complete class setup.</p> : null}
          </div>
          <div><h2 className="mb-3 text-lg font-bold">Parent / guardian</h2>
            <p className="mb-3 text-sm text-muted">Details can be added later. Name and phone changes update all learners linked to the same guardian{record.student.guardian_linked_students > 1 ? ` (${record.student.guardian_linked_students} learners)` : ""}. The relationship applies to this student.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">Guardian name (optional)<input className={inputClass} maxLength={160} value={draft.guardian_name} onChange={event => setField("guardian_name", event.target.value)} /></label>
              <label className="grid gap-1">Relationship (optional)<select className={inputClass} value={draft.guardian_relationship} onChange={event => setField("guardian_relationship", event.target.value)}>
                <option value="">Add later</option><option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option>
              </select></label>
              <label className="grid gap-1">Guardian phone (optional)<input className={inputClass} type="tel" maxLength={32} placeholder="07… or +254…" value={draft.guardian_phone} onChange={event => setField("guardian_phone", event.target.value)} /></label>
            </div>
            <Link href={guardiansHref} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">Link an existing guardian or manage portal access →</Link>
          </div>
          <label className="grid gap-1">Reason for changes<input required minLength={5} maxLength={500} className={inputClass} value={draft.reason} onChange={event => setField("reason", event.target.value)} placeholder="For example, corrected parent contact" /></label>
        </fieldset>
        {error ? <div role="alert" className="rounded-xl border border-danger p-3 text-danger">{error}<p>Your changes are still in the form.</p></div> : null}
        <div className="flex flex-col gap-2 sm:flex-row"><button disabled={save.isPending} className={`${buttonClass} bg-primary text-white`} type="submit">{save.isPending ? "Saving changes…" : "Save changes"}</button>
          <button disabled={save.isPending} className={buttonClass} type="button" onClick={() => { setEditing(null); setError(null); void recordQuery.refetch(); }}>Cancel editing</button></div>
      </form> : <div className="grid gap-5 sm:grid-cols-2">
        <div><h2 className="mb-2 text-lg font-bold">Student details</h2><dl className="space-y-2">{detailFields.slice(3).map(([field, label]) => <div key={field}><dt className="text-sm text-muted">{label.replace(" (optional)", "")}</dt><dd>{record.student[field] || "Not recorded"}</dd></div>)}</dl></div>
        <div className="space-y-4"><div><h2 className="text-lg font-bold">Subjects</h2>{record.subjects.length ? <ul className="mt-2 space-y-1">{record.subjects.map((subject, index) => <li key={subject.id || index}>{subject.name}{subject.is_compulsory ? " · compulsory" : ""}</li>)}</ul> : <p>No active subjects recorded.</p>}</div>
          <div><h2 className="text-lg font-bold">Parent / guardian</h2><p>{record.student.guardian_name || "Name can be added later"}</p><p className="capitalize">{record.student.guardian_relationship || "Relationship can be added later"}</p>
            {record.student.guardian_phone ? <a className="inline-flex min-h-11 items-center underline" href={`tel:${record.student.guardian_phone}`}>{record.student.guardian_phone}</a> : <p>Phone can be added later</p>}</div>
        </div>
      </div>}
    </> : null}
  </section>;
}
