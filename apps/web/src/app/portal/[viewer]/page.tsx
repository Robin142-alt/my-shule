import { notFound } from "next/navigation";

import type { PortalViewer } from "@/lib/experiences/types";
import { readPublicPortalSession } from "@/lib/routing/public-experience-session";

const allowedViewers = ["parent", "student"] as const;

export default async function PortalViewerHomePage({
  params,
}: {
  params: Promise<{ viewer: string }>;
}) {
  const { viewer } = await params;

  if (!allowedViewers.includes(viewer as PortalViewer)) {
    notFound();
  }

  await readPublicPortalSession(viewer as PortalViewer);
  return null; // The persistent portal layout owns workspace rendering.
}
