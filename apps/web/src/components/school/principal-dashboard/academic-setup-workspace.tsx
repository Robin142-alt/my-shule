"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Clock3, Flag, Plus, RefreshCw } from 'lucide-react';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { usePermissions } from '@/components/providers/permission-context';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useVerifiedPrincipalDashboardApi } from './verified-tenant-api';
import { PrincipalHeader, PrincipalMetrics, PrincipalPanel, principalStyles as s } from './workspace-ui';

type CalendarRecord = { id: string; name: string; starts_on: string; ends_on: string; academic_year_id?: string; archived_at?: string | null;
  academic_term_id?: string | null; is_current?: boolean; period_type?: string; description?: string; status?: string; version?: number };
type CalendarData = { years: CalendarRecord[]; terms: CalendarRecord[]; calendarPeriods: CalendarRecord[] };
type Kind = 'years' | 'terms' | 'calendar-periods';
type Editing = { kind: Kind; record?: CalendarRecord };
const names = { years: 'academic year', terms: 'term', 'calendar-periods': 'calendar event' };
const day = (value: string) => value?.slice(0, 10) ?? '';
const daysBetween = (a: string, b: string) => Math.round((Date.parse(day(b)) - Date.parse(day(a))) / 86_400_000);
const schoolDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateLabel = (value: string) => value ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date(`${day(value)}T00:00:00+03:00`)) : 'Dates not set';
const available = (row: CalendarRecord) => !row.archived_at && !['archived', 'inactive'].includes(row.status ?? '');

