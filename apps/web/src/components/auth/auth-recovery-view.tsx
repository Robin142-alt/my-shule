"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { getPasswordError } from "@/lib/auth/password-policy";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  requestPasswordRecovery,
  resetPassword,
} from "@/lib/auth/recovery-client";

type RecoveryAudience = "superadmin" | "school" | "portal";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordView({
  title,
  subtitle,
  identifierLabel,
  identifierPlaceholder,
  submitLabel,
  backHref,
  successMessage,
  audience = "school",
  tenantSlug = null,
}: {
  title: string;
  subtitle: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  submitLabel: string;
  backHref: string;
  successMessage: string;
  audience?: RecoveryAudience;
  tenantSlug?: string | null;
}) {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalizedIdentifier = identifier.trim();

    if (!emailPattern.test(normalizedIdentifier)) {
      setError("Enter a valid email address for this account.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await requestPasswordRecovery({
        audience,
        identifier: normalizedIdentifier,
        tenantSlug,
      });
      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send recovery instructions right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void submit();
        }}
      >
        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm leading-6 text-muted">{subtitle}</p>
        </div>

        {success ? (
          <AuthMessage
            tone="success"
            title="Check your email"
            description={successMessage}
          />
        ) : (
          <div className="space-y-4">
            <AuthField
              label={identifierLabel}
              placeholder={identifierPlaceholder}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              error={error ?? undefined}
            />
            <AuthSubmitButton busy={busy} type="submit">
              {submitLabel}
            </AuthSubmitButton>
          </div>
        )}

        {success ? (
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-accent"
            onClick={() => {
              setSuccess(false);
              setError(null);
            }}
          >
            Use another email
          </button>
        ) : null}
        <Link
          href={`${backHref}?expired=1`}
          className={
            success
              ? "auth-primary"
              : "inline-flex text-sm font-medium text-accent"
          }
        >
          Back to login
        </Link>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordView({
  title,
  subtitle,
  secretLabel,
  secretPlaceholder,
  backHref,
  audience = "school",
  tenantSlug = null,
  initialToken = "",
}: {
  title: string;
  subtitle: string;
  secretLabel: string;
  secretPlaceholder: string;
  backHref: string;
  audience?: RecoveryAudience;
  tenantSlug?: string | null;
  initialToken?: string;
}) {
  const [code, setCode] = useState(initialToken);
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};

    if (code.trim().length < 4) {
      nextErrors.code =
        "Enter the reset code or token from your recovery message.";
    }

    const passwordError = getPasswordError(secret);
    if (passwordError) nextErrors.secret = passwordError;

    if (confirmSecret !== secret) {
      nextErrors.confirmSecret =
        "The confirmation does not match the new password.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setBusy(true);

    try {
      await resetPassword({
        audience,
        token: code.trim(),
        password: secret,
        tenantSlug,
      });
      setSuccess(true);
    } catch (submitError) {
      setFieldErrors({
        code:
          submitError instanceof Error
            ? submitError.message
            : "Unable to reset this password right now.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void submit();
        }}
      >
        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm leading-6 text-muted">{subtitle}</p>
        </div>

        {success ? (
          <AuthMessage
            tone="success"
            title="Password updated"
            description="Sign in with your new password."
          />
        ) : (
          <div className="space-y-4">
            {!initialToken && (
              <AuthField
                label="Recovery code"
                placeholder="Enter the code you received"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                error={fieldErrors.code}
              />
            )}
            {initialToken && fieldErrors.code ? (
              <AuthMessage
                tone="error"
                title="Unable to reset password"
                description={fieldErrors.code}
              />
            ) : null}
            <NewPasswordFields
              passwordLabel={secretLabel}
              passwordPlaceholder={secretPlaceholder}
              password={secret}
              confirmation={confirmSecret}
              onPasswordChange={setSecret}
              onConfirmationChange={setConfirmSecret}
              showErrors={Boolean(fieldErrors.secret || fieldErrors.confirmSecret)}
              disabled={busy}
            />
            <AuthSubmitButton busy={busy} type="submit">
              Save new password
            </AuthSubmitButton>
          </div>
        )}

        {!success && (
          <Link
            href={backHref.replace("login", "forgot-password")}
            className="text-sm font-medium"
          >
            Request a new reset link
          </Link>
        )}
        <Link
          href={`${backHref}?expired=1`}
          className={
            success
              ? "auth-primary"
              : "inline-flex text-sm font-medium text-accent"
          }
        >
          Back to login
        </Link>
      </form>
    </AuthCard>
  );
}
