"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { MobileTrustRow, SecurityBadge } from "@/components/auth/auth-security";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import {
  clearMfaLoginChallenge,
  readMfaLoginChallenge,
  type MfaLoginChallenge,
} from "@/lib/auth/mfa-login-challenge";
import { MFA_CHALLENGE_HELP_TEXT, normalizeMfaCode } from "@/lib/auth/mfa-challenge";

type LoginResponse = {
  redirectTo?: string;
};

const loginHrefByAudience: Record<ExperienceAudience, string> = {
  superadmin: "/superadmin/login",
  school: "/school/login",
  portal: "/portal/login",
};

function isAudience(value: string | null): value is ExperienceAudience {
  return value === "superadmin" || value === "school" || value === "portal";
}

function parseLoginError(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
}

function maskIdentifier(identifier?: string) {
  if (!identifier) {
    return "your account";
  }

  if (!identifier.includes("@")) {
    return identifier;
  }

  const [name, domain] = identifier.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export function MfaVerificationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedAudience = searchParams.get("audience");
  const [challenge] = useState<MfaLoginChallenge | null>(() => readMfaLoginChallenge());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const expectedAudience = isAudience(requestedAudience) ? requestedAudience : null;
  const activeChallenge =
    challenge && (!expectedAudience || challenge.audience === expectedAudience)
      ? challenge
      : null;
  const loginHref = activeChallenge?.audience
    ? loginHrefByAudience[activeChallenge.audience]
    : expectedAudience
      ? loginHrefByAudience[expectedAudience]
      : "/login";
  const canSubmit = Boolean(activeChallenge);
  const pageError =
    challenge && !activeChallenge
      ? "This verification request does not match the login you started."
      : error;
  const maskedIdentifier = maskIdentifier(activeChallenge?.identifier);

  async function submitVerification() {
    const normalizedCode = normalizeMfaCode(code);

    if (!activeChallenge) {
      setError("Start sign-in again before entering a verification code.");
      return;
    }

    if (normalizedCode.length !== 6) {
      setError("Enter the 6-digit verification code from your email.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          audience: activeChallenge.audience,
          identifier: activeChallenge.identifier,
          password: activeChallenge.password,
          verificationCode: normalizedCode,
          tenantSlug: activeChallenge.tenantSlug,
        }),
      });
      const payload = (await response.json().catch(() => null)) as LoginResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(parseLoginError(payload, "Unable to verify that code."));
      }

      clearMfaLoginChallenge();
      router.push((payload as LoginResponse | null)?.redirectTo ?? activeChallenge.redirectFallback);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to verify that code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submitVerification();
        }}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SecurityBadge label="Verification required" tone="success" />
            <SecurityBadge label="Email code" />
            <SecurityBadge label="Session protected" />
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight text-foreground">
              Enter verification code
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Complete sign-in for {maskedIdentifier}. Codes expire quickly and can only be used once.
            </p>
          </div>
        </div>

        <MobileTrustRow />

        <AuthMessage
          tone={canSubmit ? "warning" : "error"}
          title={canSubmit ? "Check your email" : "Start sign-in again"}
          description={canSubmit ? MFA_CHALLENGE_HELP_TEXT : pageError ?? "The verification page needs the login attempt that requested this code."}
        />

        <AuthField
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => {
            setCode(normalizeMfaCode(event.target.value));
            setError(null);
          }}
          error={pageError ?? undefined}
          disabled={!canSubmit || isSubmitting}
        />

        {pageError && canSubmit ? (
          <AuthMessage tone="error" title="Verification failed" description={pageError} />
        ) : null}

        <AuthSubmitButton busy={isSubmitting} type="submit" disabled={!canSubmit}>
          Verify and continue
        </AuthSubmitButton>

        <div className="rounded-2xl border border-border bg-surface-muted/80 px-4 py-3 text-sm">
          <Link
            href={loginHref}
            className="font-bold text-accent underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
