"use client";
import { useState } from "react";
import { Users, LogIn, LogOut, Printer } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { checkOutVisitor, printVisitorSlip } from "./api-client";

type VisitorRecord = {
  id: string;
  full_name: string;
  id_number: string;
  phone: string;
  purpose: string;
  person_to_see: string;
  department: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  badge_number: string;
};

type VisitorsData = {
  metrics: {
    checked_in_today: number;
    currently_on_premises: number;
    checked_out_today: number;
    total_this_week: number;
  };
  visitors: VisitorRecord[];
};

export function VisitorsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<VisitorsData>('/admin-command/secretary/visitors');
  const [actionId, setActionId] = useState<string | null>(null);

  const visitors = data?.visitors || [];
  const metrics = data?.metrics;

  const getStatusTone = (status: string): Tone => {
    switch (status) {
      case "On Premises": return "info";
      case "Checked Out": return "success";
      case "Overdue": return "danger";
      default: return "neutral";
    }
  };

  const handleCheckOut = async (id: string) => {
    setActionId(id);
    try {
      await checkOutVisitor(id);
      toast.success("Visitor checked out successfully.");
      refetch();
    } catch {
      toast.error("Failed to check out visitor.");
    } finally {
      setActionId(null);
    }
  };

  const handlePrintSlip = async (id: string) => {
    setActionId(id);
    try {
      await printVisitorSlip(id);
      toast.success("Visitor slip sent to printer.");
    } catch {
      toast.error("Failed to print visitor slip.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Visitors" description="Track and manage all school visitors. Check in, check out, and print visitor slips." icon={Users}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><LogIn className="w-4 h-4" /> Checked In Today</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.checked_in_today || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">On Premises Now</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.currently_on_premises || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><LogOut className="w-4 h-4" /> Checked Out</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.checked_out_today || 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">This Week</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_this_week || 0}</div>
        </div>
      </div>

      {/* Mobile visitor cards */}
      <div className="grid gap-3 lg:hidden">
        {isLoading ? (
          <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-8 text-center text-sm font-semibold text-[#64748B]">Loading visitors...</div>
        ) : visitors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] px-4 py-8 text-center">
            <p className="font-black text-[#071D49]">No visitors checked in yet today.</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Use Check In to register the first visitor at reception.</p>
          </div>
        ) : (
          visitors.map((visitor) => (
            <article key={visitor.id} className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">Badge {visitor.badge_number}</p>
                  <h3 className="mt-1 break-words font-black text-[#071D49]">{visitor.full_name}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-[#64748B]">ID {visitor.id_number}</p>
                </div>
                <StatusChip label={visitor.status} tone={getStatusTone(visitor.status)} />
              </div>
              <dl className="mt-3 grid gap-2 rounded-xl bg-[#F8FAFC] p-3 text-sm">
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">Purpose</dt>
                  <dd className="mt-0.5 break-words font-semibold text-[#071D49]">{visitor.purpose}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">Person to see</dt>
                  <dd className="mt-0.5 break-words font-semibold text-[#071D49]">{visitor.person_to_see}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">Check in</dt>
                    <dd className="mt-0.5 font-semibold text-[#52657F]">{visitor.check_in_time}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">Check out</dt>
                    <dd className="mt-0.5 font-semibold text-[#52657F]">{visitor.check_out_time || "Not yet"}</dd>
                  </div>
                </div>
              </dl>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {visitor.status === "On Premises" ? (
                  <button
                    type="button"
                    disabled={actionId === visitor.id}
                    onClick={() => handleCheckOut(visitor.id)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" /> Check Out
                  </button>
                ) : <span />}
                <button
                  type="button"
                  disabled={actionId === visitor.id}
                  onClick={() => handlePrintSlip(visitor.id)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" /> Visitor slip
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Desktop visitors table */}
      <div className="hidden overflow-x-auto rounded-xl border border-[#D8E0EC] lg:block">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Badge</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Full Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">ID Number</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Person to See</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Check In</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Check Out</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading visitors...</td></tr>
            ) : visitors.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No visitors checked in yet today. Use the Check In button to register new visitors at reception.</td></tr>
            ) : (
              visitors.map((v) => (
                <tr key={v.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-mono font-bold text-[#071D49]">{v.badge_number}</td>
                  <td className="px-4 py-3 font-medium text-[#071D49]">{v.full_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.id_number}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.purpose}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.person_to_see}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.check_in_time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.check_out_time || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={v.status} tone={getStatusTone(v.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {v.status === "On Premises" && (
                        <button disabled={actionId === v.id} onClick={() => handleCheckOut(v.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <LogOut className="w-3 h-3" /> Check Out
                        </button>
                      )}
                      <button disabled={actionId === v.id} onClick={() => handlePrintSlip(v.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0EC] bg-white px-3 py-1.5 text-xs font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
                        <Printer className="w-3 h-3" /> Slip
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
