import { useState } from "react";
import { LayoutList, Loader2, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchLessonLogsLive, createLessonLogLive } from "@/lib/modules/teacher-live";

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
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Class/Stream ID</label>
              <input 
                type="text" 
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
                className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" 
                placeholder="e.g. uuid"
              />
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
            disabled={createMutation.isPending || !formData.classId || !formData.topics}
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
          emptyState={isLoading ? "Loading lesson logs..." : "No lesson logs recorded yet."}
        />
      )}
    </Panel>
  );
}
