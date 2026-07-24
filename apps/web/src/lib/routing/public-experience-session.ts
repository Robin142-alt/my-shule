import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  parseExperienceSession,
  PORTAL_SESSION_COOKIE,
  SCHOOL_SESSION_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
} from "@/lib/auth/experience-routing";
import {
  readAccessCookie,
  readTenantCookie,
  resolveSchoolTenantSlug,
} from "@/lib/auth/server-session";
import type { PortalViewer, SchoolExperienceRole } from "@/lib/experiences/types";
import {
  checkSchoolModuleAccess,
  type SchoolModuleAccessState,
} from "@/lib/module-access/server-school-module-access";

export async function readPublicSuperadminSession() {
  const cookieStore = await cookies();
  const session = parseExperienceSession(
    "superadmin",
    cookieStore.get(SUPERADMIN_SESSION_COOKIE)?.value,
  );

  if (!session || session.experience !== "superadmin") {
    redirect("/superadmin/login");
  }

  return session;
}

export async function readPublicSchoolSession(
  expectedRole?: SchoolExperienceRole,
  options?: { preserveSection?: string },
) {
  const cookieStore = await cookies();
  const session = parseExperienceSession(
    "school",
    cookieStore.get(SCHOOL_SESSION_COOKIE)?.value,
  );

  if (!session || session.experience !== "school") {
    redirect("/school/login");
  }

  if (expectedRole && session.role !== expectedRole) {
    const section = options?.preserveSection?.trim();

    redirect(`/school/${session.role}${section ? `/${section}` : ""}`);
  }

  return session;
}

export async function readStorekeeperInventorySession() {
  const cookieStore = await cookies();
  const session = parseExperienceSession(
    "school",
    cookieStore.get(SCHOOL_SESSION_COOKIE)?.value,
  );

  if (!session || session.experience !== "school") {
    redirect("/school/login");
  }

  if (session.role !== "storekeeper") {
    redirect("/forbidden");
  }

  return session;
}

export async function readLibrarianLibrarySession() {
  const cookieStore = await cookies();
  const session = parseExperienceSession(
    "school",
    cookieStore.get(SCHOOL_SESSION_COOKIE)?.value,
  );

  if (!session || session.experience !== "school") {
    redirect("/school/login");
  }

  if (session.role !== "librarian") {
    redirect("/forbidden");
  }

  const { tenantSlug: tenantId, tenantMismatch } = resolveSchoolTenantSlug({
    tenantCookie: readTenantCookie(cookieStore),
    sessionTenantSlug: session.tenantSlug,
  });

  if (tenantMismatch) {
    redirect("/forbidden");
  }

  const accessToken = readAccessCookie(cookieStore);
  const libraryModuleAccess: SchoolModuleAccessState = await checkSchoolModuleAccess({
    tenantId,
    accessToken,
    moduleCode: "library",
  });

  return {
    ...session,
    libraryModuleAccess,
  };
}

export async function readPublicPortalSession(expectedViewer?: PortalViewer) {
  const cookieStore = await cookies();
  const session = parseExperienceSession(
    "portal",
    cookieStore.get(PORTAL_SESSION_COOKIE)?.value,
  );

  if (!session || session.experience !== "portal") {
    redirect("/portal/login");
  }

  if (expectedViewer && session.viewer !== expectedViewer) {
    redirect(`/portal/${session.viewer}`);
  }

  return {
    ...session,
    tenantSlug: readTenantCookie(cookieStore)?.trim() || null,
  };
}
