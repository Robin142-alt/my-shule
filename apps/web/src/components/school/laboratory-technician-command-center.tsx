"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Download,
  FlaskConical,
  LayoutDashboard,
  Microscope,
  MoreHorizontal,
  Package,
  PieChart,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  TestTube,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { buildSchoolSectionHref } from "./school-pages";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";
import { toast } from "sonner";

type RouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type ViewId = "overview" | "schedule" | "requests" | "preparation" | "issue_return" | "apparatus" | "chemicals" | "consumables" | "intake" | "stocktake" | "faults" | "incidents" | "disposal" | "procurement" | "reports" | "messages" | "settings";
type LabActionTone = "success" | "info" | "warning" | "danger";
type LabDashboardData = {
  kpis?: Array<{ value?: string | number }>;
};
type LabWorkflowDraft = {
  title: string;
  subject: string;
  teacher: string;
  className: string;
  item: string;
  quantity: string;
  dueDate: string;
  notes: string;
  tone: LabActionTone;
};

type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  group: string;
  desc: string;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Dashboard", desc: "Daily control center for urgent lab work." },
  { id: "schedule", label: "Practical Schedule", icon: Calendar, group: "Dashboard", desc: "View and manage lab usage and practical preparation." },
  { id: "requests", label: "Teacher Requests", icon: ClipboardList, group: "Operations", desc: "Review, approve, and prepare teacher practical requests." },
  { id: "preparation", label: "Preparation Bench", icon: FlaskConical, group: "Operations", desc: "Manage practical preparation tasks before class." },
  { id: "issue_return", label: "Issue / Return Desk", icon: ArrowRightLeft, group: "Operations", desc: "Issue and return lab apparatus and equipment." },
  { id: "apparatus", label: "Apparatus & Equipment", icon: Microscope, group: "Inventory", desc: "Manage durable lab items and equipment." },
  { id: "chemicals", label: "Chemicals & Reagents", icon: TestTube, group: "Inventory", desc: "Manage chemical stock, expiry, and low stock alerts." },
  { id: "consumables", label: "Consumables & Specimens", icon: Package, group: "Inventory", desc: "Manage non-durable lab items consumed during lessons." },
  { id: "intake", label: "Stock Intake", icon: Download, group: "Inventory", desc: "Record lab stock received from storekeeper or suppliers." },
  { id: "stocktake", label: "Stocktake & Audit", icon: ClipboardCheck, group: "Audit", desc: "Physical stock counts and reconciliation." },
  { id: "faults", label: "Faults & Maintenance", icon: Wrench, group: "Maintenance", desc: "Track broken equipment and maintenance requests." },
  { id: "incidents", label: "Safety Incidents", icon: ShieldAlert, group: "Safety", desc: "Record lab accidents, spills, and safety follow-ups." },
  { id: "disposal", label: "Waste & Disposal", icon: Trash2, group: "Safety", desc: "Track expired chemicals and disposal requests." },
  { id: "procurement", label: "Procurement Requests", icon: ShoppingCart, group: "Admin", desc: "Request purchase of chemicals and apparatus." },
  { id: "reports", label: "Reports & Downloads", icon: PieChart, group: "Admin", desc: "Print and export lab records." },
  { id: "messages", label: "Messages & Alerts", icon: Bell, group: "Admin", desc: "Notifications, teacher clarifications, and updates." },
  { id: "settings", label: "Lab Settings", icon: Settings, group: "Admin", desc: "Configuration for lab operations." },
];

