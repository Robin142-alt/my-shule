"use client";

import { useState } from 'react';
import { useSchoolMutation } from '@/lib/data/school-hooks';
import { syllabusButton, syllabusField, type SyllabusAllocation, type SyllabusCoverage, type SyllabusPlan, type SyllabusSubtopic } from '@/lib/modules/syllabus-types';
import { CoverageProgress, CoverageStatus, syllabusDate } from './syllabus-progress';
import styles from './syllabus-workspace.module.css';

function SubtopicRow({ subtopic, allocation, plan, due, record, hidden }: {
  subtopic: SyllabusSubtopic; allocation: SyllabusAllocation; plan: SyllabusPlan; due: string; record?: SyllabusCoverage; hidden: boolean;
}) {
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const note = draftNote ?? record?.note ?? '';
  const [message, setMessage] = useState('');
  const save = useSchoolMutation<SyllabusCoverage, { assignment_id: string; completed: boolean; note: string; version: number; syllabus_version: number }>(
    `/academics/syllabus/${encodeURIComponent(plan.id)}/subtopics/${encodeURIComponent(subtopic.id)}/coverage`, 'POST', { queueNetworkFailures: false });
  const writable = allocation.can_record && !subtopic.archived;
  async function persist(completed: boolean) {
    setMessage('');
    try { await save.mutateAsync({ assignment_id: allocation.id, completed, note, version: record?.version ?? 0, syllabus_version: plan.version }); setDraftNote(null); setMessage('Saved'); }
    catch { /* The mutation error remains visible and the note is preserved for retry. */ }
  }
  return <li className={`${styles.checkRow} space-y-2`} hidden={hidden} data-complete={record?.completed ?? false}>
    <label className="flex min-h-11 items-start gap-3 text-sm font-semibold">
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={record?.completed ?? false} disabled={!writable || save.isPending}
        onChange={event => void persist(event.target.checked)} />
      <span className="min-w-0 break-words">{subtopic.title}<span className="mt-1 block text-xs font-normal text-muted">{subtopic.required ? 'Required' : 'Optional'} · Due {syllabusDate(subtopic.expected_on || due)}{subtopic.archived ? ' · Archived' : ''}</span></span>
    </label>
    {record?.completed_at && <p className="text-xs text-muted">Taught · {new Date(record.completed_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} · {allocation.teacher_name}</p>}
    {writable ? <details><summary className="cursor-pointer py-2 text-sm text-info">Teaching note{record?.note ? ' (saved)' : ' (optional)'}</summary>
      <label className="block text-sm">Note for {subtopic.title}<textarea className={syllabusField} maxLength={2000} rows={2} value={note} onChange={event => setDraftNote(event.target.value)} /></label>
      <button type="button" className={`${syllabusButton} mt-2`} disabled={save.isPending || note === (record?.note ?? '')} onClick={() => void persist(record?.completed ?? false)}>Save note</button>
    </details> : record?.note ? <p className="whitespace-pre-wrap text-sm text-muted">{record.note}</p> : null}
    {save.isPending && <p role="status" className="text-xs">Saving coverage…</p>}
    {message && <p role="status" className="text-xs text-success">{message}</p>}
    {save.error && <div role="alert" className="text-sm text-danger">{save.error.message} Your change has not been saved. Refresh the coverage and retry.</div>}
  </li>;
}

export function SyllabusChecklist({ allocation, plan }: { allocation: SyllabusAllocation; plan: SyllabusPlan }) {
  const progress = allocation.progress;
  const [view, setView] = useState<'All' | 'To teach' | 'Taught'>('All');
  const [search, setSearch] = useState('');
  const visible = (sub: SyllabusSubtopic, topic: string, archived: boolean) => `${topic} ${sub.title}`.toLowerCase().includes(search.trim().toLowerCase())
    && (view === 'All' || (!archived && !sub.archived && Boolean(allocation.records.find(r => r.subtopic_id === sub.id)?.completed) === (view === 'Taught')));
  const visibleCount = plan.topics.reduce((count, topic) => count + topic.subtopics.filter(sub => visible(sub, topic.title, topic.archived)).length, 0);
  return <section className={`${styles.workspace} space-y-4`} aria-label="Syllabus checklist">
    <div><h3 className="text-lg font-bold">{allocation.subject} · {allocation.class_name}{allocation.stream_name ? ` · ${allocation.stream_name}` : ''}</h3>
      <p className="text-sm text-muted">{allocation.teacher_name} · {allocation.year_name} · {allocation.term_name} · Syllabus revision {plan.version}</p></div>
    {!allocation.can_record && <p className="rounded-lg bg-surface-muted p-3 text-sm">Read-only coverage. Only the teacher with an active allocation can record what they taught.</p>}
    <div className="space-y-3 rounded-lg bg-surface-muted p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{progress?.percentage ?? 0}% covered</strong><CoverageStatus status={progress?.status ?? 'Syllabus not set'} /></div>
      <CoverageProgress value={progress?.percentage ?? 0} label="Class syllabus coverage" /><p className="text-sm text-muted">{progress?.completed ?? 0}/{progress?.total ?? 0} required subtopics · {progress?.completed_topics ?? 0} completed topics · {progress?.remaining.length ?? 0} remaining</p>
    </div>
    {allocation.can_record && <p className="text-sm text-muted">Tick a subtopic when taught. Changes save automatically; untick to correct a record.</p>}
    {(progress?.overdue.length ?? 0) > 0 && <div className="rounded-lg border border-warning-border bg-warning-soft p-3 text-sm"><strong>{progress!.overdue.length} subtopics are past their target date.</strong> Start with the remaining work below.</div>}
    <div className={styles.segmented} role="group" aria-label="Filter subtopics">{(['All', 'To teach', 'Taught'] as const).map(option => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)}>{option}</button>)}</div>
    <label className="block text-sm font-semibold">Find a subtopic<input type="search" className={syllabusField} placeholder="Search topics or subtopics" value={search} onChange={event => setSearch(event.target.value)} /></label>
    {!visibleCount && <div className="rounded-lg border border-dashed border-border p-4 text-sm"><p>No subtopics match this view.</p><button type="button" className={`${syllabusButton} mt-2`} onClick={() => { setView('All'); setSearch(''); }}>Show all subtopics</button></div>}
    {plan.topics.map(topic => {
      const required = topic.subtopics.filter(sub => sub.required && !sub.archived);
      const done = required.filter(sub => allocation.records.some(record => record.subtopic_id === sub.id && record.completed)).length;
      return <details key={topic.id} open={!topic.archived} className={styles.topic} data-complete={required.length > 0 && done === required.length}
        hidden={!topic.subtopics.some(sub => visible(sub, topic.title, topic.archived))}>
        <summary>{topic.title}{topic.archived ? ' · Archived (history retained)' : ''}<small>{done}/{required.length} required subtopics taught · Due {syllabusDate(topic.expected_on)}</small></summary>
        <ul>{topic.subtopics.map(sub => <SubtopicRow key={sub.id} subtopic={{ ...sub, archived: topic.archived || sub.archived }} allocation={allocation} plan={plan} due={topic.expected_on}
          hidden={!visible(sub, topic.title, topic.archived)} record={allocation.records.find(record => record.subtopic_id === sub.id)} />)}</ul>
      </details>;
    })}
    {Boolean(progress?.milestones.length) && <details className={styles.topic}><summary>Milestones &amp; target dates<small>{progress!.milestones.filter(m => m.status === 'Overdue').length} overdue · {progress!.milestones.filter(m => m.status === 'Upcoming').length} upcoming</small></summary>
      <ul className="space-y-3 text-sm">{progress!.milestones.map(m => <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><div><strong>{m.title}</strong><p className="mt-1 text-xs text-muted">{syllabusDate(m.due_on)} · {m.completed}/{m.total} subtopics</p></div><CoverageStatus status={m.status} /></li>)}</ul>
    </details>}
  </section>;
}
