'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';
import { MyShuleBrand } from '@/components/brand/myshule-brand';
import { LegalLinks } from './legal-links';
import { LegalDocumentLink, IncorporatedDocumentLink } from './legal-viewer';
import { legalRequest } from '@/lib/legal/client';
import type { LegalStatus } from '@/lib/legal/types';
import { GuardianAuthorisations } from './legal-guardian';
import { WorkspaceLoading } from '@/components/shared/workspace-loading';
import { authFetch } from '@/lib/auth/auth-fetch';

export function LegalAcceptance({ status, onStatus, onRetry }: { status: LegalStatus; onStatus: (status: LegalStatus) => void; onRetry: () => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();
  const canAccept = status.required_documents.length > 0 && status.required_documents.every((doc) => checked[doc.id]);
  async function continueToDashboard() {
    // Resolve the destination from the verified session. Do not accept a return URL from the browser.
    setNavigating(true);
    const response = await authFetch('/api/legal/destination', { credentials: 'same-origin', cache: 'no-store' });
    const destination = await response.json();
    if (!response.ok || typeof destination.path !== 'string' || !destination.path.startsWith('/') || destination.path.startsWith('//')) throw new Error('Unable to open your dashboard. Please retry.');
    // Navigation performs the current server-side checks. Refreshing as well
    // starts a second navigation and repeats those checks.
    router.replace(destination.path);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (saving || (!canAccept && !status.ready)) return;
    setSaving(true); setError('');
    try {
      const result = status.ready ? await legalRequest<LegalStatus>('status') : await legalRequest<LegalStatus>('accept', { selections: status.required_documents.map((doc) => ({ document_id: doc.id, checked: checked[doc.id] === true })) });
      onStatus(result); setChecked({}); setSaved(true);
      if (result.ready) await continueToDashboard();
    } catch (failure) { setNavigating(false); setError(failure instanceof Error ? failure.message : 'Unable to save. Please retry.'); }
    finally { setSaving(false); }
  }
  if (navigating) return <WorkspaceLoading />;
  return <main className="legal-page"><section className="legal-card" aria-labelledby="legal-title">
    <div className="flex items-center justify-between gap-4"><MyShuleBrand markSize={36} tone="brand" /><ShieldCheck className="h-5 w-5 text-slate-500" aria-hidden="true" /></div>
    <p className="legal-eyebrow">Your account · Your privacy</p>
    <h1 id="legal-title">{status.ready ? 'Your agreements are up to date' : 'A moment before you begin'}</h1>
    <p className="legal-intro">{status.ready ? 'Your acceptance is securely recorded. You can review your documents and authorisations here at any time.' : `Welcome, ${status.display_name}. Review the documents below and confirm your agreements to continue to MyShule.`}</p>
    {status.school_name && <p className="mt-3 text-xs text-slate-600">School: <strong>{status.school_name}</strong></p>}
    <form onSubmit={submit} aria-busy={saving}>
      {status.required_documents.some((doc) => doc.kind === 'dpa') && <div className="mt-4 grid gap-2"><p className="text-xs text-slate-600">These schedules form part of your school agreement:</p>{status.incorporated_documents.map((document) => <IncorporatedDocumentLink key={document.id} document={document}/>)}</div>}
      {status.required_documents.length > 0 && <fieldset className="legal-options" disabled={saving}><legend className="sr-only">Required agreements</legend>
        {status.required_documents.map((doc) => <div className="legal-option" key={doc.id}>
          <input id={`agreement-${doc.id}`} aria-labelledby={`agreement-text-${doc.id}`} type="checkbox" checked={checked[doc.id] === true} onChange={(event) => setChecked({ ...checked, [doc.id]: event.target.checked })} />
          <div><span id={`agreement-text-${doc.id}`}><label htmlFor={`agreement-${doc.id}`}>{doc.kind === 'privacy' ? 'I acknowledge the ' : doc.kind === 'dpa' ? 'I am authorised to bind my school and accept the ' : status.guardian_required ? 'I acknowledge the ' : 'I agree to the '}</label><LegalDocumentLink documentId={doc.id}>{doc.title}</LegalDocumentLink></span>{doc.kind === 'dpa' && <span className="block text-xs text-slate-500">On behalf of your school</span>}</div>
        </div>)}
      </fieldset>}
      {status.guardian_required && <p className="mt-4 text-xs leading-5 text-slate-600">Your acknowledgement does not replace your parent or guardian’s authorisation.</p>}
      {saved && <p role="status" className="legal-notice flex gap-2"><Check className="h-4 w-4 shrink-0" aria-hidden="true" />Your agreements have been recorded.</p>}
      {status.blockers.map((blocker) => <p className="legal-notice" key={blocker.code}>{blocker.message}</p>)}
      {error && <p role="alert" className="legal-notice legal-error">{error}</p>}
      <button className="legal-button mt-5" disabled={saving || (!canAccept && !status.ready)} type="submit">{saving ? 'Saving…' : status.ready ? 'Continue to dashboard' : 'Agree & Continue'}</button>
    </form>
    {status.blockers.length > 0 && <button type="button" className="legal-secondary mt-3 w-full" onClick={onRetry} disabled={saving}>Check again</button>}
    <GuardianAuthorisations status={status} onStatus={onStatus} />
    {status.school_authority_verified && !status.dpa_active && <details className="mt-5 text-xs leading-5"><summary className="cursor-pointer py-2 font-semibold">School agreement</summary><p>Your school agreement is available to read. Acceptance will open after the required schedules and safeguards are approved.</p><LegalDocumentLink documentId="dpa-2.0">Read the School Data Processing Agreement</LegalDocumentLink></details>}
    {status.receipts.length > 0 && <details className="mt-6 text-xs"><summary className="cursor-pointer py-3 font-semibold">Acceptance history</summary><ul className="space-y-3">{status.receipts.map((receipt) => <li key={receipt.id} className="border-t border-slate-200 pt-3"><LegalDocumentLink documentId={receipt.document_id}>{receipt.document_id}</LegalDocumentLink><p className="mt-1 text-slate-600">{receipt.scope} · {new Date(receipt.accepted_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</p></li>)}</ul></details>}
    {(status.can_verify_school_authority || status.can_verify_guardians) && <Link className="legal-link mt-5 block text-sm" href="/legal/verification">Verify legal authority</Link>}
    <LegalLinks />
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-slate-600"><a className="underline" href="mailto:orbitlanetechnology@gmail.com">Contact Orbitlane Technologies</a><Link className="underline" href="/legal/sign-out">Sign out</Link></div>
  </section></main>;
}
