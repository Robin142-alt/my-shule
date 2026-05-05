import {
  BookOpenCheck,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  CircleDollarSign,
  FileSpreadsheet,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  Settings,
  SmartphoneCharging,
  Users,
  UserSquare2,
} from "lucide-react";

import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";
import { buildDashboardSnapshot } from "@/lib/dashboard/mock-data";
import type { DashboardRole } from "@/lib/dashboard/types";
import type {
  ExperienceMetric,
  ExperienceNavItem,
  ExperienceProfile,
  SchoolExperienceRole,
} from "@/lib/experiences/types";
export type { SchoolExperienceRole } from "@/lib/experiences/types";

export interface SchoolSubscriptionReminder {
  id: string;
  channel: "admin" | "sms" | "email";
  title: string;
  detail: string;
  status: string;
  tone: "ok" | "warning" | "critical";
}

export interface SchoolSubscriptionStage {
  id: string;
  label: "ACTIVE" | "TRIAL" | "EXPIRING" | "GRACE_PERIOD" | "RESTRICTED" | "SUSPENDED";
  description: string;
}

export interface SchoolSubscriptionView {
  state: SchoolSubscriptionStage["label"];
  tone: "ok" | "warning" | "critical";
  accessMode: "full" | "read_only" | "billing_only";
  statusLabel: string;
  headline: string;
  detail: string;
  renewalDueLabel: string;
  exportAllowedLabel: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  reminders: SchoolSubscriptionReminder[];
  stages: SchoolSubscriptionStage[];
}

const SCHOOL_TENANT_ID = "amani-prep";

const roleProfileMap: Record<SchoolExperienceRole, ExperienceProfile> = {
  principal: {
    name: "Grace Njeri",
    roleLabel: "Principal",
    contextLabel: "Amani Prep School",
  },
  bursar: {
    name: "Joseph Kamau",
    roleLabel: "Bursar",
    contextLabel: "Amani Prep School",
  },
  teacher: {
    name: "Beatrice Wanjiku",
    roleLabel: "Class teacher",
    contextLabel: "Amani Prep School",
  },
  admin: {
    name: "Daniel Ouma",
    roleLabel: "School admin",
    contextLabel: "Amani Prep School",
  },
};

const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem[]> = {
  principal: [
    { id: "dashboard", label: "Dashboard", href: "/school/principal", icon: LayoutGrid },
    { id: "students", label: "Students", href: "/school/principal/students", icon: Users },
    { id: "finance", label: "Fees / Payments", href: "/school/principal/finance", icon: CircleDollarSign },
    { id: "mpesa", label: "MPESA Transactions", href: "/school/principal/mpesa", icon: SmartphoneCharging },
    { id: "attendance", label: "Attendance", href: "/school/principal/attendance", icon: ClipboardCheck },
    { id: "academics", label: "Academics", href: "/school/principal/academics", icon: GraduationCap },
    { id: "exams", label: "Exams", href: "/school/principal/exams", icon: BookOpenCheck },
    { id: "reports", label: "Reports", href: "/school/principal/reports", icon: FileSpreadsheet },
    { id: "communication", label: "Communication (SMS)", href: "/school/principal/communication", icon: MessageSquareText },
    { id: "timetable", label: "Timetable", href: "/school/principal/timetable", icon: CalendarDays },
    { id: "staff", label: "Staff", href: "/school/principal/staff", icon: UserSquare2 },
    { id: "inventory", label: "Inventory", href: "/school/principal/inventory", icon: Boxes },
    { id: "settings", label: "Settings", href: "/school/principal/settings", icon: Settings },
  ],
  bursar: [
    { id: "dashboard", label: "Dashboard", href: "/school/bursar", icon: LayoutGrid },
    { id: "students", label: "Students", href: "/school/bursar/students", icon: Users },
    { id: "finance", label: "Fees / Payments", href: "/school/bursar/finance", icon: CircleDollarSign },
    { id: "mpesa", label: "MPESA Transactions", href: "/school/bursar/mpesa", icon: SmartphoneCharging },
    { id: "reports", label: "Reports", href: "/school/bursar/reports", icon: FileSpreadsheet },
    { id: "communication", label: "Communication (SMS)", href: "/school/bursar/communication", icon: MessageSquareText },
    { id: "settings", label: "Settings", href: "/school/bursar/settings", icon: Settings },
  ],
  teacher: [
    { id: "dashboard", label: "Dashboard", href: "/school/teacher", icon: LayoutGrid },
    { id: "students", label: "Students", href: "/school/teacher/students", icon: Users },
    { id: "attendance", label: "Attendance", href: "/school/teacher/attendance", icon: ClipboardCheck },
    { id: "academics", label: "Academics", href: "/school/teacher/academics", icon: GraduationCap },
    { id: "exams", label: "Exams", href: "/school/teacher/exams", icon: BookOpenCheck },
    { id: "reports", label: "Reports", href: "/school/teacher/reports", icon: FileSpreadsheet },
    { id: "communication", label: "Communication (SMS)", href: "/school/teacher/communication", icon: MessageSquareText },
    { id: "timetable", label: "Timetable", href: "/school/teacher/timetable", icon: CalendarDays },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", href: "/school/admin", icon: LayoutGrid },
    { id: "students", label: "Students", href: "/school/admin/students", icon: Users },
    { id: "finance", label: "Fees / Payments", href: "/school/admin/finance", icon: CircleDollarSign },
    { id: "mpesa", label: "MPESA Transactions", href: "/school/admin/mpesa", icon: SmartphoneCharging },
    { id: "attendance", label: "Attendance", href: "/school/admin/attendance", icon: ClipboardCheck },
    { id: "reports", label: "Reports", href: "/school/admin/reports", icon: FileSpreadsheet },
    { id: "communication", label: "Communication (SMS)", href: "/school/admin/communication", icon: MessageSquareText },
    { id: "staff", label: "Staff", href: "/school/admin/staff", icon: UserSquare2 },
    { id: "inventory", label: "Inventory", href: "/school/admin/inventory", icon: Boxes },
    { id: "settings", label: "Settings", href: "/school/admin/settings", icon: Settings },
  ],
};

