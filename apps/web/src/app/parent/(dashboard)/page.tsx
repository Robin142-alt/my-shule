import { 
  AlertTriangle, 
  FileText, 
  CheckSquare, 
  Search, 
  Clock, 
  Download,
  Calendar,
  Banknote,
  Users,
  ShieldAlert,
  HeartPulse,
  Bus,
  BedDouble,
  BookOpen,
  MessageCircle,
  Bell
} from "lucide-react";
import { cookies } from "next/headers";
import { readAccessCookie, readTenantCookie } from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: "success" | "info" | "warning" | "danger" | "neutral" }) {
  const toneClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const dotClasses = {
    success: "bg-emerald-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-slate-400",
  };

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold", toneClasses[tone])}>
      <span className={cn("h-2 w-2 rounded-full", dotClasses[tone])} />
      {label}
    </span>
  );
}

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#64748B]">
            <tr>
              {columns.map((column, i) => (
                <th key={i} className="px-4 py-3 font-black whitespace-nowrap">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row, i) => (
              <tr key={i} className="transition hover:bg-[#F8FAFC]">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 font-semibold text-[#334155] whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#64748B]">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default async function ParentdashboardPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const cookieStore = await cookies();
  const accessToken = readAccessCookie(cookieStore);
  const tenantSlug = readTenantCookie(cookieStore);
  const baseUrl = getDashboardApiBaseUrl(tenantSlug || undefined);
  const { studentId } = await searchParams;
  
  let dashboardData: any = null;
  if (accessToken && baseUrl) {
    try {
      const qs = studentId ? `?studentId=${studentId}` : "";
      const response = await fetch(`${baseUrl}/parent/dashboard${qs}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-auth-audience": "portal",
          ...(tenantSlug ? { "x-tenant-id": tenantSlug } : {})
        },
        cache: 'no-store'
      });
      if (response.ok) {
        dashboardData = await response.json();
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  }

  const payload = dashboardData?.data || {
    feeBalance: 0,
    attendance: null,
    academics: null,
    messages: 0,
    actionRequired: [],
    recentActivity: []
  };

  const attendanceStatus = payload.attendance?.status || "Unknown";
  const attendanceDate = payload.attendance?.attendance_date ? new Date(payload.attendance.attendance_date).toLocaleDateString() : "No records";

  return (
    <div className="max-w-6xl mx-auto">
      
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Banknote className="h-5 w-5 text-[#f97316]" />
              <h3 className="font-bold text-[#64748B]">Fee Balance</h3>
            </div>
            <p className="text-3xl font-black text-[#071D49]">KES {payload.feeBalance.toLocaleString()}</p>
            {payload.feeBalance > 0 && <p className="mt-2 text-xs text-rose-600 font-bold">Overdue Amount</p>}
            <button className="mt-4 w-full rounded-xl bg-[#f97316] py-2 text-sm font-black text-white hover:bg-[#ea580c] transition">Pay Fees</button>
          </div>
          
          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-[#64748B]">Attendance</h3>
            </div>
            <p className="text-3xl font-black text-[#071D49] capitalize">{attendanceStatus}</p>
            <p className="mt-2 text-xs text-[#64748B] font-bold">Marked at {attendanceDate}</p>
            <button className="mt-4 w-full rounded-xl border border-[#D8E0EC] py-2 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] transition">View History</button>
          </div>

          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-[#64748B]">Academics</h3>
            </div>
            <p className="text-xl font-black text-[#071D49]">{payload.academics ? `${payload.academics.term} ${payload.academics.status}` : "No reports yet"}</p>
            <button className="mt-4 w-full rounded-xl border border-[#D8E0EC] py-2 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] transition">Download PDF</button>
          </div>

          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-[#64748B]">Messages</h3>
            </div>
            <p className="text-3xl font-black text-[#071D49]">{payload.messages} Unread</p>
            <p className="mt-2 text-xs text-[#64748B] font-bold">Important updates</p>
            <button className="mt-4 w-full rounded-xl border border-[#D8E0EC] py-2 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] transition">Open Inbox</button>
          </div>
        </div>

        <Panel title="Action Required">
          <DataTable 
            columns={["Type", "Message", "Status", "Action"]}
            rows={
              payload.actionRequired.map((act: any, i: number) => [
                act.type, 
                act.message, 
                <StatusChip key={`s-${i}`} label={act.status} tone={act.tone || "warning"} />, 
                <button key={`b-${i}`} className="text-[#1D4ED8] font-bold text-sm">Resolve</button>
              ])
            }
          />
        </Panel>

        <Panel title="Recent Activity">
           <div className="space-y-4">
              {payload.recentActivity.map((act: any, i: number) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", act.type === 'payment' ? 'bg-emerald-500' : 'bg-blue-500')} />
                  <div>
                    <p className="font-bold text-[#071D49]">{act.message}</p>
                    <p className="text-xs text-[#64748B]">{act.date}</p>
                  </div>
                </div>
              ))}
              {payload.recentActivity.length === 0 && <p className="text-sm text-[#64748B]">No recent activity found.</p>}
           </div>
        </Panel>
      </div>
    
    </div>
  );
}
