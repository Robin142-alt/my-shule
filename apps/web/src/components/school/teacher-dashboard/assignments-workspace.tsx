import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchAssignmentsLive, createAssignmentLive } from "@/lib/modules/teacher-live";

function CreateAssignmentModal({ onClose }: { onClose: () => void }) {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    classId: "",
    subjectId: "",
    dueDate: "",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: () => createAssignmentLive(liveSession.session!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Modal title="Create Assignment" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Title</label>
          <input 
            required 
            type="text" 
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" 
            placeholder="e.g. Algebra Chapter 4 Exercises" 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Class/Stream ID</label>
            <input 
              required 
              type="text"
              value={formData.classId}
              onChange={e => setFormData({ ...formData, classId: e.target.value })}
              className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" 
              placeholder="UUID"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Subject ID</label>
            <input 
              required 
              type="text"
              value={formData.subjectId}
              onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" 
              placeholder="UUID"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Due Date</label>
          <input 
            required 
            type="date" 
            value={formData.dueDate}
            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" 
          />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={createMutation.isPending} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {createMutation.isPending ? "Publishing..." : "Publish Assignment"}
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
  const liveSession = useLiveTenantSession("school");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: assignments, isLoading, isError } = useQuery({
    queryKey: ["teacher-assignments", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchAssignmentsLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const activeCount = assignments?.filter(a => a.status !== 'Closed').length || 0;

  const rows = assignments?.map(a => [
    a.title,
    "Various", // Class isn't joined explicitly yet, or we assume multiple
    a.subject,
    "Recently",
    a.dueDate,
    "0/0", // Needs submission tracking
    a.status,
    "View/Grade"
  ]) || [];

  return (
    <Panel title="Assignments & Homework" description="Create homework, track submissions, and grade assignments." icon={ClipboardCheck}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Active Assignments</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : activeCount}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total Assignments</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : assignments?.length || 0}</p>
        </article>
      </div>
      <div className="mb-4">
        {hasPermission('academics:write') && (
          <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Assignment</button>
        )}
      </div>
      
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load assignments. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Title", "Class", "Subject", "Assigned", "Due Date", "Submissions", "Status", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading assignments..." : "No assignments found."}
        />
      )}
      
      {isModalOpen && <CreateAssignmentModal onClose={() => setIsModalOpen(false)} />}
    </Panel>
  );
}
