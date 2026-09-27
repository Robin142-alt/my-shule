import { headers } from "next/headers";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordView } from "@/components/auth/auth-recovery-view";
import { readResetToken, type ResetSearchParams } from "@/lib/auth/reset-token";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";

export default async function InternalSchoolResetPasswordPage({
  searchParams,
}: {
  searchParams?: ResetSearchParams;
}) {
  const requestHeaders = await headers();
  const initialToken = await readResetToken(searchParams);
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const resolution = resolveSchoolBranding(host);

  return (
    <AuthShell>
      <ResetPasswordView
        title="Create a new password"
        subtitle="Choose a password for your MyShule account."
        secretLabel="New password"
        secretPlaceholder="Create a new school password"
        backHref="/login"
        audience="school"
        tenantSlug={resolution.requestedSlug}
        initialToken={initialToken}
      />
    </AuthShell>
  );
}
