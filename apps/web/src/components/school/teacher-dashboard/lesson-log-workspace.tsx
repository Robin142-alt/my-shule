import { useState } from "react";
import { LayoutList, Loader2, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchLessonLogsLive, createLessonLogLive, fetchTeacherClassesLive } from "@/lib/modules/teacher-live";

export function LessonLogWorkspace() {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    classId: "",
    topics: "",
    notes: "",
    challenges: ""
  });

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ["teacher-lesson-logs", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchLessonLogsLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const teacherClassesQuery = useQuery({
    queryKey: ["teacher-classes", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTeacherClassesLive(liveSession.session!),
    enabled: !!liveSession.session,
  });
  const assignedClasses = teacherClassesQuery.data?.classes ?? [];

  const createMutation = useMutation({
    mutationFn: () => createLessonLogLive(liveSession.session!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-lesson-logs"] });
      setShowForm(false);
      setFormData({ classId: "", topics: "", notes: "", challenges: "" });
    }
  });

  const rows = logs?.map(l => [
    l.date,
    l.class,
    l.subject,
    "N/A",
    l.topics,
    l.status,
    "View"
  ]) || [];

  return (
    <Panel title="Lesson Log" description="Record what was taught after each lesson." icon={LayoutList}>
      <div className="mb-4 flex gap-2">
        <button 
          type="button" 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white"
        >
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Record Lesson</>}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="mb-3 text-sm font-black text-[#071D49]">New Lesson Log</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Class taught</label>
              <select
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
                disabled={teacherClassesQuery.isLoading || assignedClasses.length === 0}
                className="w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm font-bold text-[#071D49] disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-[#94A3B8]"
              >
                <option value="">{teacherClassesQuery.isLoading ? "Loading classes..." : "Select class"}</option>
                {assignedClasses.map((assignment) => (
                  <option key={assignment.id} value={assignment.classSectionId}>
                    {assignment.className} - {assignment.subjectName}
                  </option>
                ))}
              </select>
              {!teacherClassesQuery.isLoading && assignedClasses.length === 0 ? (
                <p className="mt-2 text-xs font-bold text-amber-700">
                  No active teaching allocation exists yet. Deputy Principal or HOD must assign this teacher to a class before lesson logs can be saved.
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Topics Covered</label>
              <textarea 
                value={formData.topics}
                onChange={e => setFormData({ ...formData, topics: e.target.value })}
                className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" 
                rows={2} 
                placeholder="What did you teach today?"
              />
            </div>
          </div>
          <button 
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !formData.classId || !formData.topics.trim()}
            className="mt-4 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {createMutation.isPending ? "Saving..." : "Save Log"}
          </button>
        </div>
      )}

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load lesson logs. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Date", "Class", "Subject", "Planned Topic", "Taught Topic", "Status", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading lesson logs..." : "No lesson logs recorded yet. Use Record Lesson after your class allocation is active."}
        />
      )}
    </Panel>
  );
}
