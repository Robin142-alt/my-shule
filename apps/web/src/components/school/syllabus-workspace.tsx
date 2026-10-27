"use client";

import { useState } from 'react';
import { BookOpen, Download, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useSchoolMutation, useSchoolQuery } from '@/lib/data/school-hooks';
import { Modal } from '@/components/ui/modal';
import { syllabusButton, syllabusField, type SyllabusAllocation, type SyllabusPlan, type SyllabusWorkspaceData } from '@/lib/modules/syllabus-types';
import { SyllabusEditor } from './syllabus-editor';
import { SyllabusChecklist } from './syllabus-checklist';
import { CoverageProgress, CoverageStatus } from './syllabus-progress';
import styles from './syllabus-workspace.module.css';

type Filter = 'subject_id' | 'class_section_id' | 'stream_name' | 'teacher_user_id' | 'academic_year_id' | 'academic_term_id';
const filterLabels: Record<Filter, string> = { subject_id: 'Subject', class_section_id: 'Class', stream_name: 'Stream', teacher_user_id: 'Teacher', academic_year_id: 'Academic year', academic_term_id: 'Term' };
const filterValue = (row: SyllabusAllocation, key: Filter) => key === 'subject_id' ? row.subject : key === 'class_section_id' ? row.class_name : key === 'teacher_user_id' ? row.teacher_name : key === 'academic_year_id' ? row.year_name : key === 'academic_term_id' ? `${row.year_name} · ${row.term_name}` : row.stream_name || 'No stream';

