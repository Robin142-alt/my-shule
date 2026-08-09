import { redirect } from "next/navigation";
import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";

export default async function DashboardRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  if (role === "parent") {
    redirect("/portal/parent");
  }

  if (isSchoolExperienceRole(role)) {
    redirect(`/school/${normalizeSchoolExperienceRole(role)}`);
  }

  redirect("/forbidden");
}
