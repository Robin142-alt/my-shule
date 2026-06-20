"use client";

import { useState } from "react";
import { 
  LayoutDashboard, Banknote, GraduationCap, MessageSquare 
} from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

// Simple Panel wrapper
function Panel({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden mb-6">
      <div className="border-b bg-gray-50/50 p-4 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-[#071D49]">{title}</h2>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ParentOverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<any>("/api/parent/overview");

  return (
    <div className="space-y-6 max-w-5xl">
      <Panel title="Dashboard Overview" description="Recent activities and alerts for your children.">
        <div className="rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-sm text-center">
          {isLoading ? (
            <p className="text-[#64748B] text-sm">Loading overview...</p>
          ) : (
            <p className="text-[#64748B] text-sm">
              {data?.activities?.length ? "Activities found." : "No recent activities found."}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ParentAcademicsWorkspace() {
  const { data, isLoading } = useSchoolQuery<any>("/api/parent/academics");

  return (
    <div className="space-y-6 max-w-5xl">
      <Panel title="Academics & Performance" description="Track grades, assignments, and exam results.">
        <div className="rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-sm text-center">
          {isLoading ? (
            <p className="text-[#64748B] text-sm">Loading academics...</p>
          ) : (
            <p className="text-[#64748B] text-sm">
              {data?.grades?.length ? "Academic records found." : "No academic records found."}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ParentFinanceWorkspace() {
  const { data, isLoading } = useSchoolQuery<any>("/api/parent/finance");

  return (
    <div className="space-y-6 max-w-5xl">
      <Panel title="Fees & Payments" description="View fee statements, invoices, and payment history.">
        <div className="rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-sm text-center">
          {isLoading ? (
            <p className="text-[#64748B] text-sm">Loading finances...</p>
          ) : (
            <p className="text-[#64748B] text-sm">
              {data?.invoices?.length ? "Finance records found." : "No fee records found."}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ParentCommunicationWorkspace() {
  const { data, isLoading } = useSchoolQuery<any>("/api/parent/communication");

  return (
    <div className="space-y-6 max-w-5xl">
      <Panel title="Messages & Notices" description="Communication from the school.">
        <div className="rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-sm text-center">
          {isLoading ? (
            <p className="text-[#64748B] text-sm">Loading communications...</p>
          ) : (
            <p className="text-[#64748B] text-sm">
              {data?.messages?.length ? "Messages found." : "No messages available."}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

const navItems = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "academics", label: "Academics", icon: GraduationCap },
  { id: "fees", label: "Fees & Payments", icon: Banknote },
  { id: "messages", label: "Messages & Notices", icon: MessageSquare },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ParentCommandCenter() {
  const [activeView, setActiveView] = useState("overview");

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
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/15 text-white shadow-[inset_4px_0_0_#f97316]"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
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
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">SP</div>
              <div>
                <h1 className="text-lg font-black text-[#071D49]">Shule Platform</h1>
                <p className="text-xs font-bold text-[#64748B]">Parent Access</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeView === "overview" && <ParentOverviewWorkspace />}
          {activeView === "academics" && <ParentAcademicsWorkspace />}
          {activeView === "fees" && <ParentFinanceWorkspace />}
          {activeView === "messages" && <ParentCommunicationWorkspace />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#D8E0EC] bg-white lg:hidden">
        <div className="flex justify-around items-center px-2 py-2">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl text-[#64748B]",
                  isActive && "text-[#f97316]"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
