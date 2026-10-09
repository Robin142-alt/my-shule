'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { isLegalProtectedPath } from '@/lib/legal/routing';
import { legalRequest } from '@/lib/legal/client';
import type { LegalStatus } from '@/lib/legal/types';
import { LegalAcceptance } from './legal-acceptance';

export function LegalGate({ children, review = false }: { children?: React.ReactNode; review?: boolean }) {
  const pathname = usePathname();
  const protectedPage = review || isLegalProtectedPath(pathname);
  const [state, setState] = useState<{ path: string; status?: LegalStatus; error?: string }>({ path: '' });
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    if (!protectedPage) return;
    const requestRevision = ++revision.current;
    setState({ path: pathname });
    try { const status = await legalRequest<LegalStatus>('status'); if (requestRevision === revision.current) setState({ path: pathname, status }); }
    catch (error) { if (requestRevision === revision.current) setState({ path: pathname, error: error instanceof Error ? error.message : 'Unable to verify your agreements.' }); }
  }, [pathname, protectedPage]);
  useEffect(() => {
    if (!protectedPage) return;
    let active = true;
    const verify = () => { if (active) void load(); };
    const visible = () => { if (document.visibilityState === 'visible') verify(); };
    verify();
    window.addEventListener('focus', verify); window.addEventListener('myshule-legal-required', verify);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; invalidate(); window.removeEventListener('focus', verify); window.removeEventListener('myshule-legal-required', verify); document.removeEventListener('visibilitychange', visible); };
  }, [load, protectedPage, invalidate]);
  if (!protectedPage) return <>{children}</>;
  if (state.path !== pathname || (!state.status && !state.error)) return <main className="legal-page"><div className="legal-card" role="status" aria-live="polite"><h1>Verifying your agreements</h1><p className="legal-intro">Checking your account and school requirements…</p></div></main>;
  if (state.error) return <main className="legal-page"><div className="legal-card"><h1>We couldn’t verify your access</h1><p role="alert" className="legal-notice legal-error">{state.error}</p><button className="legal-button" onClick={load}>Try again</button><Link className="legal-link mt-4 block text-center" href="/app">Sign in</Link></div></main>;
  if (!state.status!.ready || review) return <LegalAcceptance key={state.status!.user_id + state.status!.school_id} status={state.status!} onStatus={(status) => setState({ path: pathname, status })} onRetry={load} />;
  return <>{children}</>;
}
