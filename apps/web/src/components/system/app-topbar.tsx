"use client";

import { Bell, ChevronDown, Menu, Plus, Search } from "lucide-react";
import { startTransition, useDeferredValue, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  ExperienceNavItem,
  ExperienceNotificationItem,
  ExperienceProfile,
} from "@/lib/experiences/types";
import { resolveOperationalSearch } from "@/lib/search/operational-search-resolver";
import { normalizeOperationalRoleKey } from "@/lib/search/search-access-policy";

type TopbarVariant = "platform" | "school" | "portal";

const searchPlaceholderByVariant: Record<TopbarVariant, string> = {
  platform: "Search schools, billing, or incidents",
  school: "Search students, parents, receipts, M-Pesa, or documents",
  portal: "Search fees, results, or messages",
};

const shellStyles: Record<TopbarVariant, string> = {
  platform:
    "enterprise-topbar",
  school: "enterprise-topbar",
  portal: "enterprise-topbar",
};

type QuickActionItem = { label: string; href: string };

const schoolSectionSlugs = new Set([
  "dashboard",
  "executive-analytics",
  "alerts-risks",
  "approvals",
  "users-staff",
  "audit-logs",
  "students",
  "admissions",
  "finance",
  "mpesa",
  "inventory",
  "library",
  "clinic",
  "discipline",
  "labs",
  "leadership",
  "teacher-attendance",
  "staff",
  "reports",
  "communication",
  "transport",
  "procurement",
  "school-admin",
  "hr-payroll",
  "timetable-builder",
  "communication-center",
  "school-calendar",
  "canteen-meals",
  "co-curricular",
  "data-security",
  "setup-wizard",
  "ict-assets",
  "document-printing",
  "reports-analytics",
  "universal-approvals",
  "hostel",
  "boarding",
  "cbt",
  "lms",
  "ai-insights",
  "visitors",
  "assets",
  "iot",
  "settings",
  "timetable",
  "support-new-ticket",
  "support-my-tickets",
  "support-knowledge-base",
  "support-system-status",
]);

export function scopePublicSchoolHref({
  href,
  pathname,
  roleKey,
}: {
  href: string;
  pathname: string;
  roleKey: string;
}) {
  if (!pathname.startsWith(`/school/${roleKey}`)) {
    return href;
  }

  const [path = "", query = ""] = href.split("?");
  const normalizedPath = path.replace(/^\/+/, "");
  const [firstSegment, ...restSegments] = normalizedPath.split("/");

  if (!firstSegment || !schoolSectionSlugs.has(firstSegment)) {
    return href;
  }

  const scopedPath =
    firstSegment === "dashboard"
      ? `/school/${roleKey}`
      : firstSegment === "students" && restSegments.length > 0
        ? `/school/${roleKey}/students/${restSegments.join("/")}`
        : `/school/${roleKey}/${firstSegment}`;

  return query ? `${scopedPath}?${query}` : scopedPath;
}

const defaultSchoolQuickActions: QuickActionItem[] = [
  { label: "Open Workflow Queue", href: "/universal-approvals" },
  { label: "Send Notice", href: "/communication?action=notice" },
  { label: "Print Document", href: "/document-printing" },
];

