"use client";

import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  ServerCog,
  ShieldCheck,
  SmartphoneCharging,
  Users,
  Waypoints,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { TaskQueue } from "../shared/task-queue";
import { ApprovalInbox } from "../shared/approval-inbox";
import { NotificationBell } from "../shared/notification-bell";
import { WorkflowToast } from "../shared/workflow-toast";

/* ─── Nav Config ─────────────────────────────────────────────────── */
const superadminNav = [
  { id: "overview", label: "Overview", href: "/superadmin", icon: Activity },
  { id: "schools", label: "Schools", href: "/superadmin/tenants", icon: Building2 },
  { id: "revenue", label: "Revenue", href: "/superadmin/revenue", icon: CircleDollarSign },
  { id: "subscriptions", label: "Subscriptions", href: "/superadmin/subscriptions", icon: CreditCard },
  { id: "mpesa", label: "MPESA Monitoring", href: "/superadmin/mpesa-monitoring", icon: SmartphoneCharging },
  { id: "users", label: "Users", href: "/superadmin/users", icon: Users },
  { id: "support", label: "Support", href: "/superadmin/support", icon: LifeBuoy },
  { id: "audit", label: "Audit Logs", href: "/superadmin/audit-logs", icon: ShieldCheck },
  { id: "infra", label: "Infrastructure", href: "/superadmin/infrastructure", icon: ServerCog },
  { id: "notifications", label: "Notifications", href: "/superadmin/notifications", icon: Bell },
  { id: "settings", label: "Settings", href: "/superadmin/settings", icon: Waypoints },
];

const platformNotifications = [
  {
    id: "failed-sms",
    title: "Failed SMS deliveries",
    detail: "23 parent messages need retry across active schools.",
    href: "/superadmin/sms-settings?filter=failed",
  },
  {
    id: "mpesa-callbacks",
    title: "M-Pesa callback issues",
    detail: "Four payment confirmations need reconciliation.",
    href: "/superadmin/mpesa-monitoring?filter=failed-callbacks",
  },
  {
    id: "school-setup",
    title: "School setup tasks",
    detail: "Three schools have incomplete term, class, or fee setup.",
    href: "/superadmin/schools?filter=setup",
  },
  {
    id: "support-sla",
    title: "Support SLA warning",
    detail: "Two school tickets are close to escalation.",
    href: "/superadmin/support?filter=sla",
  },
  {
    id: "backup-review",
    title: "Backup review",
    detail: "Yesterday's verification report is ready for review.",
    href: "/superadmin/infrastructure?panel=backups",
  },
  {
    id: "audit-alert",
    title: "Audit alert",
    detail: "Permission changes were made by a platform operator.",
    href: "/superadmin/audit-logs?filter=permissions",
  },
] as const;

/* ─── Super Admin Shell ──────────────────────────────────────────── */
export function SuperAdminShell({
  children,
  userName,
  onLogout,
}: {
  children: ReactNode;
  userName?: string;
  onLogout?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Platform control ready for schools, billing, support, M-Pesa, SMS, and system health.");
  const searchResults = searchTerm.trim()
    ? superadminNav.filter((item) =>
        [item.label, item.id, item.href].some((value) => value.toLowerCase().includes(searchTerm.trim().toLowerCase())),
      )
    : [];

  function openPlatformPath(href: string, message: string) {
    setNotice(message);
    setSearchTerm("");
    setNotificationsOpen(false);
    setProfileOpen(false);
    router.push(href);
  }

  return (
    <div className="sa-shell min-h-screen bg-[#F3F4F6]">
      {/* ── Desktop Sidebar ── */}
      <aside className="sa-sidebar fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-white/10 bg-[#071D49] lg:flex">
        {/* Brand */}
        <div className="border-b border-white/[0.06] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF7A1A] shadow-lg shadow-orange/20">
              <span className="text-sm font-bold text-white">SH</span>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white tracking-tight">My Shule</p>
              <p className="text-[11px] text-white/40">Platform Control</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Navigation
          </p>
          <div className="space-y-0.5">
            {superadminNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/superadmin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-white/10 text-white shadow-[inset_4px_0_0_#FF7A1A]"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-[#FF7A1A]" : "text-white/35 group-hover:text-white/70"}`} />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom profile */}
        <div className="border-t border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A1A] text-xs font-bold text-white">
              {(userName ?? "RM").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white/90">{userName ?? "Robin Mwangi"}</p>
              <p className="text-[11px] text-white/30">Platform owner</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg p-2 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#071D49]/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="slide-in-sidebar absolute inset-y-0 left-0 w-[280px] border-r border-white/10 bg-[#071D49] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <p className="text-sm font-semibold text-white">Navigation</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-white/[0.08] p-2 text-white/40 hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="px-3 py-4">
              <div className="space-y-0.5">
                {superadminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                        isActive ? "bg-white/10 text-white shadow-[inset_4px_0_0_#FF7A1A]" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="lg:pl-[260px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-border bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex h-[60px] max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-white/[0.08] p-2.5 text-white/50 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="hidden items-center gap-2 md:flex">
                <div className="h-2 w-2 rounded-full bg-[#FF7A1A] pulse-indicator" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
                  Platform healthy
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative hidden items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 md:flex">
                <Search className="h-4 w-4 text-muted" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchResults[0]) {
                      openPlatformPath(searchResults[0].href, `Navigating to ${searchResults[0].label} from platform search.`);
                    }
                  }}
                  aria-label="Search schools, tickets, logs"
                  placeholder="Search schools, tickets, logs..."
                  className="w-[220px] bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                />
                {searchTerm.trim() ? (
                  <div className="absolute right-0 top-12 z-30 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                    {searchResults.length ? (
                      searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            openPlatformPath(item.href, `Navigating to ${item.label} from platform search.`);
                          }}
                          className="block w-full px-4 py-3 text-left text-sm transition hover:bg-surface-muted"
                        >
                          <span className="block font-semibold text-primary">{item.label}</span>
                          <span className="mt-1 block text-xs text-muted">{item.href}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-muted">No matching platform record found.</p>
                    )}
                  </div>
                ) : null}
              </label>
              <div className="flex items-center gap-2">
                <TaskQueue />
                <ApprovalInbox currentUserId="super-admin-user" />
                <NotificationBell />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm text-primary transition hover:border-accent/50 hover:text-accent"
                >
                  <span className="hidden md:inline">{userName ?? "Robin M."}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {profileOpen && (
                  <div className="fade-in-panel absolute right-0 top-12 w-48 rounded-xl border border-border bg-white p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); onLogout?.(); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
          <div role="status" className="mb-4 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm">
            {notice}
          </div>
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
