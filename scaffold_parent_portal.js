const fs = require('fs');
const path = require('path');

const workspaces = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "" },
  { id: "children", label: "My Children", icon: "Users", path: "children" },
  { id: "fees", label: "Fees & Payments", icon: "Banknote", path: "fees" },
  { id: "attendance", label: "Attendance", icon: "CalendarCheck", path: "attendance" },
  { id: "academics", label: "Academics", icon: "GraduationCap", path: "academics" },
  { id: "report-cards", label: "Report Cards", icon: "FileText", path: "report-cards" },
  { id: "discipline", label: "Discipline / Behavior", icon: "ShieldAlert", path: "discipline" },
  { id: "health", label: "Health / Sick Bay", icon: "HeartPulse", path: "health" },
  { id: "library", label: "Library", icon: "Library", path: "library" },
  { id: "transport", label: "Transport", icon: "Bus", path: "transport" },
  { id: "boarding", label: "Boarding", icon: "BedDouble", path: "boarding" },
  { id: "notices", label: "Notices & Events", icon: "Megaphone", path: "notices" },
  { id: "messages", label: "Messages", icon: "MessageSquare", path: "messages" },
  { id: "requests", label: "Requests & Consent", icon: "FileSignature", path: "requests" },
  { id: "downloads", label: "Downloads", icon: "Download", path: "downloads" },
  { id: "notifications", label: "Notifications", icon: "Bell", path: "notifications" },
  { id: "profile", label: "Profile & Settings", icon: "Settings", path: "profile" },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Generate Parent Portal Shell
const shellCode = `// GENERATED FILE
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Banknote, CalendarCheck, GraduationCap, 
  FileText, ShieldAlert, HeartPulse, Library, Bus, BedDouble, 
  Megaphone, MessageSquare, FileSignature, Download, Bell, Settings, Search 
} from "lucide-react";

const navItems = [
${workspaces.map(w => `  { label: "${w.label}", icon: ${w.icon}, href: "/parent${w.path ? '/' + w.path : ''}" },`).join("\n")}
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ParentPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // A very simple heuristic to decide active nav
  const isActive = (href: string) => {
    if (href === "/parent" && pathname === "/parent") return true;
    if (href !== "/parent" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-[#F3F6FA]">
      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-[260px] overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f97316]/90">MyShule</p>
          <h2 className="mt-2 text-xl font-black">Parent Portal</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">Stay connected.</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white",
                  isActive(item.href) && "bg-white/15 text-white shadow-[inset_4px_0_0_#f97316]"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden pb-[60px] lg:pb-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur shrink-0">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">KB</div>
              <div>
                <h1 className="text-lg font-black text-[#071D49]">Kisumu Boys High School</h1>
                <p className="text-xs font-bold text-[#64748B]">2026 Academic Year • Term 2</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-xl border border-[#D8E0EC] bg-white pl-4 pr-10 text-sm font-bold text-[#071D49] outline-none hover:border-[#071D49]">
                  <option>Viewing: Brian Otieno (Form 2)</option>
                  <option>Viewing: Mark Otieno (Form 4)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#071D49]">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              
              <Link href="/parent/notifications" className="relative text-[#64748B] hover:text-[#071D49]">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">3</span>
              </Link>
              
              <button className="hidden sm:inline-flex h-10 items-center justify-center rounded-xl bg-[#f97316] px-4 text-sm font-black text-white hover:bg-[#ea580c] transition">
                Quick Pay Fees
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#D8E0EC] bg-white lg:hidden">
        <div className="flex justify-around items-center px-2 py-2">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard, href: '/parent' },
            { id: 'fees', label: 'Fees', icon: Banknote, href: '/parent/fees' },
            { id: 'academics', label: 'Academics', icon: GraduationCap, href: '/parent/academics' },
            { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/parent/messages' },
            { id: 'more', label: 'More', icon: Search, href: '/parent/profile' }
          ].map(item => {
            const active = isActive(item.href);
            return (
              <Link 
                key={item.id} 
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl text-[#64748B]",
                  active && "text-[#f97316]"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  );
}
`;
ensureDir('apps/web/src/components/parent');
fs.writeFileSync('apps/web/src/components/parent/parent-portal-shell.tsx', shellCode);

// 2. Generate Layout
const layoutCode = `import { ReactNode } from "react";
import { ParentPortalShell } from "@/components/parent/parent-portal-shell";

export default function ParentDashboardLayout({ children }: { children: ReactNode }) {
  return <ParentPortalShell>{children}</ParentPortalShell>;
}
`;
ensureDir('apps/web/src/app/parent/(dashboard)');
fs.writeFileSync('apps/web/src/app/parent/(dashboard)/layout.tsx', layoutCode);

// 3. Generate Pages
const commonImports = `import { 
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
`;