const roleQuickActions: Record<string, QuickActionItem[]> = {
  principal: [
    { label: "Approve Results", href: "/approvals?workflow=exam-release" },
    { label: "Approve Budget", href: "/approvals?workflow=budget-approval" },
    { label: "Send Announcement", href: "/communication-center?action=announcement" },
    { label: "Generate Board Report", href: "/reports-analytics?report=board" },
    { label: "Open Incident Center", href: "/discipline?action=incident-center" },
    { label: "Open Fee Follow-up", href: "/finance?action=fee-reminder" },
  ],
  "deputy-principal": [
    { label: "Assign Substitute", href: "/timetable-builder?action=assign-substitute" },
    { label: "Escalate Case", href: "/discipline?action=escalate" },
    { label: "Notify Parent", href: "/communication?action=parent-sms" },
    { label: "Resolve Conflict", href: "/timetable-builder?action=resolve-conflict" },
    { label: "Generate Daily Report", href: "/reports-analytics?report=daily-operations" },
    { label: "Open Fee Follow-up", href: "/finance?action=fee-reminder" },
  ],
  secretary: [
    { label: "Register Visitor", href: "/visitors?action=register" },
    { label: "Print Letter", href: "/document-printing?action=print-letter" },
    { label: "Record Inquiry", href: "/admissions?action=inquiry" },
    { label: "Update Parent Phone", href: "/school-admin?action=parent-phone" },
    { label: "Book Appointment", href: "/school-calendar?action=appointment" },
    { label: "Open Fee Follow-up", href: "/finance?action=fee-reminder" },
  ],
  accountant: [
    { label: "Record Payment", href: "/finance?action=record-payment" },
    { label: "Reconcile M-Pesa", href: "/mpesa?action=reconcile" },
    { label: "Print Receipt", href: "/document-printing?action=receipt" },
    { label: "Send Fee Reminder", href: "/communication?action=fee-reminder" },
    { label: "Export Statement", href: "/reports-analytics?report=statement" },
  ],
  bursar: [
    { label: "Record Payment", href: "/finance?action=record-payment" },
    { label: "Reconcile M-Pesa", href: "/mpesa?action=reconcile" },
    { label: "Print Receipt", href: "/document-printing?action=receipt" },
    { label: "Send Fee Reminder", href: "/communication?action=fee-reminder" },
    { label: "Export Statement", href: "/reports-analytics?report=statement" },
  ],
  teacher: [
    { label: "Mark Attendance", href: "/students?action=attendance" },
    { label: "Upload Assignment", href: "/academics?action=assignment" },
    { label: "Enter Marks", href: "/exams?action=marks" },
    { label: "Submit Lesson Plan", href: "/academics?action=lesson-plan" },
  ],
  "class-teacher": [
    { label: "Message Parent", href: "/communication?action=parent-sms" },
    { label: "Record Note", href: "/students?action=class-note" },
    { label: "Mark Concern", href: "/students?action=concern" },
    { label: "Refer Counsellor", href: "/guidance-counselling?action=referral" },
    { label: "Generate Class Report", href: "/reports-analytics?report=class" },
  ],
  "grade-master": [
    { label: "Notify Class Teacher", href: "/communication?action=teacher-notice" },
    { label: "Schedule Meeting", href: "/school-calendar?action=meeting" },
    { label: "Escalate Parent Case", href: "/universal-approvals?action=parent-escalation" },
    { label: "Generate Grade Report", href: "/reports-analytics?report=grade" },
  ],
  hod: [
    { label: "Approve Lesson Plan", href: "/academics?action=approve-plan" },
    { label: "Return Plan", href: "/academics?action=return-plan" },
    { label: "Assign Teacher", href: "/timetable-builder?action=assign-teacher" },
    { label: "Send Department Notice", href: "/communication?action=department" },
  ],
  "dean-academics": [
    { label: "Approve Batch", href: "/approvals?workflow=dean-report-review" },
    { label: "Reject Batch", href: "/approvals?workflow=dean-report-review&decision=reject" },
    { label: "Return for Correction", href: "/approvals?workflow=dean-report-review&decision=return" },
    { label: "Open Integrity Scan", href: "/exams?action=integrity-scan" },
  ],
  "exams-manager": [
    { label: "Create Exam", href: "/exams?action=create" },
    { label: "Upload Marks", href: "/exams?action=upload-marks" },
    { label: "Process Grades", href: "/exams?action=process-grades" },
    { label: "Send to Dean", href: "/exams?action=send-to-dean" },
  ],
  nurse: [
    { label: "Log Visit", href: "/clinic?action=visit" },
    { label: "Dispense Medicine", href: "/clinic?action=dispense" },
    { label: "Notify Guardian", href: "/communication?action=health" },
    { label: "Print Medical Note", href: "/document-printing?action=medical-note" },
  ],
  "guidance-counselling": [
    { label: "Start Session", href: "/guidance-counselling?action=session" },
    { label: "Add Notes", href: "/guidance-counselling?action=notes" },
    { label: "Escalate Emergency", href: "/guidance-counselling?action=emergency" },
    { label: "Schedule Parent Meeting", href: "/school-calendar?action=welfare-meeting" },
  ],
  "discipline-master": [
    { label: "Record New Case", href: "/discipline?action=new" },
    { label: "Notify Parent", href: "/communication?action=discipline-parent" },
    { label: "Refer to Counsellor", href: "/guidance-counselling?action=referral" },
    { label: "Print Discipline Slip", href: "/document-printing?action=discipline-slip" },
  ],
  librarian: [
    { label: "Issue Book", href: "/library?action=issue" },
    { label: "Receive Return", href: "/library?action=return" },
    { label: "Send Overdue SMS", href: "/communication?action=library-overdue" },
    { label: "Print Library Card", href: "/document-printing?action=library-card" },
  ],
  storekeeper: [
    { label: "Issue Stock", href: "/inventory?action=issue" },
    { label: "Receive Stock", href: "/inventory?action=receive" },
    { label: "Request Procurement", href: "/procurement?action=request" },
    { label: "Print Stock Card", href: "/document-printing?action=stock-card" },
  ],
  "boarding-master": [
    { label: "Mark Roll Call", href: "/boarding?action=roll-call" },
    { label: "Approve Leave-out", href: "/boarding?action=leaveout" },
    { label: "Record Dorm Incident", href: "/boarding?action=incident" },
    { label: "Notify Guardian", href: "/communication?action=boarding" },
  ],
  "security-officer": [
    { label: "Register Visitor", href: "/visitors?action=register" },
    { label: "Issue Gate Pass", href: "/visitors?action=gate-pass" },
    { label: "Record Incident", href: "/visitors?action=incident" },
    { label: "Print Visitor Badge", href: "/document-printing?action=visitor-badge" },
  ],
  "transport-manager": [
    { label: "Assign Route", href: "/transport?action=assign-route" },
    { label: "Report Incident", href: "/transport?action=incident" },
    { label: "Send Parent Alert", href: "/communication?action=transport-alert" },
    { label: "Log Fuel Refill", href: "/transport?action=fuel" },
  ],
  "laboratory-technician": [
    { label: "Add Chemical", href: "/labs?action=chemical" },
    { label: "Record Breakage", href: "/labs?action=breakage" },
    { label: "Create Lab Session", href: "/labs?action=session" },
    { label: "Schedule Maintenance", href: "/labs?action=maintenance" },
  ],
  admissions: [
    { label: "Record Inquiry", href: "/admissions?action=inquiry" },
    { label: "Verify Documents", href: "/admissions?action=verify" },
    { label: "Print Admission Letter", href: "/document-printing?action=admission-letter" },
    { label: "Send Parent SMS", href: "/communication?action=admissions-sms" },
  ],
  admin: [
    { label: "Invite User", href: "/settings?action=invite-user" },
    { label: "Assign Role", href: "/settings?action=assign-role" },
    { label: "Configure Term", href: "/settings?action=term" },
    { label: "Open Audit Logs", href: "/audit-logs" },
  ],
};

