import { notFound, redirect } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  canRoleAccessModule,
  doesModuleExist,
  isDashboardRole,
} from "@/lib/dashboard/role-config";

export default async function DashboardModulePage({
  params,
}: {
  params: Promise<{ role: string; module: string }>;
}) {
  const { role, module } = await params;

  if (!isDashboardRole(role)) {
    notFound();
  }

  if (!doesModuleExist(module)) {
    notFound();
  }

  if (!canRoleAccessModule(role, module)) {
    redirect(`/dashboard/${role}`);
  }

  return <DashboardLayout role={role} moduleName={module} />;
}
