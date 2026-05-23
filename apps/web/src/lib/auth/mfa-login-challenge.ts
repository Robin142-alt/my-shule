import type { ExperienceAudience } from "@/lib/auth/experience-audience";

export const MFA_LOGIN_CHALLENGE_STORAGE_KEY = "myshule:mfa-login-challenge";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export type MfaLoginChallenge = {
  audience: ExperienceAudience;
  identifier: string;
  password: string;
  tenantSlug: string | null;
  redirectFallback: string;
  createdAt: number;
};

type PendingMfaLoginChallenge = Omit<MfaLoginChallenge, "createdAt">;

function hasSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isChallenge(value: unknown): value is MfaLoginChallenge {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<MfaLoginChallenge>;
  const audience = record.audience;

  return (
    (audience === "superadmin" || audience === "school" || audience === "portal") &&
    typeof record.identifier === "string" &&
    typeof record.password === "string" &&
    (typeof record.tenantSlug === "string" || record.tenantSlug === null) &&
    typeof record.redirectFallback === "string" &&
    typeof record.createdAt === "number"
  );
}

export function storeMfaLoginChallenge(challenge: PendingMfaLoginChallenge) {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    MFA_LOGIN_CHALLENGE_STORAGE_KEY,
    JSON.stringify({
      ...challenge,
      createdAt: Date.now(),
    } satisfies MfaLoginChallenge),
  );
}

export function readMfaLoginChallenge() {
  if (!hasSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isChallenge(parsed) || Date.now() - parsed.createdAt > CHALLENGE_TTL_MS) {
      clearMfaLoginChallenge();
      return null;
    }

    return parsed;
  } catch {
    clearMfaLoginChallenge();
    return null;
  }
}

export function clearMfaLoginChallenge() {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY);
}

export function buildMfaVerificationPath(audience: ExperienceAudience) {
  return `/verify-code?audience=${encodeURIComponent(audience)}`;
}