export function SyllabusWorkspace({ mode = 'monitor' }: { mode?: 'teaching' | 'monitor' } = {}) {
  const query = useSchoolQuery<SyllabusWorkspaceData>('/academics/syllabus', { refetchInterval: 15_000 });
  const [filters, setFilters] = useState<Partial<Record<Filter, string>>>({});
  const [search, setSearch] = useState('');
  const [behind, setBehind] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selection, setSelection] = useState('');
  const [editor, setEditor] = useState<SyllabusPlan | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const exportReport = useSchoolMutation<{ csv: string; filename: string }, Record<string, never>>('/academics/syllabus/export', 'POST', { queueNetworkFailures: false, invalidateSchoolQueries: false });
  const data = query.data;
  const scopeKey = data ? `${data.school_id}:${data.generated_by ?? ''}` : '';
  const [previousScope, setPreviousScope] = useState(scopeKey);
  if (previousScope !== scopeKey) {
    setPreviousScope(scopeKey); setEditor(null); setSelection(''); setFilters({}); setSearch(''); setBehind(false); setMessage('');
  }
  const items = (data?.items ?? []).filter(row => mode !== 'teaching' || !data?.generated_by || row.teacher_user_id === data.generated_by);
  const filtered = items.filter(row => Object.entries(filters).every(([key, value]) => !value || String(row[key as Filter] ?? '') === value)
    && (!behind || row.progress?.status === 'Behind') && `${row.subject} ${row.class_name} ${row.stream_name ?? ''} ${row.teacher_name} ${row.grade_level}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = items.find(row => `${row.id}:${row.academic_term_id}` === selection);
  const selectedPlan = data?.syllabi.find(plan => plan.id === selected?.syllabus_id);
  const totals = filtered.reduce((sum, row) => ({ completed: sum.completed + (row.progress?.completed ?? 0), required: sum.required + (row.progress?.total ?? 0) }), { completed: 0, required: 0 });
  const percentage = totals.required ? Math.round(1000 * totals.completed / totals.required) / 10 : 0;
  const filterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => { setFilters({}); setSearch(''); setBehind(false); };
  async function download() {
    try {
      const artifact = await exportReport.mutateAsync({});
      const url = URL.createObjectURL(new Blob(['\uFEFF', artifact.csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = artifact.filename; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Coverage report downloaded. The report contains all coverage records you are authorized to view.');
    } catch { /* The export error is displayed below. */ }
  }
  return <section className={`${styles.workspace} ${mode === 'teaching' ? styles.teaching : ''} space-y-5 rounded-xl border border-border bg-surface p-4 text-foreground sm:p-6`} aria-label="Syllabus coverage workspace">
    <div className={styles.header}><div><p className={styles.eyebrow}>Academics &amp; Teaching</p><h2 className="text-xl font-bold">Syllabus Coverage</h2>
      <p className="mt-2 max-w-xl text-sm text-muted">{mode === 'teaching' ? 'Choose your class, then tick what you have taught. Every tick saves automatically.' : 'One shared syllabus. A clear view of what each class has actually covered.'}</p></div>
      <div className={styles.actions}><button type="button" className={syllabusButton} disabled={query.isFetching} onClick={() => void query.refetch()} aria-label="Refresh coverage" title="Refresh coverage"><RefreshCw size={16} aria-hidden="true" /></button>
        <button type="button" className={`${syllabusButton} gap-2`} disabled={!data || exportReport.isPending} onClick={() => void download()} aria-label="Download coverage CSV"><Download size={16} aria-hidden="true" />{exportReport.isPending ? 'Preparing report…' : 'Download report'}</button>
        {Boolean(data?.rights.length) && <button type="button" className={`${syllabusButton} ${styles.primary}`} onClick={() => setEditor('new')}><Plus size={16} aria-hidden="true" />Define syllabus</button>}</div></div>
    {message && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{message}</p>}
    {exportReport.error && <p role="alert" className="text-sm text-danger">Report download failed: {exportReport.error.message} Retry the download.</p>}
    {query.error && <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">Coverage could not be refreshed: {query.error.message} Use Refresh coverage to retry.</div>}
    {query.isPending && !data ? <p role="status" className="py-6">Loading syllabus coverage…</p> : data ? <>
      <div className={styles.summary} aria-label="Coverage summary for the current filters">
        <div><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Actual coverage</span><strong>{percentage}%</strong></div><div className="mt-3"><CoverageProgress value={percentage} label="Overall actual coverage" /></div><p>{totals.completed} of {totals.required} required subtopics taught · current view</p></div>
        <div><strong>{filtered.filter(i => i.progress?.status === 'Behind').length}</strong><p>Behind schedule</p><p>Class and subject combinations</p></div>
        <div><strong>{filtered.filter(i => !i.syllabus_id).length}</strong><p>Awaiting a syllabus</p><p>{filtered.filter(i => i.progress?.status === 'Completed').length} fully covered</p></div>
      </div>
      <div><div className={styles.toolbar}>
        <label className="text-sm font-semibold">Find coverage<input type="search" className={syllabusField} placeholder={mode === 'teaching' ? 'Find a subject, class or stream' : 'Find a subject, teacher or class'} value={search} onChange={event => setSearch(event.target.value)} /></label>
        <button type="button" className={`${syllabusButton} gap-2`} aria-expanded={showFilters} aria-controls="syllabus-filters" onClick={() => setShowFilters(open => !open)}><SlidersHorizontal size={16} aria-hidden="true" />Filters{filterCount ? ` (${filterCount})` : ''}</button>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={behind} onChange={event => setBehind(event.target.checked)} />Behind schedule only</label>
      </div><div id="syllabus-filters" className={styles.filters} hidden={!showFilters}>
        {(Object.keys(filterLabels) as Filter[]).filter(key => mode !== 'teaching' || key !== 'teacher_user_id').map(key => <label key={key} className="text-sm font-semibold">{filterLabels[key]}<select className={syllabusField} value={filters[key] ?? ''} onChange={event => setFilters(current => ({ ...current, [key]: event.target.value }))}><option value="">All {key === 'class_section_id' ? 'classes' : `${filterLabels[key].toLowerCase()}s`}</option>
          {Array.from(new Map(items.map(row => [String(row[key] ?? ''), filterValue(row, key)])).entries()).filter(([value]) => value !== '').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
      </div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">{filtered.length} class and subject combinations · updates automatically</p>
        {(filterCount > 0 || search || behind) && <button type="button" className="min-h-11 text-sm font-semibold text-info" onClick={clearFilters}>Clear filters</button>}</div></div>
      {mode === 'teaching' && <h3 className="font-semibold">My classes</h3>}
      {!items.length ? <div className="rounded-lg border border-dashed border-border p-5"><BookOpen className="mb-3 text-muted" size={24} aria-hidden="true" /><h3 className="font-semibold">No teacher allocations in your scope</h3><p className="mt-2 text-sm text-muted">Assign teachers to the school&apos;s classes, streams and subjects in Academic Foundation. Coverage will appear here once allocations exist. {data.rights.length ? 'You can define a shared syllabus now using Define syllabus.' : 'Ask your subject head or HOD to define the shared syllabus.'}</p></div> : <div className={styles.tableShell}>
        <table className={styles.table}><caption className="sr-only">Actual syllabus coverage by teacher, class, stream, subject and term</caption><thead><tr>{['Subject / teacher','Class / stream','Year / term','Coverage','Outstanding','Status','Action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{!filtered.length ? <tr><td colSpan={7}>No coverage matches these filters. Clear filters to see your allocations.</td></tr> : filtered.map(row => <tr key={`${row.id}:${row.academic_term_id}`}>
            <td><strong>{row.subject}</strong><small>{row.teacher_name}</small></td><td><span className={styles.mobileLabel}>Class / stream</span>{row.class_name}<small>{row.stream_name || 'No stream'}</small></td>
            <td><span className={styles.mobileLabel}>Year / term</span>{row.year_name}<small>{row.term_name}</small></td>
            <td>{row.progress ? <><div className="mb-2 flex items-center justify-between gap-2"><strong>{row.progress.percentage}%</strong><span className="text-xs text-muted">{row.progress.completed}/{row.progress.total} taught</span></div><CoverageProgress value={row.progress.percentage} label={`${row.subject}, ${row.stream_name || row.class_name}: actual coverage`} /><small>Expected {row.progress.expected_percentage}% · {row.progress.completed_topics} topics complete</small></> : 'Syllabus not set'}</td>
            <td><span className={styles.mobileLabel}>Outstanding</span>{row.progress ? <>{row.progress.remaining.length} remaining<small>{row.progress.overdue.length} overdue</small></> : 'Awaiting subject head'}</td><td><CoverageStatus status={row.progress?.status ?? 'Setup required'} /></td>
            <td>{row.syllabus_id ? <button type="button" className={`${syllabusButton} ${row.can_record ? styles.primary : ''}`} onClick={() => setSelection(`${row.id}:${row.academic_term_id}`)} aria-label={`${row.can_record ? 'Record' : 'View'} coverage for ${row.subject}, ${row.class_name}, ${row.stream_name || 'no stream'}, ${row.teacher_name}, ${row.term_name}`}>{row.can_record ? 'Record coverage' : 'View coverage'}</button> : <span className="text-muted">{data.rights.some(r => r.subject_id === row.subject_id) ? 'Use Define syllabus' : 'Ask subject head to publish syllabus'}</span>}</td>
          </tr>)}</tbody></table></div>}
      {(mode === 'monitor' || data.rights.length > 0) && <div className="space-y-3"><h3 className="font-semibold">Shared syllabi</h3>{data.syllabi.length ? data.syllabi.map(plan => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><p className="text-sm"><strong>{plan.subject} · {plan.grade_level}</strong><span className="block text-muted">{data.years.find(y => y.id === plan.academic_year_id)?.name} · {data.terms.find(t => t.id === plan.academic_term_id)?.name} · Revision {plan.version}</span></p>{plan.can_manage && <button type="button" className={syllabusButton} onClick={() => setEditor(plan)}>Revise syllabus</button>}</div>) : <p className="text-sm text-muted">No shared syllabus has been published. {data.rights.length ? 'Select Define syllabus to add topics, subtopics, dates and milestones.' : 'The appointed subject head or HOD must define the syllabus before teachers record coverage.'}</p>}</div>}
      <Modal open={Boolean(editor)} onClose={() => setEditor(null)} title={editor === 'new' ? 'Define shared syllabus' : 'Revise shared syllabus'} size="xl" mobileFullScreen>
        {editor && <SyllabusEditor key={editor === 'new' ? 'new' : `${editor.id}:${editor.version}`} data={data} plan={editor === 'new' ? undefined : editor} onCancel={() => setEditor(null)} onSaved={() => { setEditor(null); setMessage('Syllabus published. Allocated teachers can now record coverage.'); void query.refetch(); }} />}
      </Modal>
      <Modal open={Boolean(selected && selectedPlan)} onClose={() => setSelection('')} title="Subtopic coverage" size="xl" mobileFullScreen>
        {selected && selectedPlan && <SyllabusChecklist key={`${selected.id}:${selectedPlan.id}`} allocation={selected} plan={selectedPlan} />}
      </Modal>
    </> : !query.error ? <p role="status">A verified school session is required to load coverage.</p> : null}
  </section>;
}
