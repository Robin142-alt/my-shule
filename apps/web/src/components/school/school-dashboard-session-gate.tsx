"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { getExpiredSessionLoginPath } from "@/lib/auth/session-expiry-client";

export function SchoolDashboardSessionGate({ children }: { children: ReactNode }) {
  const state = useSchoolDashboardRole();
  if (!state.liveDataEnabled || state.authenticatedSession) return children;

  const pending = state.isLoading;
  const error = state.error ?? (!pending ? "Your session could not be verified. Retry or sign in to continue." : null);
  return (
    <main className="grid min-h-[60vh] place-items-center px-5 py-12">
      <div role={error ? "alert" : "status"} aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        {pending ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" aria-hidden="true" /> : null}
        <p className="mt-3 text-sm font-black text-foreground">
          {error ? "Dashboard access could not be verified" : "Verifying your dashboard access"}
        </p>
        <p className="mt-2 text-xs font-semibold leading-5 text-muted">
          {error ?? "Confirming your school, identity, and active working role."}
        </p>
        {error ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Button variant="secondary" disabled={pending}
              onClick={() => { void state.reloadDashboardRoles().catch(() => undefined); }}>
              {pending ? "Verifying session…" : "Retry session verification"}
            </Button>
            <a className="text-sm font-semibold text-primary underline" href={getExpiredSessionLoginPath("school")}>Sign in</a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
