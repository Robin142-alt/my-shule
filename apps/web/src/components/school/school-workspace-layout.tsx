"use client";

// CSS is small and shared by many appointed roles. Load it with the persistent
// shell so a lazy workspace's stylesheet cannot hold up subsequent selections.
import "./exams-manager/exam-analytics.module.css";
import "./dean-academics/dean-workspace.module.css";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SchoolPages, type SchoolPagesProps } from "./school-pages";
import { publicSchoolRole, workspaceSection, WorkspaceNavigation } from "@/lib/routing/workspace-navigation";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

/** Above the page segment: sidebar state, session, events and identity survive
 * workspace navigation. Page children still execute server route guards. */
export function SchoolWorkspaceLayout({ children, ...initial }: SchoolPagesProps & { children: ReactNode }) {
  const pathname = usePathname();
  const mode = initial.routeMode ?? "hosted";
  const { session } = useExperienceSession("school", {
    // Public /school addresses do not bind a tenant. Never reuse a layout's
    // initial routing cookie as identity after signing into another account.
    tenantSlug: mode === "hosted" ? initial.tenantSlug : undefined,
    autoLoad: mode === "public" ? publicSchoolRole(pathname) !== null : workspaceSection(pathname, { kind: "school", mode, role: initial.role }) !== null,
  });
  const role = mode === "public" ? publicSchoolRole(pathname) : session?.roleContext?.activeRole ?? initial.role;
  if (!role) return children;
  const scope = { kind: "school" as const, role, mode };
  const section = workspaceSection(pathname, scope);
  const prefix = mode === "public" ? `/school/${role}` : "";
  const studentId = pathname.startsWith(`${prefix}/students/`) ? pathname.slice(`${prefix}/students/`.length) : undefined;
  if (section === null && (!studentId || studentId.includes("/"))) return children;
  return <WorkspaceNavigation scope={scope}>
    {children}
    <SchoolPages {...initial} tenantSlug={mode === "public" ? undefined : initial.tenantSlug}
      userLabel={session?.userLabel ?? initial.userLabel} role={role} section={section ?? "students"} studentId={studentId} />
  </WorkspaceNavigation>;
}