export function PrincipalAcademicSetupWorkspace({ onOpenProgression }: { onOpenProgression?: () => void } = {}) {
  const query = useSchoolQuery<CalendarData>('/academics/foundation', { refetchInterval: 60_000 });
  const { hasPermission } = usePermissions(); const canWrite = hasPermission('academics:write');
  const [today, setToday] = useState(schoolDay); const [selectedYear, setSelectedYear] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [includePast, setIncludePast] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setToday(schoolDay()), 60_000); return () => window.clearInterval(timer); }, []);
  const years = (query.data?.years ?? []).filter(available); const terms = (query.data?.terms ?? []).filter(available);
  const activeYear = years.find(row => day(row.starts_on) <= today && day(row.ends_on) >= today) ?? years.find(row => row.is_current);
  const activeTerm = terms.filter(row => row.status === undefined || row.status === 'active').sort((a,b) => b.starts_on.localeCompare(a.starts_on)).find(row => row.academic_year_id === activeYear?.id && day(row.starts_on) <= today && day(row.ends_on) >= today);
  const yearId = selectedYear || activeYear?.id || years[0]?.id || '';
  const yearTerms = terms.filter(row => row.academic_year_id === yearId).sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  const upcoming = (query.data?.calendarPeriods ?? []).filter(row => available(row) && row.academic_year_id === yearId && (includePast || day(row.ends_on) >= today)).sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  const termDays = activeTerm ? daysBetween(activeTerm.starts_on, activeTerm.ends_on) + 1 : 0;
  const elapsed = activeTerm ? Math.max(0, Math.min(termDays, daysBetween(activeTerm.starts_on, today) + 1)) : 0;
  return <div className={s.stack}>
    <PrincipalHeader icon={CalendarDays} title="Academic Calendar" description="Confirmed school dates, upcoming milestones and academic-year transitions." actions={<>
      <Button variant="outline" aria-label="Refresh calendar" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} /></Button>
      {canWrite && <><Button variant="outline" onClick={() => setEditing({ kind: 'years' })}>Add year</Button><Button onClick={() => setEditing({ kind: 'terms' })} disabled={!years.length}><Plus size={16} />Add term</Button></>}
    </>} />
    {query.error && <div role="alert" className={s.error}>{query.error.message}<Button variant="outline" onClick={() => void query.refetch()}>Retry calendar</Button></div>}
    {query.isLoading ? <p role="status" className={s.empty}>Loading the school calendar…</p> : query.data && <>
      <PrincipalMetrics items={[
        { label: 'Academic year', value: activeYear?.name ?? 'Not configured', detail: activeYear ? `${dateLabel(activeYear.starts_on)} – ${dateLabel(activeYear.ends_on)}` : 'Add a confirmed academic year', icon: CalendarDays, tone: 'blue' },
        { label: 'Current term', value: activeTerm?.name ?? 'Between terms', detail: activeTerm ? `Week ${Math.ceil(elapsed / 7)} of ${Math.ceil(termDays / 7)}` : 'Review the configured opening dates', icon: Flag, tone: 'violet' },
        { label: 'Days remaining', value: activeTerm ? Math.max(0, daysBetween(today, activeTerm.ends_on)) : '—', detail: activeTerm ? `Term closes ${dateLabel(activeTerm.ends_on)}` : 'No active term today', icon: Clock3, tone: 'mint' },
      ]} />
      <div className={s.toolbar}><label className={s.field}>View academic year<select value={yearId} onChange={event => setSelectedYear(event.target.value)}>{!years.length && <option value="">No academic years</option>}{years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label></div>
      <div className={s.columns}>
        <PrincipalPanel title="Term dates" description="Opening, closing and progress through the selected year." tone="blue">
          {yearTerms.length ? <div className={s.stack}>{yearTerms.map(term => <div key={term.id} className={s.calendarItem}>
            <div><strong>{term.name}</strong><p>{dateLabel(term.starts_on)} – {dateLabel(term.ends_on)}</p></div>
            <span className={s.badge} data-tone={term.id === activeTerm?.id ? 'mint' : 'blue'}>{day(term.ends_on) < today ? 'Ended' : day(term.starts_on) > today ? 'Upcoming' : 'In progress'}</span>
            {canWrite && <Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'terms', record: term })}>Edit {term.name}</Button>}
            {term.id === activeTerm?.id && <label className={s.termProgress}>Term progress <progress value={elapsed} max={termDays} aria-label="Term progress" /><small>{elapsed} of {termDays} calendar days</small></label>}
          </div>)}</div> : <p className={s.empty}>No terms are configured for this year.</p>}
        </PrincipalPanel>
        <PrincipalPanel title="Upcoming milestones" description="Examinations, holidays and other configured school dates." tone="amber" actions={canWrite && <Button size="sm" variant="outline" disabled={!yearId} onClick={() => setEditing({ kind: 'calendar-periods' })}>Add event</Button>}>
          <label><input type="checkbox" checked={includePast} onChange={event => setIncludePast(event.target.checked)} /> Include past dates</label>
          {upcoming.length ? <div className={s.boundedList}>{upcoming.map(period => <div key={period.id} className={s.calendarItem}>
            <span className={s.badge} data-tone={period.period_type === 'exam' ? 'violet' : period.period_type === 'holiday' ? 'mint' : 'amber'}>{period.period_type}</span>
            <div><strong>{period.name}</strong><p>{dateLabel(period.starts_on)} – {dateLabel(period.ends_on)}</p>{period.description && <p>{period.description}</p>}</div>
            {canWrite && <Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'calendar-periods', record: period })}>Edit {period.name}</Button>}
          </div>)}</div> : <p className={s.empty}>No upcoming milestones have been configured for this year.</p>}
        </PrincipalPanel>
      </div>
      <PrincipalPanel title="Academic years & transitions" description="Existing years remain available for planning and historical reporting." tone="violet" actions={onOpenProgression && <Button variant="outline" onClick={onOpenProgression}>Review student progression</Button>}>
        <div className={s.tableShell}><table><thead><tr><th>Academic year</th><th>Opening date</th><th>Closing date</th><th>Stage</th>{canWrite && <th>Action</th>}</tr></thead>
          <tbody>{years.map(year => <tr key={year.id}><td><strong>{year.name}</strong></td><td>{dateLabel(year.starts_on)}</td><td>{dateLabel(year.ends_on)}</td><td>{day(year.starts_on) > today ? 'Upcoming transition' : day(year.ends_on) < today ? 'Ended' : 'Current year'}</td>{canWrite && <td><Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'years', record: year })}>Edit {year.name}</Button></td>}</tr>)}</tbody></table></div>
        {!years.length && <p className={s.empty}>No academic years configured.</p>}
      </PrincipalPanel>
    </>}
    {editing && canWrite && <CalendarEditor key={`${editing.kind}-${editing.record?.id ?? 'new'}`} editing={editing} years={years} terms={terms} defaultYear={yearId} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await query.refetch(); }} />}
  </div>;
}

