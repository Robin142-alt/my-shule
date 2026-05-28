import { redirect } from "next/navigation";

export default async function LibrarianLibrarySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  redirect(section === "dashboard" ? "/school/librarian" : "/school/librarian/library");
}
