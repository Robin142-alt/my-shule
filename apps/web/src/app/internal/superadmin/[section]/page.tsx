import { notFound } from "next/navigation";

import { readPlatformRequestContext } from "@/lib/routing/experience-context";
import {
  isSuperadminSection,
} from "@/lib/routing/experience-routes";

export default async function InternalSuperadminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await readPlatformRequestContext();

  const { section } = await params;

  if (section !== "dashboard" && section !== "users" && !isSuperadminSection(section)) {
    notFound();
  }


  return null; // The persistent platform layout owns workspace rendering.
}
