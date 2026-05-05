import { notFound } from "next/navigation";

import { PortalPages } from "@/components/portal/portal-pages";
import { getPortalWorkspace } from "@/lib/experiences/portal-data";
import type { PortalViewer } from "@/lib/experiences/types";

const allowedViewers = ["parent", "student"] as const;

export default async function PortalSectionPage({
  params,
}: {
  params: Promise<{ viewer: string; section: string }>;
}) {
  const { viewer, section } = await params;

  if (!allowedViewers.includes(viewer as PortalViewer)) {
    notFound();
  }

  const typedViewer = viewer as PortalViewer;
  const navItems = getPortalWorkspace(typedViewer).navItems;
  const activeHref = `/portal/${typedViewer}/${section}`;

  if (!navItems.some((item) => item.href === activeHref)) {
    notFound();
  }

  return <PortalPages viewer={typedViewer} section={section} />;
}
