import { redirect } from "next/navigation";
import type { DashboardRole } from "@/lib/dashboard/types";

export default async function DashboardRolePage({ params }: { params: { role: DashboardRole } }) {
  void params;
  redirect("/forbidden");
}
