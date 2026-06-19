"use client";
import { useState } from "react";
import { CalendarDays, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { confirmAppointment, cancelAppointment } from "./api-client";

type AppointmentRecord = {
  id: string;
  visitor_name: string;
  phone: string;
  purpose: string;
  person_to_see: string;
  department: string;
  date: string;
  time_slot: string;
  status: string;
  notes: string;
};

type AppointmentsData = {
  metrics: {
    today: number;
    upcoming: number;
    confirmed: number;
    cancelled: number;
  };
  appointments: AppointmentRecord[];
};

export function AppointmentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AppointmentsData>('/admin-command/secretary/appointments');
  const [actionId, setActionId] = useState<string | null>(null);

  const appointments = data?.appointments || [];
  const metrics = data?.metrics;

  const getStatusTone = (status: string): Tone => {
    switch (status) {
      case "Confirmed": return "success";
      case "Pending": return "warning";
      case "Cancelled": return "danger";
      case "Completed": return "info";
      case "No Show": return "danger";
      default: return "neutral";
    }
  };

  const handleConfirm = async (id: string) => {
    setActionId(id);
    try {
      await confirmAppointment(id);
      toast.success("Appointment confirmed.");
      refetch();
    } catch {
      toast.error("Failed to confirm appointment.");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionId(id);
    try {
      await cancelAppointment(id);
      toast.success("Appointment cancelled.");
      refetch();
    } catch {
      toast.error("Failed to cancel appointment.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Appointments" description="Schedule and manage visitor appointments with school staff." icon={CalendarDays}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><CalendarDays className="w-4 h-4" /> Today</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.today || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Clock className="w-4 h-4" /> Upcoming</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.upcoming || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Confirmed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.confirmed || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Cancelled</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.cancelled || 0}</div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Visitor</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Person to See</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading appointments...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No appointments scheduled. Schedule a new appointment when a visitor requests to meet with school staff.</td></tr>
            ) : (
              appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium text-[#071D49]">{appt.visitor_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{appt.phone}</td>
                  <td className="px-4 py-3 text-[#64748B]">{appt.purpose}</td>
                  <td className="px-4 py-3 text-[#64748B]">{appt.person_to_see}</td>
                  <td className="px-4 py-3 text-[#64748B]">{appt.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{appt.time_slot}</td>
                  <td className="px-4 py-3"><StatusChip label={appt.status} tone={getStatusTone(appt.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {appt.status === "Pending" && (
                        <>
                          <button disabled={actionId === appt.id} onClick={() => handleConfirm(appt.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                            <CheckCircle className="w-3 h-3" /> Confirm
                          </button>
                          <button disabled={actionId === appt.id} onClick={() => handleCancel(appt.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        </>
                      )}
                      {appt.status === "Confirmed" && (
                        <button disabled={actionId === appt.id} onClick={() => handleCancel(appt.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                          <XCircle className="w-3 h-3" /> Cancel
                        </button>
                      )}
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
