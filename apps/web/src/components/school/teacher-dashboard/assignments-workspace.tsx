import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";

function CreateAssignmentModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal title="Create Assignment" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Title</label>
          <input required type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. Algebra Chapter 4 Exercises" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Class/Stream</label>
            <select required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="">Select class...</option>
              <option value="f2b">Form 2 Blue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Subject</label>
            <select required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="">Select subject...</option>
              <option value="math">Mathematics</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Due Date</label>
          <input required type="date" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Publishing..." : "Publish Assignment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AssignmentsWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Panel title="Assignments & Homework" description="Create homework, track submissions, and grade assignments." icon={ClipboardCheck}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Active Assignments</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending Marking</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
      </div>
      <div className="mb-4">
        {hasPermission('school_academics:write') && (
          <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Assignment</button>
        )}
      </div>
      <RecordTable
        columns={["Title", "Class", "Subject", "Assigned", "Due Date", "Submissions", "Status", "Actions"]}
        rows={[]}
        emptyState="No assignments found."
      />
      {isModalOpen && <CreateAssignmentModal onClose={() => setIsModalOpen(false)} />}
    </Panel>
  );
}
