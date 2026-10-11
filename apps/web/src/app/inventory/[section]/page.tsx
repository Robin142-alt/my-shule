import { notFound, redirect } from "next/navigation";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";

export default async function StorekeeperInventorySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isSchoolWorkspaceSection("storekeeper", section)) notFound();
  redirect(section === "dashboard" ? "/school/storekeeper" : `/school/storekeeper/${section}`);
}
