import type { LucideIcon } from "lucide-react";

export type ExperienceIcon = LucideIcon;

export type SchoolExperienceRole =
  | "principal"
  | "deputy-principal"
  | "secretary"
  | "bursar"
  | "accountant"
  | "teacher"
  | "dean-academics"
  | "exams-manager"
  | "hod"
  | "class-teacher"
  | "grade-master"
  | "admin"
  | "student"
  | "storekeeper"
  | "librarian"
  | "nurse"
  | "boarding-master"
  | "security-officer"
  | "transport-manager"
  | "ict-manager"
  | "laboratory-technician"
  | "guidance-counselling"
  | "discipline-master"
  | "procurement-officer"
  | "admissions";
export type PortalViewer = "parent" | "student";

export interface ExperienceNavItem {
  id: string;
  label: string;
  href: string;
  icon: ExperienceIcon;
  badge?: string;
  group?: string;
}

export interface ExperienceNotificationItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: "ok" | "warning" | "critical";
  href?: string;
  status?: "unread" | "read" | "sent" | "dismissed" | string;
  sourceModule?: string;
  relatedModule?: string | null;
  relatedRecordId?: string | null;
}

export interface ExperienceMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend?: string;
}

export interface ExperienceChartPoint {
  label: string;
  value: number;
}

export interface ExperienceActivityItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: "ok" | "warning" | "critical";
}

export interface ExperienceListItem {
  id: string;
  title: string;
  subtitle: string;
  value?: string;
  tone?: "ok" | "warning" | "critical";
}

export interface ExperienceProfile {
  name: string;
  roleLabel: string;
  contextLabel: string;
  roleKey?: SchoolExperienceRole | PortalViewer | "superadmin" | "system-monitor" | "platform-owner";
}
