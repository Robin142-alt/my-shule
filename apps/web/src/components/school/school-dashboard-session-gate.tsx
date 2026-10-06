"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { WorkspaceLoading } from "@/components/shared/workspace-loading";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { useSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";

export function SchoolDashboardSessionGate({
  children,
}: {
  children: ReactNode;
}) {
  const state = useSchoolDashboardRole();
  const failure = state.verificationError;
  const temporary = failure?.status === 429 || (failure?.status ?? 0) >= 500;
  const retryAt = failure?.retryAt ?? null;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!retryAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const retrySeconds = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
  const retry = () => { void state.reloadDashboardRoles().catch(() => undefined); };
  const temporaryMessage = failure?.status === 429
    ? "Session checks are temporarily busy. You do not need to sign in again."
    : `We could not check your session. ${failure?.message ?? "Please retry shortly."}`;
  const retryLabel = retrySeconds ? `Retry in ${retrySeconds}s` : "Retry session verification";
  if (!state.liveDataEnabled) return children;
  if (state.authenticatedSession) return <>
    {temporary ? <div role="status" className="border-b border-border bg-surface px-4 py-3 text-sm text-foreground">
      {temporaryMessage}{" "}
      <button type="button" className="min-h-11 px-3 font-semibold underline" disabled={state.isLoading || retrySeconds > 0} onClick={retry}>
        {retryLabel}
      </button>
    </div> : null}
    {children}
  </>;
  const pending = state.isLoading;
  if (pending) return <WorkspaceLoading />;
  const error =
    state.error ??
    (!pending
      ? "Your session could not be verified. Try again or sign in."
      : null);
  return (
    <AuthShell>
      <AuthCard>
        <div className="space-y-5">
          <div role="alert">
            <h1 className="mt-3">{temporary ? "Session check temporarily unavailable" : "Let’s get you signed in"}</h1>
            {error ? <p className="mt-2 text-sm text-muted">{temporary ? temporaryMessage : error}</p> : null}
          </div>
          {error ? (
            <div className="space-y-3">
              {!temporary ? <Link className="auth-primary" href="/school/login?expired=1">
                Sign in again
              </Link> : null}
              <button
                type="button"
                className="auth-secondary"
                disabled={pending || retrySeconds > 0}
                onClick={retry}
              >
                {retryLabel}
              </button>
            </div>
          ) : null}
        </div>
      </AuthCard>
    </AuthShell>
  );
}
