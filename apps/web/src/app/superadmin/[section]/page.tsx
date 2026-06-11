import { notFound } from "next/navigation";

import { SuperadminPages } from "@/components/platform/superadmin-pages";
import { readPublicSuperadminSession } from "@/lib/routing/public-experience-session";
import type { SuperadminSection } from "@/lib/routing/experience-routes";
import { isSuperadminPublicSection } from "@/lib/routing/superadmin-sections";

export default async function SuperadminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await readPublicSuperadminSession();

  const { section } = await params;

  if (!isSuperadminPublicSection(section)) {
    notFound();
  }

  const mappedSection = section as SuperadminSection;

  return <SuperadminPages section={mappedSection} routeMode="public" />;
}
