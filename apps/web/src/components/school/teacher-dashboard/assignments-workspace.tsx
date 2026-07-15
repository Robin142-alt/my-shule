import { AlertTriangle, ClipboardCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchAssignmentsLive, createAssignmentLive, fetchTeacherClassesLive } from "@/lib/modules/teacher-live";

function CreateAssignmentModal({ onClose }: { onClose: () => void }) {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    classId: "",
    subjectId: "",
    dueDate: "",
    description: "",
  });

  const teacherClassesQuery = useQuery({
    queryKey: ["teacher-classes", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTeacherClassesLive(liveSession.session!),
    enabled: !!liveSession.session,
  });
  const assignedClasses = teacherClassesQuery.data?.classes ?? [];

  const createMutation = useMutation({
    mutationFn: () => createAssignmentLive(liveSession.session!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      onClose();
    },
    onError: (error: any) => {
      setActionError(error?.message || "Assignment could not be published. Please retry.");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError("");
    createMutation.mutate();
  };

  const handleAssignmentChange = (assignmentId: string) => {
    const assignment = assignedClasses.find((item) => item.id === assignmentId);
    setActionError("");
    setFormData({
      ...formData,
      classId: assignment?.classSectionId ?? "",
      subjectId: assignment?.subjectId ?? "",
    });
  };

  const canPublish = Boolean(
    liveSession.session &&
    formData.title.trim() &&
    formData.classId &&
    formData.subjectId &&
    formData.dueDate &&
    !teacherClassesQuery.isLoading &&
    assignedClasses.length > 0,
  );

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
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Assigned class and subject</label>
          <select
            required
            value={assignedClasses.find((item) => item.classSectionId === formData.classId && item.subjectId === formData.subjectId)?.id ?? ""}
            onChange={(event) => handleAssignmentChange(event.target.value)}
            disabled={teacherClassesQuery.isLoading || assignedClasses.length === 0}
            className="w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm font-bold text-[#071D49] outline-none focus:border-[#071D49] disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
          >
            <option value="">{teacherClassesQuery.isLoading ? "Loading assigned classes..." : "Select assigned class"}</option>
            {assignedClasses.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.className} - {assignment.subjectName}
              </option>
            ))}
          </select>
          {!teacherClassesQuery.isLoading && assignedClasses.length === 0 ? (
            <p className="mt-2 text-xs font-bold text-amber-700">
              No active class-subject allocation is assigned to this teacher. Deputy Principal or HOD must assign a class before homework can be published.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4">
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
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Instructions</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" 
            rows={3}
            placeholder="Instructions, submission expectations, or reference pages."
          />
        </div>
        {actionError ? (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={createMutation.isPending || !canPublish} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
    a.className ?? "Assigned class",
    a.subject,
    "Recently",
    a.dueDate,
    "Submission tracking opens from the assignment row",
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
          emptyState={isLoading ? "Loading assignments..." : "No assignments yet. Use Create Assignment after your class-subject allocations are active."}
        />
      )}
      
      {isModalOpen && <CreateAssignmentModal onClose={() => setIsModalOpen(false)} />}
    </Panel>
  );
}
