import { SystemMonitorDashboard } from "@/components/platform/system-monitor-dashboard";
import { readPublicSuperadminSession } from "@/lib/routing/public-experience-session";

export default async function SystemMonitorPage() {
  await readPublicSuperadminSession();
  return <SystemMonitorDashboard routeMode="public" />;
}
