import { readSchoolRequestContext } from "@/lib/routing/experience-context";

export default async function InternalSchoolStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const context = await readSchoolRequestContext();
  const { studentId } = await params;

  return null; // The persistent school layout renders the selected workspace.
}
