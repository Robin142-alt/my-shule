"use client";

import { useState } from "react";
import { HeartPulse, Stethoscope } from "lucide-react";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

function LogClinicVisitModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      await requestDashboardApi("/api/admin-command/clinic/visit", {
        method: "POST",
        body: JSON.stringify(data)
      });
      
      toast.success("Clinic visit logged successfully");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Log Clinic Visit" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Student</label>
          <input name="student" required type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Select student..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Symptoms / Reason</label>
          <textarea name="symptoms" required rows={3} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Describe the visit reason..."></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Action Taken / Treatment</label>
          <textarea name="treatment" required rows={3} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Describe treatment..."></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Sent Home?</label>
            <select name="sentHome" required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="no">No, returned to class</option>
              <option value="yes">Yes, parent called</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Follow up needed?</label>
            <select name="followUp" required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Logging..." : "Log Visit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClinicWorkspace() {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#071D49]">Clinic Operations</h2>
              <p className="text-sm text-[#64748B]">Log visits, track treatments, and monitor student health trends.</p>
            </div>
          </div>
          {hasPermission('clinic:write') ? (
            <Button onClick={() => setIsModalOpen(true)}>Log Visit</Button>
          ) : (
            <span className="text-xs font-bold text-[#64748B]">Restricted</span>
          )}
        </div>
        
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-xl border border-[#D8E0EC] p-4 bg-slate-50">
            <p className="text-sm font-bold text-[#64748B]">Today's Visits</p>
            <p className="text-2xl font-black text-[#071D49] mt-1">12</p>
          </div>
          <div className="rounded-xl border border-[#D8E0EC] p-4 bg-rose-50">
            <p className="text-sm font-bold text-rose-600">Sent Home</p>
            <p className="text-2xl font-black text-rose-700 mt-1">2</p>
          </div>
          <div className="rounded-xl border border-[#D8E0EC] p-4 bg-emerald-50">
            <p className="text-sm font-bold text-emerald-600">Cleared</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">10</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#D8E0EC] overflow-hidden">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
                <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
                <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Symptoms</th>
                <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Action Taken</th>
                <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              <tr className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">09:15 AM</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">Brian Otieno</td>
                <td className="px-4 py-3 text-[#64748B]">Headache</td>
                <td className="px-4 py-3 text-[#64748B]">Painkillers, Rest</td>
                <td className="px-4 py-3 font-medium text-emerald-600">Returned to class</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">10:30 AM</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">Mary Kamau</td>
                <td className="px-4 py-3 text-[#64748B]">Fever</td>
                <td className="px-4 py-3 text-[#64748B]">Paracetamol</td>
                <td className="px-4 py-3 font-medium text-rose-600">Sent Home</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && <LogClinicVisitModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

export function NurseCommandCenter() {
  return (
    <div className="flex min-h-screen bg-[#F3F6FA]">
      <aside className="hidden h-screen w-[260px] overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
          <h2 className="mt-2 text-xl font-black">School Nurse</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">Health Command</p>
        </div>
        <nav className="space-y-1">
          <div>
            <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Health Center</p>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]">
              <HeartPulse className="h-4 w-4" /> Clinic
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="flex h-[84px] shrink-0 items-center justify-between border-b border-[#D8E0EC] bg-white px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Clinic Management</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <ClinicWorkspace />
        </div>
      </main>
    </div>
  );
}
