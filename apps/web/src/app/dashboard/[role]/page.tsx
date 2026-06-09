import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardRole } from "@/lib/dashboard/types";

export default async function DashboardRolePage({ params }: { params: { role: DashboardRole } }) {
  return <DashboardLayout role={params.role} />;
}
