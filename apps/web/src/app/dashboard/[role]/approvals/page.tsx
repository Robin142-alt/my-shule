import { redirect } from "next/navigation";
import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";

export default async function LegacyDashboardApprovalsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  if (role === "parent") {
    redirect("/portal/parent/approvals");
  }

  if (isSchoolExperienceRole(role)) {
    redirect(`/school/${normalizeSchoolExperienceRole(role)}/approvals`);
  }

  redirect("/forbidden");
}
