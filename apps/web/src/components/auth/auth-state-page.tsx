import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthStateView,
  type AuthStateKind,
} from "@/components/auth/auth-state-view";

export function AuthStatePage({ kind }: { kind: AuthStateKind }) {
  return (
    <AuthShell>
      <AuthStateView kind={kind} />
    </AuthShell>
  );
}
