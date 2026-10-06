"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BadgePercent,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileChartColumn,
  FileText,
  LayoutDashboard,
  Layers3,
  ReceiptText,
  Smartphone,
  WalletCards,
} from "lucide-react";

import { AccountantOverviewWorkspace } from "@/components/school/accountant/overview-workspace";
import { ArrearsWorkspace } from "@/components/school/accountant/arrears-workspace";
import { ExpensesWorkspace } from "@/components/school/accountant/expenses-workspace";
import { FeeStructuresWorkspace } from "@/components/school/accountant/fee-structures-workspace";
import { InvoicesWorkspace } from "@/components/school/accountant/invoices-workspace";
import { MPesaReconciliationWorkspace } from "@/components/school/accountant/m-pesa-reconciliation-workspace";
import { PaymentsWorkspace } from "@/components/school/accountant/payments-workspace";
import { SchoolPaymentChannels } from "@/components/school/accountant/payment-channels-workspace";
import { SchoolPaymentSetupSummary, usePaymentSetupSummary } from "@/components/school/accountant/payment-setup-summary";
import { CollectionsWorkspace } from "@/components/school/accountant/collections-workspace";
import { ReceiptsWorkspace } from "@/components/school/accountant/receipts-workspace";
import { ReportsWorkspace } from "@/components/school/accountant/reports-workspace";
import { WaiversDiscountsWorkspace } from "@/components/school/accountant/waivers-discounts-workspace";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import {
  IntegratedSchoolCommandHeader,
  SchoolCommandSidebarIdentity,
} from "@/components/school/integrated-school-command-header";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolNotificationBell } from "@/components/common/notifications/notification-bell";

import { buildSchoolSectionHref, type SchoolRouteMode } from "./school-pages";

type AccountantSection =
  | "overview"
  | "fee-structures"
  | "invoices"
  | "payments"
  | "payment-setup"
  | "collections"
  | "m-pesa-reconciliation"
  | "receipts"
  | "arrears"
  | "waivers-discounts"
  | "expenses"
  | "reports";

