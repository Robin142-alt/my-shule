const fs = require('fs');

const workspacesData = [
  {
    id: "overview",
    label: "Overview",
    icon: "Home",
    group: "Dashboard",
    desc: "Shows what needs attention today.",
    apiRoute: "/api/secretary/overview"
  },
  {
    id: "queue",
    label: "Front Office Queue",
    icon: "Users",
    group: "Reception",
    desc: "Manages all people coming physically to the school office.",
    columns: ["Ticket No.", "Time In", "Name", "Phone", "Type", "Purpose", "Linked Student", "Assigned To", "Waiting Time", "Status", "Actions"],
    actions: ["View", "Call Next", "Start Service", "Assign Office", "Mark Served", "Escalate", "Print Slip", "Cancel"],
    formTitle: "Add Walk-in Ticket",
    apiRoute: "/api/secretary/queue",
    dataKey: "queueData"
  },
  {
    id: "parent_desk",
    label: "Parent & Guardian Desk",
    icon: "UserCircle",
    group: "Reception",
    desc: "Handles parent-facing office requests.",
    columns: ["Request No.", "Parent Name", "Phone", "Student", "Class", "Request Type", "Assigned To", "Status", "Date", "Actions"],
    actions: ["View", "Assign", "Reply", "Mark Resolved", "Create Appointment", "Print Summary", "Escalate"],
    formTitle: "Register Parent Request",
    apiRoute: "/api/secretary/parents/requests",
    dataKey: "requests"
  },
  {
    id: "student_lookup",
    label: "Student Quick Lookup",
    icon: "Search",
    group: "Reception",
    desc: "Read-only access to student class, parent contacts, and status.",
    columns: ["Admission No.", "Student Name", "Class", "Stream", "Parent Phone", "Status", "Class Teacher", "Actions"],
    actions: ["View Profile", "Create Request", "Book Appointment", "Print Summary", "Send Message"],
    formTitle: "Student Search",
    apiRoute: "/api/secretary/students/search",
    dataKey: "students"
  },
  {
    id: "visitor_register",
    label: "Visitor Register",
    icon: "ClipboardList",
    group: "Reception",
    desc: "Records all non-parent and general visitors.",
    columns: ["Visitor Name", "Phone", "ID No.", "Purpose", "Person to See", "Time In", "Time Out", "Status", "Pass No.", "Actions"],
    actions: ["View", "Print Pass", "Notify Host", "Check Out", "Deny Entry", "Convert to Ticket"],
    formTitle: "Check In Visitor",
    apiRoute: "/api/secretary/visitors",
    dataKey: "visitors"
  },
  {
    id: "calls_log",
    label: "Calls Log",
    icon: "Phone",
    group: "Communication",
    desc: "Records incoming and outgoing office calls.",
    columns: ["Time", "Caller Name", "Phone", "Caller Type", "Student", "Reason", "Assigned To", "Follow-up Date", "Status", "Actions"],
    actions: ["View", "Return Call", "Create Request", "Assign Follow-up", "Mark Resolved", "Escalate", "Link Student", "Send SMS"],
    formTitle: "Log Call",
    apiRoute: "/api/secretary/calls",
    dataKey: "calls"
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: "Calendar",
    group: "Communication",
    desc: "Schedules and tracks meetings between parents/visitors and school staff.",
    columns: ["Date", "Time", "Parent/Visitor", "Student", "Meeting With", "Purpose", "Status", "Actions"],
    actions: ["View", "Confirm", "Check In", "Reschedule", "Notify Staff", "Mark Completed", "Cancel"],
    formTitle: "New Appointment",
    apiRoute: "/api/secretary/appointments",
    dataKey: "appointments"
  },
  {
    id: "letters",
    label: "Letters & Documents",
    icon: "FileText",
    group: "Office",
    desc: "Handles official school letters and printed documents.",
    columns: ["Document No.", "Type", "Student/Parent", "Requested By", "Prepared By", "Approval Status", "Date", "Actions"],
    actions: ["Preview", "Edit Draft", "Send for Approval", "Approve", "Print", "Download PDF", "Send to Parent", "Revoke"],
    formTitle: "New Letter Request",
    apiRoute: "/api/secretary/documents",
    dataKey: "documents"
  },
  {
    id: "admissions",
    label: "Admissions Handoff",
    icon: "UserPlus",
    group: "Office",
    desc: "Forwards admission leads to the Admissions Officer.",
    columns: ["Inquiry No.", "Parent Name", "Phone", "Student Name", "Target Class", "Source", "Status", "Assigned Officer", "Actions"],
    actions: ["View", "Call Parent", "Schedule Visit", "Forward", "Create Draft", "Send SMS", "Mark Closed", "Print Form"],
    formTitle: "Add Admission Inquiry",
    apiRoute: "/api/secretary/admissions/inquiries",
    dataKey: "inquiries"
  },
  {
    id: "communication",
    label: "Communication Desk",
    icon: "MessageSquare",
    group: "Communication",
    desc: "Allows the Secretary to send approved office messages and announcements.",
    columns: ["Date", "Recipient", "Channel", "Message Type", "Status", "Sent By", "Actions"],
    actions: ["View", "Resend", "Duplicate", "Cancel", "View Report"],
    formTitle: "New Message",
    apiRoute: "/api/secretary/messages",
    dataKey: "messages"
  },
  {
    id: "mail_parcels",
    label: "Mail, Deliveries & Parcels",
    icon: "Package",
    group: "Office",
    desc: "Tracks physical mail, deliveries, documents, and parcels entering or leaving school.",
    columns: ["Ref No.", "Date", "Sender", "Recipient", "Type", "Description", "Status", "Received By", "Actions"],
    actions: ["View", "Assign Recipient", "Notify Recipient", "Mark Collected", "Print Receipt", "Mark Returned", "Report Lost"],
    formTitle: "Record Mail/Parcel",
    apiRoute: "/api/secretary/mail-parcels",
    dataKey: "parcels"
  },
  {
    id: "staff_directory",
    label: "Staff Directory",
    icon: "Contact",
    group: "Reference",
    desc: "Staff contacts and office routing.",
    columns: ["Staff Name", "Role", "Department", "Phone", "Email", "Availability", "Office", "Actions"],
    actions: ["View", "Call", "Send Message", "Book Appointment", "Assign Request"],
    formTitle: "",
    apiRoute: "/api/secretary/staff",
    dataKey: "staff"
  },
  {
    id: "lost_found",
    label: "Lost & Found",
    icon: "HelpCircle",
    group: "Office",
    desc: "Tracks items reported lost or found.",
    columns: ["Item No.", "Item Name", "Category", "Found/Reported By", "Student Linked", "Location", "Date", "Status", "Actions"],
    actions: ["View", "Match", "Contact Owner", "Mark Claimed", "Print Slip", "Close"],
    formTitle: "Report Item",
    apiRoute: "/api/secretary/lost-found",
    dataKey: "items"
  },
  {
    id: "reports",
    label: "Reports",
    icon: "BarChart",
    group: "System",
    desc: "Generates front-office reports.",
    columns: ["Report Name", "Date Range", "Format", "Status", "Actions"],
    actions: ["View", "Download PDF", "Download Excel", "Print", "Send to Principal"],
    formTitle: "Generate Report",
    apiRoute: "/api/secretary/reports",
    dataKey: "reports"
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    group: "System",
    desc: "Secretary-level preferences only.",
    columns: [],
    actions: [],
    formTitle: "Update Settings",
    apiRoute: "/api/secretary/settings",
    dataKey: "settings"
  }
];

