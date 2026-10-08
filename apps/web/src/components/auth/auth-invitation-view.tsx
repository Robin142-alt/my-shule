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
  buildInviteLoginHref,
  inviteLoginLabel,
} from "@/lib/auth/invite-redirect";
import {
  acceptInvitation,
  type InvitationAcceptanceResult,
} from "@/lib/auth/invitation-client";

export function InviteAcceptanceView({
  initialToken = "",
  initialTenantSlug = "",
}: {
  initialToken?: string;
  initialTenantSlug?: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [acceptedInvite, setAcceptedInvite] =
    useState<InvitationAcceptanceResult | null>(null);
  const acceptedLoginHref = acceptedInvite
    ? buildInviteLoginHref({
        role: acceptedInvite.role,
        email: acceptedInvite.email,
        tenantId: acceptedInvite.tenantId,
      })
    : "/school/login";
  const acceptedLoginLabel = acceptedInvite
    ? inviteLoginLabel(acceptedInvite.role)
    : "Continue to School Login";

  const submit = async () => {
    const nextErrors: Record<string, string> = {};

    if (token.trim().length < 32) {
      nextErrors.token =
        "Open the full invitation link or paste the secure invitation token.";
    }

    if (displayName.trim().length > 0 && displayName.trim().length < 2) {
      nextErrors.displayName =
        "Enter your full name or leave this field blank.";
    }

    const passwordError = getPasswordError(password);
    if (passwordError) nextErrors.password = passwordError;

    if (confirmPassword !== password) {
      nextErrors.confirmPassword =
        "The confirmation does not match the new password.";
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
        tenantSlug: initialTenantSlug.trim() || undefined,
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
            Create your password
          </h1>
          <p className="text-sm leading-6 text-muted">
            One step to activate your MyShule account.
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
              href={`${acceptedLoginHref}&expired=1`}
              className="auth-primary"
            >
              {acceptedLoginLabel}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {!initialToken && (
              <AuthField
                label="Invitation token"
                placeholder="Paste the secure token from your invitation link"
                autoComplete="one-time-code"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                error={fieldErrors.token}
              />
            )}
            {initialToken && fieldErrors.token ? (
              <AuthMessage
                tone="error"
                title="Unable to accept invitation"
                description={fieldErrors.token}
              />
            ) : null}
            <AuthField
              label="Full name (optional)"
              placeholder="Name to show inside the school workspace"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              error={fieldErrors.displayName}
            />
            <NewPasswordFields
              passwordLabel="Create password"
              confirmationLabel="Confirm password"
              value={password}
              confirmation={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmationChange={setConfirmPassword}
              showErrors={Boolean(fieldErrors.password || fieldErrors.confirmPassword)}
              disabled={busy}
            />
            <AuthSubmitButton busy={busy} type="submit">
              Create account
            </AuthSubmitButton>
          </div>
        )}
        <Link href="/login?expired=1" className="text-sm font-medium">
          Back to login
        </Link>
        {fieldErrors.token ? (
          <p className="text-sm text-muted">
            Link expired? Ask your school administrator to resend your
            invitation.
          </p>
        ) : null}
      </form>
    </AuthCard>
  );
}
