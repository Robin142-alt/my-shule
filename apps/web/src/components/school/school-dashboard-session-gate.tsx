"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  if (!state.liveDataEnabled || state.authenticatedSession) return children;
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
            <h1 className="mt-3">Let’s get you signed in</h1>
            {error ? <p className="mt-2 text-sm text-muted">{error}</p> : null}
          </div>
          {error ? (
            <div className="space-y-3">
              <Link className="auth-primary" href="/school/login?expired=1">
                Sign in again
              </Link>
              <button
                type="button"
                className="auth-secondary"
                disabled={pending}
                onClick={() => {
                  void state.reloadDashboardRoles().catch(() => undefined);
                }}
              >
                Retry session verification
              </button>
            </div>
          ) : null}
        </div>
      </AuthCard>
    </AuthShell>
  );
}
