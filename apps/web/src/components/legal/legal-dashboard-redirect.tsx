'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '@/lib/auth/auth-fetch';
import { WorkspaceLoading } from '@/components/shared/workspace-loading';

async function dashboardDestination() {
  const response = await authFetch('/api/legal/destination', { credentials: 'same-origin', cache: 'no-store' });
  const destination = await response.json();
  const path = destination?.path;
  if (!response.ok || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /^\/legal(?:[/?#]|$)/.test(path)) {
    throw new Error('Unable to open your dashboard. Please retry.');
  }
  return path;
}

export function LegalDashboardRedirect() {
  const router = useRouter();
  const pending = useRef<Promise<string> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    // Share Strict Mode's overlapping setup, but never store a session decision.
    pending.current ??= dashboardDestination();
    void pending.current.then(path => { if (active) router.replace(path); }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Unable to open your dashboard. Please retry.');
    });
    return () => { active = false; };
  }, [router, attempt]);
  if (!error) return <WorkspaceLoading />;
  return <main className="legal-page"><section className="legal-card"><h1>We couldn’t open your dashboard</h1><p role="alert" className="legal-notice legal-error">{error}</p><button className="legal-button" onClick={() => { pending.current = null; setError(''); setAttempt(value => value + 1); }}>Try again</button><Link className="legal-link mt-4 block text-center" href="/app">Sign in</Link></section></main>;
}
