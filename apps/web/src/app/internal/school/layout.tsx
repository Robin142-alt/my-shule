import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { parseExperienceSession, SCHOOL_SESSION_COOKIE } from "@/lib/auth/experience-routing";
import { SchoolWorkspaceLayout } from "@/components/school/school-workspace-layout";

export default async function HostedSchoolLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const session = parseExperienceSession("school", store.get(SCHOOL_SESSION_COOKIE)?.value);
  const school = session?.experience === "school" ? session : null;
  return <SchoolWorkspaceLayout role={school?.role ?? "admin"} tenantSlug={school?.tenantSlug} userLabel={school?.userLabel}
    routeMode="hosted" liveDataEnabled sessionVerificationEnabled>{children}</SchoolWorkspaceLayout>;
}