const roleToDashboardRole: Record<SchoolExperienceRole, DashboardRole> = {
  principal: "admin",
  bursar: "bursar",
  teacher: "teacher",
  admin: "admin",
};

export const schoolSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Students",
  finance: "Fees / Payments",
  mpesa: "MPESA Transactions",
  attendance: "Attendance",
  academics: "Academics",
  exams: "Exams",
  reports: "Reports",
  communication: "Communication",
  timetable: "Timetable",
  staff: "Staff",
  inventory: "Inventory",
  settings: "Settings",
};

export function getSchoolWorkspace(role: SchoolExperienceRole) {
  const dashboardRole = roleToDashboardRole[role];
  const snapshot = buildDashboardSnapshot(dashboardRole, SCHOOL_TENANT_ID, true);
  const model = buildSchoolErpModel({
    role: dashboardRole,
    tenant: snapshot.tenant,
    online: true,
  });

  return {
    role,
    dashboardRole,
    snapshot,
    model,
    subscription: buildSchoolSubscription(role),
    navItems: schoolNavMap[role],
    profile: roleProfileMap[role],
  };
}

export function getSchoolKpiSummary(role: SchoolExperienceRole): ExperienceMetric[] {
  const { snapshot } = getSchoolWorkspace(role);

  return snapshot.kpis.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    helper: item.helper,
    trend: item.trendValue,
  }));
}

function buildSchoolSubscription(role: SchoolExperienceRole): SchoolSubscriptionView {
  const stages: SchoolSubscriptionStage[] = [
    {
      id: "active",
      label: "ACTIVE",
      description: "All school workflows remain fully available.",
    },
    {
      id: "trial",
      label: "TRIAL",
      description: "Trial schools get the full product until the trial end date.",
    },
    {
      id: "expiring",
      label: "EXPIRING",
      description: "Warning window before a renewal becomes urgent.",
    },
    {
      id: "grace",
      label: "GRACE_PERIOD",
      description: "Full access remains available while the school completes renewal.",
    },
    {
      id: "restricted",
      label: "RESTRICTED",
      description: "School records stay readable, but new writes are paused except billing and export.",
    },
    {
      id: "suspended",
      label: "SUSPENDED",
      description: "Billing, support, and export remain available so the school can recover safely.",
    },
  ];

  const renewalAction =
    role === "teacher"
      ? {
          label: "Contact bursar",
          href: "/school/teacher/communication",
        }
      : {
          label: "Renew with MPESA",
          href: `/school/${role}/finance`,
        };

  return {
    state: "EXPIRING",
    tone: "warning",
    accessMode: "full",
    statusLabel: "Renewal due in 5 days",
    headline: "Your school subscription is approaching renewal",
    detail:
      role === "teacher"
        ? "Teaching tools stay available, but the bursar or principal should renew the workspace soon to avoid restricted mode."
        : "Billing reminders are active. Renew now to avoid entering grace period and later read-only restriction.",
    renewalDueLabel: "Renews on 09 May 2026",
    exportAllowedLabel: "Data export always remains available",
    primaryActionLabel: renewalAction.label,
    primaryActionHref: renewalAction.href,
    reminders: [
      {
        id: "sub-admin",
        channel: "admin",
        title: "Admin banner raised",
        detail: "Subscription warning is visible to school admins and bursars.",
        status: "Sent",
        tone: "ok",
      },
      {
        id: "sub-sms",
        channel: "sms",
        title: "SMS reminder queued",
        detail: "Billing phone will receive an MPESA renewal reminder this afternoon.",
        status: "Queued",
        tone: "warning",
      },
      {
        id: "sub-email",
        channel: "email",
        title: "Email reminder queued",
        detail: "Finance contacts will receive the renewal link and invoice summary.",
        status: "Queued",
        tone: "warning",
      },
    ],
    stages,
  };
}
