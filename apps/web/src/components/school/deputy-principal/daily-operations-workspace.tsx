"use client";
import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, addSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type OperationNote = {
  id: string;
  time: string;
  area: string;
  issue: string;
  status: "Active" | "Resolved";
};

export function DeputyDailyOperationsWorkspace() {
  const [notes, setNotes] = useState<OperationNote[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ area: "", issue: "" });

  const loadData = () => {
    const data = readSchoolData<OperationNote>("deputyOperations");
    setNotes(data.length > 0 ? data : [
      { id: "1", time: "08:15 AM", area: "Main Gate", issue: "Parent visitor log high", status: "Resolved" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyOperations") loadData();
    });
    return unsub;
  }, []);

  const handleCreate = () => {
    const newNote: OperationNote = {
      id: Math.random().toString(36).slice(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      area: formData.area,
      issue: formData.issue,
      status: "Active"
    };
    addSchoolRecord("deputyOperations", newNote);
    createNotification({
      audienceRoles: ["principal", "deputy_principal", "security"],
      sourceModule: "daily_operations",
      title: "New Operation Alert",
      body: `Operation issue logged at ${newNote.area}: ${newNote.issue}`,
      severity: "warning",
    });
    setShowModal(false);
    setFormData({ area: "", issue: "" });
    alert("Operation Note created.");
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Resolved") return "success";
    return "warning";
  };

  return (
    <Panel title="Daily Operations" description="Manage the school day from morning to evening." icon={Activity} actions={
      <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Operation Note</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Morning Parade</div>
          <div className="mt-1 text-lg font-black text-emerald-600">Completed</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Staff on Duty</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">6 / 6 Present</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Gate Security</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">Report Received</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Classes Not Started</div>
          <div className="mt-1 text-lg font-black text-rose-700">2</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Area</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Issue</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {notes.map((note) => (
              <tr key={note.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{note.time}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{note.area}</td>
                <td className="px-4 py-3 text-[#64748B]">{note.issue}</td>
                <td className="px-4 py-3"><StatusChip label={note.status} tone={getStatusTone(note.status)} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold text-xs">View Note</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071D49]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#071D49] mb-4">Log Daily Operation Note</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[#334155]">Area</label>
                <input value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-[#334155]">Issue Details</label>
                <input value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
              <button disabled={!formData.area || !formData.issue} onClick={handleCreate} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">Save Note</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}