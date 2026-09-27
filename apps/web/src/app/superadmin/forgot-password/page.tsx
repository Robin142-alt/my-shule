import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordView } from "@/components/auth/auth-recovery-view";

export default function SuperadminForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordView
        title="Forgot password?"
        subtitle="Enter your account email to request a reset link."
        identifierLabel="Work email"
        identifierPlaceholder="Enter your work email"
        submitLabel="Send reset link"
        backHref="/superadmin/login"
        successMessage="If the email belongs to an authorized platform account, recovery instructions have been sent."
        audience="superadmin"
      />
    </AuthShell>
  );
}
