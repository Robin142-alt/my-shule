"use client";

import { useState } from "react";
import { Search, Monitor, ShieldAlert, Server, Smartphone, CheckCircle2, LayoutDashboard, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type IctView = "overview" | "helpdesk" | "inventory" | "access" | "logs";

function Panel({ title, description, icon: Icon, children, actions }: { title: string; description?: string; icon?: any; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function OverviewWorkspace() {
  const { data: ticketsData } = useSchoolQuery<any>("/api/support/tickets?limit=5");
  const { data: alertsData } = useSchoolQuery<any>("/api/observability/alerts");
  const { data: healthData } = useSchoolQuery<any>("/api/observability/health");
  const { data: assetsData } = useSchoolQuery<any>("/api/assets/dashboard");

  const openTickets = ticketsData?.meta?.total_items ?? 0;
  const systemAlerts = alertsData?.alerts?.length ?? healthData?.active_alert_count ?? 0;
  const assignedDevices = assetsData?.total_records ?? 0;
  const tickets = ticketsData?.data ?? [];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Open IT Tickets</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{openTickets}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Assigned Devices</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{assignedDevices}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">System Alerts</div>
          <div className={`mt-2 text-3xl font-black ${systemAlerts > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {systemAlerts}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Helpdesk Tickets</h2>
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Support tickets and infrastructure logs will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition">
                <div>
                  <p className="font-semibold text-[#071D49]">{ticket.subject}</p>
                  <p className="text-sm text-gray-500 mt-1">{ticket.status} • {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                <StatusPill label={ticket.priority} tone={ticket.priority === 'urgent' ? 'critical' : 'ok'} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ItHelpdeskWorkspace() {
  const { data: ticketsData, isLoading } = useSchoolQuery<any>("/api/support/tickets");
  const tickets = ticketsData?.data ?? [];

  return (
    <Panel title="IT Helpdesk" description="Manage support tickets from staff and students." icon={Monitor} actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white"><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>}>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading tickets...</p>
      ) : !tickets.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No IT tickets found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-black">Subject</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black">Priority</th>
                <th className="px-4 py-3 font-black">Created</th>
                <th className="px-4 py-3 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              {tickets.map((t: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{t.subject}</td>
                  <td className="px-4 py-3"><StatusPill label={t.status} tone="ok" /></td>
                  <td className="px-4 py-3"><StatusPill label={t.priority} tone={t.priority === 'urgent' ? 'critical' : 'ok'} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[#1D4ED8] hover:underline text-xs font-bold">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function DeviceInventoryWorkspace() {
  const { data: assetsData, isLoading } = useSchoolQuery<any>("/api/assets/dashboard");
  const assets = assetsData?.data ?? [];

  return (
    <Panel title="Device Inventory" description="Manage laptops, tablets, projectors, and other IT assets." icon={Smartphone} actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white"><Plus className="w-4 h-4 mr-2" /> Register Device</Button>}>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading assets...</p>
      ) : !assets.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No IT assets found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-black">Item Name</th>
                <th className="px-4 py-3 font-black">Category</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              {assets.map((a: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{a.item_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{a.category}</td>
                  <td className="px-4 py-3"><StatusPill label={a.status || 'Active'} tone="ok" /></td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[#1D4ED8] hover:underline text-xs font-bold">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function AccessControlWorkspace() {
  return (
    <Panel title="Access Control" description="Manage RFID tags, gate access, and network credentials." icon={ShieldAlert}>
      <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
        Access control module will be deployed shortly. 
      </div>
    </Panel>
  );
}

function SystemLogsWorkspace() {
  const { data: alertsData, isLoading } = useSchoolQuery<any>("/api/observability/alerts");
  const alerts = alertsData?.alerts ?? [];

  return (
    <Panel title="System Logs" description="Review server logs, observability metrics, and infrastructure alerts." icon={Server}>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading alerts...</p>
      ) : !alerts.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No system alerts at the moment. Everything is running smoothly.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
              <div>
                <p className="font-bold text-red-800">{alert.name}</p>
                <p className="text-xs text-red-600 mt-1">{alert.description || alert.type}</p>
              </div>
              <StatusPill label="Active" tone="critical" />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function IctManagerCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<IctView>("overview");

  const { data: ticketsData } = useSchoolQuery<any>("/api/support/tickets");
  const { data: alertsData } = useSchoolQuery<any>("/api/observability/alerts");
  const { data: healthData } = useSchoolQuery<any>("/api/health");
  const { data: assetsData } = useSchoolQuery<any>("/api/assets");

  const openTickets = ticketsData?.meta?.total_items ?? 0;
  const systemAlerts = alertsData?.alerts?.length ?? healthData?.active_alert_count ?? 0;
  const assignedDevices = assetsData?.total_records ?? 0;
  const tickets = ticketsData?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        
        {/* Sidebar */}
        <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:flex lg:flex-col lg:w-72 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 shrink-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
            <h2 className="mt-2 text-xl font-black">ICT Hub</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Systems & Devices.</p>
          </div>
          <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar" aria-label="Navigation">
            <button 
              onClick={() => setActiveView("overview")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "overview" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Overview
            </button>
            <button 
              onClick={() => setActiveView("helpdesk")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "helpdesk" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <Monitor className="h-4 w-4 shrink-0" />
              IT Helpdesk
            </button>
            <button 
              onClick={() => setActiveView("inventory")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "inventory" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <Smartphone className="h-4 w-4 shrink-0" />
              Device Inventory
            </button>
            <button 
              onClick={() => setActiveView("access")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "access" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Access Control
            </button>
            <button 
              onClick={() => setActiveView("logs")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "logs" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <Server className="h-4 w-4 shrink-0" />
              System Logs
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-[0_2px_40px_rgba(7,29,73,0.04)] overflow-hidden">
            
            <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-2 backdrop-blur">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">MS</div>
                  <div>
                    <h1 className="text-lg font-black text-[#071D49]">ICT Manager Dashboard</h1>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <label className="flex min-h-10 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white px-3 text-[#64748B] shadow-sm focus-within:border-[#1D4ED8] focus-within:ring-1 focus-within:ring-[#1D4ED8]">
                      <Search className="h-4 w-4" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#94A3B8]"
                        placeholder="Search devices or tickets..."
                      />
                    </label>
                  </div>
                  <Button className="bg-[#071D49] hover:bg-[#071D49]/90 text-white rounded-xl">New IT Ticket</Button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
              {activeView === "overview" && <OverviewWorkspace />}
              {activeView === "helpdesk" && <ItHelpdeskWorkspace />}
              {activeView === "inventory" && <DeviceInventoryWorkspace />}
              {activeView === "access" && <AccessControlWorkspace />}
              {activeView === "logs" && <SystemLogsWorkspace />}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
