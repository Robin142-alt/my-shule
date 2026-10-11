import { notFound } from "next/navigation";

import { readPublicSuperadminSession } from "@/lib/routing/public-experience-session";
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


  return null; // The persistent platform layout owns workspace rendering.
}
