"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Smartphone,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import type { OperationalSearchAction } from "@/lib/search/operational-search-registry";
import { resolveOperationalSearch } from "@/lib/search/operational-search-resolver";

const schoolNavItems = [
  { id: "dashboard", label: "Dashboard", href: "", icon: LayoutDashboard },
  { id: "students", label: "Students", href: "/students", icon: Users },
  { id: "admissions", label: "Admissions", href: "/admissions", icon: UserPlus },
  { id: "finance", label: "Finance", href: "/finance", icon: Wallet },
  { id: "mpesa", label: "MPESA", href: "/mpesa", icon: Smartphone },
  { id: "academics", label: "Academics", href: "/academics", icon: GraduationCap },
  { id: "exams", label: "Exams", href: "/exams", icon: BookOpen },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { id: "communication", label: "Communication", href: "/communication", icon: MessageSquare },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const globalSearchRoles = new Set(["principal", "deputy-principal", "secretary", "accountant"]);

type SchoolShellSearchResult = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tag: string;
  actions?: OperationalSearchAction[];
};

export function SchoolShell({
  role,
  schoolName,
  schoolCounty,
  userName,
  userRole,
  onLogout,
  children,
}: {
  role: string;
  schoolName?: string;
  schoolCounty?: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const basePath = `/school/${role}`;
  const visibleSchoolNavItems = schoolNavItems.filter((item) => isProductionReadyModule(item.id));
  const mainItems = visibleSchoolNavItems.filter((i) => i.id !== "settings");
  const bottomItems = visibleSchoolNavItems.filter((i) => i.id === "settings");
  const canUseGlobalSearch = globalSearchRoles.has(role);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  function toRoleHref(href: string) {
    const [rawPath, rawQuery] = href.split("?");
    const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const schoolPath = normalizedPath.startsWith("/finance/mpesa")
      ? "/mpesa"
      : normalizedPath;

    return `${basePath}${schoolPath}${rawQuery ? `?${rawQuery}` : ""}`;
  }

  function openSearchResult(href: string) {
    setSearchTerm("");
    setSearchOpen(false);
    setNotificationsOpen(false);
    router.push(href);
  }

  function defaultResultHref(type: string) {
    const deskByType: Record<string, string> = {
      student: "/students",
      parent: "/students",
      receipt: "/finance",
      invoice: "/finance",
      mpesa: "/mpesa",
      visitor: "/visitors",
      admission: "/admissions",
      disciplineCase: "/discipline",
      healthCase: "/clinic",
      book: "/library",
      inventory: "/inventory",
      route: "/transport",
      bus: "/transport",
      assignment: "/academics",
      exam: "/exams",
      document: "/reports",
    };

    return `${basePath}${deskByType[type] ?? ""}`;
  }

  const navigationSearchResults: SchoolShellSearchResult[] = visibleSchoolNavItems.map((item) => ({
      id: `nav-${item.id}`,
      label: item.label,
      detail: `Open ${item.label.toLowerCase()} desk`,
      href: item.href ? `${basePath}${item.href}` : basePath,
      tag: "Section",
  }));
  const operationalSearchResults: SchoolShellSearchResult[] = canUseGlobalSearch && normalizedSearchTerm
    ? resolveOperationalSearch(searchTerm, { role })
      .map((record) => ({
        id: record.id,
        label: record.title,
        detail: record.detail,
        href: defaultResultHref(record.type),
        tag: record.typeLabel,
        actions: record.actions.slice(0, 3),
      }))
    : [];
  const searchResults = [...navigationSearchResults, ...operationalSearchResults];
  const visibleSearchResults = normalizedSearchTerm
    ? searchResults
        .filter((item) => `${item.label} ${item.detail} ${item.tag}`.toLowerCase().includes(normalizedSearchTerm))
        .slice(0, 6)
    : [];

  function openRoleNotifications() {
    setSearchOpen(false);
    setNotificationsOpen((value) => !value);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#e8eaed] bg-white lg:flex">
        <div className="border-b border-[#e8eaed] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <span className="text-sm font-bold text-white">{(schoolName ?? "GF").slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#1a1d26]">{schoolName ?? "School portal"}</p>
              <p className="text-[11px] text-[#8b8f9a]">{schoolCounty ?? "Secure school access"}</p>
            </div>
          </div>
        </div>
        <div className="border-b border-[#e8eaed] px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b8f9a]">Current term</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Configured live</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
          <div className="space-y-0.5">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const href = item.href ? `${basePath}${item.href}` : basePath;
              const isActive = item.href === "" ? pathname === basePath : pathname.startsWith(`${basePath}${item.href}`);
              return (
                <Link key={item.id} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${isActive ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100" : "text-[#5a5e6a] hover:bg-[#f3f4f6] hover:text-[#1a1d26]"}`}>
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-emerald-600" : "text-[#9ca0ab]"}`} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-[#e8eaed] px-3 py-3 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const href = `${basePath}${item.href}`;
            return (
              <Link key={item.id} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#5a5e6a] hover:bg-[#f3f4f6]">
                <Icon className="h-[18px] w-[18px] shrink-0" /><span>{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500/70 transition hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-[18px] w-[18px] shrink-0" /><span>Sign out</span>
          </button>
        </div>
        <div className="border-t border-[#e8eaed] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white shadow-sm">{(userName ?? "WM").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#1a1d26]">{userName ?? "Signed-in user"}</p>
              <p className="text-[11px] text-[#8b8f9a]">{userRole ?? "School operator"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#1a1d26]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="slide-in-sidebar absolute inset-y-0 left-0 w-[280px] border-r border-[#e8eaed] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8eaed] px-5 py-4">
              <p className="text-sm font-semibold text-[#1a1d26]">{schoolName ?? "School desk"}</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg border border-[#e8eaed] p-2 text-[#8b8f9a]"><X className="h-4 w-4" /></button>
            </div>
            <nav className="px-3 py-3">
              <div className="space-y-0.5">
                {visibleSchoolNavItems.map((item) => {
                  const Icon = item.icon;
                  const href = item.href ? `${basePath}${item.href}` : basePath;
                  const isActive = item.href === "" ? pathname === basePath : pathname.startsWith(`${basePath}${item.href}`);
                  return (
                    <Link key={item.id} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? "bg-emerald-50 text-emerald-700" : "text-[#5a5e6a]"}`}>
                      <Icon className="h-[18px] w-[18px] shrink-0" /><span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-[#e8eaed] bg-white/95 backdrop-blur-lg">
          <div className="mx-auto flex h-[56px] max-w-[1360px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-[#e8eaed] p-2.5 text-[#5a5e6a] lg:hidden"><Menu className="h-4 w-4" /></button>
              <div className="hidden items-center gap-2 md:flex">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b8f9a]">School synced</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canUseGlobalSearch ? (
                <div className="relative hidden md:block">
                  <label className="flex items-center gap-2 rounded-xl border border-[#e8eaed] bg-[#f7f8fa] px-3.5 py-2">
                    <Search className="h-4 w-4 text-[#9ca0ab]" />
                    <input
                      type="search"
                      aria-label="School search"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setSearchOpen(false), 120);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && visibleSearchResults[0]) {
                          event.preventDefault();
                          openSearchResult(visibleSearchResults[0].href);
                        }
                      }}
                      placeholder="Search students, payments, visitors"
                      className="w-[240px] bg-transparent text-sm text-[#1a1d26] outline-none placeholder:text-[#b0b4be]"
                    />
                  </label>
                  {searchOpen && normalizedSearchTerm ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[340px] rounded-xl border border-[#e8eaed] bg-white p-2 shadow-xl">
                      {visibleSearchResults.length > 0 ? (
                        visibleSearchResults.map((result) => (
                          <div
                            key={result.id}
                            className="rounded-lg px-3 py-2 transition hover:bg-[#f3f4f6]"
                          >
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => openSearchResult(result.href)}
                              className="flex w-full items-start justify-between gap-3 text-left"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-[#1a1d26]">{result.label}</span>
                                <span className="mt-0.5 block text-xs leading-5 text-[#5a5e6a]">{result.detail}</span>
                              </span>
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                                {result.tag}
                              </span>
                            </button>
                            {result.actions?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {result.actions.map((action) => (
                                  <button
                                    key={`${result.id}-${action.label}`}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => openSearchResult(toRoleHref(action.href))}
                                    className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100"
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg px-3 py-3 text-sm text-[#5a5e6a]">
                          No school records found for &ldquo;{searchTerm}&rdquo;.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open school notifications"
                  aria-expanded={notificationsOpen}
                  onClick={openRoleNotifications}
                  className="relative rounded-xl border border-[#e8eaed] p-2.5 text-[#5a5e6a] transition hover:bg-[#f3f4f6]"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">4</span>
                </button>
                {notificationsOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[320px] rounded-xl border border-[#e8eaed] bg-white p-2 shadow-xl">
                    {[
                      ["Attendance registers", "7 registers still need submission before 9:00 AM", `${basePath}/students`],
                      ["Fee reminders", "42 students need balance follow-up", `${basePath}/finance`],
                      ["Visitor log", "6 visitors are currently inside school", `${basePath}/visitors`],
                      ["Approval queue", "5 requests need a decision today", `${basePath}/reports`],
                    ].map(([title, detail, href]) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          router.push(href);
                        }}
                        className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#f3f4f6]"
                      >
                        <span>
                          <span className="block text-sm font-bold text-[#1a1d26]">{title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#5a5e6a]">{detail}</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Open</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => router.push(`${basePath}/settings`)}
                className="hidden items-center gap-2 rounded-xl border border-[#e8eaed] px-3 py-2 text-sm text-[#5a5e6a] md:flex"
              >
                <span>{userName ?? "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1360px] px-4 py-5 md:px-6 lg:px-8">
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
