"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import {
  MobileTrustRow,
  SecurityBadge,
  SessionWarning,
} from "@/components/auth/auth-security";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  MFA_CHALLENGE_HELP_TEXT,
  isMfaChallengeRequiredError,
  normalizeMfaCode,
} from "@/lib/auth/mfa-challenge";
import type { SchoolBrandingResolution } from "@/lib/auth/school-branding";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

const staffLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .email("Enter a valid work email address."),
  password: z.string().min(8, "Enter your password."),
  verificationCode: z.string().optional(),
});

type StaffLoginForm = z.infer<typeof staffLoginSchema>;

export function SchoolLoginView({
  resolution,
}: {
  resolution: SchoolBrandingResolution;
}) {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(true);
  const authSession = useExperienceSession("school", {
    tenantSlug: resolution.requestedSlug ?? resolution.branding.slug,
  });
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<StaffLoginForm>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      verificationCode: "",
    },
  });
  const [mfaRequired, setMfaRequired] = useState(false);
  const isTenantUnavailable = resolution.status === "unknown";

  const tenantMessage =
    resolution.status === "unknown"
      ? {
          tone: "error" as const,
          title: "Workspace not recognized",
          description:
            "This school address could not be verified. Use your official My Shule login page or contact your administrator.",
        }
      : resolution.status === "default"
        ? {
            tone: "warning" as const,
            title: "School access pending",
            description:
              "Use your email and password. My Shule will open the school linked to your account.",
          }
        : {
            tone: "info" as const,
            title: "School-isolated access",
            description:
              "Your session opens only your school's data, branding, modules, and role permissions.",
          };

  const submit = handleSubmit(async (values) => {
    if (isTenantUnavailable) {
      return;
    }

    const normalizedVerificationCode = normalizeMfaCode(values.verificationCode);

    if (mfaRequired && normalizedVerificationCode.length !== 6) {
      setError("verificationCode", {
        message: "Enter the verification code from your email.",
      });
      return;
    }

    try {
      const result = await authSession.login({
        identifier: values.identifier.trim(),
        password: values.password,
        verificationCode: mfaRequired ? normalizedVerificationCode : undefined,
        tenantSlug: resolution.requestedSlug ?? resolution.branding.slug,
      });
      void router.push(result.redirectTo ?? "/dashboard");
    } catch (error) {
      if (isMfaChallengeRequiredError(error)) {
        setMfaRequired(true);
        clearErrors("verificationCode");
        authSession.clearError();
        return;
      }
      // useExperienceSession exposes the safe message.
    }
  });

  return (
    <AuthCard>
      <form className="space-y-6" onSubmit={submit}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-800">
              {resolution.branding.logoMark}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-950">{resolution.branding.name}</p>
              <p className="text-sm text-slate-500">{resolution.branding.county}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecurityBadge label="School admin" tone="success" />
            <SecurityBadge label="Tenant protected" />
            <SecurityBadge label="Email verified" />
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight text-slate-950">
              Secure admin access
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to manage finance, academics, CBC reporting, and school operations.
            </p>
          </div>
        </div>

        <MobileTrustRow />

        <AuthMessage
          tone={tenantMessage.tone}
          title={tenantMessage.title}
          description={tenantMessage.description}
        />

        <div className="space-y-4">
          <AuthField
            label="Email address"
            autoComplete="email"
            {...register("identifier")}
            error={errors.identifier?.message}
          />
          <AuthPasswordField
            label="Password"
            autoComplete="current-password"
            {...register("password")}
            error={errors.password?.message}
          />
          {mfaRequired ? (
            <AuthField
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              {...register("verificationCode")}
              error={errors.verificationCode?.message}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <AuthCheckbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            label="Remember this session"
          />
          <Link
            href="/school/forgot-password"
            className="text-sm font-bold text-slate-700 underline-offset-4 hover:text-emerald-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <SessionWarning mode="normal" />

        {mfaRequired ? (
          <AuthMessage
            tone="warning"
            title="Verification required"
            description={MFA_CHALLENGE_HELP_TEXT}
          />
        ) : null}

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
          {mfaRequired ? "Verify and continue" : "Sign in securely"}
        </AuthSubmitButton>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <p className="text-sm leading-6 text-slate-600">
              Need account help? Contact your school administrator or call My Shule on 0769622589.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
          <span className="font-semibold text-emerald-900">Looking for the main dashboard route?</span>
          <Link
            href="/login"
            className="font-bold text-emerald-700 underline-offset-4 hover:underline"
          >
            My Shule dashboard
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
