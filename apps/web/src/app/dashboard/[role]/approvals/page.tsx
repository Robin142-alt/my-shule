import { redirect } from "next/navigation";
import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";

export default function LegacyDashboardApprovalsPage({
  params,
}: {
  params: { role: string };
}) {
  const role = params.role;

  if (role === "parent") {
    redirect("/portal/parent/approvals");
  }

  if (isSchoolExperienceRole(role)) {
    redirect(`/school/${normalizeSchoolExperienceRole(role)}/approvals`);
  }

  redirect("/forbidden");
}
