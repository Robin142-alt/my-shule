"use client";

import { useState, type FormEvent } from 'react';
import { useSchoolMutation } from '@/lib/data/school-hooks';
import { syllabusButton, syllabusField, type SyllabusMilestone, type SyllabusPlan, type SyllabusTopic, type SyllabusWorkspaceData } from '@/lib/modules/syllabus-types';
import styles from './syllabus-workspace.module.css';

export function SyllabusEditor({ data, plan, onSaved, onCancel }: { data: SyllabusWorkspaceData; plan?: SyllabusPlan; onSaved: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(plan?.subject_id ?? data.rights[0]?.subject_id ?? '');
  const [year, setYear] = useState(plan?.academic_year_id ?? data.years.find(y => y.status === 'active')?.id ?? '');
  const [term, setTerm] = useState(plan?.academic_term_id ?? '');
  const [grade, setGrade] = useState(plan?.grade_level ?? '');
  const [topics, setTopics] = useState<SyllabusTopic[]>(plan?.topics ?? []);
  const [milestones, setMilestones] = useState<SyllabusMilestone[]>(plan?.milestones ?? []);
  const save = useSchoolMutation<unknown, Record<string, unknown>>(plan ? `/academics/syllabus/${encodeURIComponent(plan.id)}` : '/academics/syllabus', plan ? 'PATCH' : 'POST', { queueNetworkFailures: false });
  const selectedTerm = data.terms.find(t => t.id === term);
  const canManageYear = (id: string) => data.rights.some(r => r.subject_id === subject && (!r.academic_year_id || r.academic_year_id === id));
  const requiredCount = topics.filter(topic => !topic.archived).reduce((count, topic) => count + topic.subtopics.filter(sub => sub.required && !sub.archived).length, 0);
  function removeSubtopic(topic: SyllabusTopic, id: string) {
    updateTopic(topic.id, { subtopics: topic.subtopics.filter(sub => sub.id !== id) });
    setMilestones(items => items.map(m => ({ ...m, subtopic_ids: m.subtopic_ids.filter(key => key !== id) })));
  }
  function updateTopic(id: string, changes: Partial<SyllabusTopic>) { setTopics(items => items.map(t => t.id === id ? { ...t, ...changes } : t)); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await save.mutateAsync({ subject_id: subject, academic_year_id: year, academic_term_id: term, grade_level: grade,
      topics, milestones, ...(plan ? { version: plan.version } : {}) }); onSaved(); } catch { /* Keep the revision available for correction. */ }
  }
  return <form onSubmit={event => void submit(event)} className="space-y-4">
    <p className="text-sm text-muted">Set the plan once for all streams. Teachers will record their own progress against these subtopics.</p>
    <fieldset disabled={save.isPending} className="space-y-4">
      <section className={styles.formSection}><h3 className={styles.sectionTitle}><span>1</span>Choose the class and term</h3><p>Use the school&apos;s existing subjects and academic calendar.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Subject<select className={syllabusField} required disabled={Boolean(plan)} value={subject} onChange={event => { setSubject(event.target.value); setYear(''); setTerm(''); setGrade(''); }}><option value="">Select subject</option>{data.subjects.filter(s => data.rights.some(r => r.subject_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Academic year<select className={syllabusField} required disabled={Boolean(plan)} value={year} onChange={event => { setYear(event.target.value); setTerm(''); setGrade(''); }}><option value="">Select year</option>{data.years.filter(y => canManageYear(y.id) && ['active','draft'].includes(y.status)).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Term<select className={syllabusField} required disabled={Boolean(plan)} value={term} onChange={event => setTerm(event.target.value)}><option value="">Select term</option>{data.terms.filter(t => t.academic_year_id === year && ['active','draft'].includes(t.status)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Grade/Form<select className={syllabusField} required disabled={Boolean(plan)} value={grade} onChange={event => setGrade(event.target.value)}><option value="">Select grade/form</option>{data.grades.filter(g => g.academic_year_id === year).map(g => <option key={g.grade_level} value={g.grade_level}>{g.grade_level}</option>)}</select></label>
      </div></section>
      <div><h3 className={styles.sectionTitle}><span>2</span>What should be taught?</h3><p className="mt-2 text-sm text-muted">Break each topic into small, tickable subtopics. A topic is complete when all its required subtopics are taught.</p></div>
      {!topics.length && <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">Start with your first topic, then add its subtopics and target date.</div>}
      {topics.map((topic, index) => <fieldset key={topic.id} className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 font-semibold">Topic {index + 1}{topic.archived ? ' (archived)' : ''}</legend>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Topic {index + 1} title<input className={syllabusField} required maxLength={300} value={topic.title} onChange={event => updateTopic(topic.id, { title: event.target.value })} /></label>
          <label className="text-sm">Topic {index + 1} expected completion<input className={syllabusField} type="date" required min={selectedTerm?.starts_on} max={selectedTerm?.ends_on} value={topic.expected_on} onChange={event => updateTopic(topic.id, { expected_on: event.target.value })} /></label></div>
        {plan?.topics.some(t => t.id === topic.id) ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={topic.archived} onChange={event => updateTopic(topic.id, { archived: event.target.checked })} />Archive topic (retain history)</label>
          : <button type="button" className="min-h-11 text-sm text-danger" onClick={() => { setTopics(items => items.filter(t => t.id !== topic.id)); setMilestones(items => items.map(m => ({ ...m, subtopic_ids: m.subtopic_ids.filter(id => !topic.subtopics.some(s => s.id === id)) }))); }}>Remove topic {index + 1}</button>}
        {topic.subtopics.map((sub, subIndex) => <div key={sub.id} className="space-y-2 rounded-lg bg-surface-muted p-3">
          <label className="block text-sm">Topic {index + 1}, subtopic {subIndex + 1}<input className={syllabusField} required maxLength={300} value={sub.title} onChange={event => updateTopic(topic.id, { subtopics: topic.subtopics.map(s => s.id === sub.id ? { ...s, title: event.target.value } : s) })} /></label>
          <details><summary className="min-h-11 cursor-pointer content-center text-sm text-info">Subtopic settings · {sub.required ? 'Required' : 'Optional'}{sub.archived ? ' · Archived' : ''}</summary>
            <p className="mb-2 text-xs text-muted">Uses the topic&apos;s target date unless you choose a different date below.</p>
            <label className="block text-sm">Subtopic due date (optional)<input aria-label={`Topic ${index + 1}, subtopic ${subIndex + 1} due date`} className={syllabusField} type="date" min={selectedTerm?.starts_on} max={selectedTerm?.ends_on} value={sub.expected_on ?? ''} onChange={event => updateTopic(topic.id, { subtopics: topic.subtopics.map(s => s.id === sub.id ? { ...s, expected_on: event.target.value || null } : s) })} /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={sub.required} onChange={event => updateTopic(topic.id, { subtopics: topic.subtopics.map(s => s.id === sub.id ? { ...s, required: event.target.checked } : s) })} />Required for completion</label>
            {plan?.topics.some(t => t.subtopics.some(s => s.id === sub.id)) ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={sub.archived} onChange={event => updateTopic(topic.id, { subtopics: topic.subtopics.map(s => s.id === sub.id ? { ...s, archived: event.target.checked } : s) })} />Archive subtopic (retain history)</label>
              : <button type="button" className="min-h-11 text-sm text-danger" onClick={() => removeSubtopic(topic, sub.id)}>Remove subtopic {subIndex + 1}</button>}
          </details>
        </div>)}
        <button type="button" className={syllabusButton} onClick={() => updateTopic(topic.id, { subtopics: [...topic.subtopics, { id: crypto.randomUUID(), title: '', required: true, archived: false }] })}>Add subtopic to topic {index + 1}</button>
      </fieldset>)}
      <button type="button" className={syllabusButton} onClick={() => setTopics(items => [...items, { id: crypto.randomUUID(), title: '', expected_on: selectedTerm?.ends_on ?? '', archived: false, subtopics: [] }])}>Add topic</button>
      <div className={styles.formSection}><h3 className={styles.sectionTitle}><span>3</span>Coverage milestones</h3><p>Optional checkpoints for a group of subtopics, such as “Ready for midterm assessment”.</p></div>
      {milestones.map((milestone, index) => <fieldset key={milestone.id} className="space-y-3 rounded-lg border border-border p-3"><legend>Milestone {index + 1}</legend>
        <label className="block text-sm">Milestone {index + 1} title<input className={syllabusField} required maxLength={300} value={milestone.title} onChange={event => setMilestones(items => items.map(m => m.id === milestone.id ? { ...m, title: event.target.value } : m))} /></label>
        <label className="block text-sm">Milestone {index + 1} date<input className={syllabusField} type="date" required min={selectedTerm?.starts_on} max={selectedTerm?.ends_on} value={milestone.due_on} onChange={event => setMilestones(items => items.map(m => m.id === milestone.id ? { ...m, due_on: event.target.value } : m))} /></label>
        <p className="text-sm">Subtopics to complete by this milestone</p>
        {topics.filter(t => !t.archived).flatMap(t => t.subtopics.filter(s => !s.archived).map(s => <label key={s.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={milestone.subtopic_ids.includes(s.id)} onChange={event => setMilestones(items => items.map(m => m.id === milestone.id ? { ...m, subtopic_ids: event.target.checked ? [...m.subtopic_ids, s.id] : m.subtopic_ids.filter(id => id !== s.id) } : m))} />{t.title || 'Untitled topic'}: {s.title || 'Untitled subtopic'}</label>))}
        <button type="button" className={syllabusButton} onClick={() => setMilestones(items => items.filter(m => m.id !== milestone.id))}>Remove milestone {index + 1}</button>
      </fieldset>)}
      <button type="button" className={syllabusButton} onClick={() => setMilestones(items => [...items, { id: crypto.randomUUID(), title: '', due_on: selectedTerm?.ends_on ?? '', subtopic_ids: [] }])}>Add milestone</button>
      {save.error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{save.error.message}</p>}
      <div className={styles.formFooter}><p className="text-xs text-muted">{topics.filter(t => !t.archived).length} topics · {requiredCount} required subtopics · {milestones.length} milestones</p><div className="flex gap-2"><button type="button" className={syllabusButton} onClick={onCancel}>Cancel</button><button type="submit" disabled={save.isPending || !requiredCount} className={`${syllabusButton} ${styles.primary}`}>{save.isPending ? 'Saving syllabus…' : plan ? 'Publish revision' : 'Publish syllabus'}</button></div></div>
    </fieldset>
  </form>;
}
