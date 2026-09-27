"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { isMfaChallengeRequiredError } from "@/lib/auth/mfa-challenge";
import {
  clearMfaLoginChallenge,
  buildMfaVerificationPath,
  storeMfaLoginChallenge,
} from "@/lib/auth/mfa-login-challenge";
import type { SchoolBrandingResolution } from "@/lib/auth/school-branding";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

const staffLoginSchema = z.object({
  identifier: z.string().trim().email("Enter a valid work email address."),
  password: z.string().min(8, "Enter your password."),
});

type StaffLoginForm = z.infer<typeof staffLoginSchema>;

export function SchoolLoginView({
  resolution,
  initialEmail = "",
  initialTenantSlug = null,
  acceptedInvite = false,
  title = "Sign in to MyShule",
}: {
  resolution: SchoolBrandingResolution;
  initialEmail?: string;
  initialTenantSlug?: string | null;
  acceptedInvite?: boolean;
  title?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    clearMfaLoginChallenge();
  }, []);
  const [rememberMe, setRememberMe] = useState(true);
  const resolvedTenantSlug =
    resolution.status === "resolved" ? resolution.requestedSlug : null;
  const effectiveTenantSlug = initialTenantSlug?.trim() || resolvedTenantSlug;
  const authSession = useExperienceSession("school", {
    tenantSlug: effectiveTenantSlug,
  });
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<StaffLoginForm>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      identifier: initialEmail.trim().toLowerCase(),
      password: "",
    },
  });
  const isTenantUnavailable = resolution.status === "unknown";

  const submit = handleSubmit(async (values) => {
    if (isTenantUnavailable) {
      return;
    }

    try {
      const result = await authSession.login({
        identifier: values.identifier.trim(),
        password: values.password,
        tenantSlug: effectiveTenantSlug,
        rememberSession: rememberMe,
      });
      void router.push(result.redirectTo ?? "/dashboard");
    } catch (error) {
      if (isMfaChallengeRequiredError(error)) {
        storeMfaLoginChallenge({
          audience: "school",
          identifier: values.identifier.trim(),
          password: values.password,
          tenantSlug: effectiveTenantSlug,
          redirectFallback: "/dashboard",
          rememberSession: rememberMe,
        });
        clearErrors();
        authSession.clearError();
        void router.push(buildMfaVerificationPath("school"));
        return;
      }
      // useExperienceSession exposes the safe message.
    }
  });

  return (
    <AuthCard>
      <form className="space-y-5" noValidate onSubmit={submit}>
        <div>
          <h1>{title}</h1>
          <p className="mt-2 text-sm text-muted">
            {acceptedInvite
              ? "Use the password you just created."
              : "Enter your school email and password."}
          </p>
        </div>
        {isTenantUnavailable ? (
          <AuthMessage
            tone="error"
            title="School address not recognized"
            description="Open your school's official login link or contact your school administrator."
          />
        ) : null}
        <div className="space-y-4">
          <AuthField
            label="Email address"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            {...register("identifier")}
            error={errors.identifier?.message}
          />
          <AuthPasswordField
            label="Password"
            autoComplete="current-password"
            enterKeyHint="go"
            {...register("password")}
            error={errors.password?.message}
          />
        </div>
        <div className="auth-actions">
          <AuthCheckbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            label="Keep me signed in"
          />
          <Link href="/school/forgot-password" className="font-medium">
            Forgot password?
          </Link>
        </div>
        {authSession.error ? (
          <AuthMessage
            tone="error"
            title="Unable to sign in"
            description={authSession.error}
          />
        ) : null}
        <AuthSubmitButton
          busy={isSubmitting || authSession.isSubmitting}
          type="submit"
          disabled={isTenantUnavailable}
        >
          Sign in
        </AuthSubmitButton>
        <div className="auth-actions border-t border-border pt-2">
          <Link href="/parent/login?expired=1" className="font-medium">
            Parent login
          </Link>
          <Link href="/student/login?expired=1" className="font-medium">
            Student login
          </Link>
        </div>
        <p className="text-xs text-muted">
          Invited to MyShule? Open the link in your invitation to set your
          password.
        </p>
      </form>
    </AuthCard>
  );
}
