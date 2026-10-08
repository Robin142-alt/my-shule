"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { getPasswordError } from "@/lib/auth/password-policy";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { useAuthCountdown } from "@/components/auth/use-auth-countdown";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { authFetch } from "@/lib/auth/auth-fetch";
import {
  normalizeMfaCode,
  isMfaChallengeRequiredError,
} from "@/lib/auth/mfa-challenge";
import {
  clearMfaLoginChallenge,
  buildMfaVerificationPath,
  storeMfaLoginChallenge,
} from "@/lib/auth/mfa-login-challenge";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

type PortalMode = "family" | "parent" | "student";
export function PortalLoginView({
  mode = "family",
  initialEmail = "",
  initialTenantSlug = null,
  acceptedInvite = false,
}: {
  mode?: PortalMode;
  initialEmail?: string;
  initialTenantSlug?: string | null;
  acceptedInvite?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    clearMfaLoginChallenge();
  }, []);
  const queryClient = useQueryClient();
  const tenant = initialTenantSlug?.trim() || null;
  const auth = useExperienceSession("portal", { tenantSlug: tenant });
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState(
    initialEmail.trim().toLowerCase(),
  );
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const resendSeconds = useAuthCountdown(resendAt);
  const [channel, setChannel] = useState("sms");
  const usesLinkedAccess =
    (mode === "parent" || mode === "student") &&
    !(acceptedInvite && method === "password");
  const portalType = mode === "student" ? "student" : "parent";
  const identifierLabel = usesLinkedAccess
    ? mode === "student"
      ? "Admission number"
      : "Child admission number"
    : acceptedInvite
      ? mode === "student"
        ? "Student email address"
        : "Parent email address"
      : "Portal email address";

  function changeMethod(next: "password" | "otp") {
    if (lock.current) return;
    setMethod(next);
    if (acceptedInvite)
      setIdentifier(
        next === "password" ? initialEmail.trim().toLowerCase() : "",
      );
    setChallenge(null);
    setSetup(false);
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmation("");
    setError(null);
    setNotice(null);
    auth.clearError();
  }
  async function post(path: string, body: Record<string, unknown>) {
    const response = await authFetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload)
      throw new Error(
        payload?.message ?? "Unable to sign in. Please try again.",
      );
    return payload;
  }
  async function submit(resend = false) {
    if (lock.current || (resend && resendSeconds > 0)) return;
    setError(null);
    setNotice(null);
    if (!identifier.trim()) {
      setError(`Enter your ${identifierLabel.toLowerCase()}.`);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      if (method === "otp" && (!challenge || resend)) {
        if (usesLinkedAccess && phone.replace(/\D/g, "").length < 9)
          throw new Error(
            "Enter the guardian phone number registered with your school.",
          );
        const payload = await post(`/api/auth/${portalType}/otp/request`, {
          ...(mode === "student"
            ? { username: identifier.trim() }
            : { identifier: identifier.trim() }),
          ...(usesLinkedAccess
            ? { guardian_phone: phone.trim(), tenant_id: tenant ?? undefined }
            : {}),
        });
        setChallenge(payload.challenge_id ?? null);
        setSetup(Boolean(payload.password_setup_required));
        setChannel(payload.delivery_channel ?? "sms");
        setCode("");
        setResendAt(Date.now() + 60_000);
        // The backend deliberately uses conditional wording to protect account privacy.
        setNotice(
          resend
            ? "New code requested. Check your messages."
            : payload.challenge_id
              ? null
              : (payload.message ??
                "If your details match an account, a code will arrive shortly."),
        );
        return;
      }
      let payload;
      if (method === "otp") {
        if (code.length !== 6)
          throw new Error("Enter the 6-digit verification code.");
        if (setup) {
          const passwordError = getPasswordError(newPassword);
          if (passwordError) throw new Error(passwordError);
          if (newPassword !== confirmation)
            throw new Error("The passwords do not match.");
        }
        payload = await post(`/api/auth/${portalType}/otp/verify`, {
          challenge_id: challenge,
          otp_code: code,
          ...(setup ? { new_password: newPassword } : {}),
        });
      } else {
        if (!password) throw new Error("Enter your password.");
        payload = usesLinkedAccess
          ? await post(`/api/auth/${portalType}/login`, {
              ...(mode === "student"
                ? { username: identifier.trim() }
                : { admission_number: identifier.trim() }),
              password,
              tenant_id: tenant ?? undefined,
            })
          : await auth.login({ identifier: identifier.trim(), password });
      }
      if (!payload?.session || !payload?.redirectTo)
        throw new Error("Sign-in could not be confirmed. Please try again.");
      queryClient.clear();
      router.push(payload.redirectTo);
    } catch (failure) {
      if (method === "password" && isMfaChallengeRequiredError(failure)) {
        storeMfaLoginChallenge({
          audience: "portal",
          identifier: identifier.trim(),
          password,
          tenantSlug: tenant,
          redirectFallback: "/portal/parent",
        });
        router.push(buildMfaVerificationPath("portal"));
        return;
      }
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const destination =
    channel === "email"
      ? identifier.replace(
          /^(.{2})[^@]*@/,
          "$1***@",
        )
      : phone
        ? `phone ending ${phone.replace(/\D/g, "").slice(-4)}`
        : "your registered phone";

  return (
    <AuthCard>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <h1>
            {challenge
              ? "Enter verification code"
              : mode === "parent"
                ? "Parent sign in"
                : mode === "student"
                  ? "Student sign in"
                  : "Portal sign in"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {challenge
              ? `Check ${destination}.`
              : acceptedInvite
                ? "Use the password you just created."
                : usesLinkedAccess
                  ? "Use your admission number and password."
                  : "Enter your portal email and password."}
          </p>
        </div>
        {!challenge && (
          <div className="auth-methods" aria-label="Sign-in method">
            <button
              type="button"
              aria-pressed={method === "password"}
              disabled={busy}
              onClick={() => changeMethod("password")}
            >
              Password
            </button>
            <button
              type="button"
              aria-pressed={method === "otp"}
              disabled={busy}
              onClick={() => changeMethod("otp")}
            >
              {usesLinkedAccess ? "SMS code" : "Get a code"}
            </button>
          </div>
        )}
        <div className="space-y-4">
          {!challenge && (
            <AuthField
              label={identifierLabel}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode={usesLinkedAccess ? "text" : "email"}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          )}
          {!challenge && method === "otp" && usesLinkedAccess && (
            <AuthField
              label="Registered guardian phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          )}
          {method === "password" && (
            <AuthPasswordField
              label="Password"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
          {challenge && (
            <AuthField
              label="Verification code"
              className="auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint={setup ? "next" : "go"}
              value={code}
              onChange={(event) =>
                setCode(normalizeMfaCode(event.target.value))
              }
            />
          )}
          {challenge && setup && (
            <NewPasswordFields
              passwordLabel="Create new password"
              password={newPassword}
              confirmation={confirmation}
              onPasswordChange={(value) => { setNewPassword(value); setError(null); }}
              onConfirmationChange={(value) => { setConfirmation(value); setError(null); }}
              showErrors={Boolean(error)}
              disabled={busy}
            />
          )}
        </div>
        {notice ? (
          <p role="status" className="text-xs text-muted">
            {notice}
          </p>
        ) : null}
        {challenge && (
          <p className="text-xs text-muted">
            Codes expire. Use the latest code, or request another below.
          </p>
        )}
        {error && (
          <AuthMessage
            tone="error"
            title="Unable to sign in"
            description={error}
          />
        )}
        <AuthSubmitButton
          busy={busy}
          type="submit"
          disabled={method === "otp" && !challenge && resendSeconds > 0}
        >
          {method === "password"
            ? "Sign in"
            : challenge
              ? setup
                ? "Verify and set password"
                : "Verify and continue"
              : resendSeconds > 0
                ? `Request again in ${resendSeconds}s`
                : "Send code"}
        </AuthSubmitButton>
        {challenge ? (
          <div className="auth-actions">
            <button
              type="button"
              className="min-h-11 font-medium disabled:text-muted"
              disabled={busy || resendSeconds > 0}
              onClick={() => void submit(true)}
            >
              {resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : "Resend code"}
            </button>
            <button
              type="button"
              className="min-h-11 font-medium"
              disabled={busy}
              onClick={() => changeMethod("otp")}
            >
              Change details
            </button>
          </div>
        ) : method === "password" ? (
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-accent"
            disabled={busy}
            onClick={() => changeMethod("otp")}
          >
            First time or forgot password? Get a code
          </button>
        ) : (
          <p className="text-xs text-muted">
            {usesLinkedAccess
              ? "Use the guardian phone registered with your school."
              : "We will send a code using your registered contact details."}
          </p>
        )}
        <div className="auth-actions border-t border-border pt-2">
          {challenge ? (
            <button
              type="button"
              className="min-h-11 font-medium"
              disabled={busy}
              onClick={() => changeMethod("password")}
            >
              Back to login
            </button>
          ) : (
            <Link
              href={
                mode === "student"
                  ? "/parent/login?expired=1"
                  : "/student/login?expired=1"
              }
              className="font-medium"
            >
              {mode === "student" ? "Parent login" : "Student login"}
            </Link>
          )}
          <Link href="/school/login?expired=1" className="font-medium">
            School staff login
          </Link>
        </div>
        {!usesLinkedAccess && (
          <Link href="/portal/forgot-password" className="text-sm font-medium">
            Reset password by email
          </Link>
        )}
      </form>
    </AuthCard>
  );
}
