import { redirect } from "next/navigation";
import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";

export default async function StudentProfileRoute({
  params,
}: {
  params: Promise<{ role: string; studentId: string }>;
}) {
  const { role, studentId } = await params;

  if (isSchoolExperienceRole(role)) {
    redirect(`/school/${normalizeSchoolExperienceRole(role)}/students/${studentId}`);
  }

  redirect("/forbidden");
}
