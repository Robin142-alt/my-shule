"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { verifyEmail } from "@/lib/auth/email-verification-client";

export function VerifyEmailView({
  initialToken = "",
  backHref = "/login",
}: {
  initialToken?: string;
  backHref?: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const submitToken = useCallback(
    async (nextToken = token) => {
      const normalizedToken = nextToken.trim();

      if (normalizedToken.length < 4) {
        setError(
          "Enter the verification code or open the link from your email.",
        );
        return;
      }

      setError(null);
      setBusy(true);

      try {
        const payload = await verifyEmail({ token: normalizedToken });
        setSuccessMessage(payload?.message ?? "Email verified successfully.");
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to verify this email right now.",
        );
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!initialToken.trim() || autoSubmitted.current) {
      return;
    }

    autoSubmitted.current = true;
    void submitToken(initialToken);
  }, [initialToken, submitToken]);

  return (
    <AuthCard>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void submitToken();
        }}
      >
        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight text-foreground">
            Verify your email
          </h1>
          <p className="text-sm leading-6 text-muted">
            Open the link in your email or enter your verification code.
          </p>
        </div>

        {successMessage ? (
          <AuthMessage
            tone="success"
            title="Email verified"
            description={successMessage}
          />
        ) : (
          <div className="space-y-4">
            {!initialToken && (
              <AuthField
                label="Verification token"
                placeholder="Paste your email verification token"
                autoComplete="one-time-code"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                error={error ?? undefined}
              />
            )}
            {initialToken && error ? (
              <AuthMessage
                tone="error"
                title="Unable to verify email"
                description={error}
              />
            ) : null}
            <AuthSubmitButton busy={busy} type="submit">
              Verify email
            </AuthSubmitButton>
          </div>
        )}

        <Link
          href={`${backHref}?expired=1`}
          className="inline-flex text-sm font-bold text-accent underline-offset-4 hover:text-orange-300 hover:underline"
        >
          Back to login
        </Link>
      </form>
    </AuthCard>
  );
}
