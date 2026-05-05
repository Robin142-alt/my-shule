import { notFound } from "next/navigation";

import { PortalPages } from "@/components/portal/portal-pages";
import type { PortalViewer } from "@/lib/experiences/types";

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

  return <PortalPages viewer={viewer as PortalViewer} />;
}
