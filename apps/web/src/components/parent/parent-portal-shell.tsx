// GENERATED FILE
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
  { label: "Dashboard", icon: LayoutDashboard, href: "/parent" },
  { label: "My Children", icon: Users, href: "/parent/children" },
  { label: "Fees & Payments", icon: Banknote, href: "/parent/fees" },
  { label: "Attendance", icon: CalendarCheck, href: "/parent/attendance" },
  { label: "Academics", icon: GraduationCap, href: "/parent/academics" },
  { label: "Report Cards", icon: FileText, href: "/parent/report-cards" },
  { label: "Discipline / Behavior", icon: ShieldAlert, href: "/parent/discipline" },
  { label: "Health / Sick Bay", icon: HeartPulse, href: "/parent/health" },
  { label: "Library", icon: Library, href: "/parent/library" },
  { label: "Transport", icon: Bus, href: "/parent/transport" },
  { label: "Boarding", icon: BedDouble, href: "/parent/boarding" },
  { label: "Notices & Events", icon: Megaphone, href: "/parent/notices" },
  { label: "Messages", icon: MessageSquare, href: "/parent/messages" },
  { label: "Requests & Consent", icon: FileSignature, href: "/parent/requests" },
  { label: "Downloads", icon: Download, href: "/parent/downloads" },
  { label: "Notifications", icon: Bell, href: "/parent/notifications" },
  { label: "Profile & Settings", icon: Settings, href: "/parent/profile" },
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
