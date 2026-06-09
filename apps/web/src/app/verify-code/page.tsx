import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { MfaVerificationView } from "@/components/auth/mfa-verification-view";

export default function VerifyCodePage() {
  return (
    <AuthShell
      eyebrow="Verification code"
      heroTitle="Complete your secure sign-in."
      heroDescription="Use the one-time code sent to your email to finish opening the right My Shule workspace."
      badge="My Shule secure access"
      logoMark="SH"
        helper="Verification codes protect high-privilege sessions without exposing passwords or school data."
      highlights={[
        {
          id: "one-time-code",
          title: "One-time code",
          description: "Codes expire quickly and can only complete the login attempt that requested them.",
        },
        {
          id: "role-aware",
          title: "Role-aware access",
          description: "The final redirect still comes from the live authentication service.",
        },
        {
          id: "tenant-safe",
        title: "School-safe session",
        description: "School access remains scoped to the school resolved during sign-in.",
        },
      ]}
      trustNotes={[
        { id: "email-code", label: "Email code", icon: "shield" },
        { id: "audit", label: "Audit logged", icon: "check" },
        { id: "session", label: "Session managed", icon: "lock" },
      ]}
    >
      <Suspense fallback={<div className="min-h-[420px]" aria-busy="true" />}>
        <MfaVerificationView />
      </Suspense>
    </AuthShell>
  );
}
