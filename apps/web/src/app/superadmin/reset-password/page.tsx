import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordView } from "@/components/auth/auth-recovery-view";
import { readResetToken, type ResetSearchParams } from "@/lib/auth/reset-token";

export default async function SuperadminResetPasswordPage({
  searchParams,
}: {
  searchParams?: ResetSearchParams;
}) {
  const initialToken = await readResetToken(searchParams);

  return (
    <AuthShell>
      <ResetPasswordView
        title="Create a new password"
        subtitle="Choose a password for your MyShule account."
        secretLabel="New password"
        secretPlaceholder="Create a strong platform password"
        backHref="/superadmin/login"
        audience="superadmin"
        initialToken={initialToken}
      />
    </AuthShell>
  );
}
