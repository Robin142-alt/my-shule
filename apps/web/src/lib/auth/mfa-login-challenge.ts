import type { ExperienceAudience } from "@/lib/auth/experience-audience";

export const MFA_LOGIN_CHALLENGE_STORAGE_KEY = "myshule:mfa-login-challenge";

export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export type MfaLoginChallenge = {
  audience: ExperienceAudience;
  identifier: string;
  password: string;
  tenantSlug: string | null;
  redirectFallback: string;
  createdAt: number;
  rememberSession?: boolean;
};

type PendingMfaLoginChallenge = Omit<MfaLoginChallenge, "createdAt">;

let memoryChallenge: MfaLoginChallenge | null = null;
function hasSessionStorage() {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.sessionStorage !== "undefined"
    );
  } catch {
    return false;
  }
}

function isChallenge(value: unknown): value is MfaLoginChallenge {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<MfaLoginChallenge>;
  const audience = record.audience;

  return (
    (audience === "superadmin" ||
      audience === "school" ||
      audience === "portal") &&
    typeof record.identifier === "string" &&
    typeof record.password === "string" &&
    (typeof record.tenantSlug === "string" || record.tenantSlug === null) &&
    typeof record.redirectFallback === "string" &&
    typeof record.createdAt === "number"
  );
}

export function storeMfaLoginChallenge(challenge: PendingMfaLoginChallenge) {
  memoryChallenge = { ...challenge, createdAt: Date.now() };
  try {
    if (hasSessionStorage())
      window.sessionStorage.setItem(
        MFA_LOGIN_CHALLENGE_STORAGE_KEY,
        JSON.stringify(memoryChallenge),
      );
  } catch {
    /* Restricted storage can still finish this in-memory sign-in. */
  }
}

export function readMfaLoginChallenge() {
  let candidate: unknown = memoryChallenge;
  try {
    if (hasSessionStorage()) {
      const raw = window.sessionStorage.getItem(
        MFA_LOGIN_CHALLENGE_STORAGE_KEY,
      );
      candidate = raw ? JSON.parse(raw) : null;
    }
  } catch {
    /* Use the current in-memory attempt when storage is unavailable. */
  }
  if (
    !isChallenge(candidate) ||
    !Number.isFinite(candidate.createdAt) ||
    candidate.createdAt > Date.now() ||
    Date.now() - candidate.createdAt >= CHALLENGE_TTL_MS
  ) {
    clearMfaLoginChallenge();
    return null;
  }
  return candidate;
}

export function clearMfaLoginChallenge() {
  memoryChallenge = null;
  try {
    if (hasSessionStorage())
      window.sessionStorage.removeItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY);
  } catch {
    /* Nothing persistent is accessible in a restricted webview. */
  }
}

export function buildMfaVerificationPath(audience: ExperienceAudience) {
  return `/verify-code?audience=${encodeURIComponent(audience)}`;
}
