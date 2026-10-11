import { notFound } from "next/navigation";

import type { PortalViewer } from "@/lib/experiences/types";
import { readPublicPortalSession } from "@/lib/routing/public-experience-session";
import { isPortalSection } from "@/lib/routing/experience-routes";

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

  if (!isPortalSection(section)) {
    notFound();
  }

  await readPublicPortalSession(viewer as PortalViewer);
  return null; // The persistent portal layout owns workspace rendering.
}
