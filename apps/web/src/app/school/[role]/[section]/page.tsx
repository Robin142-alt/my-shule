import { notFound } from "next/navigation";

import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

const allowedRoles = ["principal", "bursar", "teacher", "admin"] as const;

export default async function SchoolSectionPage({
  params,
}: {
  params: Promise<{ role: string; section: string }>;
}) {
  const { role, section } = await params;

  if (!allowedRoles.includes(role as SchoolExperienceRole)) {
    notFound();
  }

  const typedRole = role as SchoolExperienceRole;
  const navItems = getSchoolWorkspace(typedRole).navItems;
  const activeHref = `/school/${typedRole}/${section}`;

  if (!navItems.some((item) => item.href === activeHref)) {
    notFound();
  }

  return <SchoolPages role={typedRole} section={section} />;
}
