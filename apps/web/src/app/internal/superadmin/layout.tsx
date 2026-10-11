import type { ReactNode } from "react";
import { PlatformWorkspaceLayout } from "@/components/platform/platform-workspace-layout";
export default async function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformWorkspaceLayout routeMode="hosted">{children}</PlatformWorkspaceLayout>;
}
