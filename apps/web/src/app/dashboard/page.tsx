import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readExperienceSessionCookie } from "@/lib/auth/server-session";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const schoolSession = readExperienceSessionCookie(cookieStore, "school");

  if (schoolSession?.experience === "school") {
    redirect(`/school/${schoolSession.role}`);
  }

  const portalSession = readExperienceSessionCookie(cookieStore, "portal");

  if (portalSession?.experience === "portal") {
    redirect(`/portal/${portalSession.viewer}`);
  }

  const superadminSession = readExperienceSessionCookie(cookieStore, "superadmin");

  if (superadminSession?.experience === "superadmin") {
    redirect("/superadmin");
  }

  redirect("/login");
}
