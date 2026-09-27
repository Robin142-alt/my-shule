import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordView } from "@/components/auth/auth-recovery-view";

export default function InternalPortalForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordView
        title="Forgot password?"
        subtitle="Enter your account email to request a reset link."
        identifierLabel="Email address"
        identifierPlaceholder="Email address on your portal account"
        submitLabel="Send reset link"
        backHref="/login"
        successMessage="If the details match a family or student account, recovery instructions have been sent."
        audience="portal"
      />
    </AuthShell>
  );
}