workspaces.forEach(w => {
  const dirPath = path.join('apps/web/src/app/parent/(dashboard)', w.path);
  ensureDir(dirPath);
  
  let customContent = "";
  if (w.id === "dashboard") {
    customContent = `
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Banknote className="h-5 w-5 text-[#f97316]" />
              <h3 className="font-bold text-[#64748B]">Fee Balance</h3>
            </div>
            <p className="text-3xl font-black text-[#071D49]">KES 12,500</p>
            <p className="mt-2 text-xs text-rose-600 font-bold">Term 2 Overdue</p>
            <button className="mt-4 w-full rounded-xl bg-[#f97316] py-2 text-sm font-black text-white hover:bg-[#ea580c] transition">Pay Fees</button>
          </div>
          
          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-[#64748B]">Attendance</h3>
            </div>
            <p className="text-3xl font-black text-[#071D49]">Present</p>
            <p className="mt-2 text-xs text-[#64748B] font-bold">Marked at 07:30 AM</p>
            <button className="mt-4 w-full rounded-xl border border-[#D8E0EC] py-2 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] transition">View History</button>
          </div>

          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-[#64748B]">Academics</h3>
            </div>
            <p className="text-xl font-black text-[#071D49]">Term 1 Report Published</p>
            <button className="mt-4 w-full rounded-xl border border-[#D8E0EC] py-2 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] transition">Download PDF</button>
          </div>

          <div className="rounded-xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-[#64748B]">Messages</h3>
            </div>
            <p className="text-3xl font-black text-[#071D49]">2 Unread</p>
            <p className="mt-2 text-xs text-[#64748B] font-bold">From Class Teacher</p>
            <button className="mt-4 w-full rounded-xl border border-[#D8E0EC] py-2 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] transition">Open Inbox</button>
          </div>
        </div>

        <Panel title="Action Required">
          <DataTable 
            columns={["Type", "Message", "Status", "Action"]}
            rows={[
              ["Fees", "Term 2 balance KES 12,500", <StatusChip key="1" label="Pending" tone="warning" />, <button key="b1" className="text-[#1D4ED8] font-bold text-sm">Pay Fees</button>],
              ["Consent", "Geography Trip to Longonot", <StatusChip key="2" label="Required" tone="danger" />, <button key="b2" className="text-[#1D4ED8] font-bold text-sm">Give Consent</button>],
            ]}
          />
        </Panel>

        <Panel title="Recent Activity">
           <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-[#071D49]">Payment of KES 5,000 received.</p>
                  <p className="text-xs text-[#64748B]">Yesterday at 14:30</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="font-bold text-[#071D49]">Term 1 Report Card published by Principal.</p>
                  <p className="text-xs text-[#64748B]">Monday</p>
                </div>
              </div>
           </div>
        </Panel>
      </div>
    `;
  } else if (w.id === "fees") {
    customContent = `
      <div className="space-y-6">
        <Panel title="Fee Summary" actions={<button className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-black text-white">Pay Fees</button>}>
           <DataTable 
             columns={["Fee Item", "Amount Billed", "Amount Paid", "Balance", "Due Date", "Status", "Action"]}
             rows={[
               ["Tuition Term 2", "KES 20,000", "KES 7,500", "KES 12,500", "2026-05-10", <StatusChip key="1" label="Overdue" tone="danger" />, <button key="a" className="text-[#1D4ED8] font-bold text-sm">Pay</button>],
               ["Transport Term 2", "KES 5,000", "KES 5,000", "KES 0", "2026-05-10", <StatusChip key="2" label="Cleared" tone="success" />, <span key="b" className="text-[#64748B]">N/A</span>]
             ]}
           />
        </Panel>
        
        <Panel title="Recent Receipts">
           <DataTable 
             columns={["Receipt No.", "Date", "Amount", "Method", "Action"]}
             rows={[
               ["RCT-2026-098", "Yesterday", "KES 5,000", "M-Pesa", <button key="a" className="text-[#1D4ED8] font-bold text-sm">Download</button>],
               ["RCT-2026-021", "2026-01-15", "KES 2,500", "Bank Transfer", <button key="b" className="text-[#1D4ED8] font-bold text-sm">Download</button>],
             ]}
           />
        </Panel>
      </div>
    `;
  } else {
    customContent = `
      <Panel title="${w.label}" description="Parent workspace for ${w.label.toLowerCase()}">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-[#64748B]/30 mb-4" />
          <p className="text-lg font-semibold text-[#071D49]">Content coming soon</p>
          <p className="mt-2 text-sm text-[#64748B]">This module connects to real-time school data.</p>
        </div>
      </Panel>
    `;
  }

  const pageCode = `
${commonImports}

export default function Parent${w.id.replace(/-/g, '')}Page() {
  return (
    <div className="max-w-6xl mx-auto">
      ${customContent}
    </div>
  );
}
`;

  fs.writeFileSync(path.join(dirPath, 'page.tsx'), pageCode);
});

// 4. Generate API Module structure
ensureDir('apps/api/src/parent-portal');
const moduleCode = `import { Module } from '@nestjs/common';
import { ParentPortalController } from './parent-portal.controller';
import { ParentPortalService } from './parent-portal.service';

@Module({
  controllers: [ParentPortalController],
  providers: [ParentPortalService],
})
export class ParentPortalModule {}
`;
fs.writeFileSync('apps/api/src/parent-portal/parent-portal.module.ts', moduleCode);

const controllerCode = `import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ParentPortalService } from './parent-portal.service';

@Controller('api/parent')
export class ParentPortalController {
  constructor(private readonly service: ParentPortalService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboardData();
  }

  @Get('children')
  getChildren() {
    return this.service.getChildren();
  }

  @Get('fees/:studentId')
  getFees(@Param('studentId') studentId: string) {
    return this.service.getFees(studentId);
  }
}
`;
fs.writeFileSync('apps/api/src/parent-portal/parent-portal.controller.ts', controllerCode);

const serviceCode = `import { Injectable } from '@nestjs/common';

@Injectable()
export class ParentPortalService {
  getDashboardData() {
    return { status: "success", data: [] };
  }

  getChildren() {
    return { status: "success", data: [] };
  }

  getFees(studentId: string) {
    return { status: "success", studentId, data: [] };
  }
}
`;
fs.writeFileSync('apps/api/src/parent-portal/parent-portal.service.ts', serviceCode);

console.log("Scaffold complete.");
