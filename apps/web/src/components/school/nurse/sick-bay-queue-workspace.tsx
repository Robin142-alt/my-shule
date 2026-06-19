"use client";
import { useState } from "react";
import { BedDouble, PlusCircle, Search } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { admitToSickBay, dischargeFromSickBay } from "./api-client";

type SickBayEntry = {
  id: string;
  student_name: string;
  class_name: string;
  complaint: string;
  admitted_at: string;
  status: string;
  notes: string;
};

type SickBayData = {
  metrics: { currently_admitted: number; discharged_today: number; avg_stay_hours: number };
  entries: SickBayEntry[];
};

export function SickBayQueueWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<SickBayData>('/admin-command/nurse/sick-bay-queue');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_name: "", class_name: "", complaint: "", notes: "" });
  const [search, setSearch] = useState("");

  const entries = (data?.entries || []).filter(e =>
    e.student_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Admitted") return "warning";
    if (st === "Discharged") return "success";
    if (st === "Critical") return "danger";
    return "neutral";
  };

  const handleAdmit = async () => {
    if (!form.student_name || !form.complaint) { toast.error("Student name and complaint are required."); return; }
    setIsSubmitting(true);
    try {
      await admitToSickBay(form);
      queryClient.invalidateQueries({ queryKey: ["school", "session", "/admin-command/nurse/sick-bay-queue"] });
      toast.success("Student admitted to sick bay.");
      setShowForm(false);
      setForm({ student_name: "", class_name: "", complaint: "", notes: "" });
    } catch (e: any) { toast.error(e.message || "Failed to admit student."); }
    finally { setIsSubmitting(false); }
  };

  const handleDischarge = async (id: string, name: string) => {
    try {
      await dischargeFromSickBay(id);
      queryClient.invalidateQueries({ queryKey: ["school", "session", "/admin-command/nurse/sick-bay-queue"] });
      toast.success(`${name} discharged from sick bay.`);
    } catch (e: any) { toast.error(e.message || "Failed to discharge student."); }
  };

  return (
    <Panel title="Sick Bay Queue" description="Students currently resting in the sick bay." icon={BedDouble} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Admit Student
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Currently Admitted</div>
          <div className="mt-1 text-lg font-black text-amber-700">{isLoading ? "..." : data?.metrics?.currently_admitted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Discharged Today</div>
          <div className="mt-1 text-lg font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.discharged_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Avg Stay (hrs)</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.avg_stay_hours ?? "—"}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
        <input type="text" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Admit to Sick Bay</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-[#334155]">Student Name *</label>
              <input value={form.student_name} onChange={e => setForm({...form, student_name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Class</label>
              <input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Complaint *</label>
              <input value={form.complaint} onChange={e => setForm({...form, complaint: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleAdmit} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-50">
              {isSubmitting ? "Admitting..." : "Admit"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Complaint</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Admitted At</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading sick bay...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Sick bay is empty. Click &quot;Admit Student&quot; when a student needs rest.</td></tr>
            ) : (
              entries.map(e => (
                <tr key={e.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{e.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{e.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{e.complaint}</td>
                  <td className="px-4 py-3 text-[#64748B]">{e.admitted_at}</td>
                  <td className="px-4 py-3"><StatusChip label={e.status} tone={getStatusTone(e.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {e.status === "Admitted" && (
                      <button onClick={() => handleDischarge(e.id, e.student_name)} className="text-emerald-600 hover:underline font-semibold text-xs">Discharge</button>
                    )}
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
