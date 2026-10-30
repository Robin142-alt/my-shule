import { useRef, useState } from 'react';
import type { ExamScoreStatus, TeacherMarkSheetRow } from '@/lib/modules/teacher-live';
import { markbookPaperLabel } from '@/lib/modules/markbook-labels';

export type MissingMarkReason = Exclude<ExamScoreStatus, 'entered'>;
export const MISSING_MARK_REASONS: Array<{value: MissingMarkReason; label: string}> = [
  {value: 'X', label: 'X — Missing marks'},
  {value: 'Y', label: 'Y — Examination irregularity'},
  {value: 'absent', label: 'Absent'},
  {value: 'exempt', label: 'Exempt'},
  {value: 'not_assessed', label: 'Not assessed'},
  {value: 'incomplete', label: 'Incomplete'},
  {value: 'withheld', label: 'Withheld'},
  {value: 'medical_exception', label: 'Medical exception'},
  {value: 'transfer_student', label: 'Transfer student'},
];
const control = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50';
const assignedReason = (row: TeacherMarkSheetRow) => row.id && row.score_status !== 'entered' ? row.score_status : '';

export function MissingMarksPanel({rows, dirtyStudentIds, busy, onSave, onReload}: {
  rows: TeacherMarkSheetRow[];
  dirtyStudentIds: string[];
  busy: boolean;
  onSave: (row: TeacherMarkSheetRow, reason: MissingMarkReason) => Promise<void>;
  onReload: (studentId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  // Keep the version opened by the user, even if a background read changes the row.
  const [editor, setEditor] = useState<{row: TeacherMarkSheetRow; reason: MissingMarkReason | ''} | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const saving = useRef(false);
  const disabled = busy || working;
  const missing = rows.filter(row => row.score === null);
  const visible = missing.filter(row => `${row.student_name ?? ''} ${row.admission_number ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
    && (filter === 'all' || filter === 'unassigned' && !assignedReason(row) || filter === 'assigned' && !!assignedReason(row) || assignedReason(row) === filter));

  async function save() {
    if (!editor?.reason || disabled || saving.current) return;
    saving.current = true; setWorking(true); setError('');
    try { await onSave(editor.row, editor.reason); setEditor(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save the reason. Your selection is preserved; retry or reload this record.'); }
    finally { saving.current = false; setWorking(false); }
  }
  async function reload() {
    if (!editor || disabled || saving.current) return;
    saving.current = true; setWorking(true);
    try { await onReload(editor.row.student_id); setEditor(null); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not reload this record. Please retry.'); }
    finally { saving.current = false; setWorking(false); }
  }

  return <section aria-label="Missing Marks" className="space-y-4 p-3 sm:px-6 sm:py-4">
    <div><h3 className="text-lg font-semibold">Missing Marks</h3><p className="mt-1 text-sm text-slate-600">Find students without a saved numeric score and save a reason individually. Submitted sheets stay submitted.</p></div>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Find student<input type="search" aria-label="Find missing marks" placeholder="Name or admission number" value={search} disabled={disabled}
        onChange={event => setSearch(event.target.value)} className={control} /></label>
      <label className="grid gap-1 text-sm">Reason filter<select aria-label="Missing marks filter" value={filter} disabled={disabled}
        onChange={event => setFilter(event.target.value)} className={control}>
        <option value="all">All missing marks</option><option value="unassigned">Missing reason not assigned</option><option value="assigned">Reason already assigned</option>
        <option value="X">X — Missing marks</option><option value="Y">Y — Examination irregularity</option>
      </select></label>
    </div>
    {error && <div role="alert" className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>
      <button type="button" className={control} disabled={disabled} onClick={() => void reload()}>Reload this record</button></div>}
    <p aria-live="polite" className="text-xs text-slate-500">{visible.length} of {missing.length} missing-mark records</p>
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
      {visible.map(row => {
        const dirty = dirtyStudentIds.includes(row.student_id);
        const editing = editor?.row.student_id === row.student_id;
        const reason = assignedReason(row);
        return <li key={row.student_id} className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-48"><p className="break-words font-medium">{row.student_name ?? 'Unnamed student'} <span className="text-sm font-normal text-slate-500">· {row.admission_number ?? 'No admission number'}</span></p>
              <p className="mt-1 break-words text-sm text-slate-600">{[row.class_name, row.stream_name, row.subject_name,
                markbookPaperLabel(row.subject_name ?? '', row.assessment_name ?? '')].filter(Boolean).join(' · ')}</p>
              <p className="mt-1 break-words text-xs text-slate-500">{row.exam_series_name} · No numeric score · {row.status}</p>
              <p className="mt-2 text-sm"><span className="text-slate-500">Current reason: </span>{MISSING_MARK_REASONS.find(item => item.value === reason)?.label ?? 'Not assigned'}</p>
            </div>
            {!editing && <button type="button" aria-label={`Edit reason for ${row.student_name ?? 'student'}`} className={control}
              disabled={disabled || row.can_edit_reason !== true || dirty} onClick={() => {setError(''); setEditor({row: {...row}, reason});}}>Edit Reason</button>}
          </div>
          {dirty ? <p className="text-sm text-amber-800">This student has unsaved score changes. Save the draft in Scores before editing the saved reason.</p>
            : row.can_edit_reason !== true && <p className="text-sm text-slate-600">Reason editing is unavailable in this entry window or for your assignment. Reviewed, locked and published results require the Dean&apos;s controlled correction workflow; published reports retain their approval safeguards.</p>}
          {editing && <form className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3" onSubmit={event => {event.preventDefault(); void save();}}>
            <label className="grid min-w-0 flex-1 basis-48 gap-1 text-sm">Reason<select autoFocus aria-label={`${row.student_name ?? 'Student'} missing reason`} value={editor.reason} disabled={disabled}
              onChange={event => setEditor({...editor, reason: event.target.value as MissingMarkReason | ''})} className={`${control} w-full`}>
              <option value="">Select a reason</option>{MISSING_MARK_REASONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select></label>
            <button type="submit" className={control} disabled={disabled || !editor.reason || dirty || row.can_edit_reason !== true}>{working ? 'Saving…' : 'Save reason'}</button>
            <button type="button" className={control} disabled={disabled} onClick={() => {setEditor(null); setError('');}}>Cancel</button>
          </form>}
        </li>;
      })}
    </ul>
    {!visible.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{missing.length ? 'No missing marks match these filters. Change the reason filter or search.' : 'Every student in this markbook has a saved numeric score.'}</p>}
  </section>;
}
