import { notFound } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { isDashboardRole } from "@/lib/dashboard/role-config";

export default async function DashboardRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  if (!isDashboardRole(role)) {
    notFound();
  }

  return <DashboardLayout role={role} />;
}
