"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SuperadminPages } from "./superadmin-pages";
import { WorkspaceNavigation, workspaceSection } from "@/lib/routing/workspace-navigation";

export function PlatformWorkspaceLayout({ children, routeMode = "public" }: { children: ReactNode; routeMode?: "hosted" | "public" }) {
  const scope = { kind: "superadmin" as const, mode: routeMode };
  const section = workspaceSection(usePathname(), scope);
  if (section === null) return children;
  return <WorkspaceNavigation scope={scope}>{children}<SuperadminPages section={section} routeMode={routeMode} /></WorkspaceNavigation>;
}
