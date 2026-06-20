"use client";

import { DashboardEngine } from "@/components/dashboard/dashboard-engine";
import { FeeStructuresWorkspace } from "@/components/school/accountant/fee-structures-workspace";
import { InvoicesWorkspace } from "@/components/school/accountant/invoices-workspace";
import { PaymentsWorkspace } from "@/components/school/accountant/payments-workspace";
import { MPesaReconciliationWorkspace } from "@/components/school/accountant/m-pesa-reconciliation-workspace";
import { ExpensesWorkspace } from "@/components/school/accountant/expenses-workspace";
import { ArrearsWorkspace } from "@/components/school/accountant/arrears-workspace";
import { ReceiptsWorkspace } from "@/components/school/accountant/receipts-workspace";
import { ReportsWorkspace } from "@/components/school/accountant/reports-workspace";
import { WaiversDiscountsWorkspace } from "@/components/school/accountant/waivers-discounts-workspace";
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
  if (activeSection === "expenses") {
    return <ExpensesWorkspace />;
  }
  if (activeSection === "arrears") {
    return <ArrearsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="arrears" />;
  }
  if (activeSection === "receipts") {
    return <ReceiptsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="receipts" />;
  }
  if (activeSection === "reports") {
    return <ReportsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="reports" />;
  }
  if (activeSection === "waivers-discounts") {
    return <WaiversDiscountsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="waivers-discounts" />;
  }
  if (activeSection === "overview") {
    // We haven't built this one fully isolated, maybe just pass it down or show dashboard
    // The user didn't mention it explicitly but "Overview" might be the dashboard
    return <DashboardEngine role="accountant" />;
  }

  return <DashboardEngine role="accountant" />;
}
