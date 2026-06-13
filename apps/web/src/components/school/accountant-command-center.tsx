"use client";

import { DashboardEngine } from "@/components/dashboard/dashboard-engine";
import { FeeStructuresWorkspace } from "@/components/school/accountant/fee-structures-workspace";
import { InvoicesWorkspace } from "@/components/school/accountant/invoices-workspace";
import { PaymentsWorkspace } from "@/components/school/accountant/payments-workspace";
import { MPesaReconciliationWorkspace } from "@/components/school/accountant/m-pesa-reconciliation-workspace";
import { OverviewWorkspace } from "@/components/school/accountant/overview-workspace";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { SchoolRouteMode } from "@/components/school/school-pages";

export function AccountantCommandCenter({ 
  routeMode,
  activeSection,
  role,
  tenantSlug
}: { 
  routeMode?: SchoolRouteMode;
  activeSection?: string;
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
}) {
  if (activeSection === "fee-structures") {
    return <FeeStructuresWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="fee-structures" />;
  }
  if (activeSection === "invoices") {
    return <InvoicesWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="invoices" />;
  }
  if (activeSection === "payments") {
    return <PaymentsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="payments" />;
  }
  if (activeSection === "mpesa") {
    return <MPesaReconciliationWorkspace role={role} tenantSlug={tenantSlug} />;
  }
  if (activeSection === "overview") {
    // We haven't built this one fully isolated, maybe just pass it down or show dashboard
    // The user didn't mention it explicitly but "Overview" might be the dashboard
    return <DashboardEngine role="accountant" />;
  }

  return <DashboardEngine role="accountant" />;
}
