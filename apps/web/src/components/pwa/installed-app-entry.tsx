"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { WorkspaceLoading } from "@/components/shared/workspace-loading";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

export function InstalledAppSplash() {
  return (
    <div data-testid="installed-app-splash"><WorkspaceLoading /></div>
  );
}

function AppEntryChooser() {
  return (
    <AuthShell>
      <AuthCard>
        <section
          className="space-y-5"
          aria-labelledby="app-entry-title"
          data-testid="installed-app-entry"
        >
          <div>
            <h1 id="app-entry-title">Welcome to MyShule</h1>
            <p className="mt-2 text-sm text-muted">
              Choose your account to sign in.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/school/login?expired=1&source=app"
              className="auth-primary"
            >
              School staff
            </Link>
            <Link
              href="/parent/login?expired=1&source=app"
              className="auth-secondary"
            >
              Parent
            </Link>
            <Link
              href="/student/login?expired=1&source=app"
              className="auth-secondary"
            >
              Student
            </Link>
          </div>
        </section>
      </AuthCard>
    </AuthShell>
  );
}

function SessionAwareAppEntry({
  audience,
  onRetry,
  onSwitch,
}: {
  audience: ExperienceAudience;
  onRetry: () => void;
  onSwitch: () => void;
}) {
  const router = useRouter();
  const authSession = useExperienceSession(audience, { autoLoad: true });
  useEffect(() => {
    if (authSession.session?.homePath)
      router.replace(authSession.session.homePath);
  }, [authSession.session?.homePath, router]);
  if (authSession.isLoading || authSession.session) {
    return <InstalledAppSplash />;
  }
  if (
    authSession.errorStatus === 401 ||
    authSession.errorStatus === 403 ||
    !authSession.error
  )
    return <AppEntryChooser />;
  const loginPath =
    audience === "superadmin"
      ? "/superadmin/login"
      : audience === "portal"
        ? "/portal/login"
        : "/school/login";
  return (
    <AuthShell>
      <AuthCard>
        <section
          className="space-y-5"
          data-testid="installed-app-session-error"
        >
          <div role="alert">
            <h1>Let’s get you signed in</h1>
            <p className="mt-2 text-sm text-muted">
              We couldn’t check your saved session. Try again, or sign in with
              your account.
            </p>
          </div>
          <Link
            href={`${loginPath}?expired=1&source=app`}
            className="auth-primary"
          >
            Sign in again
          </Link>
          <div className="auth-actions">
            <button
              type="button"
              className="min-h-11 font-medium"
              onClick={onRetry}
            >
              Retry
            </button>
            <button
              type="button"
              className="min-h-11 font-medium"
              onClick={onSwitch}
            >
              Use another account
            </button>
          </div>
        </section>
      </AuthCard>
    </AuthShell>
  );
}

export function InstalledAppEntry({
  initialAudience,
}: {
  initialAudience: ExperienceAudience | null;
}) {
  const [attempt, setAttempt] = useState(0);
  const [chooseAccount, setChooseAccount] = useState(false);
  if (!initialAudience || chooseAccount) return <AppEntryChooser />;
  return (
    <SessionAwareAppEntry
      key={`${initialAudience}:${attempt}`}
      audience={initialAudience}
      onRetry={() => setAttempt((current) => current + 1)}
      onSwitch={() => setChooseAccount(true)}
    />
  );
}
