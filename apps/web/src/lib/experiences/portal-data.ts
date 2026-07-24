import {
  BellRing,
  BookOpenCheck,
  Download,
  LayoutGrid,
  MessageSquareText,
  ReceiptText,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import type {
  ExperienceMetric,
  ExperienceNavItem,
  ExperienceProfile,
  PortalViewer,
} from "@/lib/experiences/types";
export type { PortalViewer } from "@/lib/experiences/types";
import { toPortalPath } from "@/lib/routing/experience-routes";

const portalNavBase = {
  parent: [
    { id: "dashboard", label: "Dashboard", href: toPortalPath("dashboard"), icon: LayoutGrid, group: "Home" },
    { id: "fees", label: "Fees", href: toPortalPath("fees"), icon: ReceiptText, group: "Learner record" },
    { id: "academics", label: "Academics", href: toPortalPath("academics"), icon: BookOpenCheck, group: "Learner record" },
    { id: "discipline", label: "Behavior", href: toPortalPath("discipline"), icon: ShieldAlert, group: "Learner record" },
    { id: "health", label: "Health", href: toPortalPath("health"), icon: Stethoscope, group: "Learner record" },
    { id: "messages", label: "Messages", href: toPortalPath("messages"), icon: MessageSquareText, group: "School contact" },
    { id: "downloads", label: "Downloads", href: toPortalPath("downloads"), icon: Download, group: "School contact" },
    { id: "notifications", label: "Notifications", href: toPortalPath("notifications"), icon: BellRing, group: "School contact" },
  ],
  student: [
    { id: "dashboard", label: "Dashboard", href: toPortalPath("dashboard"), icon: LayoutGrid, group: "Home" },
    { id: "fees", label: "Fees", href: toPortalPath("fees"), icon: ReceiptText, group: "Learner record" },
    { id: "academics", label: "Academics", href: toPortalPath("academics"), icon: BookOpenCheck, group: "Learner record" },
    { id: "discipline", label: "Behavior", href: toPortalPath("discipline"), icon: ShieldAlert, group: "Learner record" },
    { id: "messages", label: "Messages", href: toPortalPath("messages"), icon: MessageSquareText, group: "School contact" },
    { id: "downloads", label: "Downloads", href: toPortalPath("downloads"), icon: Download, group: "School contact" },
    { id: "notifications", label: "Notifications", href: toPortalPath("notifications"), icon: BellRing, group: "School contact" },
  ],
} satisfies Record<PortalViewer, ExperienceNavItem[]>;

const portalProfiles: Record<PortalViewer, ExperienceProfile> = {
  parent: {
    name: "Parent",
    roleLabel: "Parent account",
    contextLabel: "Linked learners load from the signed-in school account",
  },
  student: {
    name: "Student",
    roleLabel: "Student account",
    contextLabel: "Learner records load from the signed-in school account",
  },
};

const portalMetrics: Record<PortalViewer, ExperienceMetric[]> = {
  parent: [],
  student: [],
};

export function getPortalWorkspace(viewer: PortalViewer, _schoolId?: string | null) {
  return {
    viewer,
    navItems: portalNavBase[viewer],
    profile: portalProfiles[viewer],
    metrics: portalMetrics[viewer],
  };
}
