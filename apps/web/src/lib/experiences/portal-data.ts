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

import { formatCurrency } from "@/lib/dashboard/format";
import type {
  ExperienceActivityItem,
  ExperienceMetric,
  ExperienceNavItem,
  ExperienceProfile,
  PortalViewer,
} from "@/lib/experiences/types";
export type { PortalViewer } from "@/lib/experiences/types";
import { toPortalPath } from "@/lib/routing/experience-routes";
import { shouldUseKisumuBoysDemoTenant } from "@/lib/demo/kisumu-boys-high-demo";

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
    name: "Mrs. Wanjiku",
    roleLabel: "Parent account",
    contextLabel: "No linked learners yet",
  },
  student: {
    name: "Brian Otieno",
    roleLabel: "Student account",
    contextLabel: "No learner profile linked yet",
  },
};

const portalMetrics: Record<PortalViewer, ExperienceMetric[]> = {
  parent: [
    {
      id: "balance",
      label: "Current balance",
      value: formatCurrency(0),
      helper: "No linked learner fee records yet",
      trend: "0 learners",
    },
    {
      id: "recent-payments",
      label: "Recent payments",
      value: formatCurrency(0),
      helper: "No live payments posted yet",
      trend: "0 payments",
    },
    {
      id: "upcoming-exams",
      label: "Upcoming exams",
      value: "0",
      helper: "No assessment schedule published yet",
      trend: "0",
    },
  ],
  student: [
    {
      id: "average",
      label: "Average score",
      value: "0%",
      helper: "No assessment results published yet",
      trend: "0 pts",
    },
    {
      id: "balance",
      label: "Fee balance",
      value: formatCurrency(0),
      helper: "No linked family fee records yet",
      trend: "No account",
    },
    {
      id: "announcements",
      label: "New announcements",
      value: "0",
      helper: "No unread school notices yet",
      trend: "0",
    },
  ],
};

const emptyPortalProfiles: Record<PortalViewer, ExperienceProfile> = {
  parent: {
    name: "Parent",
    roleLabel: "Parent account",
    contextLabel: "No linked learners yet",
  },
  student: {
    name: "Student",
    roleLabel: "Student account",
    contextLabel: "No learner profile linked yet",
  },
};

const emptyPortalMetrics: Record<PortalViewer, ExperienceMetric[]> = {
  parent: portalMetrics.parent, // Use same structure but it's already zeroed
  student: portalMetrics.student,
};

const _portalFeeHistory: Array<{
  id: string;
  date: string;
  amount: string;
  method: string;
  reference: string;
  status: string;
}> = [];

const _portalAcademicRows: Array<{
  id: string;
  subject: string;
  score: string;
  grade: string;
  teacher: string;
}> = [
  {
    id: "result-brian-maths",
    subject: "Mathematics",
    score: "68%",
    grade: "ME",
    teacher: "Mr. Kamau",
  },
  {
    id: "result-brian-science",
    subject: "Integrated Science",
    score: "Meeting Expectations",
    grade: "ME",
    teacher: "Ms. Amina",
  },
  {
    id: "result-aisha-english",
    subject: "English Activities",
    score: "Exceeding Expectations",
    grade: "EE",
    teacher: "Ms. Nekesa",
  },
];

const _portalParentChildren: Array<{
  id: string;
  name: string;
  admissionNumber: string;
  gradeForm: string;
  stream: string;
  school: string;
  status: string;
}> = [
  {
    id: "child-brian",
    name: "Brian Otieno",
    admissionNumber: "KBI/2026/044",
    gradeForm: "Grade 8",
    stream: "Unity",
    school: "Kisumu Boys",
    status: "Active learner",
  },
  {
    id: "child-aisha",
    name: "Aisha Wanjiku",
    admissionNumber: "KBI/2026/118",
    gradeForm: "Grade 5",
    stream: "Hope",
    school: "Kisumu Boys",
    status: "Active learner",
  },
];

const _portalPublishedReportCards: Array<{
  id: string;
  childId: string;
  childName: string;
  exam: string;
  term: string;
  year: string;
  gradeForm: string;
  reportType: "CBC/CBE Competency Report" | "Hybrid CBC Academic Report" | "Legacy 8-4-4/KCSE Report";
  publishedDate: string;
  viewedStatus: string;
  acknowledged: boolean;
  summary: string;
}> = [
  {
    id: "report-brian-cbc",
    childId: "child-brian",
    childName: "Brian Otieno",
    exam: "Term 2 Mid-term CAT",
    term: "Term 2",
    year: "2026",
    gradeForm: "Grade 8 Unity",
    reportType: "CBC/CBE Competency Report",
    publishedDate: "2026-06-03",
    viewedStatus: "Viewed by parent",
    acknowledged: false,
    summary: "Progress is steady; mathematics practice needs consistency.",
  },
  {
    id: "report-brian-hybrid",
    childId: "child-brian",
    childName: "Brian Otieno",
    exam: "Term 1 End-term",
    term: "Term 1",
    year: "2026",
    gradeForm: "Grade 8 Unity",
    reportType: "Hybrid CBC Academic Report",
    publishedDate: "2026-04-08",
    viewedStatus: "Viewed by parent",
    acknowledged: true,
    summary: "CBC observations and marks supplement were published together.",
  },
  {
    id: "report-aisha-cbc",
    childId: "child-aisha",
    childName: "Aisha Wanjiku",
    exam: "Term 2 Reading Check",
    term: "Term 2",
    year: "2026",
    gradeForm: "Grade 5 Hope",
    reportType: "CBC/CBE Competency Report",
    publishedDate: "2026-06-02",
    viewedStatus: "Not viewed",
    acknowledged: false,
    summary: "Reading fluency is strong; handwriting speed is the next target.",
  },
  {
    id: "report-legacy-sample",
    childId: "child-brian",
    childName: "Brian Otieno",
    exam: "Archived Form 4 Mock",
    term: "Term 3",
    year: "2025",
    gradeForm: "Form 4 West",
    reportType: "Legacy 8-4-4/KCSE Report",
    publishedDate: "2025-10-29",
    viewedStatus: "Viewed by parent",
    acknowledged: true,
    summary: "Archived legacy report remains viewable in its original format.",
  },
];

