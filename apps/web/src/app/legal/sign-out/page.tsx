'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '@/lib/auth/csrf-client';
export default function LegalSignOut() {
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const router=useRouter();const queries=useQueryClient();
  async function signOut() { setBusy(true); setError(''); try { const response=await fetch('/api/auth/logout',{method:'POST',headers:{'x-myshule-csrf':await getCsrfToken()}}); if(!response.ok) throw new Error('Sign out failed. Please retry.'); queries.clear();router.replace('/app');router.refresh(); } catch(e) {setError(e instanceof Error?e.message:'Unable to sign out.');} finally {setBusy(false);} }
  return <main className="legal-page"><div className="legal-card"><h1>Sign out of MyShule</h1><p className="legal-intro mb-5">You can return to review your agreements when you are ready.</p>{error && <p role="alert">{error}</p>}<button className="legal-button" disabled={busy} onClick={signOut}>{busy?'Signing out…':'Sign out'}</button></div></main>;
}
