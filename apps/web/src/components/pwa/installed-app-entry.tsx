"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { MyShuleBrand, MyShuleMark } from "@/components/brand/myshule-brand";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

function InstalledAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#071D49] px-5 py-8 text-white"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
      }}
    >
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#2563EB]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#F97316]/20 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}

export function InstalledAppSplash({
  message = "Checking your secure session",
}: {
  message?: string;
}) {
  return (
    <InstalledAppFrame>
      <div
        className="flex min-h-[360px] flex-col items-center justify-center text-center"
        role="status"
        aria-live="polite"
        data-testid="installed-app-splash"
      >
        <MyShuleMark
          size={92}
          preload
          label="MyShule"
          className="shadow-[0_22px_70px_rgba(0,0,0,0.28)] ring-4 ring-white/10"
        />
        <div className="mt-7 text-3xl font-black tracking-[-0.03em]">
          My<span className="text-[#F4B000]">Shule</span>
        </div>
        <div className="mt-8 h-1.5 w-36 overflow-hidden rounded-full bg-white/12">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#F97316]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-white/70">{message}</p>
      </div>
    </InstalledAppFrame>
  );
}

function AppEntryChooser() {
  return (
    <InstalledAppFrame>
      <section
        className="rounded-3xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-7"
        aria-labelledby="app-entry-title"
        data-testid="installed-app-entry"
      >
        <MyShuleBrand markSize={52} preload nameClassName="text-2xl" />
        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Secure access
          </p>
          <h1
            id="app-entry-title"
            className="mt-2 text-3xl font-black tracking-[-0.025em]"
          >
            Choose how you use MyShule
          </h1>
        </div>

        <div className="mt-7 grid gap-3">
          <Link
            href="/school/login?source=app"
            className="group flex min-h-20 touch-manipulation items-center gap-4 rounded-2xl bg-white px-4 py-4 text-[#071D49] shadow-lg transition active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#071D49] text-white">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black">School</span>
              <span className="mt-0.5 block text-sm font-semibold text-[#5F6F89]">
                Staff and school operations
              </span>
            </span>
          </Link>

          <Link
            href="/parent/login?source=app"
            className="group flex min-h-20 touch-manipulation items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.09] px-4 py-4 text-white transition hover:bg-white/[0.14] active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F97316] text-white">
              <Users className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black">Parent</span>
              <span className="mt-0.5 block text-sm font-semibold text-white/65">
                Linked learner and family portal
              </span>
            </span>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs font-semibold leading-5 text-white/55">
          Your existing MyShule account, school permissions, and secure session
          are used here.
        </p>
      </section>
    </InstalledAppFrame>
  );
}

function AppEntryError({ onRetry }: { onRetry: () => void }) {
  return (
    <InstalledAppFrame>
      <section
        className="rounded-3xl border border-white/12 bg-white/[0.08] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl"
        role="alert"
        data-testid="installed-app-session-error"
      >
        <MyShuleMark size={72} label="MyShule" className="mx-auto" />
        <h1 className="mt-6 text-2xl font-black">
          We could not verify your session
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
          MyShule may be temporarily unavailable. Your account has not been
          signed out.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 text-sm font-black text-white shadow-lg"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </section>
    </InstalledAppFrame>
  );
}

function SessionAwareAppEntry({
  audience,
  onRetry,
}: {
  audience: ExperienceAudience;
  onRetry: () => void;
}) {
  const router = useRouter();
  const authSession = useExperienceSession(audience, { autoLoad: true });

  useEffect(() => {
    if (authSession.session?.homePath) {
      router.replace(authSession.session.homePath);
    }
  }, [authSession.session?.homePath, router]);

  if (authSession.isLoading || authSession.session) {
    return (
      <InstalledAppSplash
        message={
          authSession.session
            ? "Opening your dashboard"
            : "Checking your secure session"
        }
      />
    );
  }

  if (authSession.error) {
    return <AppEntryError onRetry={onRetry} />;
  }

  return <AppEntryChooser />;
}

export function InstalledAppEntry({
  initialAudience,
}: {
  initialAudience: ExperienceAudience | null;
}) {
  const [attempt, setAttempt] = useState(0);

  if (!initialAudience) {
    return <AppEntryChooser />;
  }

  return (
    <SessionAwareAppEntry
      key={`${initialAudience}:${attempt}`}
      audience={initialAudience}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  );
}
