import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordView } from "@/components/auth/auth-recovery-view";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordView
        title="Forgot password?"
        subtitle="Enter your account email to request a reset link."
        identifierLabel="Email address"
        identifierPlaceholder="Enter your email address"
        submitLabel="Send reset link"
        backHref="/login"
        successMessage="If the account is eligible, recovery instructions have been sent to the verified channel."
        audience="school"
      />
    </AuthShell>
  );
}
