import { redirect } from "next/navigation";
import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";

export default async function DashboardRolePage({ params }: { params: { role: string } }) {
  const role = params.role;

  if (role === "parent") {
    redirect("/portal/parent");
  }

  if (isSchoolExperienceRole(role)) {
    redirect(`/school/${normalizeSchoolExperienceRole(role)}`);
  }

  redirect("/forbidden");
}
