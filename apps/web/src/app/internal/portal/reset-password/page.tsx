import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordView } from "@/components/auth/auth-recovery-view";
import { readResetToken, type ResetSearchParams } from "@/lib/auth/reset-token";

export default async function InternalPortalResetPasswordPage({
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
        secretPlaceholder="Create a new portal password"
        backHref="/login"
        audience="portal"
        initialToken={initialToken}
      />
    </AuthShell>
  );
}