let tsx = `// GENERATED BY scaffold_secretary_detailed.js
"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  BarChart,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Clock,
  Contact,
  Download,
  FileText,
  Filter,
  HelpCircle,
  Home,
  Layers,
  Library,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Printer,
  Search,
  Settings,
  UserCircle,
  UserPlus,
  Users,
  X,
  XCircle,
  Eye,
  Edit,
  Trash2,
  type LucideIcon,
  Loader2,
} from "lucide-react";

import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

// ==========================================
// TYPES AND CONSTANTS
// ==========================================

type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type SecretaryView = ${workspacesData.map(w => `"${w.id}"`).join(" | ")};

type NavItem = {
  id: SecretaryView;
  label: string;
  icon: LucideIcon;
  group: string;
};

const navItems: NavItem[] = [
${workspacesData.map(w => `  { id: "${w.id}", label: "${w.label}", icon: ${w.icon}, group: "${w.group}" },`).join("\n")}
];

const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    card: "border-blue-200 bg-blue-50 text-blue-950",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50 text-rose-950",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-white text-[#071D49]",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ==========================================
// UTILITY COMPONENTS
// ==========================================

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
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function RealDataTable({ 
  columns, 
  actions, 
  data, 
  loading, 
  error,
  emptyIcon: EmptyIcon = FileText,
  emptyMessage = "No records found"
}: { 
  columns: string[], 
  actions: string[], 
  data: any[], 
  loading: boolean, 
  error: string | null,
  emptyIcon?: LucideIcon,
  emptyMessage?: string
}) {
  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] py-16 text-center">
        <Settings className="h-12 w-12 text-[#94A3B8]" />
        <h3 className="mt-4 text-lg font-bold text-[#071D49]">Configuration View</h3>
        <p className="mt-2 text-sm text-[#64748B]">Manage settings here.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] py-16 text-center">
        <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
        <p className="mt-2 text-sm text-[#64748B]">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
        <p className="mt-2 text-sm text-rose-700">{error}</p>
        <button className="mt-4 px-4 py-2 bg-white border border-rose-200 rounded-lg text-sm text-rose-700 hover:bg-rose-100 transition">Retry</button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] py-16 text-center">
        <EmptyIcon className="h-12 w-12 text-[#94A3B8]" />
        <h3 className="mt-4 text-lg font-bold text-[#071D49]">{emptyMessage}</h3>
        <p className="mt-2 text-sm text-[#64748B]">
          There are no items to display.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] mt-4">
      <table className="w-full text-left text-sm text-[#64748B]">
        <thead className="bg-[#F8FAFC] text-xs font-bold uppercase text-[#0F172A]">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 border-b border-[#E2E8F0] whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
              {columns.map((col, idx) => {
                if (col === 'Actions') {
                  return (
                    <td key={idx} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {actions.slice(0, 3).map((act, i) => (
                          <button key={i} className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap">
                            {act}
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                }
                if (col === 'Status') {
                  return (
                    <td key={idx} className="px-4 py-3">
                      <StatusChip label={row.status || "WAITING"} tone="info" />
                    </td>
                  );
                }
                const fieldKey = col.toLowerCase().replace(/[^a-z0-9]/g, '_');
                return (
                  <td key={idx} className="px-4 py-3 whitespace-nowrap">
                    {row[fieldKey] || \`\${col} Data\`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// WORKSPACES
// ==========================================
`;

