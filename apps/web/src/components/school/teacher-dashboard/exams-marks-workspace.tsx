import { BookOpenCheck, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { Modal } from "@/components/ui/modal";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchPendingMarksLive, fetchClassRegisterLive, saveExamMarksLive, type PendingMarksWindow } from "@/lib/modules/teacher-live";


function MarksEntryModal({ windowTask, onClose }: { windowTask: PendingMarksWindow; onClose: () => void }) {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  
  const { data: students, isLoading } = useQuery({
    queryKey: ["class-register", liveSession.session?.tenantId, windowTask.classSectionId],
    queryFn: () => fetchClassRegisterLive(liveSession.session!, windowTask.classSectionId),
    enabled: !!liveSession.session && !!windowTask.classSectionId,
  });

  const handleScoreChange = (studentId: string, value: string) => {
    // Only allow numbers up to outOf
    if (value === "") {
      setScores(prev => ({ ...prev, [studentId]: "" }));
      return;
    }
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0 && num <= windowTask.outOf) {
      setScores(prev => ({ ...prev, [studentId]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!liveSession.session) return;
    setSubmitting(true);
    await saveExamMarksLive(liveSession.session, {
      examId: windowTask.id,
      classSectionId: windowTask.classSectionId,
      scores
    });
    
    queryClient.invalidateQueries({ queryKey: ["pending-marks"] });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal title={`Enter Marks: ${windowTask.className} - ${windowTask.subjectName}`} open={true} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-black text-[#071D49]">{windowTask.examName}</h3>
          <p className="text-sm font-bold text-[#64748B]">Maximum Score: {windowTask.outOf}</p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#64748B]" /></div>
          ) : (
            <div className="divide-y divide-[#F1F5F9] border-t border-[#F1F5F9]">
              {students?.map(student => (
                <div key={student.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold text-[#071D49]">{student.name}</p>
                    <p className="text-xs text-[#64748B]">{student.admissionNo}</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="--"
                      value={scores[student.id] || ""}
                      onChange={(e) => handleScoreChange(student.id, e.target.value)}
                      className="w-20 rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-center text-sm font-bold text-[#071D49] shadow-sm outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#F1F5F9] pt-6">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Draft
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 4px; }
      `}} />
    </Modal>
  );
}

export function ExamsMarksWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");
  const [activeWindow, setActiveWindow] = useState<PendingMarksWindow | null>(null);
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pending-marks", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchPendingMarksLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const stats = data?.stats || { totalWindows: 0, nearingDeadline: 0 };
  const rows = data?.windows.map(w => [
    w.examName,
    w.className,
    w.subjectName,
    w.paperName,
    w.outOf.toString(),
    w.deadline,
    `${w.enteredCount} / ${w.totalStudents}`,
    <span key={w.id + 'status'} className={`font-bold ${w.status === 'Completed' ? 'text-green-600' : 'text-orange-500'}`}>
      {w.status}
    </span>,
    <button key={w.id + 'btn'} onClick={() => setActiveWindow(w)} className="text-[#1D4ED8] hover:underline font-bold">
      {w.status === 'Completed' ? 'Edit Marks' : 'Enter Marks'}
    </button>
  ]) || [];

  return (
    <Panel title="Exams & Marks" description="Enter formal exam marks for assigned papers during open exam windows." icon={BookOpenCheck}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Open Tasks</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.totalWindows}
          </p>
        </article>
        <article className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-bold uppercase text-red-600">Nearing Deadline</p>
          <p className="text-2xl font-black text-red-700">
            {isLoading ? "..." : stats.nearingDeadline}
          </p>
        </article>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Validate Marks</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Submit to HOD</button>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load exam entry tasks. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Exam", "Class", "Subject", "Paper", "Out Of", "Deadline", "Entered", "Status", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading exam entry tasks..." : "No open exam mark-entry tasks assigned to you."}
        />
      )}
      {activeWindow && (
        <MarksEntryModal windowTask={activeWindow} onClose={() => setActiveWindow(null)} />
      )}
    </Panel>
  );
}
