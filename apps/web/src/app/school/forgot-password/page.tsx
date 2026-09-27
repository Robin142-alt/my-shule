import { headers } from "next/headers";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordView } from "@/components/auth/auth-recovery-view";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";

export default async function SchoolForgotPasswordPage() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");
  const resolution = resolveSchoolBranding(host);

  return (
    <AuthShell>
      <ForgotPasswordView
        title="Forgot password?"
        subtitle="Enter your account email to request a reset link."
        identifierLabel="Email address"
        identifierPlaceholder="Email address on your school account"
        submitLabel="Send reset link"
        backHref="/school/login"
        successMessage="If the details match a school account, reset instructions are on the way."
        audience="school"
        tenantSlug={resolution.requestedSlug}
      />
    </AuthShell>
  );
}
