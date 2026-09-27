"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { useExperienceSession } from "@/lib/auth/use-experience-session";

const credentialsSchema = z.object({
  email: z.string().email("Enter your platform email address."),
  password: z.string().min(8, "Enter your platform password."),
});

export function SuperadminLoginView({
  variant = "platform",
}: {
  variant?: "platform" | "support";
}) {
  const router = useRouter();
  useEffect(() => {
    clearMfaLoginChallenge();
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const authSession = useExperienceSession("superadmin");
  const copy =
    variant === "support"
      ? {
          title: "Support sign in",
          description: "Enter your MyShule support email and password.",
        }
      : {
          title: "Welcome back",
          description: "Sign in to MyShule administration.",
        };
  const submitCredentials = async (form?: HTMLFormElement | null) => {
    const emailInput = form?.elements.namedItem("email");
    const passwordInput = form?.elements.namedItem("password");
    const nextEmail =
      emailInput instanceof HTMLInputElement
        ? emailInput.value.trim()
        : email.trim();
    const nextPassword =
      passwordInput instanceof HTMLInputElement
        ? passwordInput.value
        : password;
    const parsed = credentialsSchema.safeParse({
      email: nextEmail,
      password: nextPassword,
    });

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flattened.email?.[0] ?? "",
        password: flattened.password?.[0] ?? "",
      });
      return;
    }

    setFieldErrors({});
    setGeneralError(null);

    try {
      const result = await authSession.login({
        identifier: nextEmail,
        password: nextPassword,
        rememberSession,
      });
      void router.push(result.redirectTo ?? "/superadmin");
    } catch (loginError) {
      if (isMfaChallengeRequiredError(loginError)) {
        storeMfaLoginChallenge({
          audience: "superadmin",
          identifier: nextEmail,
          password: nextPassword,
          tenantSlug: null,
          redirectFallback: "/superadmin",
          rememberSession,
        });
        setGeneralError(null);
        void router.push(buildMfaVerificationPath("superadmin"));
        return;
      }

      setGeneralError(
        loginError instanceof Error
          ? loginError.message
          : "We could not complete this secure sign-in.",
      );
    }
  };

  return (
    <AuthCard>
      <div className="space-y-5">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-foreground">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {copy.description}
            </p>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCredentials(event.currentTarget);
          }}
        >
          <div className="space-y-4">
            <AuthField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              error={fieldErrors.email || undefined}
            />
            <AuthPasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              error={fieldErrors.password || undefined}
            />
          </div>

          <div className="auth-actions">
            <AuthCheckbox
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
              label="Keep me signed in"
            />
            <Link
              href="/superadmin/forgot-password"
              className="text-sm font-bold text-accent underline-offset-4 hover:text-orange-300 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {generalError ? (
            <AuthMessage
              tone="error"
              title="Sign-in blocked"
              description={generalError}
            />
          ) : null}

          <AuthSubmitButton busy={authSession.isSubmitting} type="submit">
            Sign in
          </AuthSubmitButton>
        </form>
        <Link href="/login?expired=1" className="text-sm font-medium">
          Use another account
        </Link>
      </div>
    </AuthCard>
  );
}
