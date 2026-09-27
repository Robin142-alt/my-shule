import { AuthShell } from "@/components/auth/auth-shell";
import { PortalLoginView } from "@/components/auth/portal-login-view";

export default function InternalPortalLoginPage() {
  return (
    <AuthShell>
      <PortalLoginView />
    </AuthShell>
  );
}
