"use client";

import { useState } from "react";

export type ExamSubjectOption = { id: string; label: string; code?: string | null };
export type ExamClassOption = { id: string; label: string; grade_level?: string | null; stream?: string | null; subject_ids?: string[]; streams?: { id: string; label: string }[] };
export type ClassSubjectSelection = { class_section_id: string; subject_ids: string[]; stream_subjects?: { stream_id: string; subject_ids: string[] }[] };
export type SubjectOffering = { class_section_id: string; subject_id: string; academic_term_id?: string | null; stream_id?: string | null };

export function subjectLabel(subject: ExamSubjectOption) {
  const code = subject.code?.trim();
  return code && !/^(?:SUB-)?[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(code) && code !== subject.label
    ? `${subject.label} (${code})` : subject.label;
}

export function ClassSubjectSelector({ classes, subjects, selectedClasses, selections, onChange, offerings, termId }: {
  classes: ExamClassOption[];
  subjects: ExamSubjectOption[];
  selectedClasses: string[];
  selections: ClassSubjectSelection[];
  offerings?: SubjectOffering[];
  termId?: string;
  onChange: (classIds: string[], selections: ClassSubjectSelection[]) => void;
}) {
  const [active, setActive] = useState<string>(classes.find(c => selectedClasses.includes(c.id))?.id ?? classes[0]?.id ?? "");
  const [streamId, setStreamId] = useState("");
  const [search, setSearch] = useState("");
  const currentClass = classes.find(c => c.id === active) ?? classes[0];
  const participating = currentClass && selectedClasses.includes(currentClass.id);
  const selected = (id: string, stream = "") => {
    const row = selections.find(s => s.class_section_id === id);
    return (stream ? row?.stream_subjects?.find(s => s.stream_id === stream)?.subject_ids : undefined) ?? row?.subject_ids ?? [];
  };
  const offeredIds = currentClass ? offerings
    ? offerings.filter(row => row.class_section_id === currentClass.id && (!row.academic_term_id || row.academic_term_id === termId)
      && (!row.stream_id || row.stream_id === streamId)).map(row => row.subject_id)
    : currentClass.subject_ids ?? [] : [];
  const offered = subjects.filter(s => offeredIds.includes(s.id));
  const visible = offered.filter(s => subjectLabel(s).toLowerCase().includes(search.trim().toLowerCase()));
  const common = currentClass ? selected(currentClass.id, streamId) : [];
  const outsideCurriculum = common.filter(id => !offeredIds.includes(id));
  const field = "min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

  function chooseGroup(name: string) { setActive(name); setStreamId(""); setSearch(""); }
  function participate(ids: string[], checked: boolean) {
    onChange(checked ? [...new Set([...selectedClasses, ...ids])] : selectedClasses.filter(id => !ids.includes(id)), selections);
  }
  function changeSubjects(transform: (current: string[]) => string[]) {
    if (!currentClass) return;
    const next = [...selections];
    const index = next.findIndex(s => s.class_section_id === currentClass.id);
    const previous = next[index] ?? { class_section_id: currentClass.id, subject_ids: [] };
    const entry = streamId ? { ...previous, stream_subjects: [...(previous.stream_subjects ?? []).filter(s => s.stream_id !== streamId), { stream_id: streamId, subject_ids: transform(common) }] }
      : { ...previous, subject_ids: transform(common) };
    if (index < 0) next.push(entry); else next[index] = entry;
    onChange(selectedClasses, next);
  }

  return <section className="min-w-0 space-y-4" aria-label="Class-specific examined subjects">
    <div>
      <h3 className="font-bold text-foreground">Participating Grades / Forms</h3>
      <p className="mt-1 text-sm text-muted">Choose each class, then select what it will sit in this exam. Subjects are never selected automatically.</p>
    </div>
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
      <div className="space-y-2">
        {classes.map(item => {
          const enabled = selectedClasses.includes(item.id);
          const count = selected(item.id).length;
          return <div key={item.id} className={`flex items-center gap-2 rounded-lg border p-2 ${currentClass?.id === item.id ? "border-info bg-info-soft" : "border-border"}`}>
            <input type="checkbox" aria-label={`Participates: ${item.label}`} checked={enabled}
              onChange={e => { participate([item.id], e.target.checked); chooseGroup(item.id); }} />
            <button type="button" aria-pressed={currentClass?.id === item.id} onClick={() => chooseGroup(item.id)} className="min-h-11 min-w-0 flex-1 rounded px-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary">
              <span className="block font-bold">{item.label} — {count} subjects</span>
              <span className="text-xs text-muted">{!enabled ? "Not participating" : count > 0 ? "Configured" : "Choose subjects"}</span>
            </button>
          </div>;
        })}
      </div>
      {currentClass ? <fieldset className="min-w-0 space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 font-bold">Subjects for {currentClass.label}</legend>
        {!participating ? <p className="text-sm text-muted">Select this class as participating to configure its examined subjects.</p> : <>
          {currentClass.streams?.length ? <details className="rounded-lg bg-surface-muted p-3">
            <summary className="cursor-pointer text-sm font-semibold">Streams and exceptions</summary>
            <p className="my-2 text-sm text-muted">Streams use the class selection unless an exception is configured. Adjust a stream only when its subjects differ.</p>
            <label className="block text-sm font-semibold">Configure subjects for
              <select className={`${field} mt-1 w-full`} value={streamId} onChange={e => { setStreamId(e.target.value); setSearch(""); }}>
                <option value="">Class default</option>{currentClass.streams.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            {streamId && selections.find(s => s.class_section_id === currentClass.id)?.stream_subjects?.some(s => s.stream_id === streamId) ? <button type="button" className={`${field} mt-2`} onClick={() => onChange(selectedClasses, selections.map(s => s.class_section_id === currentClass.id ? { ...s, stream_subjects: s.stream_subjects?.filter(row => row.stream_id !== streamId) } : s))}>Use class default</button> : null}
          </details> : null}
          <p className="text-sm text-muted">{common.length} selected{streamId ? " for this stream" : " for the class"}. Only configured academic subjects are offered below.</p>
          {!offered.length ? <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">No academic subjects are mapped to this class or stream in this term. Ask the academic administrator to configure its curriculum, then reload school setup.</p> : <>
            <label className="block text-sm font-semibold">Search subjects<input type="search" className={`${field} mt-1 w-full`} value={search} onChange={e => setSearch(e.target.value)} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${field} font-semibold`} onClick={() => changeSubjects(current => [...new Set([...current, ...offeredIds])])}>Select all</button>
              <button type="button" className={field} onClick={() => changeSubjects(() => [])}>Clear selection</button>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {visible.map(subject => <label key={subject.id} className="flex min-h-11 min-w-0 items-start gap-2 rounded-lg border border-border p-2 text-sm">
                <input type="checkbox" className="mt-1" checked={common.includes(subject.id)} onChange={e => changeSubjects(current => e.target.checked ? [...new Set([...current, subject.id])] : current.filter(id => id !== subject.id))} />
                <span className="break-words">{subjectLabel(subject)}</span>
              </label>)}
              {!visible.length ? <p className="text-sm text-muted">No subjects match this search.</p> : null}
            </div>
          </>}
          {outsideCurriculum.length > 0 ? <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning">
            <p className="font-semibold">Saved subjects need curriculum review</p>
            <p>These saved selections are preserved: {outsideCurriculum.map(id => subjects.find(s => s.id === id)?.label ?? "Unavailable subject").join(", ")}. Review academic mappings before saving. Existing results remain protected.</p>
          </div> : null}
        </>}
      </fieldset> : <p className="text-sm text-muted">Add classes in school setup before configuring an exam.</p>}
    </div>
    {selectedClasses.length ? <details className="rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-sm font-semibold">Review all class selections ({selectedClasses.length})</summary>
      <ul className="mt-3 space-y-2 text-sm">{classes.filter(c => selectedClasses.includes(c.id)).map(c => <li key={c.id}>
        <strong>{c.label} ({selected(c.id).length}): </strong>{selected(c.id).map(id => subjects.find(s => s.id === id)?.label ?? "Unavailable subject").join(", ") || "No subjects selected"}
        {selections.find(s => s.class_section_id === c.id)?.stream_subjects?.map(s => <p className="mt-1 pl-3" key={s.stream_id}>{c.streams?.find(stream => stream.id === s.stream_id)?.label ?? "Stream"} ({s.subject_ids.length}): {s.subject_ids.map(id => subjects.find(subject => subject.id === id)?.label ?? "Unavailable subject").join(", ") || "No subjects selected"}</p>)}
      </li>)}</ul>
    </details> : null}
  </section>;
}
