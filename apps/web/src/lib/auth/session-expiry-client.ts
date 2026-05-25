import type { ExperienceAudience } from "@/lib/auth/experience-audience";

const expiredSessionLoginPaths: Record<ExperienceAudience, string> = {
  superadmin: "/superadmin/login",
  school: "/school/login",
  portal: "/portal/login",
};

export class ExpiredSessionError extends Error {
  readonly audience: ExperienceAudience;

  constructor(audience: ExperienceAudience) {
    super("Your session expired. Sign in again to continue.");
    this.name = "ExpiredSessionError";
    this.audience = audience;
  }
}

export function getExpiredSessionLoginPath(audience: ExperienceAudience) {
  return `${expiredSessionLoginPaths[audience]}?expired=1`;
}

export function isExpiredSessionError(error: unknown): error is ExpiredSessionError {
  return error instanceof ExpiredSessionError;
}

export function redirectOnExpiredSessionResponse(
  response: Pick<Response, "status">,
  audience: ExperienceAudience,
  navigate: (href: string) => void,
) {
  if (response.status !== 401) {
    return false;
  }

  navigate(getExpiredSessionLoginPath(audience));
  return true;
}

export function redirectOnExpiredSessionError(
  error: unknown,
  fallbackAudience: ExperienceAudience,
  navigate: (href: string) => void,
) {
  if (!isExpiredSessionError(error)) {
    return false;
  }

  navigate(getExpiredSessionLoginPath(error.audience ?? fallbackAudience));
  return true;
}
