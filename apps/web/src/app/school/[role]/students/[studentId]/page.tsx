import { notFound } from "next/navigation";

import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

const allowedRoles = ["principal", "bursar", "teacher", "admin"] as const;

export default async function SchoolStudentProfilePage({
  params,
}: {
  params: Promise<{ role: string; studentId: string }>;
}) {
  const { role, studentId } = await params;

  if (!allowedRoles.includes(role as SchoolExperienceRole)) {
    notFound();
  }

  const typedRole = role as SchoolExperienceRole;
  const studentExists = getSchoolWorkspace(typedRole).model.studentProfiles.some(
    (entry) => entry.id === studentId,
  );

  if (!studentExists) {
    notFound();
  }

  return <SchoolPages role={typedRole} section="students" studentId={studentId} />;
}
