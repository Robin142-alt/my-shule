"use client";

import {
  BedDouble,
  Bell,
  ClipboardList,
  FileSpreadsheet,
  HeartPulse,
  LayoutGrid,
  Pill,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import { DispensingLogWorkspace } from "@/components/school/nurse/dispensing-log-workspace";
import { HealthReportsWorkspace } from "@/components/school/nurse/health-reports-workspace";
import { MedicineInventoryWorkspace } from "@/components/school/nurse/medicine-inventory-workspace";
import { OverviewWorkspace } from "@/components/school/nurse/overview-workspace";
import { ParentNotificationsWorkspace } from "@/components/school/nurse/parent-notifications-workspace";
import { SickBayQueueWorkspace } from "@/components/school/nurse/sick-bay-queue-workspace";
import { VisitsWorkspace } from "@/components/school/nurse/visits-workspace";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";

type NurseSection =
  | "overview"
  | "visits"
  | "sick-bay-queue"
  | "medicine-inventory"
  | "dispensing-log"
  | "parent-notifications"
  | "health-reports";

type NurseNavItem = {
  id: NurseSection;
  label: string;
  description: string;
  icon: LucideIcon;
};

const nurseNavItems: NurseNavItem[] = [
  { id: "overview", label: "Overview", description: "Clinic activity and alerts", icon: LayoutGrid },
  { id: "visits", label: "Visits", description: "Record and close health visits", icon: Stethoscope },
  { id: "sick-bay-queue", label: "Sick Bay Queue", description: "Admit and discharge students", icon: BedDouble },
  { id: "medicine-inventory", label: "Medicine Inventory", description: "Stock, expiry, and adjustments", icon: Pill },
  { id: "dispensing-log", label: "Dispensing Log", description: "Medicine issued to students", icon: ClipboardList },
  { id: "parent-notifications", label: "Parent Notifications", description: "Health alerts to guardians", icon: Bell },
  { id: "health-reports", label: "Health Reports", description: "Generate and download reports", icon: FileSpreadsheet },
];

function normalizeSection(section?: string): NurseSection {
  const normalized = String(section || "overview").trim().toLowerCase();
  return nurseNavItems.some((item) => item.id === normalized)
    ? (normalized as NurseSection)
    : "overview";
}

function renderWorkspace(section: NurseSection) {
  switch (section) {
    case "visits":
      return <VisitsWorkspace />;
    case "sick-bay-queue":
      return <SickBayQueueWorkspace />;
    case "medicine-inventory":
      return <MedicineInventoryWorkspace />;
    case "dispensing-log":
      return <DispensingLogWorkspace />;
    case "parent-notifications":
      return <ParentNotificationsWorkspace />;
    case "health-reports":
      return <HealthReportsWorkspace />;
    case "overview":
    default:
      return <OverviewWorkspace />;
  }
}

export function NurseCommandCenter({ activeSection }: { activeSection?: string }) {
  const section = normalizeSection(activeSection);
  const activeItem = nurseNavItems.find((item) => item.id === section) ?? nurseNavItems[0];

  return (
    <div className="flex min-h-screen bg-[#F3F6FA]">
      <aside className="hidden h-screen w-[280px] shrink-0 overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
        <SchoolCommandSidebarIdentity eyebrow="Health command" title="School Nurse" subtitle="Visits, medicine, incidents, and referrals" />
        <nav className="space-y-1" aria-label="Nurse workspace navigation">
          <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Health Centre</p>
          {nurseNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === section;
            return (
              <a
                key={item.id}
                href={`/school/nurse/${item.id}`}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  isActive
                    ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block font-black">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-white/55">{item.description}</span>
                </span>
              </a>
            );
          })}
        </nav>
      </aside>
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[84px] shrink-0 flex-col justify-center gap-1 border-b border-[#D8E0EC] bg-white px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <HeartPulse className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{activeItem.label}</h1>
              <p className="text-sm font-semibold text-[#64748B]">{activeItem.description}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
          <IntegratedSchoolCommandHeader roleTitle="Nurse Dashboard" fallbackUserLabel="School Nurse" />
          {renderWorkspace(section)}
        </div>
      </main>
    </div>
  );
}
