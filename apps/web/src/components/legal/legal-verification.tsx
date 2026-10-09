'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { legalRequest } from '@/lib/legal/client';
import type { LegalStatus } from '@/lib/legal/types';

type Candidate = { user_id: string; display_name: string; student_id?: string; student_name?: string; role?: string };
type Authority = { id: string; kind: string; user_id: string; display_name: string; student_id: string };
type Candidates = { members: Candidate[]; guardians: Candidate[]; authorities: Authority[] };
export function LegalVerification() {
  const [status,setStatus] = useState<LegalStatus>();
  const [school,setSchool] = useState('');
  const [candidates,setCandidates] = useState<Candidates>();
  const [selected,setSelected] = useState('');
  const [reference,setReference] = useState('');
  const [checked,setChecked] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [revoke,setRevoke] = useState('');
  useEffect(() => { legalRequest<LegalStatus>('status').then((value) => { setStatus(value); setSchool(value.school_id ?? ''); }).catch((e) => setError(e.message)); }, []);
  async function load() {
    setBusy(true); setError(''); setCandidates(undefined); setChecked(false); setSelected(''); setRevoke('');
    try { setCandidates(await legalRequest<Candidates>(`verification/candidates?school_id=${encodeURIComponent(school.trim())}`)); }
    catch(e) { setError(e instanceof Error ? e.message : 'Unable to load school records.'); } finally { setBusy(false); }
  }
  const choices = [...(candidates?.members ?? []).map((member) => ({ ...member, kind:'school', key:`school:${member.user_id}` })), ...(candidates?.guardians ?? []).map((guardian) => ({ ...guardian, kind:'guardian', key:`guardian:${guardian.user_id}:${guardian.student_id}` }))];
  async function verify(event: React.FormEvent) {
    event.preventDefault(); const candidate=choices.find((item)=>item.key===selected); if(!candidate || !checked || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await legalRequest('verification',{kind:candidate.kind,school_id:school,user_id:candidate.user_id,...(candidate.student_id?{student_id:candidate.student_id}:{}),evidence_reference:reference,checked}); await load(); setReference(''); setMessage('Authority verified. The account holder can now complete the relevant agreement or authorisation.'); }
    catch(e) { setError(e instanceof Error?e.message:'Verification failed.'); } finally {setBusy(false);}
  }
  async function revokeAuthority() { if(!revoke || busy) return; setBusy(true);setError('');try {await legalRequest(`verification/${revoke}/revoke`,{school_id:school,checked:true});await load();setMessage('Authority revoked. Existing school contracts remain in the acceptance history.');}catch(e){setError(e instanceof Error?e.message:'Revocation failed.');}finally{setBusy(false);} }
  const permitted = status?.can_verify_school_authority || status?.can_verify_guardians;
  return <main className="legal-page"><section className="legal-card"><Link className="legal-link text-sm" href="/legal/accept">Back to agreements</Link><h1 className="mt-5">Verify legal authority</h1><p className="legal-intro">Check the school’s records before confirming. Dashboard access alone does not establish authority.</p>
    {status && !permitted && <p className="legal-notice">Only the platform owner or a verified school representative can manage these records.</p>}
    {permitted && <><div className="legal-fields">{status?.can_verify_school_authority ? <label className="text-sm">School<select value={school} onChange={(e)=>{setSchool(e.target.value);setCandidates(undefined);}}><option value="">Choose a school</option>{status.verification_schools?.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p className="text-sm font-semibold">{status?.school_name ?? 'Your school'}</p>}<button className="legal-secondary" disabled={!school.trim()||busy} onClick={load}>{busy?'Loading…':'Load school records'}</button></div>
    {candidates && <form onSubmit={verify} className="legal-fields"><label className="text-sm">Person and authority<select value={selected} onChange={(e)=>{setSelected(e.target.value);setChecked(false);}} required><option value="">Choose an existing school record</option>{choices.filter((item)=>item.user_id!==status?.user_id).map((item)=><option key={item.key} value={item.key}>{item.display_name} · {item.kind==='school'?'School representative':`Guardian of ${item.student_name}`}</option>)}</select></label>
      <label className="text-sm">Verification record reference<input value={reference} onChange={(e)=>setReference(e.target.value)} minLength={8} maxLength={500} required placeholder="Reference to the verified institutional or guardian record" /><span className="mt-1 block text-xs text-slate-500">Use a record reference. Do not enter identity numbers or private document contents.</span></label>
      <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={checked} onChange={(e)=>setChecked(e.target.checked)} />I independently checked the institutional or guardian records and confirm this person’s authority.</label>
      <button className="legal-button" disabled={busy||!checked||!selected||reference.trim().length<8}>Confirm verification</button>
    </form>}
    {candidates?.authorities.length ? <details className="mt-5 text-sm"><summary className="cursor-pointer py-2">Current verifications</summary>{candidates.authorities.filter((item)=>item.kind==='guardian'||status?.can_verify_school_authority).map((item)=><label key={item.id} className="mt-3 flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={revoke===item.id} onChange={(e)=>setRevoke(e.target.checked?item.id:'')} />Revoke {item.display_name} · {item.kind}{item.student_id?` · student ${item.student_id}`:''}</label>)}<button className="legal-secondary mt-4 w-full" onClick={revokeAuthority} disabled={!revoke||busy}>Revoke selected authority</button></details>:null}</>}
    {message&&<p role="status" className="legal-notice">{message}</p>}{error&&<p role="alert" className="legal-notice legal-error">{error}</p>}
  </section></main>;
}
