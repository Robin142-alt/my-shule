import { notFound, redirect } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { canRoleAccessModule, isDashboardRole } from "@/lib/dashboard/role-config";

export default async function StudentProfileRoute({
  params,
}: {
  params: Promise<{ role: string; studentId: string }>;
}) {
  const { role, studentId } = await params;

  if (!isDashboardRole(role)) {
    notFound();
  }

  if (!canRoleAccessModule(role, "students")) {
    redirect(`/dashboard/${role}`);
  }

  return (
    <DashboardLayout
      role={role}
      moduleName="students"
      studentId={studentId}
    />
  );
}