const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-success-border bg-success-soft text-emerald-900",
    chip: "border-success-border bg-success-soft text-success",
    dot: "bg-emerald-500",
    text: "text-success",
  },
  info: {
    card: "border-info-border bg-info-soft text-blue-950",
    chip: "border-info-border bg-info-soft text-info",
    dot: "bg-blue-500",
    text: "text-info",
  },
  warning: {
    card: "border-warning-border bg-warning-soft text-amber-950",
    chip: "border-warning-border bg-warning-soft text-warning",
    dot: "bg-amber-500",
    text: "text-warning",
  },
  danger: {
    card: "border-danger-border bg-danger-soft text-rose-950",
    chip: "border-danger-border bg-danger-soft text-danger",
    dot: "bg-rose-500",
    text: "text-danger",
  },
  neutral: {
    card: "border-slate-200 bg-white text-foreground",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function labActionSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function persistLabWorkflowAction(title: string, body: string, tone: LabActionTone) {
  return requestDashboardApi("/api/admin-command/laboratory-technician/actions", {
    method: "POST",
    body: {
      action: labActionSlug(title),
      title,
      description: body,
      priority: tone === "danger" || tone === "warning" ? "high" : "normal",
      source: "laboratory-technician-dashboard",
    },
  });
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="app-workspace-panel rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

async function recordLabAction(title: string, body: string, tone: LabActionTone = "info") {
  try {
    await persistLabWorkflowAction(title, body, tone);
  } catch (error) {
    toast.error("Laboratory action was not saved", {
      description: error instanceof Error ? error.message : "The action could not be persisted for audit and dashboard follow-up.",
    });
    return false;
  }

  const notify = tone === "danger" ? toast.error : tone === "success" ? toast.success : toast.info;
  notify(title, { description: body });
  publishSchoolOperationalEvent({
    type: "laboratory.workflow_action",
    module: "laboratory",
    actorRole: "laboratory_technician",
    title,
    body,
  });
  return true;
}

async function openLabActionRecord(title: string, rows: Array<[string, string]>) {
  const persisted = await recordLabAction("Lab record opened", `${title} is available for preview, print, or PDF download.`, "success");
  if (!persisted) {
    return;
  }

  openPrintDocument({
    eyebrow: "MyShule Laboratory",
    title,
    subtitle: `Generated ${new Date().toLocaleString()} from the Laboratory Technician command center`,
    rows: rows.map(([label, value]) => ({ label, value })),
    footer: "Laboratory actions must preserve class, teacher, item, and safety audit context.",
  });
}

async function exportLabWorkspace(title: string) {
  const persisted = await recordLabAction("Lab export created", `${title} export downloaded from the current workspace.`, "success");
  if (!persisted) {
    return;
  }

  downloadCsvFile({
    filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lab-workspace"}.csv`,
    headers: ["Workspace", "Scope", "Generated At"],
    rows: [[title, "Current school laboratory records", new Date().toISOString()]],
  });
}

function createLabWorkflowDraft(title: string, values: Partial<LabWorkflowDraft> = {}): LabWorkflowDraft {
  return {
    title,
    subject: values.subject ?? "",
    teacher: values.teacher ?? "",
    className: values.className ?? "",
    item: values.item ?? "",
    quantity: values.quantity ?? "",
    dueDate: values.dueDate ?? "",
    notes: values.notes ?? "",
    tone: values.tone ?? "info",
  };
}

function LabWorkflowModal({
  draft,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: LabWorkflowDraft | null;
  submitting: boolean;
  onChange: (draft: LabWorkflowDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!draft) {
    return null;
  }

  const update = (field: keyof LabWorkflowDraft, value: string) => onChange({ ...draft, [field]: value });

  return (
    <Modal
      open
      title={draft.title}
      description="Capture the operational details before the laboratory action is saved for audit, follow-up, and dashboard refresh."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Laboratory Action"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-foreground">
          Subject / workflow
          <input value={draft.subject} onChange={(event) => update("subject", event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="Chemistry practical" />
        </label>
        <label className="text-sm font-bold text-foreground">
          Teacher / requester
          <input value={draft.teacher} onChange={(event) => update("teacher", event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="Mrs. Njeri" />
        </label>
        <label className="text-sm font-bold text-foreground">
          Class / lab
          <input value={draft.className} onChange={(event) => update("className", event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="Form 4 West" />
        </label>
        <label className="text-sm font-bold text-foreground">
          Item / apparatus
          <input value={draft.item} onChange={(event) => update("item", event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="Voltmeter, reagent, microscope" />
        </label>
        <label className="text-sm font-bold text-foreground">
          Quantity / count
          <input value={draft.quantity} onChange={(event) => update("quantity", event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="2 sets" />
        </label>
        <label className="text-sm font-bold text-foreground">
          Date / due back
          <input value={draft.dueDate} onChange={(event) => update("dueDate", event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="Tomorrow 10:00 AM" />
        </label>
        <label className="sm:col-span-2 text-sm font-bold text-foreground">
          Safety notes and follow-up
          <textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="Record safety checks, condition, approval notes, and follow-up owner." />
        </label>
      </div>
    </Modal>
  );
}

function SimpleWorkspace({
  title,
  description,
  icon: Icon,
  viewId,
  openLabWorkflow,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  viewId: ViewId;
  openLabWorkflow: (draft: LabWorkflowDraft) => void;
}) {
  const primaryLabelByView: Partial<Record<ViewId, string>> = {
    schedule: "Add Practical Slot",
    preparation: "Open Prep Checklist",
    apparatus: "Add Apparatus",
    chemicals: "Record Chemical Stock",
    consumables: "Add Consumable",
    intake: "Record Stock Intake",
    stocktake: "Start Stocktake",
    faults: "Log Maintenance Fault",
    incidents: "Record Safety Incident",
    disposal: "Create Disposal Request",
    procurement: "Create Procurement Request",
    reports: "Generate Lab Report",
    messages: "Send Lab Alert",
    settings: "Save Lab Settings",
  };
  const primaryLabel = primaryLabelByView[viewId] || "Open Lab Workflow";

  return (
    <Panel title={title} description={description} icon={Icon}>
      <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-muted rounded-xl border border-dashed border-border">
        <Icon className="h-12 w-12 text-muted/30 mb-4" />
        <p className="text-lg font-bold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted max-w-sm">{description}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white"
            onClick={() => openLabWorkflow(createLabWorkflowDraft(primaryLabel, { subject: title, notes: `${primaryLabel} for ${title}.` }))}
          >
            {primaryLabel}
          </button>
          <button type="button" className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-foreground" onClick={() => exportLabWorkspace(title)}>Export</button>
        </div>
      </div>
    </Panel>
  );
}

// ----------------------------------------------------------------------
// WORKSPACE COMPONENTS
// ----------------------------------------------------------------------

function OverviewWorkspace({ onNavigate, openLabWorkflow }: { onNavigate: (v: ViewId) => void; openLabWorkflow: (draft: LabWorkflowDraft) => void }) {
  const { data: dashboard, isLoading } = useSchoolQuery<LabDashboardData>("/api/labs/dashboard");
  const kpis = Array.isArray(dashboard?.kpis) ? dashboard.kpis : [];

  return (
    <Panel title="Lab Overview" description="Command center for daily practicals, urgent alerts, and pending requests." icon={LayoutDashboard}>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("schedule")}>
          <div className="text-sm font-semibold text-muted">Today&apos;s Practicals</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : (kpis[0]?.value || "3")}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("requests")}>
          <div className="text-sm font-semibold text-muted">Pending Requests</div>
          <div className="mt-1 text-2xl font-black text-amber-600">{isLoading ? "..." : (kpis[1]?.value || "4")}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("chemicals")}>
          <div className="text-sm font-semibold text-danger">Low Stock / Expiring</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : (kpis[2]?.value || "7")}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("issue_return")}>
          <div className="text-sm font-semibold text-muted">Unreturned Items</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : (kpis[3]?.value || "12")}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-surface-muted px-4 py-3 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground">Today&apos;s Lab Timeline</h3>
              <button type="button" className="text-sm text-blue-600 font-semibold hover:underline" onClick={() => onNavigate("schedule")}>View All</button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="text-muted border-b border-border">
                    <th className="pb-2 font-semibold">Time</th>
                    <th className="pb-2 font-semibold">Subject</th>
                    <th className="pb-2 font-semibold">Class</th>
                    <th className="pb-2 font-semibold">Teacher</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 text-muted">08:10 AM</td>
                    <td className="py-3 font-medium text-foreground">Chemistry</td>
                    <td className="py-3 text-foreground">Form 4 West</td>
                    <td className="py-3 text-muted">Mrs. Njeri</td>
                    <td className="py-3"><StatusChip label="In Progress" tone="info" /></td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline font-semibold text-xs"
                        onClick={() =>
                          openLabWorkflow(createLabWorkflowDraft("Complete practical", {
                            subject: "Chemistry",
                            teacher: "Mrs. Njeri",
                            className: "Form 4 West",
                            item: "Issued practical items",
                            dueDate: "Today",
                            notes: "Confirm returned items, condition, completion note, and any breakage before closing the practical.",
                            tone: "success",
                          }))
                        }
                      >
                        Complete
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-muted">10:40 AM</td>
                    <td className="py-3 font-medium text-foreground">Biology</td>
                    <td className="py-3 text-foreground">Form 2 North</td>
                    <td className="py-3 text-muted">Mr. Kiptoo</td>
                    <td className="py-3"><StatusChip label="Preparation Needed" tone="warning" /></td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline font-semibold text-xs"
                        onClick={() =>
                          openLabWorkflow(createLabWorkflowDraft("Prepare practical checklist", {
                            subject: "Biology",
                            teacher: "Mr. Kiptoo",
                            className: "Form 2 North",
                            item: "Apparatus and specimens",
                            dueDate: "Today 10:40 AM",
                            notes: "Record apparatus, specimen readiness, safety checks, and bench setup before the class arrives.",
                          }))
                        }
                      >
                        Prepare
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-danger-border bg-danger-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-danger-border flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h3 className="font-bold text-rose-900">Urgent Alerts</h3>
            </div>
            <div className="p-4 space-y-3 text-sm text-danger">
              <div className="flex justify-between items-start">
                <span><strong>Hydrochloric Acid</strong> batch expires in 12 days.</span>
                <button type="button" className="text-rose-900 underline font-semibold text-xs" onClick={() => onNavigate("chemicals")}>View Item</button>
              </div>
              <div className="flex justify-between items-start">
                <span><strong>Microscope slides</strong> below reorder level.</span>
                <button type="button" className="text-rose-900 underline font-semibold text-xs" onClick={() => onNavigate("procurement")}>Request</button>
              </div>
              <div className="flex justify-between items-start">
                <span><strong>2 Voltmeters</strong> unreturned from Form 3 Blue.</span>
                <button type="button" className="text-rose-900 underline font-semibold text-xs" onClick={() => onNavigate("issue_return")}>Follow Up</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TeacherRequestsWorkspace({ openLabWorkflow }: { openLabWorkflow: (draft: LabWorkflowDraft) => void }) {
  const [requestStatusFilter, setRequestStatusFilter] = useState<"new" | "approved" | "preparation">("new");
  const requests = [
    { date: "Tomorrow 09:00 AM", teacher: "Ms. Atieno", subject: "Physics", prac: "Ohm's Law", pri: "High", status: "Under Review", filterStatus: "new", tone: "warning" },
    { date: "Wed 14:00 PM", teacher: "Mr. Kiptoo", subject: "Biology", prac: "Cell Structure", pri: "Normal", status: "Under Review", filterStatus: "new", tone: "warning" },
    { date: "Thu 11:00 AM", teacher: "Mrs. Njeri", subject: "Chemistry", prac: "Acid-base titration", pri: "Normal", status: "Approved", filterStatus: "approved", tone: "success" },
    { date: "Fri 08:00 AM", teacher: "Mr. Otieno", subject: "Biology", prac: "Food tests", pri: "High", status: "In Preparation", filterStatus: "preparation", tone: "info" },
  ] as const;
  const filteredRequests = requests.filter((request) => request.filterStatus === requestStatusFilter);
  const filterClass = (filter: typeof requestStatusFilter) =>
    cn(
      "px-4 py-1.5 rounded-full text-sm font-bold border transition",
      requestStatusFilter === filter
        ? "border-primary bg-primary text-white"
        : "border-border text-muted hover:bg-surface-muted",
    );

  return (
    <Panel title="Teacher Requests" description="Review, approve, and prepare teacher practical requests." icon={ClipboardList} actions={
      <div className="flex gap-2">
        <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground" onClick={() => openLabWorkflow(createLabWorkflowDraft("Bulk approve practical requests", { subject: "Teacher requests", notes: "Record the request batch, stock check outcome, safety clearance, and approval notes." }))}>Bulk Approve</button>
        <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white" onClick={() => openLabWorkflow(createLabWorkflowDraft("Create manual practical request", { notes: "Capture teacher, class, subject, required items, quantities, preparation date, and approval path." }))}>Create Request Manually</button>
      </div>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          <button type="button" className={filterClass("new")} onClick={() => setRequestStatusFilter("new")}>New ({requests.filter((request) => request.filterStatus === "new").length})</button>
          <button type="button" className={filterClass("approved")} onClick={() => setRequestStatusFilter("approved")}>Approved</button>
          <button type="button" className={filterClass("preparation")} onClick={() => setRequestStatusFilter("preparation")}>In Preparation</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Date Needed</th>
              <th className="px-4 py-3 font-bold border-b border-border">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-border">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-border">Practical</th>
              <th className="px-4 py-3 font-bold border-b border-border">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRequests.map((r, i) => (
              <tr key={i} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-semibold text-foreground">{r.date}</td>
                <td className="px-4 py-3 text-muted">{r.teacher}</td>
                <td className="px-4 py-3 text-foreground">{r.subject}</td>
                <td className="px-4 py-3 text-muted">{r.prac}</td>
                <td className="px-4 py-3 font-medium text-rose-600">{r.pri}</td>
                <td className="px-4 py-3"><StatusChip label={r.status} tone={r.tone as Tone} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-emerald-600 hover:underline font-semibold mr-3"
                    onClick={() =>
                      openLabWorkflow(createLabWorkflowDraft("Approve practical request", {
                        subject: `${r.subject} - ${r.prac}`,
                        teacher: r.teacher,
                        dueDate: r.date,
                        notes: "Confirm stock availability, safety requirements, preparation owner, and approval notes.",
                        tone: "success",
                      }))
                    }
                  >
                    Approve
                  </button>
                  <button type="button" className="text-blue-600 hover:underline font-semibold mr-3" onClick={() => openLabActionRecord("Teacher practical request", [["Teacher", r.teacher], ["Subject", r.subject], ["Practical", r.prac], ["Date Needed", r.date], ["Priority", r.pri], ["Status", r.status]])}>Review</button>
                  <button type="button" aria-label={`Download ${r.subject} request details`} className="p-1 text-muted hover:bg-border rounded" onClick={() => exportLabWorkspace(`${r.subject} ${r.prac} request`)}><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function IssueReturnWorkspace({ openLabWorkflow }: { openLabWorkflow: (draft: LabWorkflowDraft) => void }) {
  return (
    <Panel title="Issue / Return Desk" description="Handle issuing and returning of lab apparatus and equipment." icon={ArrowRightLeft} actions={
      <button type="button" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white" onClick={() => openLabWorkflow(createLabWorkflowDraft("Issue laboratory item", { notes: "Capture teacher, class, item, quantity, condition, due back date, and technician confirmation." }))}>
        Issue Item
      </button>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input type="text" placeholder="Search item, teacher, or class..." className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Issue No.</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Issued To</th>
              <th className="px-4 py-3 font-bold border-b border-border">Item</th>
              <th className="px-4 py-3 font-bold border-b border-border">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-border">Due Back</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { no: "ISS-0012", date: "Today", to: "Ms. Atieno", item: "Voltmeter", qty: "2", due: "Tomorrow", status: "Issued", tone: "info" },
              { no: "ISS-0010", date: "Yesterday", to: "Mr. Kiptoo", item: "Microscope", qty: "5", due: "Today", status: "Overdue", tone: "danger" },
            ].map((s, i) => (
              <tr key={i} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-semibold text-foreground">{s.no}</td>
                <td className="px-4 py-3 text-muted">{s.date}</td>
                <td className="px-4 py-3 text-foreground">{s.to}</td>
                <td className="px-4 py-3 text-muted">{s.item}</td>
                <td className="px-4 py-3 font-bold">{s.qty}</td>
                <td className="px-4 py-3 text-foreground">{s.due}</td>
                <td className="px-4 py-3"><StatusChip label={s.status} tone={s.tone as Tone} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline font-semibold mr-3"
                    onClick={() =>
                      openLabWorkflow(createLabWorkflowDraft("Record laboratory return", {
                        teacher: s.to,
                        item: s.item,
                        quantity: s.qty,
                        dueDate: s.due,
                        notes: `Return ${s.no}: record returned quantity, condition, and damage or loss follow-up.`,
                        tone: s.status === "Overdue" ? "warning" : "info",
                      }))
                    }
                  >
                    Return
                  </button>
                  <button type="button" aria-label={`View issue ${s.no} details`} className="p-1 text-muted hover:bg-border rounded" onClick={() => openLabActionRecord(`Lab issue ${s.no}`, [["Date", s.date], ["Issued To", s.to], ["Item", s.item], ["Quantity", s.qty], ["Due Back", s.due], ["Status", s.status]])}><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function LaboratoryTechnicianCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: RouteMode }) {
  const [activeViewState, setActiveViewState] = useState<ViewId>(
    (activeSection && activeSection !== "dashboard" ? activeSection : "overview") as ViewId
  );
  const [labWorkflowDraft, setLabWorkflowDraft] = useState<LabWorkflowDraft | null>(null);
  const [isSubmittingLabWorkflow, setIsSubmittingLabWorkflow] = useState(false);

  const setActiveView = (view: ViewId) => {
    setActiveViewState(view);
    const newPath = buildSchoolSectionHref("laboratory-technician", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };

  const submitLabWorkflow = async () => {
    if (!labWorkflowDraft) {
      return;
    }

    const subject = labWorkflowDraft.subject.trim();
    const notes = labWorkflowDraft.notes.trim();

    if (!subject || !notes) {
      toast.error("Add the laboratory workflow details", {
        description: "Subject/workflow and safety notes are required before this action can be saved.",
      });
      return;
    }

    setIsSubmittingLabWorkflow(true);
    const details = [
      `Subject: ${subject}`,
      labWorkflowDraft.teacher.trim() ? `Teacher/requester: ${labWorkflowDraft.teacher.trim()}` : null,
      labWorkflowDraft.className.trim() ? `Class/lab: ${labWorkflowDraft.className.trim()}` : null,
      labWorkflowDraft.item.trim() ? `Item: ${labWorkflowDraft.item.trim()}` : null,
      labWorkflowDraft.quantity.trim() ? `Quantity: ${labWorkflowDraft.quantity.trim()}` : null,
      labWorkflowDraft.dueDate.trim() ? `Date/due: ${labWorkflowDraft.dueDate.trim()}` : null,
      `Notes: ${notes}`,
    ].filter(Boolean).join("; ");

    const persisted = await recordLabAction(labWorkflowDraft.title, details, labWorkflowDraft.tone);
    setIsSubmittingLabWorkflow(false);

    if (persisted) {
      setLabWorkflowDraft(null);
    }
  };

  return (
    <div className="authenticated-app flex min-h-dvh bg-background font-sans">
      <aside className="hidden h-dvh w-[260px] shrink-0 overflow-y-auto bg-primary p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
        <SchoolCommandSidebarIdentity eyebrow="Laboratory command" title="Laboratory Technician" subtitle="Laboratory inventory, safety, and issue control" />
        <nav className="dashboard-navigation space-y-1" aria-label="Lab navigation">
          {navItems.map((item, index) => {
            const showGroup = item.group !== navItems[index - 1]?.group;
            const Icon = item.icon;
            return (
              <div key={`${item.group}-${item.label}`}>
                {showGroup ? <p className="dashboard-nav-group">{item.group}</p> : null}
                <button
                  aria-current={activeViewState === item.id ? "page" : undefined}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className="dashboard-nav-item"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="dashboard-nav-label">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="app-command-main flex h-dvh min-w-0 flex-1 flex-col">
        <header className="app-command-topbar sticky top-0 z-20 border-b border-border bg-white/90 px-4 py-3 backdrop-blur shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-xs font-black text-white shrink-0">LT</div>
              <h1 className="text-lg font-black text-foreground truncate">{navItems.find(i => i.id === activeViewState)?.label || "Dashboard"}</h1>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <StatusChip label="Term 2 (2026)" tone="info" />
              <button
                type="button"
                aria-label="Open laboratory search"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white"
                onClick={() => {
                  setActiveView("requests");
                  void recordLabAction("Open search and filters", "Laboratory search opened the teacher requests workspace with filters for practicals, stock, and issue records.", "info");
                }}
              >
                <Search className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <TaskQueue />
                <ApprovalInbox />
                <NotificationBell />
              </div>
            </div>
          </div>
          <div className="mt-3 lg:hidden">
            <MobileWorkspaceNavigation
              label="Laboratory workspace"
              items={navItems}
              value={activeViewState}
              onValueChange={(value) => setActiveView(value as ViewId)}
              testId="laboratory-mobile-workspace-nav"
            />
          </div>
        </header>
        <div className="app-content flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <IntegratedSchoolCommandHeader roleTitle="Laboratory Technician Dashboard" fallbackUserLabel="Laboratory Technician" />
          {activeViewState === "overview" && <OverviewWorkspace onNavigate={setActiveView} openLabWorkflow={setLabWorkflowDraft} />}
          {activeViewState === "requests" && <TeacherRequestsWorkspace openLabWorkflow={setLabWorkflowDraft} />}
          {activeViewState === "issue_return" && <IssueReturnWorkspace openLabWorkflow={setLabWorkflowDraft} />}
          {/* Dynamically render the rest with SimpleWorkspace */}
          {!["overview", "requests", "issue_return"].includes(activeViewState) && (
            <SimpleWorkspace 
              title={navItems.find(i => i.id === activeViewState)?.label || ""} 
              description={navItems.find(i => i.id === activeViewState)?.desc || ""} 
              icon={navItems.find(i => i.id === activeViewState)?.icon || AlertTriangle} 
              viewId={activeViewState}
              openLabWorkflow={setLabWorkflowDraft}
            />
          )}
        </div>
      </main>
      <LabWorkflowModal
        draft={labWorkflowDraft}
        submitting={isSubmittingLabWorkflow}
        onChange={setLabWorkflowDraft}
        onClose={() => {
          if (!isSubmittingLabWorkflow) {
            setLabWorkflowDraft(null);
          }
        }}
        onSubmit={submitLabWorkflow}
      />
    </div>
  );
}
