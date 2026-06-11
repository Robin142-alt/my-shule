"use client";

import { useState } from "react";
import { Search, Monitor, ShieldAlert, Server, Smartphone, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function IctManagerCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: ticketsData } = useSchoolQuery<any>("/api/support/tickets?limit=5");
  const { data: alertsData } = useSchoolQuery<any>("/api/observability/alerts");
  const { data: healthData } = useSchoolQuery<any>("/api/observability/health");

  const openTickets = ticketsData?.meta?.total_items ?? 0;
  const systemAlerts = alertsData?.alerts?.length ?? healthData?.active_alert_count ?? 0;
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
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]">
              <Monitor className="h-4 w-4 shrink-0" />
              IT Helpdesk
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <Smartphone className="h-4 w-4 shrink-0" />
              Device Inventory
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Access Control
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
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
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Open IT Tickets</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">{openTickets}</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Assigned Devices</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">145</div>
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
                        <StatusPill label={ticket.priority} tone={ticket.priority === 'urgent' ? 'danger' : 'info'} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