function CalendarEditor({ editing: { kind, record }, years, terms, defaultYear, onClose, onSaved }: {
  editing: Editing; years: CalendarRecord[]; terms: CalendarRecord[]; defaultYear: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const request = useVerifiedPrincipalDashboardApi();
  const [yearId, setYearId] = useState(record?.academic_year_id || defaultYear || years[0]?.id || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget); const starts = String(form.get('starts_on')); const ends = String(form.get('ends_on'));
    if (starts > ends) { setError('The closing date must be on or after the opening date.'); return; }
    const body: Record<string, unknown> = { name: String(form.get('name')).trim(), starts_on: starts, ends_on: ends };
    if (kind === 'calendar-periods' || (kind === 'terms' && !record)) body.academic_year_id = yearId;
    if (kind !== 'calendar-periods') body.is_current = form.get('is_current') === 'on';
    else { body.period_type = form.get('period_type'); body.description = form.get('description'); body.academic_term_id = form.get('academic_term_id') || null; }
    if (record) { body.reason = String(form.get('reason') ?? '').trim(); if (record.version) body.expected_version = record.version; }
    setBusy(true); setError('');
    try { await request(`/academics/${kind}${record ? `/${encodeURIComponent(record.id)}` : ''}`, { method: record ? 'PATCH' : 'POST', body }); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Calendar record could not be saved.'); }
    finally { setBusy(false); }
  }
  return <Modal open onClose={() => { if (!busy) onClose(); }} title={`${record ? 'Edit' : 'Add'} ${names[kind]}`} footer={<><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" form="principal-calendar-editor" disabled={busy}>{busy ? 'Saving…' : 'Save calendar record'}</Button></>}>
    <form id="principal-calendar-editor" onSubmit={save} className={s.form}>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <label className={s.field}>Name<input name="name" required maxLength={200} defaultValue={record?.name} /></label>
      {kind !== 'years' && <label className={s.field}>Academic year<select value={yearId} disabled={Boolean(record && kind === 'terms')} onChange={event => setYearId(event.target.value)} required>{years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>}
      <div className={s.formGrid}><label className={s.field}>Starts on<input type="date" name="starts_on" required defaultValue={day(record?.starts_on ?? '')} /></label><label className={s.field}>Ends on<input type="date" name="ends_on" required defaultValue={day(record?.ends_on ?? '')} /></label></div>
      {kind === 'calendar-periods' ? <>
        <label className={s.field}>Event type<select name="period_type" defaultValue={record?.period_type || 'exam'}>{['exam', 'holiday', 'reporting', 'activity', 'boarding', 'transport', 'other'].map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className={s.field}>Term<select name="academic_term_id" defaultValue={record?.academic_term_id ?? ''}><option value="">Whole academic year</option>{terms.filter(term => term.academic_year_id === yearId).map(term => <option value={term.id} key={term.id}>{term.name}</option>)}</select></label>
        <label className={s.field}>Description<textarea name="description" maxLength={1000} rows={3} defaultValue={record?.description} /></label>
      </> : <label><input name="is_current" type="checkbox" defaultChecked={record?.is_current} /> Set as the current {kind === 'years' ? 'year' : 'term'}</label>}
      {record && <label className={s.field}>Reason for change<input name="reason" required maxLength={500} /></label>}
    </form>
  </Modal>;
}
