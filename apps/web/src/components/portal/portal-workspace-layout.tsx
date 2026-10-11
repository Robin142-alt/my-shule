"use client";
import type { ComponentProps, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PortalPages } from "./portal-pages";
import { WorkspaceNavigation, workspaceSection } from "@/lib/routing/workspace-navigation";
import { useExperienceSession } from "@/lib/auth/use-experience-session";
import { WorkspaceLoading } from "@/components/shared/workspace-loading";

export function PortalWorkspaceLayout({ children, ...props }: ComponentProps<typeof PortalPages> & { children: ReactNode }) {
  const scope = { kind: "portal" as const, role: props.viewer, mode: props.routeMode ?? "hosted" as const };
  const section = workspaceSection(usePathname(), scope);
  const auth = useExperienceSession("portal", { autoLoad: section !== null });
  if (section === null) return children;
  if (!auth.session) return auth.error ? <div role="alert" className="p-6">{auth.error}<button type="button" onClick={() => { void auth.reloadSession().catch(() => undefined); }}>Retry session verification</button></div> : <WorkspaceLoading />;
  const viewer = auth.session.viewer === "student" ? "student" : "parent";
  if (scope.mode === "public" && viewer !== props.viewer) return <div role="alert" className="p-6">This portal does not match your signed-in account.</div>;
  return <WorkspaceNavigation scope={{ ...scope, role: viewer }}>{children}<PortalPages {...props} key={`${auth.user?.user_id}:${auth.session.tenantSlug}:${viewer}`} viewer={viewer} tenantSlug={auth.session.tenantSlug} userLabel={auth.session.userLabel} section={section} /></WorkspaceNavigation>;
}
