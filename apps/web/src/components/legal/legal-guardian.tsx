'use client';
import { useState } from 'react';
import { legalRequest } from '@/lib/legal/client';
import type { LegalStatus } from '@/lib/legal/types';
import { LegalDocumentLink } from './legal-viewer';

export function GuardianAuthorisations({ status, onStatus }: { status: LegalStatus; onStatus: (status: LegalStatus) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const documents = status.documents.filter((doc) => doc.kind !== 'dpa');
  const ownAgreementsPending = status.required_documents.some((doc) => doc.kind !== 'dpa');
  async function save(studentId: string, withdraw: boolean) {
    setBusy(studentId); setError(''); setMessage('');
    try {
      const result = await legalRequest<LegalStatus>(withdraw ? 'guardian/withdraw' : 'guardian/authorise', {
        student_id: studentId, checked: checked[studentId] === true,
        ...(withdraw ? {} : { selections: documents.map((doc) => ({ document_id: doc.id, checked: checked[studentId] === true })) }),
      });
      onStatus(result); setChecked({}); setMessage(withdraw ? 'Authorisation withdrawn. A new school verification is required before authorising again.' : 'Your child’s portal authorisation has been recorded.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save. Please retry.'); }
    finally { setBusy(null); }
  }
  if (!status.guardian_children.length) return null;
  return <section className="mt-7 border-t border-slate-200 pt-5" aria-labelledby="guardian-title"><h2 id="guardian-title" className="text-sm font-semibold">Your children’s portal access</h2>
    <p className="mt-2 text-xs leading-5 text-slate-600">Authorisation is separate from your own agreements. It covers student portal access, and does not authorise unrelated or optional processing.</p>
    <div className="mt-2 flex flex-wrap gap-4 text-xs">{documents.map((doc) => <LegalDocumentLink key={doc.id} documentId={doc.id}>{doc.title}</LegalDocumentLink>)}</div>
    {status.guardian_children.map((child) => <div key={child.student_id} className="mt-4 rounded-lg border border-slate-200 p-3"><h3 className="text-sm font-semibold">{child.name}</h3>
      {!child.verified ? <p className="mt-2 text-xs leading-5">Your school must verify your parental or guardian authority before you can authorise access. Contact your school administrator.</p> : <>
        <label className="mt-3 flex items-start gap-3 text-xs leading-5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={checked[child.student_id] === true} disabled={busy !== null || ownAgreementsPending} onChange={(event) => setChecked({ ...checked, [child.student_id]: event.target.checked })} />{child.authorised ? 'I want to withdraw my authorisation for this child’s portal access.' : status.statements.guardian}</label>
        {ownAgreementsPending && <p className="mt-2 text-xs">Complete your own agreements above first.</p>}
        <button className="legal-secondary mt-3 w-full" disabled={busy !== null || !checked[child.student_id] || ownAgreementsPending} onClick={() => save(child.student_id, child.authorised)}>{busy === child.student_id ? 'Saving…' : child.authorised ? 'Withdraw authorisation' : 'Authorise portal access'}</button>
      </>}
    </div>)}
    {message && <p className="legal-notice" role="status">{message}</p>}{error && <p className="legal-notice legal-error" role="alert">{error}</p>}
  </section>;
}
