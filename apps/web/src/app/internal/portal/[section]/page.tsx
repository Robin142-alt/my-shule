import { notFound } from "next/navigation";

import { readPortalRequestContext } from "@/lib/routing/experience-context";
import { isPortalSection } from "@/lib/routing/experience-routes";

export default async function InternalPortalSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await readPortalRequestContext();
  const { section } = await params;

  if (!isPortalSection(section)) {
    notFound();
  }

  return null; // The persistent portal layout owns workspace rendering.
}