type AccountantNavItem = {
  id: AccountantSection;
  label: string;
  description: string;
  group: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const ACCOUNTANT_NAV_ITEMS: AccountantNavItem[] = [
  {
    id: "overview",
    label: "Today",
    description: "Live collections, balances, and exceptions",
    group: "Daily work",
    icon: LayoutDashboard,
  },
  {
    id: "fee-structures",
    label: "Fee Structures",
    description: "Configure school-owned charges",
    group: "Billing Setup",
    icon: Layers3,
  },
  { id: "payment-setup", label: "Payment Setup", description: "School accounts and Principal approval", group: "Billing Setup", icon: Banknote },
  { id: "collections", label: "Collections & exceptions", description: "Automatic payments, bank statements and matching", group: "Daily work", icon: Banknote },
  {
    id: "invoices",
    label: "Invoices & statements",
    description: "Generate and manage learner invoices",
    group: "Billing",
    icon: FileText,
  },
  {
    id: "payments",
    label: "Cash & cheques",
    description: "Record receipts and confirm cheque clearance",
    group: "Daily work",
    icon: Banknote,
  },
  {
    id: "m-pesa-reconciliation",
    label: "M-Pesa Reconciliation",
    description: "Match callbacks and resolve exceptions",
    group: "Controls",
    icon: Smartphone,
  },
  {
    id: "receipts",
    label: "Receipts",
    description: "Preview, download, and print receipts",
    group: "Daily work",
    icon: ReceiptText,
  },
  {
    id: "arrears",
    label: "Arrears",
    description: "Review balances and contact guardians",
    group: "Controls",
    icon: CircleDollarSign,
  },
  {
    id: "waivers-discounts",
    label: "Waivers & Discounts",
    description: "Govern adjustments and approvals",
    group: "Controls",
    icon: BadgePercent,
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Track school expenditure records",
    group: "Controls",
    icon: WalletCards,
  },
  {
    id: "reports",
    label: "Finance Reports",
    description: "Preview and export school finance reports",
    group: "Reporting",
    icon: FileChartColumn,
  },
];

const ACCOUNTANT_SECTION_ALIASES: Record<string, AccountantSection> = {
  dashboard: "overview",
  finance: "overview",
  "finance-overview": "overview",
  fees: "collections",
  mpesa: "m-pesa-reconciliation",
  waivers: "waivers-discounts",
};

function normalizeAccountantSection(section?: string): AccountantSection {
  const normalized = String(section || "overview").trim().toLowerCase();
  const aliased = ACCOUNTANT_SECTION_ALIASES[normalized] ?? normalized;
  return ACCOUNTANT_NAV_ITEMS.some((item) => item.id === aliased)
    ? (aliased as AccountantSection)
    : "overview";
}

export function AccountantCommandCenter({
  routeMode = "hosted",
  activeSection,
  role,
  tenantSlug,
  userLabel,
}: {
  routeMode?: SchoolRouteMode;
  activeSection?: string;
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  userLabel?: string | null;
}) {
  const [activeWorkspace, setActiveWorkspace] = useState<AccountantSection>(
    normalizeAccountantSection(activeSection),
  );
  const roleTitle = role === "bursar" ? "Bursar Dashboard" : "Accountant Dashboard";
  const roleLabel = role === "bursar" ? "Bursar" : "Accountant";
  const paymentSetup = usePaymentSetupSummary();
  useEffect(() => {
    setActiveWorkspace(normalizeAccountantSection(activeSection));
  }, [activeSection]);

  useEffect(() => {
    const restoreWorkspace = () => {
      const root = routeMode === "public" ? `/school/${role}` : "";
      const pathname = window.location.pathname;
      if (root && pathname !== root && !pathname.startsWith(`${root}/`)) return;
      const section = pathname.slice(root.length).replace(/^\//, "") || "overview";
      if (ACCOUNTANT_NAV_ITEMS.some((item) => item.id === section) || section in ACCOUNTANT_SECTION_ALIASES) {
        setActiveWorkspace(normalizeAccountantSection(section));
      }
    };
    window.addEventListener("popstate", restoreWorkspace);
    return () => window.removeEventListener("popstate", restoreWorkspace);
  }, [role, routeMode]);

  const groupedNavItems = useMemo(
    () =>
      ACCOUNTANT_NAV_ITEMS.reduce<Record<string, AccountantNavItem[]>>((groups, item) => {
        groups[item.group] = [...(groups[item.group] ?? []), item];
        return groups;
      }, {}),
    [],
  );

  const navigateTo = (section: AccountantSection) => {
    setActiveWorkspace(section);
    const href = buildSchoolSectionHref(role, section, routeMode);
    // All finance workspaces already live in this authorized client shell.
    // Native history keeps deep links/back/forward without remounting the page,
    // repeating requests or reconnecting the school's realtime stream.
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
  };

  const workspace = (() => {
    switch (activeWorkspace) {
      case "fee-structures":
        return (
          <FeeStructuresWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="fee-structures"
          />
        );
      case "invoices":
        return (
          <InvoicesWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="invoices"
            onNavigate={(section) => navigateTo(normalizeAccountantSection(section))}
          />
        );
      case "payment-setup":
        return <SchoolPaymentChannels mode="request" />;
      case "collections":
        return <CollectionsWorkspace tenantSlug={tenantSlug} />;
      case "payments":
        return (
          <PaymentsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="payments"
            onNavigate={(section) => navigateTo(normalizeAccountantSection(section))}
          />
        );
      case "m-pesa-reconciliation":
        return <MPesaReconciliationWorkspace role={role} tenantSlug={tenantSlug} onNavigate={(section) => navigateTo(normalizeAccountantSection(section))} />;
      case "receipts":
        return (
          <ReceiptsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="receipts"
            onNavigate={(section) => navigateTo(normalizeAccountantSection(section))}
          />
        );
      case "arrears":
        return (
          <ArrearsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="arrears"
          />
        );
      case "waivers-discounts":
        return (
          <WaiversDiscountsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="waivers-discounts"
          />
        );
      case "expenses":
        return <ExpensesWorkspace />;
      case "reports":
        return (
          <ReportsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="reports"
          />
        );
      case "overview":
      default:
        return <div className="space-y-5"><AccountantOverviewWorkspace onNavigate={(section) => navigateTo(normalizeAccountantSection(section))} /><SchoolPaymentSetupSummary onOpen={() => navigateTo("payment-setup")} /></div>;
    }
  })();

  const activeItem =
    ACCOUNTANT_NAV_ITEMS.find((item) => item.id === activeWorkspace)
    ?? ACCOUNTANT_NAV_ITEMS[0];

  return (
    <div
      data-route-mode={routeMode}
      data-testid="accountant-command-center"
      className="authenticated-app app-padded min-h-dvh bg-background p-3 md:p-5"
    >
      <div className="mx-auto grid max-w-[1800px] gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden h-[calc(100dvh-40px)] rounded-xl border border-border bg-surface p-3 text-foreground xl:sticky xl:top-5 xl:flex xl:flex-col">
          <SchoolCommandSidebarIdentity
            tone="light"
            eyebrow="Finance command"
            title={roleLabel}
            subtitle="School finance"
            icon={ChartNoAxesCombined}
          />
          <nav className="dashboard-navigation flex-1 space-y-5 overflow-y-auto pr-1" aria-label={`${roleLabel} workspace navigation`}>
            {Object.entries(groupedNavItems).map(([group, items]) => (
              <div key={group}>
                <p className="dashboard-nav-group">
                  {group}
                </p>
                <div className="mt-2 grid gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeWorkspace;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className="dashboard-nav-item"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
                        <span className="min-w-0">
                          <span className="dashboard-nav-label">{item.label}{item.id === "payment-setup" && Boolean(paymentSetup.data?.attention) ? ` (${paymentSetup.data!.attention} follow-up)` : ""}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          <IntegratedSchoolCommandHeader
            roleTitle={roleTitle}
            fallbackUserLabel={userLabel?.trim() || roleLabel}
            actions={(
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <SchoolNotificationBell basePath={routeMode === "public" ? `/school/${role}` : ""} />
                <button
                  type="button"
                  onClick={() => navigateTo("payments")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white hover:bg-[#0B2D6F]"
                >
                  <Banknote className="h-4 w-4" aria-hidden={true} />
                  Record cash / cheque
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("collections")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-strong bg-white px-4 text-sm font-black text-foreground hover:bg-surface-muted"
                >
                  <Smartphone className="h-4 w-4" aria-hidden={true} />
                  Review collections
                </button>
              </div>
            )}
          />

          <div className="xl:hidden">
            <MobileWorkspaceNavigation
              label="Finance workspace"
              items={ACCOUNTANT_NAV_ITEMS}
              value={activeWorkspace}
              onValueChange={(value) => navigateTo(value as AccountantSection)}
              testId="accountant-mobile-workspace-nav"
            />
          </div>

          <section className="app-finance-canvas space-y-4">
            <div className="app-workspace-heading mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Live school finance
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">{activeItem.label}</h2>
              <p className="mt-1 text-sm text-muted">{activeItem.description}</p>
            </div>
            {workspace}
          </section>
        </main>
      </div>
    </div>
  );
}
