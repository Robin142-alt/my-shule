import { redirect } from "next/navigation";
import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";

export default async function DashboardRoleModulePage({
  params,
}: {
  params: Promise<{ role: string; module: string }>;
}) {
  const { role, module } = await params;

  if (role === "parent") {
    redirect(`/portal/parent/${module}`);
  }

  if (isSchoolExperienceRole(role)) {
    redirect(`/school/${normalizeSchoolExperienceRole(role)}/${module}`);
  }

  redirect("/forbidden");
}
