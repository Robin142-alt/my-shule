"use client";
import { RecordTable } from "@/components/ui/record-table";
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
      <div className="app-metric-grid grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><LogIn className="w-4 h-4" /> Checked In Today</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.checked_in_today || 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">On Premises Now</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.currently_on_premises || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><LogOut className="w-4 h-4" /> Checked Out</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.checked_out_today || 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">This Week</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_this_week || 0}</div>
        </div>
      </div>

      {/* Mobile visitor cards */}
      <div className="grid gap-3 lg:hidden">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface-muted px-4 py-8 text-center text-sm font-semibold text-muted">Loading visitors...</div>
        ) : visitors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted px-4 py-8 text-center">
            <p className="font-black text-foreground">No visitors checked in yet today.</p>
            <p className="mt-1 text-sm font-semibold text-muted">Use Check In to register the first visitor at reception.</p>
          </div>
        ) : (
          visitors.map((visitor) => (
            <article key={visitor.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Badge {visitor.badge_number}</p>
                  <h3 className="mt-1 break-words font-black text-foreground">{visitor.full_name}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-muted">ID {visitor.id_number}</p>
                </div>
                <StatusChip label={visitor.status} tone={getStatusTone(visitor.status)} />
              </div>
              <dl className="mt-3 grid gap-2 rounded-xl bg-surface-muted p-3 text-sm">
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.1em] text-muted">Purpose</dt>
                  <dd className="mt-0.5 break-words font-semibold text-foreground">{visitor.purpose}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.1em] text-muted">Person to see</dt>
                  <dd className="mt-0.5 break-words font-semibold text-foreground">{visitor.person_to_see}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.1em] text-muted">Check in</dt>
                    <dd className="mt-0.5 font-semibold text-muted">{visitor.check_in_time}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.1em] text-muted">Check out</dt>
                    <dd className="mt-0.5 font-semibold text-muted">{visitor.check_out_time || "Not yet"}</dd>
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-black text-foreground hover:bg-surface-muted disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" /> Visitor slip
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Desktop visitors table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Badge</th>
              <th className="px-4 py-3 font-bold border-b border-border">Full Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">ID Number</th>
              <th className="px-4 py-3 font-bold border-b border-border">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-border">Person to See</th>
              <th className="px-4 py-3 font-bold border-b border-border">Check In</th>
              <th className="px-4 py-3 font-bold border-b border-border">Check Out</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Loading visitors...</td></tr>
            ) : visitors.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">No visitors checked in yet today. Use the Check In button to register new visitors at reception.</td></tr>
            ) : (
              visitors.map((v) => (
                <tr key={v.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{v.badge_number}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{v.full_name}</td>
                  <td className="px-4 py-3 text-muted">{v.id_number}</td>
                  <td className="px-4 py-3 text-muted">{v.purpose}</td>
                  <td className="px-4 py-3 text-muted">{v.person_to_see}</td>
                  <td className="px-4 py-3 text-muted">{v.check_in_time}</td>
                  <td className="px-4 py-3 text-muted">{v.check_out_time || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={v.status} tone={getStatusTone(v.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {v.status === "On Premises" && (
                        <button disabled={actionId === v.id} onClick={() => handleCheckOut(v.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <LogOut className="w-3 h-3" /> Check Out
                        </button>
                      )}
                      <button disabled={actionId === v.id} onClick={() => handlePrintSlip(v.id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface-muted disabled:opacity-50">
                        <Printer className="w-3 h-3" /> Slip
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
