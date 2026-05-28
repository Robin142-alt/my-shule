"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { SecurityBadge, SessionWarning } from "@/components/auth/auth-security";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { acceptInvitation, type InvitationAcceptanceResult } from "@/lib/auth/invitation-client";

export function InviteAcceptanceView({
  initialToken = "",
}: {
  initialToken?: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [acceptedInvite, setAcceptedInvite] = useState<InvitationAcceptanceResult | null>(null);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};

    if (token.trim().length < 32) {
      nextErrors.token = "Open the full invitation link or paste the secure invitation token.";
    }

    if (displayName.trim().length > 0 && displayName.trim().length < 2) {
      nextErrors.displayName = "Enter your full name or leave this field blank.";
    }

    if (
      password.trim().length < 10 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      nextErrors.password =
        "Use at least 10 characters with uppercase, lowercase, and a number.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "The confirmation does not match the new password.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setBusy(true);

    try {
      const result = await acceptInvitation({
        token: token.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      setAcceptedInvite(result);
    } catch (submitError) {
      setFieldErrors({
        token:
          submitError instanceof Error
            ? submitError.message
            : "Unable to accept this invitation right now.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <SecurityBadge label="Verified invitation" tone="success" />
            <SecurityBadge label="School linked" />
          </div>
          <h2 className="text-3xl font-bold leading-tight text-foreground">
            Accept your invitation
          </h2>
          <p className="text-sm leading-6 text-muted">
            Set your first password for the school workspace issued by My Shule.
          </p>
        </div>

        {acceptedInvite ? (
          <div className="space-y-4">
            <AuthMessage
              tone="success"
              title="Invitation accepted"
              description="Your account is active for your school."
            />
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-accent px-4 text-sm font-bold text-white shadow-[0_16px_36px_rgba(255,122,26,0.24)] transition hover:bg-accent-hover hover:shadow-[0_18px_42px_rgba(255,122,26,0.3)]"
            >
              Continue to login
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AuthField
              label="Invitation token"
              placeholder="Paste the secure token from your invitation link"
              autoComplete="one-time-code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              error={fieldErrors.token}
            />
            <AuthField
              label="Full name"
              placeholder="Name to show inside the school workspace"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              error={fieldErrors.displayName}
            />
            <AuthPasswordField
              label="Create password"
              placeholder="Create a school workspace password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
            />
            <AuthPasswordField
              label="Confirm password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={fieldErrors.confirmPassword}
            />
            <AuthSubmitButton busy={busy} onClick={submit}>
              Accept invitation
            </AuthSubmitButton>
          </div>
        )}

        <SessionWarning mode="normal" />
      </div>
    </AuthCard>
  );
}
