import { notFound, redirect } from "next/navigation";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";

export default async function LibrarianLibrarySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isSchoolWorkspaceSection("librarian", section)) notFound();
  redirect(section === "dashboard" ? "/school/librarian" : `/school/librarian/${section}`);
}
