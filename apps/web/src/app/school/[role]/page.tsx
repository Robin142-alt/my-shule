import { notFound } from "next/navigation";

import { SchoolPages } from "@/components/school/school-pages";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

const allowedRoles = ["principal", "bursar", "teacher", "admin"] as const;

export default async function SchoolRoleHomePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  if (!allowedRoles.includes(role as SchoolExperienceRole)) {
    notFound();
  }

  return <SchoolPages role={role as SchoolExperienceRole} />;
}
