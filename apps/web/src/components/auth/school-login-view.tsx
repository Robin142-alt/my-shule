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
  isMfaChallengeRequiredError,
} from "@/lib/auth/mfa-challenge";
import {
  buildMfaVerificationPath,
  storeMfaLoginChallenge,
} from "@/lib/auth/mfa-login-challenge";
import type { SchoolBrandingResolution } from "@/lib/auth/school-branding";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

const staffLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .email("Enter a valid work email address."),
  password: z.string().min(8, "Enter your password."),
});

type StaffLoginForm = z.infer<typeof staffLoginSchema>;

export function SchoolLoginView({
  resolution,
}: {
  resolution: SchoolBrandingResolution;
}) {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(true);
  const resolvedTenantSlug = resolution.status === "resolved" ? resolution.requestedSlug : null;
  const authSession = useExperienceSession("school", {
    tenantSlug: resolvedTenantSlug,
  });
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<StaffLoginForm>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });
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

    try {
      const result = await authSession.login({
        identifier: values.identifier.trim(),
        password: values.password,
        tenantSlug: resolvedTenantSlug,
      });
      void router.push(result.redirectTo ?? "/dashboard");
    } catch (error) {
      if (isMfaChallengeRequiredError(error)) {
        storeMfaLoginChallenge({
          audience: "school",
          identifier: values.identifier.trim(),
          password: values.password,
          tenantSlug: resolvedTenantSlug,
          redirectFallback: "/dashboard",
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
      <form className="space-y-6" onSubmit={submit}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-accent text-sm font-bold text-white shadow-[0_0_24px_rgba(255,122,26,0.26)]">
              {resolution.branding.logoMark}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{resolution.branding.name}</p>
              <p className="text-sm text-muted">{resolution.branding.county}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecurityBadge label="School admin" tone="success" />
            <SecurityBadge label="Tenant protected" />
            <SecurityBadge label="Email verified" />
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight text-foreground">
              Run your school with operational clarity.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Visibility across departments, accountable payments, traceable incidents, and responsible student monitoring.
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
        </div>

        <div className="flex items-center justify-between gap-3">
          <AuthCheckbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            label="Remember this session"
          />
          <Link
            href="/school/forgot-password"
            className="text-sm font-bold text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <SessionWarning mode="normal" />

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
          Sign in securely
        </AuthSubmitButton>

        <div className="rounded-2xl border border-border bg-surface-muted/80 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-accent" />
            <p className="text-sm leading-6 text-muted">
              Need account help? Contact your school administrator or call My Shule on 0769622589.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">Looking for the main dashboard route?</span>
          <Link
            href="/login"
            className="font-bold text-accent underline-offset-4 hover:underline"
          >
            My Shule dashboard
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
