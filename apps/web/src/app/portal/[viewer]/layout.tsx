import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { readPublicPortalSession } from "@/lib/routing/public-experience-session";
import { PortalWorkspaceLayout } from "@/components/portal/portal-workspace-layout";
export default async function PortalLayout({ children, params }: { children: ReactNode; params: Promise<{ viewer: string }> }) {
  const { viewer } = await params;
  if (viewer !== "parent" && viewer !== "student") notFound();
  const session = await readPublicPortalSession(viewer);
  return <PortalWorkspaceLayout viewer={session.viewer} tenantSlug={session.tenantSlug} userLabel={session.userLabel} routeMode="public">{children}</PortalWorkspaceLayout>;
}
