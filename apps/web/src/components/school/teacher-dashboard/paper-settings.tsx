import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchPaperConfiguration, savePaperConfiguration, type PaperConfiguration } from '@/lib/modules/teacher-live';
import type { LiveAuthSession } from '@/lib/dashboard/api-client';
import { onFormNavigationKeyDown } from '@/lib/accessibility/keyboard-navigation';

const control = 'min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50';

export function PaperSettings({ session, windowId, disabled, onSaved }: {
  session: LiveAuthSession; windowId: string; disabled: boolean; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PaperConfiguration | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['exam-paper-configuration', session.tenantId, windowId],
    queryFn: () => fetchPaperConfiguration(session, windowId), enabled: open, retry: false });
  const data = draft ?? query.data;
  const weighted = data?.papers.some(p => p.weight != null) ?? false;
  function change(index: number, patch: Partial<PaperConfiguration['papers'][number]>) {
    if (!data) return;
    setDraft({ ...data, papers: data.papers.map((paper, i) => i === index ? { ...paper, ...patch } : paper) }); setError('');
  }
  async function save() {
    if (!data || saving || disabled) return;
    setSaving(true); setError('');
    try {
      const result = await savePaperConfiguration(session, windowId, data);
      client.setQueryData(['exam-paper-configuration', session.tenantId, windowId], result);
      await Promise.all([client.invalidateQueries({ queryKey: ['pending-marks', session.tenantId] }),
        client.invalidateQueries({ queryKey: ['teacher-mark-sheet', session.tenantId] }),
        client.invalidateQueries({ queryKey: ['school', session.tenantId] })]);
      setDraft(null); setOpen(false); onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save papers. Your settings are still here; please retry.'); }
    finally { setSaving(false); }
  }
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
    <summary className="min-h-8 cursor-pointer font-medium text-slate-700">Papers & maximum marks <span className="font-normal text-slate-500">(optional)</span></summary>
    {open && <div className="mt-3 space-y-3">
      <p className="text-slate-600">These settings apply to this exam, class and subject. Categories add up to the paper total. Final subject results are always out of 100.</p>
      {disabled && <p role="status" className="text-amber-800">Save any unsaved scores before changing paper settings. Submitted sheets must be returned for correction first.</p>}
      {query.isLoading && <p role="status">Loading paper settings…</p>}
      {query.isError && <div role="alert"><p>{query.error.message}</p><button type="button" className={control} onClick={() => void query.refetch()}>Retry settings</button></div>}
      {data && <fieldset onKeyDown={onFormNavigationKeyDown} disabled={saving || disabled} className="space-y-3">
        {data.papers.map((paper, index) => <div key={paper.id ?? `new-${index}`} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-36 flex-1 gap-1">Paper name<input aria-label={`Paper ${index + 1} name`} list="exam-paper-names" className={control} value={paper.name} maxLength={100} onChange={event => change(index, { name: event.target.value })} /></label>
            <label className="grid w-28 gap-1">Maximum marks<input aria-label={`Paper ${index + 1} maximum`} className={control} type="number" min="0.01" step="0.01" max="9999" value={paper.max_score || ''} disabled={Boolean(paper.categories?.length)} onChange={event => change(index, { max_score: Number(event.target.value) })} /></label>
            {weighted && <label className="grid w-24 gap-1">Weight<input aria-label={`Paper ${index + 1} weight`} className={control} type="number" min="0.01" step="0.01" value={paper.weight ?? ''} onChange={event => change(index, { weight: Number(event.target.value) })} /></label>}
            {data.papers.length > 1 && <button type="button" className={control} onClick={() => setDraft({ ...data, papers: data.papers.filter((_, i) => i !== index) })} aria-label={`Remove ${paper.name}`}>Remove</button>}
          </div>
          <details open={Boolean(paper.categories?.length)}><summary className="cursor-pointer py-2 text-slate-600">Categories / sections (optional)</summary>
            <div className="space-y-2">
              {(paper.categories ?? []).map((category, ci) => <div key={category.id ?? ci} className="flex flex-wrap gap-2">
                <input aria-label={`${paper.name} category ${ci + 1} name`} className={`${control} min-w-36 flex-1`} placeholder="e.g. Reading" value={category.name} maxLength={100} onChange={event => change(index, { categories: paper.categories!.map((c, i) => i === ci ? { ...c, name: event.target.value } : c) })} />
                <input aria-label={`${paper.name} category ${ci + 1} maximum`} className={`${control} w-24`} type="number" min="0.01" max="9999" step="0.01" value={category.max_score || ''} onChange={event => {
                  const categories = paper.categories!.map((c, i) => i === ci ? { ...c, max_score: Number(event.target.value) } : c);
                  change(index, { categories, max_score: categories.reduce((sum, c) => sum + c.max_score, 0) });
                }} />
                <button type="button" className={control} aria-label={`Remove ${category.name || 'category'}`} onClick={() => {
                  const categories = paper.categories!.filter((_, i) => i !== ci);
                  change(index, { categories, max_score: categories.length ? categories.reduce((sum, c) => sum + c.max_score, 0) : paper.max_score });
                }}>Remove</button>
              </div>)}
              <button type="button" className={control} onClick={() => {
                const categories = [...(paper.categories ?? []), { name: `Section ${(paper.categories?.length ?? 0) + 1}`, max_score: paper.categories?.length ? 20 : paper.max_score }];
                change(index, { categories, max_score: categories.reduce((sum, c) => sum + c.max_score, 0) });
              }}>Add category</button>
            </div>
          </details>
        </div>)}
        <datalist id="exam-paper-names">{['Paper 1', 'Paper 2', 'Paper 3', 'Practical', 'Oral'].map(name => <option key={name} value={name} />)}</datalist>
        <button type="button" className={control} disabled={data.papers.length >= 20} onClick={() => setDraft({ ...data, papers: [...data.papers, { name: `Paper ${data.papers.length + 1}`, max_score: 100, weight: weighted ? 1 : null, categories: [] }] })}>Add paper</button>
        <details><summary className="cursor-pointer py-2 text-slate-600">Calculation settings</summary>
          <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={weighted} onChange={event => setDraft({ ...data, papers: data.papers.map(p => ({ ...p, weight: event.target.checked ? p.weight ?? 1 : null })) })} /> Use custom paper weights</label>
          <p className="text-slate-500">{weighted ? 'Paper percentages are combined using these weights.' : 'Obtained marks are divided by the combined maximum marks, then converted to 100.'}</p>
        </details>
        <div className="flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void save()}>{saving ? 'Saving…' : 'Save paper settings'}</button><button type="button" className={control} onClick={() => { setDraft(null); setOpen(false); setError(''); }}>Cancel</button></div>
      </fieldset>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    </div>}
  </details>;
}
