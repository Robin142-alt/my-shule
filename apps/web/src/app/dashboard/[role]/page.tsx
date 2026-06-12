import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardRole } from "@/lib/dashboard/types";

export default async function DashboardRolePage({ params }: { params: { role: DashboardRole } }) {
  if (params.role === "exam-manager") {
    redirect("/dashboard/exam-manager/overview");
  }
  if (params.role === "teacher") {
    redirect("/school/teacher");
  }
  return <DashboardLayout role={params.role} />;
}