function getQuickActionsForProfile(profile: ExperienceProfile | undefined) {
  const roleKey = normalizeOperationalRoleKey(profile?.roleKey ?? profile?.roleLabel);

  return roleQuickActions[roleKey] ?? defaultSchoolQuickActions;
}

export function AppTopbar({
  variant,
  navItems,
  notifications = [],
  topLabel,
  title,
  subtitle,
  actions,
  status,
  profile,
  onNotificationOpen,
  onOpenSidebar,
}: {
  variant: TopbarVariant;
  navItems: ExperienceNavItem[];
  notifications?: ExperienceNotificationItem[];
  topLabel: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  status?: { label: string; tone: "ok" | "warning" | "critical" };
  profile?: ExperienceProfile;
  onNotificationOpen?: (item: ExperienceNotificationItem) => void | Promise<void>;
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showQuickActionsPanel, setShowQuickActionsPanel] = useState(false);
  const [showUrgentPanel, setShowUrgentPanel] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
  const filteredSearchItems =
    normalizedSearchTerm.length > 0
      ? navItems
          .filter((item) =>
            `${item.label} ${item.group ?? ""}`.toLowerCase().includes(normalizedSearchTerm),
          )
          .slice(0, 6)
      : [];
  const filteredSchoolEntities =
    normalizedSearchTerm.length > 0
      ? resolveOperationalSearch(normalizedSearchTerm, {
          role: profile?.roleKey ?? profile?.roleLabel ?? variant,
          capabilities: [],
        }).slice(0, 5)
      : [];
  const schoolQuickActions = getQuickActionsForProfile(profile);
  const normalizedRoleKey = normalizeOperationalRoleKey(profile?.roleKey ?? profile?.roleLabel);
  const canFollowUpFees = ["principal", "deputy-principal", "secretary", "accountant", "bursar"].includes(normalizedRoleKey);
  const urgentActionItems = notifications.length > 0
    ? notifications.slice(0, 6).map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        href: item.href ?? "/reports-analytics?filter=urgent",
      }))
    : [
        {
          id: "attendance-follow-up",
          title: "Attendance follow-up",
          detail: "Review missing registers and send absence SMS.",
          href: "/students?action=attendance-follow-up",
        },
        ...(canFollowUpFees ? [{
          id: "fee-reminders",
          title: "Fee reminders",
          detail: "Open balances that need parent SMS today.",
          href: "/finance?action=fee-reminder",
        }] : []),
        {
          id: "approval-queue",
          title: "Approval queue",
          detail: "Review requests waiting for your decision.",
          href: "/universal-approvals",
        },
      ];

  const runNavigation = (href: string) => {
    setSearchTerm("");
    setShowSearchPanel(false);
    setShowNotificationsPanel(false);
    setShowQuickActionsPanel(false);
    setShowUrgentPanel(false);

    startTransition(() => {
      router.push(
        variant === "school" && normalizedRoleKey
          ? scopePublicSchoolHref({ href, pathname, roleKey: normalizedRoleKey })
          : href,
      );
    });
  };
  const searchHrefForItem = (item: ExperienceNavItem) => {
    if (variant === "school" && /fees\s*\/\s*payments/i.test(item.label)) {
      return "/finance";
    }

    return item.href;
  };

  return (
    <header
      className={`sticky top-3 z-20 mb-5 rounded-[var(--radius)] px-4 py-3 md:px-5 ${shellStyles[variant]}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-muted text-primary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <DashboardGreeting
              name={profile?.name ?? title}
              context={profile?.contextLabel}
              className="mb-2"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {topLabel}
            </p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="relative min-w-[240px]">
            <label className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 transition duration-150 focus-within:border-border-strong focus-within:shadow-[var(--shadow-focus)]">
              <Search className="h-4 w-4 text-muted" />
              <input
                type="search"
                aria-label="Search"
                placeholder={searchPlaceholderByVariant[variant]}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={() => {
                  setShowSearchPanel(true);
                  setShowNotificationsPanel(false);
                  setShowQuickActionsPanel(false);
                  setShowUrgentPanel(false);
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowSearchPanel(false), 120);
                }}
                onKeyDown={(event) => {
                  const firstSearchHref = filteredSearchItems[0]
                    ? searchHrefForItem(filteredSearchItems[0])
                    : filteredSchoolEntities[0]?.actions[0]?.href;
                  if (event.key === "Enter" && firstSearchHref) {
                    event.preventDefault();
                    runNavigation(firstSearchHref);
                  }
                }}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </label>
            {showSearchPanel && normalizedSearchTerm ? (
              <div
                data-testid="workspace-search-panel"
                className="fade-in-panel glass-panel absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-[var(--radius)] p-2"
              >
                {filteredSchoolEntities.length > 0 || filteredSearchItems.length > 0 ? (
                  <>
                    {filteredSchoolEntities.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[var(--radius-sm)] px-3 py-2 transition duration-150 hover:bg-surface-strong"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted">{item.detail}</p>
                          </div>
                          <span
                            title={`${item.mode} search`}
                            className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted"
                          >
                            {item.typeLabel}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.actions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => runNavigation(action.href)}
                              className="rounded-[var(--radius-xs)] border border-accent/20 bg-accent-soft px-2 py-1 text-[11px] font-bold text-accent transition hover:-translate-y-0.5"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredSearchItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runNavigation(searchHrefForItem(item))}
                        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition duration-150 hover:bg-surface-strong"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          <p className="text-xs text-muted">{item.group ?? "Section"}</p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          Open
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="rounded-xl px-3 py-3 text-sm text-muted">
                    No results for &ldquo;{deferredSearchTerm}&rdquo;.
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {variant === "school" ? (
            <>
              <StatusPill label="Sync: Live" tone="ok" />
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Urgent actions ${urgentActionItems.length}`}
                  aria-expanded={showUrgentPanel}
                  onClick={() => {
                    setShowUrgentPanel((value) => !value);
                    setShowSearchPanel(false);
                    setShowNotificationsPanel(false);
                    setShowQuickActionsPanel(false);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-warning/25 bg-warning/10 px-3 text-xs font-bold text-warning transition hover:-translate-y-0.5"
                >
                  Urgent actions <span className="rounded-full bg-warning px-1.5 py-0.5 text-[10px] text-white">{urgentActionItems.length}</span>
                </button>
                {showUrgentPanel ? (
                  <div
                    data-testid="workspace-urgent-actions-panel"
                    className="fade-in-panel glass-panel absolute right-0 top-[calc(100%+6px)] z-30 w-[320px] rounded-[var(--radius)] p-2"
                  >
                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Needs attention today
                    </p>
                    <div className="space-y-1">
                      {urgentActionItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => runNavigation(item.href)}
                          className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition hover:bg-surface-strong"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                            <span className="mt-1 block text-xs leading-5 text-muted">{item.detail}</span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-warning">
                            Open
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Quick actions"
                  aria-expanded={showQuickActionsPanel}
                  onClick={() => {
                    setShowQuickActionsPanel((value) => !value);
                    setShowSearchPanel(false);
                    setShowNotificationsPanel(false);
                    setShowUrgentPanel(false);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-accent/20 bg-accent-soft px-3 text-xs font-bold text-accent transition hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Quick actions
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showQuickActionsPanel ? (
                  <div
                    data-testid="workspace-quick-actions-panel"
                    className="fade-in-panel glass-panel absolute right-0 top-[calc(100%+6px)] z-30 w-[280px] rounded-[var(--radius)] p-2"
                  >
                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Quick school actions
                    </p>
                    <div className="space-y-1">
                      {schoolQuickActions.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => runNavigation(item.href)}
                          className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-surface-strong"
                        >
                          {item.label}
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                            Open
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {status ? <StatusPill label={status.label} tone={status.tone} /> : null}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotificationsPanel}
              onClick={() => {
                setShowNotificationsPanel((value) => !value);
                setShowSearchPanel(false);
                setShowQuickActionsPanel(false);
                setShowUrgentPanel(false);
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-muted transition duration-150 hover:border-border-strong hover:bg-surface-strong"
            >
              <Bell className="h-4 w-4 text-primary" />
              {notifications.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {notifications.length}
                </span>
              ) : null}
            </button>
            {showNotificationsPanel ? (
              <div
                data-testid="workspace-notifications-panel"
                className="fade-in-panel glass-panel absolute right-0 top-[calc(100%+6px)] z-30 w-[320px] rounded-[var(--radius)] p-2"
              >
                <div className="flex items-center justify-between gap-3 px-2 py-1">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <StatusPill
                    label={`${notifications.length}`}
                    tone={notifications.some((item) => item.tone === "critical") ? "critical" : "ok"}
                    compact
                  />
                </div>
                <div className="custom-scrollbar max-h-[300px] space-y-1 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (onNotificationOpen) {
                            void Promise.resolve(onNotificationOpen(item)).catch(() => undefined);
                          }

                          if (item.href) {
                            runNavigation(item.href);
                            return;
                          }

                          setShowNotificationsPanel(false);
                        }}
                        className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition duration-150 hover:bg-surface-strong"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                            {item.timeLabel}
                          </p>
                        </div>
                        <StatusPill label={item.tone} tone={item.tone} compact />
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl px-3 py-4 text-sm text-muted">
                      No notifications are open right now.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          {profile ? (
            <div className="hidden min-w-0 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 lg:block">
              <p className="truncate text-xs font-bold text-foreground">{profile.name}</p>
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {profile.roleLabel}
              </p>
            </div>
          ) : null}
          {variant === "school" ? (
            <div className="flex items-center gap-2 mr-2 ml-2">
              <TaskQueue />
              <ApprovalInbox currentUserId="school" />
              <NotificationBell />
            </div>
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  );
}
