"use client";

import { useMemo, useState, type ComponentType } from "react";
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
import { ReceiptsWorkspace } from "@/components/school/accountant/receipts-workspace";
import { ReportsWorkspace } from "@/components/school/accountant/reports-workspace";
import { WaiversDiscountsWorkspace } from "@/components/school/accountant/waivers-discounts-workspace";
import {
  IntegratedSchoolCommandHeader,
  SchoolCommandSidebarIdentity,
} from "@/components/school/integrated-school-command-header";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";

import { buildSchoolSectionHref, type SchoolRouteMode } from "./school-pages";

type AccountantSection =
  | "overview"
  | "fee-structures"
  | "invoices"
  | "payments"
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
    label: "Finance Overview",
    description: "Live collections, balances, and exceptions",
    group: "Command Center",
    icon: LayoutDashboard,
  },
  {
    id: "fee-structures",
    label: "Fee Structures",
    description: "Configure school-owned charges",
    group: "Billing Setup",
    icon: Layers3,
  },
  {
    id: "invoices",
    label: "Student Invoices",
    description: "Generate and manage learner invoices",
    group: "Billing Setup",
    icon: FileText,
  },
  {
    id: "payments",
    label: "Payments",
    description: "Record and allocate fee payments",
    group: "Collections",
    icon: Banknote,
  },
  {
    id: "m-pesa-reconciliation",
    label: "M-Pesa Reconciliation",
    description: "Match callbacks and resolve exceptions",
    group: "Collections",
    icon: Smartphone,
  },
  {
    id: "receipts",
    label: "Receipts",
    description: "Preview, download, and print receipts",
    group: "Collections",
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
    window.history.replaceState(
      null,
      "",
      buildSchoolSectionHref(role, section, routeMode),
    );
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
          />
        );
      case "payments":
        return (
          <PaymentsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="payments"
          />
        );
      case "m-pesa-reconciliation":
        return <MPesaReconciliationWorkspace role={role} tenantSlug={tenantSlug} />;
      case "receipts":
        return (
          <ReceiptsWorkspace
            role={role}
            tenantSlug={tenantSlug}
            routeMode={routeMode}
            activeSection="receipts"
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
        return <AccountantOverviewWorkspace onNavigate={(section) => navigateTo(normalizeAccountantSection(section))} />;
    }
  })();

  const activeItem =
    ACCOUNTANT_NAV_ITEMS.find((item) => item.id === activeWorkspace)
    ?? ACCOUNTANT_NAV_ITEMS[0];

  return (
    <div
      data-route-mode={routeMode}
      data-testid="accountant-command-center"
      className="min-h-screen bg-[#F3F6FA] p-3 md:p-5"
    >
      <div className="mx-auto grid max-w-[1800px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden h-[calc(100vh-40px)] rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.24)] xl:sticky xl:top-5 xl:flex xl:flex-col">
          <SchoolCommandSidebarIdentity
            eyebrow="Finance command"
            title={roleLabel}
            subtitle="Billing, collections, reconciliation, controls, and reports"
            icon={ChartNoAxesCombined}
          />
          <nav className="flex-1 space-y-5 overflow-y-auto pr-1" aria-label={`${roleLabel} workspace navigation`}>
            {Object.entries(groupedNavItems).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
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
                        className={`flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive
                            ? "bg-white/15 text-white shadow-[inset_4px_0_0_#22D3EE]"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{item.label}</span>
                          <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-white/50">
                            {item.description}
                          </span>
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
                <button
                  type="button"
                  onClick={() => navigateTo("payments")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#071D49] px-4 text-sm font-black text-white hover:bg-[#0B2D6F]"
                >
                  <Banknote className="h-4 w-4" aria-hidden={true} />
                  Record payment
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("m-pesa-reconciliation")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC]"
                >
                  <Smartphone className="h-4 w-4" aria-hidden={true} />
                  Reconcile M-Pesa
                </button>
              </div>
            )}
          />

          <div className="rounded-xl border border-[#C8D5EA] bg-white p-3 shadow-sm xl:hidden">
            <label
              htmlFor="accountant-mobile-workspace"
              className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#5F6F89]"
            >
              Finance workspace
            </label>
            <select
              id="accountant-mobile-workspace"
              value={activeWorkspace}
              onChange={(event) => navigateTo(event.currentTarget.value as AccountantSection)}
              className="h-11 w-full rounded-lg border border-[#C8D5EA] bg-[#F8FAFC] px-3 text-sm font-bold text-[#071D49] outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            >
              {ACCOUNTANT_NAV_ITEMS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <section className="rounded-2xl bg-[#071D49] p-4 shadow-[0_24px_70px_rgba(7,29,73,0.18)] md:p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                Live school finance
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">{activeItem.label}</h2>
              <p className="mt-1 text-sm font-semibold text-white/62">{activeItem.description}</p>
            </div>
            {workspace}
          </section>
        </main>
      </div>
    </div>
  );
}
