import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailView } from "@/components/auth/email-verification-view";
import { readResetToken, type ResetSearchParams } from "@/lib/auth/reset-token";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: ResetSearchParams;
}) {
  const initialToken = await readResetToken(searchParams);

  return (
    <AuthShell>
      <VerifyEmailView initialToken={initialToken} />
    </AuthShell>
  );
}
