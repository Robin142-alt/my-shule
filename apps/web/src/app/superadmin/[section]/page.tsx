import { notFound } from "next/navigation";

import { SuperadminPages } from "@/components/platform/superadmin-pages";

const allowedSections = new Set([
  "tenants",
  "revenue",
  "subscriptions",
  "mpesa-monitoring",
  "users",
  "support",
  "audit-logs",
  "infrastructure",
  "notifications",
  "settings",
]);

export default async function SuperadminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!allowedSections.has(section)) {
    notFound();
  }

  return <SuperadminPages section={section} />;
}
