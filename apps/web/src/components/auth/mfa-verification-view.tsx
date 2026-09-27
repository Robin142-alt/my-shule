"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { useAuthCountdown } from "@/components/auth/use-auth-countdown";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { authFetch } from "@/lib/auth/auth-fetch";
import {
  CHALLENGE_TTL_MS,
  clearMfaLoginChallenge,
  readMfaLoginChallenge,
  storeMfaLoginChallenge,
  type MfaLoginChallenge,
} from "@/lib/auth/mfa-login-challenge";
import {
  isMfaChallengeRequiredMessage,
  normalizeMfaCode,
} from "@/lib/auth/mfa-challenge";

const loginPaths = {
  superadmin: "/superadmin/login",
  school: "/school/login",
  portal: "/portal/login",
};
export function MfaVerificationView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [challenge, setChallenge] = useState<MfaLoginChallenge | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  useEffect(() => {
    const stored = readMfaLoginChallenge();
    setChallenge(stored);
    setResendAt(stored ? stored.createdAt + 30_000 : null);
    setReady(true);
  }, []);
  const remaining = useAuthCountdown(
    challenge ? challenge.createdAt + CHALLENGE_TTL_MS : null,
  );
  const resendSeconds = useAuthCountdown(resendAt);
  const requested = params.get("audience");
  const matches = !requested || requested === challenge?.audience;
  const active = challenge && matches && remaining > 0 ? challenge : null;
  const audience =
    requested === "school" ||
    requested === "portal" ||
    requested === "superadmin"
      ? requested
      : challenge?.audience;
  const loginHref = `${audience ? loginPaths[audience] : "/login"}?expired=1`;
  const destination = active?.identifier.replace(/^(.{2})[^@]*@/, "$1•••@");

  useEffect(() => {
    if (ready && challenge && remaining === 0) clearMfaLoginChallenge();
  }, [ready, challenge, remaining]);

  async function send(resend = false) {
    if (!active || lock.current || (resend && resendSeconds > 0)) return;
    if (!resend && normalizeMfaCode(code).length !== 6) {
      setError("Enter the 6-digit code from your email.");
      codeRef.current?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await authFetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        body: JSON.stringify({
          audience: active.audience,
          identifier: active.identifier,
          password: active.password,
          tenantSlug: active.tenantSlug,
          rememberSession: active.rememberSession,
          ...(!resend ? { verificationCode: normalizeMfaCode(code) } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (
        resend &&
        !response.ok &&
        isMfaChallengeRequiredMessage(payload?.message)
      ) {
        storeMfaLoginChallenge(active);
        setChallenge(readMfaLoginChallenge());
        setResendAt(Date.now() + 30_000);
        setCode("");
        setNotice(
          "A new code was sent. Check your email and use the latest code.",
        );
        codeRef.current?.focus();
        return;
      }
      if (!response.ok)
        throw new Error(
          payload?.message?.includes("invalid or expired")
            ? "That code is incorrect or expired. Try again or resend a code."
            : (payload?.message ?? "Unable to verify. Please try again."),
        );
      if (!payload?.session || !payload?.redirectTo)
        throw new Error("Sign-in could not be confirmed. Please try again.");
      clearMfaLoginChallenge();
      queryClient.clear();
      router.push(payload.redirectTo);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to verify. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthCard>
      {!ready ? (
        <p role="status" className="text-sm text-muted">
          Opening verification…
        </p>
      ) : !active ? (
        <div className="space-y-5">
          <div>
            <h1>Start sign-in again</h1>
            <p className="mt-2 text-sm text-muted">
              This verification attempt has expired or was interrupted.
            </p>
          </div>
          <Link
            href={loginHref}
            onClick={clearMfaLoginChallenge}
            className="auth-primary"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div>
            <h1>Enter verification code</h1>
            <p className="mt-2 text-sm text-muted">
              Check your email at{" "}
              <span className="font-medium text-foreground">{destination}</span>
              .
            </p>
          </div>
          <AuthField
            ref={codeRef}
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="go"
            className="auth-code"
            value={code}
            onChange={(event) => {
              setCode(normalizeMfaCode(event.target.value));
              setError(null);
            }}
            error={error ?? undefined}
          />
          <p className="text-xs text-muted">
            Sign-in attempt expires in {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}.
          </p>
          {notice ? (
            <AuthMessage
              tone="success"
              title="Check your email"
              description={notice}
            />
          ) : null}
          <AuthSubmitButton busy={busy} type="submit">
            Verify and continue
          </AuthSubmitButton>
          <div className="auth-actions">
            <button
              type="button"
              className="min-h-11 font-medium disabled:text-muted"
              disabled={busy || resendSeconds > 0}
              onClick={() => void send(true)}
            >
              {resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : "Resend code"}
            </button>
            <Link
              href={loginHref}
              onClick={clearMfaLoginChallenge}
              className="font-medium"
            >
              Use another account
            </Link>
          </div>
          <Link
            href={loginHref}
            onClick={clearMfaLoginChallenge}
            className="text-sm font-medium"
          >
            Back to login
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
