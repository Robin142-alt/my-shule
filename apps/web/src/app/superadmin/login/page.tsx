import { AuthShell } from "@/components/auth/auth-shell";
import { SuperadminLoginView } from "@/components/auth/superadmin-login-view";

export default function SuperadminLoginPage() {
  return (
    <AuthShell>
      <SuperadminLoginView />
    </AuthShell>
  );
}