const _portalPublishedExamResults: Array<{
  id: string;
  childName: string;
  exam: string;
  subject: string;
  term: string;
  year: string;
  performance: string;
  grade: string;
  teacherComment: string;
  target: string;
  status: "Published";
}> = [
  {
    id: "published-result-brian-maths",
    childName: "Brian Otieno",
    exam: "Term 2 Mid-term CAT",
    subject: "Mathematics",
    term: "Term 2",
    year: "2026",
    performance: "68%",
    grade: "ME",
    teacherComment: "Shows good reasoning; needs careful algebra checking.",
    target: "Strengthen algebra accuracy",
    status: "Published",
  },
  {
    id: "published-result-brian-science",
    childName: "Brian Otieno",
    exam: "Term 2 Mid-term CAT",
    subject: "Integrated Science",
    term: "Term 2",
    year: "2026",
    performance: "Meeting Expectations",
    grade: "ME",
    teacherComment: "Practical evidence is improving.",
    target: "Revise lab report conclusions",
    status: "Published",
  },
  {
    id: "published-result-aisha-english",
    childName: "Aisha Wanjiku",
    exam: "Term 2 Reading Check",
    subject: "English Activities",
    term: "Term 2",
    year: "2026",
    performance: "Exceeding Expectations",
    grade: "EE",
    teacherComment: "Reads confidently and answers comprehension questions well.",
    target: "Build handwriting speed",
    status: "Published",
  },
];

const _portalAcademicTargets: Array<{
  id: string;
  childName: string;
  subject: string;
  currentPerformance: string;
  target: string;
  responsibleTeacher: string;
  suggestedAction: string;
  status: string;
}> = [
  {
    id: "target-brian-maths",
    childName: "Brian Otieno",
    subject: "Mathematics",
    currentPerformance: "68%",
    target: "Strengthen algebra accuracy",
    responsibleTeacher: "Mr. Kamau",
    suggestedAction: "Complete three algebra practice sets each week.",
    status: "In progress",
  },
  {
    id: "target-aisha-writing",
    childName: "Aisha Wanjiku",
    subject: "English Activities",
    currentPerformance: "EE",
    target: "Build handwriting speed",
    responsibleTeacher: "Ms. Nekesa",
    suggestedAction: "Timed writing practice for ten minutes each evening.",
    status: "New",
  },
];

const _portalTeacherComments: ExperienceActivityItem[] = [
  {
    id: "comment-brian-teacher",
    title: "Mathematics teacher comment",
    detail: "Brian is focused in class and needs consistency in written mathematics practice.",
    timeLabel: "Term 2",
    tone: "warning",
  },
  {
    id: "comment-brian-class-teacher",
    title: "Class teacher comment",
    detail: "Class participation is positive. Parent support should focus on homework routines.",
    timeLabel: "Published",
    tone: "ok",
  },
  {
    id: "comment-brian-principal",
    title: "Principal comment",
    detail: "Good progress. Maintain attendance and follow the mathematics improvement target.",
    timeLabel: "Approved",
    tone: "ok",
  },
];

const _portalMessages: ExperienceActivityItem[] = [
  {
    id: "message-report-published",
    title: "Report published",
    detail: "Term 2 Mid-term CAT report card is available for parent review and acknowledgement.",
    timeLabel: "Today",
    tone: "ok",
  },
  {
    id: "message-target-follow-up",
    title: "Academic target follow-up",
    detail: "Mathematics practice target has been shared for weekly parent support.",
    timeLabel: "Term 2",
    tone: "warning",
  },
  {
    id: "message-parent-meeting",
    title: "Parent meeting request",
    detail: "Class teacher is available for a short academic progress discussion if needed.",
    timeLabel: "Optional",
    tone: "ok",
  },
];

export function getPortalWorkspace(viewer: PortalViewer, schoolId?: string | null) {
  const isDemo = shouldUseKisumuBoysDemoTenant(schoolId);
  return {
    viewer,
    navItems: portalNavBase[viewer],
    profile: isDemo ? portalProfiles[viewer] : emptyPortalProfiles[viewer],
    metrics: isDemo ? portalMetrics[viewer] : emptyPortalMetrics[viewer],
  };
}

export function getPortalFeeHistory(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalFeeHistory : []; }

export function getPortalAcademicRows(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalAcademicRows : []; }

export function getPortalParentChildren(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalParentChildren : []; }

export function getPortalPublishedReportCards(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalPublishedReportCards : []; }

export function getPortalPublishedExamResults(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalPublishedExamResults : []; }

export function getPortalAcademicTargets(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalAcademicTargets : []; }

export function getPortalTeacherComments(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalTeacherComments : []; }

export function getPortalMessages(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _portalMessages : []; }
