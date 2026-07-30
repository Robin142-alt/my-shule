import {
  PORTAL_SESSION_COOKIE,
  SCHOOL_SESSION_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
} from "@/lib/auth/experience-routing";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";

export const ACCESS_COOKIE = "myshule_access";
export const REFRESH_COOKIE = "myshule_refresh";
export const AUDIENCE_COOKIE = "myshule_audience";
export const TENANT_COOKIE = "myshule_tenant";
export const REMEMBER_SESSION_COOKIE = "myshule_remember_session";

export function getExperienceSessionCookieName(audience: ExperienceAudience) {
  switch (audience) {
    case "superadmin":
      return SUPERADMIN_SESSION_COOKIE;
    case "school":
      return SCHOOL_SESSION_COOKIE;
    case "portal":
      return PORTAL_SESSION_COOKIE;
  }
}
