"use client";
import { useState } from "react";
import { Stethoscope, Search, PlusCircle } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { createVisit, closeVisit, referVisit } from "./api-client";

type VisitRecord = {
  id: string;
  student_name: string;
  class_name: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  status: string;
  visit_date: string;
};

type VisitsData = {
  metrics: { total_visits: number; open_visits: number; referred: number };
  visits: VisitRecord[];
};

function failureMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function VisitsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<VisitsData>('/admin-command/nurse/visits');
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_name: "", class_name: "", complaint: "", diagnosis: "", treatment: "" });

  const visits = (data?.visits || []).filter(v =>
    v.student_name.toLowerCase().includes(search.toLowerCase()) ||
    v.complaint.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Open") return "info";
    if (st === "Closed") return "success";
    if (st === "Referred") return "danger";
    return "neutral";
  };

  const handleCreate = async () => {
    if (!form.student_name || !form.complaint) { toast.error("Student name and complaint are required."); return; }
    setIsSubmitting(true);
    try {
      await createVisit(form);
      await refetch();
      toast.success("Visit recorded successfully.");
      setShowForm(false);
      setForm({ student_name: "", class_name: "", complaint: "", diagnosis: "", treatment: "" });
    } catch (error: unknown) { toast.error(failureMessage(error, "Failed to record visit.")); }
    finally { setIsSubmitting(false); }
  };

  const handleClose = async (id: string) => {
    try {
      await closeVisit(id);
      await refetch();
      toast.success("Visit closed.");
    } catch (error: unknown) { toast.error(failureMessage(error, "Failed to close visit.")); }
  };

  const handleRefer = async (id: string) => {
    try {
      await referVisit(id, { reason: "Requires specialist attention" });
      await refetch();
      toast.success("Student referred for further treatment.");
    } catch (error: unknown) { toast.error(failureMessage(error, "Failed to refer visit.")); }
  };

  if (error && !data) {
    return (
      <Panel
        title="Health Visits"
        description="Record and manage student health visits."
        icon={Stethoscope}
        actions={(
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white opacity-50"
          >
            <PlusCircle className="w-4 h-4" /> New Visit
          </button>
        )}
      >
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          <p>Health visits could not be loaded. Existing records were not changed.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 min-h-10 rounded-lg border border-rose-300 bg-white px-4 text-rose-900"
          >
            Retry health visits
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Health Visits" description="Record and manage student health visits." icon={Stethoscope} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> New Visit
      </button>
    }>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Visits</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_visits ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Open Visits</div>
          <div className="mt-1 text-lg font-black text-blue-700">{isLoading ? "..." : data?.metrics?.open_visits ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Referred</div>
          <div className="mt-1 text-lg font-black text-rose-700">{isLoading ? "..." : data?.metrics?.referred ?? 0}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
        <input type="text" placeholder="Search by student or complaint..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Record New Visit</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-[#334155]">Student Name *</label>
              <input value={form.student_name} onChange={e => setForm({...form, student_name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Class</label>
              <input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#334155]">Complaint *</label>
              <input value={form.complaint} onChange={e => setForm({...form, complaint: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Diagnosis</label>
              <input value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Treatment Given</label>
              <input value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleCreate} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Save Visit"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Complaint</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Diagnosis</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading visits...</td></tr>
            ) : visits.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No health visits found. Click &quot;New Visit&quot; to record a student visit.</td></tr>
            ) : (
              visits.map(v => (
                <tr key={v.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{v.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.complaint}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.diagnosis || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.visit_date}</td>
                  <td className="px-4 py-3"><StatusChip label={v.status} tone={getStatusTone(v.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {v.status === "Open" && (
                      <>
                        <button onClick={() => handleClose(v.id)} className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Close</button>
                        <button onClick={() => handleRefer(v.id)} className="text-rose-600 hover:underline font-semibold text-xs">Refer</button>
                      </>
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
