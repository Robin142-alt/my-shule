import { notFound, redirect } from "next/navigation";

import { getSchoolRoleAlias } from "@/lib/auth/school-role-normalization";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";
import { readPublicSchoolSession } from "@/lib/routing/public-experience-session";
import { isDeputyWorkspace, resolveDeputyWorkspace } from "@/lib/routing/deputy-workspaces";

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
  "hos",
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
  const roleAlias = getSchoolRoleAlias(role);

  if (roleAlias) {
    redirect(`/school/${roleAlias}/${section}`);
  }

  if (!allowedRoles.includes(role as SchoolExperienceRole)) {
    notFound();
  }

  if (role === "principal" && section === "attendance") {
    redirect("/school/principal/attendance-monitoring");
  }

  if (role === "deputy-principal") {
    if (!isDeputyWorkspace(section)) notFound();
    const currentSection = resolveDeputyWorkspace(section);
    if (currentSection !== section) redirect(`/school/deputy-principal/${currentSection}`);
  } else if (!isSchoolWorkspaceSection(role, section)) {
    notFound();
  }

  await readPublicSchoolSession(role as SchoolExperienceRole, {
    preserveSection: section,
  });
  return null; // The persistent school layout renders the selected workspace.
}
