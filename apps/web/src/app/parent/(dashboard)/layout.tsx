import { ReactNode } from "react";
import { ParentPortalShell } from "@/components/parent/parent-portal-shell";

export default function ParentDashboardLayout({ children }: { children: ReactNode }) {
  return <ParentPortalShell>{children}</ParentPortalShell>;
}
