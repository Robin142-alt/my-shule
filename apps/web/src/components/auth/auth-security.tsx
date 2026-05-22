"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Fingerprint,
  Laptop,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

export function OTPInput({
  label,
  value,
  onChange,
  error,
  length = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  length?: number;
}) {
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-foreground" htmlFor="auth-otp">
        {label}
      </label>
      <input
        id="auth-otp"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        className="sr-only"
        aria-invalid={Boolean(error)}
      />
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {digits.map((digit, index) => (
          <button
            key={`${index}-${digit}`}
            type="button"
            onClick={() => document.getElementById("auth-otp")?.focus()}
            className={`h-12 rounded-2xl border bg-surface-muted text-center text-lg font-bold text-foreground transition ${
              error ? "border-danger" : "border-border hover:border-accent/45"
            }`}
          >
            {digit || " "}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function SecurityBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const classes =
    tone === "success"
      ? "border-success/25 bg-success-soft text-success"
      : tone === "warning"
        ? "border-warning/25 bg-warning-soft text-warning"
        : "border-border bg-surface-muted/80 text-muted";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${classes}`}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function DeviceVerificationCard({
  trusted,
  onTrustedChange,
}: {
  trusted: boolean;
  onTrustedChange: (trusted: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-muted/80 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm">
          <Laptop className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">Device context</p>
            <SecurityBadge label="Audit ready" tone="success" />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            This sign-in will be associated with the current browser and device profile. Review sessions after login if anything looks unfamiliar.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-3">
            <input
              type="checkbox"
              checked={trusted}
              onChange={(event) => onTrustedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border bg-surface-muted text-accent"
            />
            <span>
              <span className="block text-sm font-bold text-foreground">Use this device context</span>
              <span className="mt-1 block text-sm leading-5 text-muted">
                Use only on a managed school or personal device.
              </span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function SessionWarning({
  mode,
}: {
  mode: "normal" | "expiring" | "locked";
}) {
  const copy =
    mode === "locked"
      ? {
          title: "Access temporarily locked",
          detail: "Too many attempts were detected. Wait before trying again or start account recovery.",
          icon: LockKeyhole,
        }
      : mode === "expiring"
        ? {
            title: "Session expires soon",
            detail: "Save your work and continue securely to refresh your session.",
            icon: Clock3,
          }
        : {
            title: "Protected session",
            detail: "CSRF checks, same-site cookies, session binding, and audit-ready device context protect this sign-in flow.",
            icon: Fingerprint,
          };
  const Icon = copy.icon;

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <p className="text-sm font-bold text-foreground">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{copy.detail}</p>
        </div>
      </div>
    </div>
  );
}

export function TenantSelector({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className="space-y-2">
      <label className="relative block" htmlFor="tenant-selector">
        <input
          id="tenant-selector"
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          autoComplete="organization"
          placeholder=" "
          className={`peer h-14 w-full rounded-[var(--radius)] border bg-white px-4 pb-2 pt-5 text-sm font-medium text-foreground outline-none transition placeholder:text-transparent hover:border-accent/35 focus:border-accent focus:shadow-[var(--shadow-focus)] ${
            error ? "border-danger" : "border-border"
          }`}
          aria-invalid={Boolean(error)}
        />
        <span className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold text-muted-strong transition-all duration-200 peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-accent">
          School email domain
        </span>
      </label>

      {focused ? (
        <div className="grid gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-muted">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" />
            The system resolves the correct workspace from the signed-in account.
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function MobileTrustRow() {
  return (
    <div className="hidden grid-cols-3 gap-2 min-[480px]:grid lg:hidden">
      {[
        { icon: ShieldCheck, label: "CSRF" },
        { icon: Smartphone, label: "Mobile" },
        { icon: LockKeyhole, label: "Session" },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="min-w-0 rounded-2xl border border-border bg-surface-muted/80 px-3 py-3 text-center">
            <Icon className="mx-auto h-4 w-4 text-accent" />
            <p className="mt-2 truncate text-xs font-bold text-muted">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
