"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

import { MyShuleBrand, MyShuleMark } from "@/components/brand/myshule-brand";

type AuthHighlight = {
  id: string;
  title: string;
  description: string;
};

type AuthTrustNote = {
  id: string;
  label: string;
  icon?: "shield" | "lock" | "check";
};

function resolveTrustIcon(icon: AuthTrustNote["icon"]) {
  if (icon === "lock") {
    return LockKeyhole;
  }

  if (icon === "check") {
    return CheckCircle2;
  }

  return ShieldCheck;
}

function AnimatedBackground({ dark }: { dark: boolean }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 ${
          dark
            ? "bg-[linear-gradient(135deg,var(--navy)_0%,var(--darkblue)_100%)]"
            : "bg-[linear-gradient(135deg,var(--navy)_0%,var(--darkblue)_100%)]"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          dark
            ? "bg-[linear-gradient(90deg,rgba(255,122,26,0.18)_0%,transparent_42%,rgba(255,255,255,0.08)_100%)]"
            : "bg-[linear-gradient(90deg,rgba(255,122,26,0.12)_0%,transparent_42%,rgba(255,255,255,0.08)_100%)]"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          dark
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_34%,rgba(2,6,23,0.18)_100%)]"
            : "bg-[linear-gradient(180deg,rgba(148,163,184,0.12)_0%,transparent_40%,rgba(7,27,59,0.55)_100%)]"
        }`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />
    </div>
  );
}

function TrustIndicators({
  notes,
  dark,
}: {
  notes: AuthTrustNote[];
  dark: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {notes.map((note) => {
        const Icon = resolveTrustIcon(note.icon);

        return (
          <span
            key={note.id}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
              dark
                ? "border-white/10 bg-white/[0.08] text-orange-50"
                : "border-border bg-surface-muted text-muted"
            } shadow-sm backdrop-blur`}
          >
            <Icon className="h-3.5 w-3.5 text-accent" />
            {note.label}
          </span>
        );
      })}
    </div>
  );
}

function SecurityStrip({ dark }: { dark: boolean }) {
  const items = [
    { icon: ShieldCheck, label: "Email verified" },
    { icon: Activity, label: "Audit trail" },
    { icon: Wifi, label: "Session health" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className={`rounded-2xl border px-4 py-3 ${
              dark
                ? "border-white/10 bg-white/[0.06] text-slate-200"
                : "border-border bg-surface-muted text-muted"
            }`}
          >
            <Icon className="h-4 w-4 text-accent" />
            <p className="mt-2 text-xs font-semibold">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function AuthHero({
  eyebrow,
  title,
  description,
  badge,
  highlights,
  trustNotes,
  helper,
  dark,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  highlights: AuthHighlight[];
  trustNotes: AuthTrustNote[];
  helper: string;
  dark: boolean;
}) {
  return (
    <section className="relative isolate hidden overflow-hidden p-8 text-foreground lg:flex lg:min-h-[calc(100vh-32px)] lg:flex-col lg:justify-between xl:p-10">
      <AnimatedBackground dark={dark} />
      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MyShuleMark
              size={48}
              preload
              className={dark ? "shadow-[0_0_28px_rgba(244,176,0,0.22)]" : ""}
            />
            <div>
              <p className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-950"}>
                My Shule ERP
              </p>
              <p className={dark ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-slate-500"}>
                {badge}
              </p>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
              dark
                ? "border border-white/10 bg-white/[0.08] text-orange-100"
                : "border border-border bg-surface-muted text-muted"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {eyebrow}
          </div>
        </div>

        <div className="max-w-2xl space-y-5">
          <motion.h1
            className={dark ? "text-4xl font-bold leading-[1.08] text-white xl:text-5xl" : "text-4xl font-bold leading-[1.08] text-slate-950 xl:text-5xl"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {title}
          </motion.h1>
          <motion.p
            className={dark ? "max-w-xl text-base leading-7 text-slate-300" : "max-w-xl text-base leading-7 text-slate-600"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: "easeOut" }}
          >
            {description}
          </motion.p>
        </div>
      </div>

      <div className="relative z-10 space-y-5">
        <div className="grid gap-3">
          {highlights.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border px-4 py-3 ${
                dark
                  ? "border-white/10 bg-white/[0.07] text-slate-200"
                  : "border-border bg-surface-muted text-muted"
              } shadow-sm backdrop-blur`}
            >
              <p className={dark ? "text-sm font-bold text-white" : "text-sm font-bold text-slate-950"}>
                {item.title}
              </p>
              <p className={dark ? "mt-1 text-xs leading-5 text-slate-300" : "mt-1 text-xs leading-5 text-slate-600"}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <SecurityStrip dark={dark} />
        <TrustIndicators notes={trustNotes} dark={dark} />
        <p className={dark ? "max-w-2xl text-sm leading-6 text-slate-300" : "max-w-2xl text-sm leading-6 text-slate-600"}>
          {helper}
        </p>
      </div>
    </section>
  );
}

export function AuthShell({
  eyebrow,
  heroTitle,
  heroDescription,
  badge,
  helper,
  highlights,
  trustNotes,
  children,
}: {
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  badge: string;
  helper: string;
  highlights: AuthHighlight[];
  trustNotes: AuthTrustNote[];
  children: ReactNode;
}) {
  const dark = true;

  return (
    <main
      className="command-background min-h-screen px-3 py-3 text-foreground transition-colors duration-300 md:px-4 md:py-4"
    >
      <div
        className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[var(--radius-xl)] border border-border bg-white shadow-[var(--shadow-lg)] lg:grid-cols-[1.1fr_0.9fr]"
      >
        <AuthHero
          eyebrow={eyebrow}
          title={heroTitle}
          description={heroDescription}
          badge={badge}
          helper={helper}
          highlights={highlights}
          trustNotes={trustNotes}
          dark={dark}
        />

        <section
          className="relative flex min-h-[calc(100vh-24px)] flex-col items-center justify-center overflow-hidden bg-white px-4 py-6 transition-colors duration-300 sm:px-6 md:px-8 lg:min-h-full"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,122,26,0.12),transparent_72%)] lg:hidden"
          />
          <div className="relative z-10 mb-5 flex w-full max-w-[480px] lg:hidden">
            <MyShuleBrand markSize={42} tone="brand" preload />
          </div>
          <motion.div
            className="relative z-10 w-full max-w-[480px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </section>
      </div>
    </main>
  );
}
