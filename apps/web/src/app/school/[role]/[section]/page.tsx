import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { SchoolPages } from "@/components/school/school-pages";
import { readAccessCookie } from "@/lib/auth/server-session";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { readPublicSchoolSession } from "@/lib/routing/public-experience-session";
import { isSchoolSection } from "@/lib/routing/experience-routes";

const allowedRoles = [
  "principal",
  "deputy-principal",
  "secretary",
  "bursar",
  "accountant",
  "teacher",
  "dean-academics",
  "exams-manager",
  "hod",
  "class-teacher",
  "grade-master",
  "admin",
  "student",
  "storekeeper",
  "admissions",
  "librarian",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "ict-manager",
  "laboratory-technician",
  "guidance-counselling",
  "discipline-master",
  "procurement-officer",
] as const;
export default async function SchoolSectionPage({
  params,
}: {
  params: Promise<{ role: string; section: string }>;
}) {
  const { role, section } = await params;

  if (!allowedRoles.includes(role as SchoolExperienceRole)) {
    notFound();
  }

  if (!isSchoolSection(section) || !isProductionReadyModule(section)) {
    notFound();
  }

  const session = await readPublicSchoolSession(role as SchoolExperienceRole, {
    preserveSection: section,
  });
  const cookieStore = await cookies();
  const liveDataEnabled = Boolean(readAccessCookie(cookieStore));

  return (
    <SchoolPages
      role={session.role}
      section={section}
      tenantSlug={session.tenantSlug}
      routeMode="public"
      liveDataEnabled={liveDataEnabled}
    />
  );
}