workspacesData.forEach(w => {
  let primaryButton = '';
  if (w.formTitle) {
    primaryButton = `<button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#071D49]/90"><Plus className="inline-block w-4 h-4 mr-1" /> ${w.formTitle}</button>`;
  }

  const compName = w.id.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

  if (w.id === 'overview') {
    tsx += `
function OverviewWorkspace({ onNavigate }: { onNavigate: (v: SecretaryView) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const schoolId = getCurrentSchoolId() || "demo-school";
        const res = await fetch(\`${w.apiRoute}?schoolId=\${schoolId}\`);
        if (!res.ok) throw new Error("Failed to load overview data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        // Fallback or error state
        setError(err.message || "Could not load today's queue. Check your connection and retry.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Panel title="${w.label}" description="${w.desc}" icon={${w.icon}}>
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 flex justify-between items-center text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
          <button className="bg-white border border-rose-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-100" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("queue")}>
          <div className="text-sm font-semibold text-[#64748B]">Parents Waiting</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{loading ? "-" : (data?.parentsWaiting || 0)}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("visitor_register")}>
          <div className="text-sm font-semibold text-[#64748B]">Visitors On Site</div>
          <div className="mt-1 text-2xl font-black text-blue-600">{loading ? "-" : (data?.visitorsOnSite || 0)}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("appointments")}>
          <div className="text-sm font-semibold text-[#64748B]">Today's Appts</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{loading ? "-" : (data?.todaysAppts || 0)}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("letters")}>
          <div className="text-sm font-semibold text-[#64748B]">Pending Letters</div>
          <div className="mt-1 text-2xl font-black text-amber-600">{loading ? "-" : (data?.pendingLetters || 0)}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("calls_log")}>
          <div className="text-sm font-semibold text-[#64748B]">Missed Calls</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{loading ? "-" : (data?.missedCalls || 0)}</div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC]">
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#D8E0EC] font-bold text-[#071D49]">
            Today's Front Desk Queue
          </div>
          <RealDataTable 
            columns={["Ticket No.", "Visitor", "Status", "Actions"]} 
            actions={["Call Next", "Escalate"]} 
            data={data?.queue || []} 
            loading={loading}
            error={null}
            emptyIcon={Users}
            emptyMessage="No one is waiting at reception."
          />
        </div>
        <div className="rounded-xl border border-[#D8E0EC]">
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#D8E0EC] font-bold text-[#071D49]">
            Urgent Follow-ups
          </div>
          <div className="p-4 text-sm text-[#64748B]">
            {loading ? "Loading..." : "No urgent items."}
          </div>
        </div>
      </div>
    </Panel>
  );
}
`;
  } else {
    tsx += `
function ${compName}Workspace({ onNavigate }: { onNavigate: (v: SecretaryView) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const schoolId = getCurrentSchoolId() || "demo-school";
        const res = await fetch(\`${w.apiRoute}?schoolId=\${schoolId}\`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        // Assume API returns array directly or inside data key
        setData(Array.isArray(json) ? json : (json.${w.dataKey} || []));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load records. Check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Panel title="${w.label}" description="${w.desc}" icon={${w.icon}} actions={${primaryButton ? primaryButton : 'null'}}>
      <RealDataTable 
        columns={${JSON.stringify(w.columns || [])}} 
        actions={${JSON.stringify(w.actions || [])}} 
        data={data}
        loading={loading}
        error={error}
        emptyIcon={${w.icon}}
      />
    </Panel>
  );
}
`;
  }
});

