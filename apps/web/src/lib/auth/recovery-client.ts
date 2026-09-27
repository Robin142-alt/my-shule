import { authFetch } from "@/lib/auth/auth-fetch";
import { getCsrfToken } from "@/lib/auth/csrf-client";

type RecoveryAudience = "superadmin" | "school" | "portal";

type RecoveryRequestInput = {
  audience: RecoveryAudience;
  identifier: string;
  tenantSlug?: string | null;
};

type PasswordResetInput = {
  audience: RecoveryAudience;
  token: string;
  password: string;
  tenantSlug?: string | null;
};

async function postRecoveryAction(
  path: string,
  body: Record<string, unknown>,
) {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; success?: boolean }
    | null;

  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message ?? "Unable to complete this recovery request.");
  }

  return payload;
}

export function requestPasswordRecovery(input: RecoveryRequestInput) {
  return postRecoveryAction("/api/auth/password-recovery/request", input);
}

export function resetPassword(input: PasswordResetInput) {
  return postRecoveryAction("/api/auth/password-recovery/reset", input);
}
