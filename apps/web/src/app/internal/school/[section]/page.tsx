import { notFound, redirect } from "next/navigation";

import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";
import { readSchoolRequestContext } from "@/lib/routing/experience-context";
import { isDeputyWorkspace, resolveDeputyWorkspace } from "@/lib/routing/deputy-workspaces";

export default async function InternalSchoolSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const context = await readSchoolRequestContext();
  const { section } = await params;

  if (context.role === "principal" && section === "attendance") {
    redirect("/attendance-monitoring");
  }

  if (context.role === "deputy-principal") {
    if (!isDeputyWorkspace(section)) notFound();
    const currentSection = resolveDeputyWorkspace(section);
    if (currentSection !== section) redirect(`/${currentSection}`);
  } else if (!isSchoolWorkspaceSection(context.role, section)) {
    notFound();
  }

  return null; // The persistent school layout renders the selected workspace.
}
