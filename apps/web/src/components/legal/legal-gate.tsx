'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { WorkspaceLoading } from '@/components/shared/workspace-loading';
import { isLegalProtectedPath } from '@/lib/legal/routing';
import { legalRequest } from '@/lib/legal/client';
import type { LegalStatus } from '@/lib/legal/types';
import { LegalDashboardRedirect } from './legal-dashboard-redirect';

const loadAcceptance = () => import('./legal-acceptance').then(module => module.LegalAcceptance);
const LegalAcceptance = dynamic(loadAcceptance, { loading: WorkspaceLoading });
type Verification = { allowed?: true; status?: LegalStatus };
type GateState = Verification & { error?: string };
type GateMode = 'access' | 'accept' | 'review';

export function LegalGate({ children, mode = 'access' }: { children?: React.ReactNode; mode?: GateMode }) {
  const pathname = usePathname();
  if (mode === 'access' && !isLegalProtectedPath(pathname)) return <>{children}</>;
  // Workspace URLs do not change the account's agreements. Keep the verified
  // tree mounted within an audience; leaving protected routes unmounts this
  // gate, so returning from sign-in always requires fresh verification.
  const audience = /^\/(superadmin|internal\/superadmin|system-monitor)(\/|$)/.test(pathname) ? 'superadmin'
    : /^\/(portal|parent|student|internal\/portal)(\/|$)/.test(pathname) ? 'portal' : 'school';
  return <RouteLegalGate key={`${audience}:${mode}`} mode={mode}>{children}</RouteLegalGate>;
}

function RouteLegalGate({ children, mode }: { children?: React.ReactNode; mode: GateMode }) {
  const [state, setState] = useState<GateState>({});
  const revision = useRef(0);
  const inFlight = useRef<Promise<Verification> | null>(null);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const requestRevision = ++revision.current;
    // Keep the authorized shell during background verification. A failed check
    // or a new requirement still closes the gate. Coalesce overlapping reads
    // only within this mounted gate, never across accounts or browser tabs.
    let pending = inFlight.current;
    if (!pending) {
      pending = (async (): Promise<Verification> => {
        if (mode !== 'review') {
          const access = await legalRequest<{ ready: boolean }>('access');
          if (access?.ready === true) return { allowed: true };
          // A confirmed denial closes access immediately, even if loading the
          // detailed agreement form takes longer. Ignore superseded requests.
          if (inFlight.current === pending) setState({});
        }
        // Fetch the form code alongside its data, not on every dashboard visit.
        void loadAcceptance().catch(() => undefined);
        return { status: await legalRequest<LegalStatus>('status') };
      })();
      inFlight.current = pending;
    }
    try { const result = await pending; if (requestRevision === revision.current) setState(result); }
    catch (error) { if (requestRevision === revision.current) setState({ error: error instanceof Error ? error.message : 'Unable to verify your agreements.' }); }
    finally { if (inFlight.current === pending) inFlight.current = null; }
  }, [mode]);
  useEffect(() => {
    let active = true;
    const verify = () => { if (active) void load(); };
    // A new backend denial supersedes a read started before that denial.
    const required = () => { invalidate(); inFlight.current = null; setState({}); verify(); };
    const visible = () => { if (document.visibilityState === 'visible') verify(); };
    verify();
    window.addEventListener('focus', verify); window.addEventListener('myshule-legal-required', required);
    window.addEventListener('myshule-session-changed', required);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(visible, 60_000);
    return () => { active = false; invalidate(); window.clearInterval(timer); window.removeEventListener('focus', verify); window.removeEventListener('myshule-legal-required', required); window.removeEventListener('myshule-session-changed', required); document.removeEventListener('visibilitychange', visible); };
  }, [load, invalidate]);
  if (!state.allowed && !state.status && !state.error) return <WorkspaceLoading />;
  if (state.error) return <main className="legal-page"><div className="legal-card"><h1>We couldn’t verify your access</h1><p role="alert" className="legal-notice legal-error">{state.error}</p><button className="legal-button" onClick={load}>Try again</button><Link className="legal-link mt-4 block text-center" href="/app">Sign in</Link></div></main>;
  if (mode === 'accept' && (state.allowed || state.status?.ready)) return <LegalDashboardRedirect />;
  if (state.status && (!state.status.ready || mode === 'review')) return <LegalAcceptance key={state.status.user_id + state.status.school_id} status={state.status} review={mode === 'review'} onStatus={(status) => {
    invalidate(); inFlight.current = null; setState({ status });
  }} onRetry={load} />;
  return <>{children}</>;
}
