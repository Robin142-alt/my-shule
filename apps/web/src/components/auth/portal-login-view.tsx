"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Smartphone } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { MobileTrustRow, SecurityBadge } from "@/components/auth/auth-security";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

const portalSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your portal identifier."),
  guardianPhone: z.string(),
  secret: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

type PortalForm = z.infer<typeof portalSchema>;

type PortalMode = "family" | "parent" | "student";

const portalCopy: Record<
  PortalMode,
  {
    badge: string;
    title: string;
    description: string;
    identifierLabel: string;
    secretLabel: string;
    submitLabel: string;
    message: string;
  }
> = {
  family: {
    badge: "Family portal",
    title: "Stay connected to your child in real time.",
    description:
      "Securely review fees, attendance, clinic updates, teacher messages, and academic progress from one calm family workspace.",
    identifierLabel: "Portal email address",
    secretLabel: "Password",
    submitLabel: "Open portal",
    message:
      "Parents only see linked learners, and students only see their own records and school messages.",
  },
  parent: {
    badge: "Parent access",
    title: "Follow progress with confidence.",
    description:
      "A secure parent login for fee balances, attendance snapshots, clinic records, transport status, and learner progress.",
    identifierLabel: "Child admission number",
    secretLabel: "Password",
    submitLabel: "Continue as parent",
    message:
      "Payment context and learner records stay private to the verified family profile.",
  },
  student: {
    badge: "Student access",
    title: "Open your learning command space.",
    description:
      "A focused student login for assignments, results, timetable, notices, and academic downloads.",
    identifierLabel: "Admission number",
    secretLabel: "Password",
    submitLabel: "Continue as student",
    message:
      "Students only see their own timetable, assignments, performance records, and notices.",
  },
};

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
  const authSession = useExperienceSession("portal", {
    tenantSlug: initialTenantSlug?.trim() || null,
  });
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [passwordSetupRequired, setPasswordSetupRequired] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const usesLinkedAccess = mode === "parent" || mode === "student";
  const copy = portalCopy[mode];
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PortalForm>({
    resolver: zodResolver(portalSchema),
    defaultValues: {
      identifier: initialEmail.trim().toLowerCase(),
      guardianPhone: "",
      secret: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      if (loginMode === "otp") {
        setOtpError(null);

        if (!challengeId) {
          if (usesLinkedAccess && values.guardianPhone.replace(/\D/g, "").length < 9) {
            throw new Error("Enter the guardian phone number registered during admission.");
          }
          const portalType = mode === "student" ? "student" : "parent";
          const response = await fetch(`/api/auth/${portalType}/otp/request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-myshule-csrf": await getCsrfToken(),
            },
            credentials: "same-origin",
            body: JSON.stringify(
              mode === "student"
                ? {
                    username: values.identifier.trim(),
                    guardian_phone: values.guardianPhone.trim(),
                    tenant_id: initialTenantSlug?.trim() || undefined,
                  }
                : mode === "parent"
                  ? {
                      identifier: values.identifier.trim(),
                      guardian_phone: values.guardianPhone.trim(),
                      tenant_id: initialTenantSlug?.trim() || undefined,
                    }
                  : { identifier: values.identifier.trim() },
            ),
          });
          const payload = (await response.json().catch(() => null)) as
            | { challenge_id?: string; message?: string; password_setup_required?: boolean }
            | null;

          if (!response.ok) {
            throw new Error(payload?.message ?? "Unable to send a verification code.");
          }

          setChallengeId(payload?.challenge_id ?? null);
          setPasswordSetupRequired(Boolean(payload?.password_setup_required));
          setOtpMessage(payload?.message ?? "If a parent account exists, a code has been sent.");
          return;
        }

        const portalType = mode === "student" ? "student" : "parent";
        if (passwordSetupRequired) {
          if (
            values.newPassword.length < 10 ||
            !/[A-Z]/.test(values.newPassword) ||
            !/[a-z]/.test(values.newPassword) ||
            !/\d/.test(values.newPassword)
          ) {
            throw new Error("Use at least 10 characters with uppercase, lowercase, and a number.");
          }
          if (values.newPassword !== values.confirmPassword) {
            throw new Error("The password confirmation does not match.");
          }
        }

        const response = await fetch(`/api/auth/${portalType}/otp/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
          body: JSON.stringify({
            challenge_id: challengeId,
            otp_code: values.secret.trim(),
            new_password: passwordSetupRequired ? values.newPassword : undefined,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { redirectTo?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to verify that code.");
        }

        void router.push(payload?.redirectTo ?? (mode === "student" ? "/portal/student" : "/portal/parent"));
        return;
      }

      if (usesLinkedAccess) {
        const portalType = mode === "student" ? "student" : "parent";
        const response = await fetch(`/api/auth/${portalType}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
          body: JSON.stringify({
            ...(mode === "student"
              ? { username: values.identifier.trim() }
              : { admission_number: values.identifier.trim() }),
            password: values.secret,
            tenant_id: initialTenantSlug?.trim() || undefined,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { redirectTo?: string; message?: string }
          | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? `Unable to sign in to the ${portalType} portal.`);
        }
        void router.push(payload?.redirectTo ?? (mode === "student" ? "/portal/student" : "/portal/parent"));
        return;
      }

      const result = await authSession.login({
        identifier: values.identifier.trim(),
        password: values.secret,
      });
      void router.push(result.redirectTo ?? "/dashboard");
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Unable to sign in right now.");
    }
  });

  return (
    <AuthCard>
      <form className="space-y-6" onSubmit={submit}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SecurityBadge label={copy.badge} tone="success" />
            <SecurityBadge label="Private records" />
            <SecurityBadge label="M-PESA ready" />
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight text-foreground">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {copy.description}
            </p>
          </div>
        </div>

        <MobileTrustRow />

        <AuthMessage
          tone="info"
          title="Private by design"
          description={loginMode === "otp" ? "Parents can receive a one-time code by SMS where a phone number is linked by the school." : copy.message}
        />

        {acceptedInvite && loginMode === "password" ? (
          <AuthMessage
            tone="success"
            title="Parent access is active"
            description="Use the password you just created. This login is linked to the invited parent email and school."
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface-muted/80 p-1 text-sm font-bold text-muted">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 transition ${loginMode === "password" ? "bg-accent text-white shadow-[0_0_18px_rgba(255,122,26,0.22)]" : "hover:text-foreground"}`}
            onClick={() => {
              setLoginMode("password");
              setChallengeId(null);
              setOtpError(null);
              setOtpMessage(null);
              setPasswordSetupRequired(false);
            }}
          >
            Password
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 transition ${loginMode === "otp" ? "bg-accent text-white shadow-[0_0_18px_rgba(255,122,26,0.22)]" : "hover:text-foreground"}`}
            onClick={() => {
              setLoginMode("otp");
              setChallengeId(null);
              setOtpError(null);
              setOtpMessage(null);
              setPasswordSetupRequired(false);
            }}
          >
            SMS code
          </button>
        </div>
        {mode === "student" ? (
          <AuthMessage
            tone="info"
            title="Student first access"
            description="Your initial password is your admission number. For first access or recovery, choose SMS code, verify through the registered guardian phone, then create a private password."
          />
        ) : null}
        {mode === "parent" ? (
          <AuthMessage
            tone="info"
            title="Verified family access"
            description="Use any linked child admission number. For first access or recovery, choose SMS code, verify the guardian phone registered by the school, then create a private parent password."
          />
        ) : null}

        <div className="space-y-4">
          <AuthField
            label={usesLinkedAccess ? (mode === "student" ? "Admission number" : "Child admission number") : loginMode === "otp" ? "Phone number or email" : copy.identifierLabel}
            autoComplete={loginMode === "otp" ? "username" : "email"}
            {...register("identifier")}
            error={errors.identifier?.message}
          />
          {usesLinkedAccess && loginMode === "otp" && !challengeId ? (
            <AuthField
              label="Registered guardian phone"
              autoComplete="tel"
              {...register("guardianPhone")}
              error={errors.guardianPhone?.message}
            />
          ) : null}
          {loginMode === "password" || challengeId ? (
          <AuthPasswordField
            label={loginMode === "otp" && challengeId ? "Verification code" : copy.secretLabel}
            autoComplete={loginMode === "otp" ? "one-time-code" : acceptedInvite ? "new-password" : "current-password"}
            {...register("secret")}
            error={errors.secret?.message}
          />
          ) : null}
          {loginMode === "otp" && challengeId && passwordSetupRequired ? (
            <>
              <AuthPasswordField
                label="Create new password"
                autoComplete="new-password"
                {...register("newPassword")}
                hint="At least 10 characters with uppercase, lowercase, and a number."
              />
              <AuthPasswordField
                label="Confirm new password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
            </>
          ) : null}
        </div>

        {otpMessage ? (
          <AuthMessage tone="success" title="Verification code sent" description={otpMessage} />
        ) : null}

        {authSession.error || otpError ? (
          <AuthMessage
            tone="error"
            title="Portal sign-in failed"
            description={otpError ?? authSession.error ?? "Unable to sign in right now."}
          />
        ) : null}

        <AuthSubmitButton busy={isSubmitting || authSession.isSubmitting} type="submit">
          {loginMode === "otp"
            ? challengeId
              ? passwordSetupRequired
                ? "Verify and set password"
                : "Verify code"
              : "Send code"
            : copy.submitLabel}
        </AuthSubmitButton>

        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href="/portal/forgot-password"
            className="font-bold text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            Forgot password?
          </Link>
          <Link
            href="/login"
            className="font-bold text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            My Shule dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">Need the school side?</span>
          <Link
            href="/school/login"
            className="font-bold text-accent underline-offset-4 hover:underline"
          >
            School login
          </Link>
        </div>

        <div className="flex items-center justify-end text-sm">
          <span className="inline-flex items-center gap-2 text-muted">
            <Smartphone className="h-4 w-4" />
            Mobile optimized
          </span>
        </div>
      </form>
    </AuthCard>
  );
}
