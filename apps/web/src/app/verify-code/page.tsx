import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { MfaVerificationView } from "@/components/auth/mfa-verification-view";

export default function VerifyCodePage() {
  return (
    <AuthShell>
      <Suspense fallback={<p role="status" className="text-sm text-muted">Opening verification…</p>}>
        <MfaVerificationView />
      </Suspense>
    </AuthShell>
  );
}
