import { redirect } from "next/navigation";

export default async function StorekeeperInventorySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  redirect(section === "dashboard" ? "/school/storekeeper" : "/school/storekeeper/inventory");
}
