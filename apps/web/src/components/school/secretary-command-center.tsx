"use client";

import { useState } from "react";
import { Search, Bell, Users, Calendar, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

type SecretaryDashboardData = {
  communication_summary: {
    announcements: number;
    meetings: number;
  };
};

export function SecretaryCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);
  const [visitorDraft, setVisitorDraft] = useState({
    visitor_name: "",
    phone_number: "",
    purpose: "",
    host_user_id: "",
  });
  const { data, isLoading } = useSchoolQuery<SecretaryDashboardData>('/admin-command/secretary/dashboard');

  const announcements = data?.communication_summary?.announcements || 0;
  const meetings = data?.communication_summary?.meetings || 0;

  async function registerVisitor() {
    if (!visitorDraft.visitor_name.trim() || !visitorDraft.purpose.trim()) {
      toast.error("Visitor name and purpose are required.");
      return;
    }

    setVisitorSubmitting(true);
    try {
      await requestDashboardApi("/admin-command/secretary/visitors/check-in", {
        method: "POST",
        body: {
          visitor_name: visitorDraft.visitor_name,
          phone_number: visitorDraft.phone_number || undefined,
          purpose: visitorDraft.purpose,
          host_user_id: visitorDraft.host_user_id || "front-office",
          source_dashboard: "secretary-legacy-command-center",
        },
      });
      toast.success("Visitor checked in and security notified.");
      setVisitorModalOpen(false);
      setVisitorDraft({ visitor_name: "", phone_number: "", purpose: "", host_user_id: "" });
    } catch (error: any) {
      toast.error(error?.message || "Visitor could not be checked in.");
    } finally {
      setVisitorSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        
        {/* Sidebar */}
        <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:flex lg:flex-col lg:w-72 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 shrink-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
            <h2 className="mt-2 text-xl font-black">Secretary Desk</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Front office operations.</p>
          </div>
          <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar" aria-label="Navigation">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]">
              <Users className="h-4 w-4 shrink-0" />
              Front Desk
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <Phone className="h-4 w-4 shrink-0" />
              Call Logs
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <Calendar className="h-4 w-4 shrink-0" />
              Appointments
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <Mail className="h-4 w-4 shrink-0" />
              Dispatches
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-[0_2px_40px_rgba(7,29,73,0.04)] overflow-hidden">
            
            {/* Topbar */}
            <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-2 backdrop-blur">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">MS</div>
                  <div>
                    <h1 className="text-lg font-black text-[#071D49]">Secretary Dashboard</h1>
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
                        placeholder="Search visitors..."
                      />
                    </label>
                  </div>
                  <Button className="bg-[#071D49] hover:bg-[#071D49]/90 text-white rounded-xl" onClick={() => setVisitorModalOpen(true)}>Register Visitor</Button>
                </div>
              </div>
            </header>

            {/* Dashboard Workspace */}
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Active Announcements</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : announcements}</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Meetings Recorded</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : meetings}</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">New Parcels/Mails</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">0</div>
                </Card>
              </div>

              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Front Desk Activity</h2>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Visitor and log features will appear here.</p>
                </div>
              </Card>
            </div>
            
          </div>
        </main>
      </div>
      <Modal
        open={visitorModalOpen}
        title="Register visitor"
        description="Check a visitor into the tenant-scoped front office visitor log."
        onClose={() => setVisitorModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVisitorModalOpen(false)}>Cancel</Button>
            <Button onClick={registerVisitor} disabled={visitorSubmitting}>{visitorSubmitting ? "Registering..." : "Register visitor"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Visitor name</span>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={visitorDraft.visitor_name} onChange={(event) => setVisitorDraft((current) => ({ ...current, visitor_name: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Phone</span>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={visitorDraft.phone_number} onChange={(event) => setVisitorDraft((current) => ({ ...current, phone_number: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Purpose</span>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={visitorDraft.purpose} onChange={(event) => setVisitorDraft((current) => ({ ...current, purpose: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Host/user to see</span>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={visitorDraft.host_user_id} onChange={(event) => setVisitorDraft((current) => ({ ...current, host_user_id: event.target.value }))} placeholder="front-office" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
