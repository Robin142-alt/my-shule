import { notFound, redirect } from "next/navigation";

import { SchoolPages } from "@/components/school/school-pages";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { readSchoolRequestContext } from "@/lib/routing/experience-context";
import { isSchoolSection, type SchoolSection } from "@/lib/routing/experience-routes";
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
  } else if (!isSchoolSection(section) || !isProductionReadyModule(section)) {
    notFound();
  }

  return (
    <SchoolPages
      role={context.role}
      section={section as SchoolSection}
      tenantSlug={context.tenantSlug}
      sessionVerificationEnabled
    />
  );
}