tsx += `
// ==========================================
// MAIN SHELL
// ==========================================

export function SecretaryCommandCenterFull({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [activeView, setActiveView] = useState<SecretaryView>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeNav = navItems.find((n) => n.id === activeView);

  const groups = Array.from(new Set(navItems.map((n) => n.group)));

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#F1F5F9] font-sans text-[#0F172A] selection:bg-[#1D4ED8] selection:text-white rounded-xl overflow-hidden border border-[#D8E0EC]">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[#E2E8F0] bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#1D4ED8] text-sm font-black text-white">S</div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#1D4ED8]">MyShule</p>
              <h1 className="text-sm font-black text-[#0F172A]">Secretary Desk</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group}>
                <h3 className="px-2 text-xs font-black uppercase tracking-wider text-[#64748B] mb-2">{group}</h3>
                <nav className="space-y-1">
                  {navItems
                    .filter((n) => n.group === group)
                    .map((item) => {
                      const isActive = activeView === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveView(item.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                            isActive
                              ? "bg-[#EEF5FF] text-[#1D4ED8]"
                              : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                          )}
                        >
                          <Icon className={cn("h-5 w-5", isActive ? "text-[#1D4ED8]" : "text-[#94A3B8]")} />
                          {item.label}
                        </button>
                      );
                    })}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#F8FAFC]">
        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="sr-only">Open menu</span>
              <div className="space-y-1.5">
                <div className="h-0.5 w-6 bg-current rounded-full" />
                <div className="h-0.5 w-6 bg-current rounded-full" />
                <div className="h-0.5 w-6 bg-current rounded-full" />
              </div>
            </button>

            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input 
                type="text" 
                placeholder="Search students, parents, visitors..." 
                className="h-10 w-80 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative rounded-full p-2 text-[#64748B] hover:bg-[#F8FAFC] transition">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white" />
            </button>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {activeView === "overview" && <OverviewWorkspace onNavigate={setActiveView} />}
            {activeView === "queue" && <QueueWorkspace onNavigate={setActiveView} />}
            {activeView === "parent_desk" && <ParentDeskWorkspace onNavigate={setActiveView} />}
            {activeView === "student_lookup" && <StudentLookupWorkspace onNavigate={setActiveView} />}
            {activeView === "visitor_register" && <VisitorRegisterWorkspace onNavigate={setActiveView} />}
            {activeView === "calls_log" && <CallsLogWorkspace onNavigate={setActiveView} />}
            {activeView === "appointments" && <AppointmentsWorkspace onNavigate={setActiveView} />}
            {activeView === "letters" && <LettersWorkspace onNavigate={setActiveView} />}
            {activeView === "admissions" && <AdmissionsWorkspace onNavigate={setActiveView} />}
            {activeView === "communication" && <CommunicationWorkspace onNavigate={setActiveView} />}
            {activeView === "mail_parcels" && <MailParcelsWorkspace onNavigate={setActiveView} />}
            {activeView === "staff_directory" && <StaffDirectoryWorkspace onNavigate={setActiveView} />}
            {activeView === "lost_found" && <LostFoundWorkspace onNavigate={setActiveView} />}
            {activeView === "reports" && <ReportsWorkspace onNavigate={setActiveView} />}
            {activeView === "settings" && <SettingsWorkspace onNavigate={setActiveView} />}
          </div>
        </div>
      </main>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#1D4ED8] text-sm font-black text-white">S</div>
                <div>
                  <h1 className="text-sm font-black text-[#0F172A]">Secretary Desk</h1>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-[#64748B]">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group}>
                    <h3 className="px-2 text-xs font-black uppercase tracking-wider text-[#64748B] mb-2">{group}</h3>
                    <nav className="space-y-1">
                      {navItems
                        .filter((n) => n.group === group)
                        .map((item) => {
                          const isActive = activeView === item.id;
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveView(item.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold",
                                isActive
                                  ? "bg-[#EEF5FF] text-[#1D4ED8]"
                                  : "text-[#64748B]"
                              )}
                            >
                              <Icon className={cn("h-5 w-5", isActive ? "text-[#1D4ED8]" : "text-[#94A3B8]")} />
                              {item.label}
                            </button>
                          );
                        })}
                    </nav>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/components/school/secretary-command-center-full.tsx', tsx);
console.log('Successfully generated apps/web/src/components/school/secretary-command-center-full.tsx with actual API Fetching and Empty/Error states.');
