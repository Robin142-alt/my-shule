"use client";

import { FeeStructuresWorkspace } from "@/components/school/accountant/fee-structures-workspace";
import { InvoicesWorkspace } from "@/components/school/accountant/invoices-workspace";
import { PaymentsWorkspace } from "@/components/school/accountant/payments-workspace";
import { MPesaReconciliationWorkspace } from "@/components/school/accountant/m-pesa-reconciliation-workspace";
import { ExpensesWorkspace } from "@/components/school/accountant/expenses-workspace";
import { ArrearsWorkspace } from "@/components/school/accountant/arrears-workspace";
import { ReceiptsWorkspace } from "@/components/school/accountant/receipts-workspace";
import { ReportsWorkspace } from "@/components/school/accountant/reports-workspace";
import { WaiversDiscountsWorkspace } from "@/components/school/accountant/waivers-discounts-workspace";
import { RoleOperationalWorkspace } from "@/components/school/role-operational-workspace";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { SchoolRouteMode } from "@/components/school/school-pages";
import { IntegratedSchoolCommandHeader } from "@/components/school/integrated-school-command-header";
import type { ReactNode } from "react";

function AccountantWorkspaceFrame({ role, children }: { role: SchoolExperienceRole; children: ReactNode }) {
  const roleTitle = role === "bursar" ? "Bursar Dashboard" : "Accountant Dashboard";
  const fallbackUserLabel = role === "bursar" ? "Bursar" : "Accountant";

  return (
    <div className="min-h-dvh space-y-5 bg-[#F3F6FA] p-4 lg:p-6">
      <IntegratedSchoolCommandHeader roleTitle={roleTitle} fallbackUserLabel={fallbackUserLabel} />
      {children}
    </div>
  );
}

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
    return <AccountantWorkspaceFrame role={role}><FeeStructuresWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="fee-structures" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "invoices") {
    return <AccountantWorkspaceFrame role={role}><InvoicesWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="invoices" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "payments" || activeSection === "finance") {
    return <AccountantWorkspaceFrame role={role}><PaymentsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="payments" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "mpesa" || activeSection === "m-pesa-reconciliation") {
    return <AccountantWorkspaceFrame role={role}><MPesaReconciliationWorkspace role={role} tenantSlug={tenantSlug} /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "expenses") {
    return <AccountantWorkspaceFrame role={role}><ExpensesWorkspace /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "arrears") {
    return <AccountantWorkspaceFrame role={role}><ArrearsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="arrears" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "receipts") {
    return <AccountantWorkspaceFrame role={role}><ReceiptsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="receipts" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "reports") {
    return <AccountantWorkspaceFrame role={role}><ReportsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="reports" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "waivers-discounts") {
    return <AccountantWorkspaceFrame role={role}><WaiversDiscountsWorkspace role={role} tenantSlug={tenantSlug} routeMode={routeMode ?? "hosted"} activeSection="waivers-discounts" /></AccountantWorkspaceFrame>;
  }
  if (activeSection === "overview") {
    return <RoleOperationalWorkspace role={role} initialSection="overview" tenantSlug={tenantSlug} routeMode={routeMode} />;
  }

  return <RoleOperationalWorkspace role={role} initialSection={activeSection ?? "overview"} tenantSlug={tenantSlug} routeMode={routeMode} />;
}
