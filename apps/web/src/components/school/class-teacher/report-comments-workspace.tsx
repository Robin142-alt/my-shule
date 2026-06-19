"use client";
import { useState } from "react";
import { MessageSquareText, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { saveReportComment, submitAllComments } from "./api-client";

type CommentRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  mean_grade: string;
  class_position: number;
  comment: string;
  status: string;
};

type ReportCommentsData = {
  metrics: {
    total_students: number;
    comments_written: number;
    comments_pending: number;
    submitted: number;
  };
  term: string;
  exam_name: string;
  comments: CommentRecord[];
};

export function ReportCommentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ReportCommentsData>('/admin-command/class-teacher/report-comments');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const comments = data?.comments || [];
  const metrics = data?.metrics;

  const getStatusTone = (s: string): Tone => {
    if (s === "Submitted") return "success";
    if (s === "Written") return "info";
    if (s === "Pending") return "warning";
    return "neutral";
  };

  const handleSaveComment = async (studentId: string) => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await saveReportComment(studentId, { comment: editText });
      toast.success("Comment saved.");
      setEditingId(null);
      setEditText("");
      refetch();
    } catch {
      toast.error("Failed to save comment.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      await submitAllComments({ term: data?.term, exam: data?.exam_name });
      toast.success("All comments submitted for review.");
      refetch();
    } catch {
      toast.error("Failed to submit comments. Ensure all comments are written first.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel
      title="Report Comments"
      description={`Write class teacher comments for report cards${data?.exam_name ? ` — ${data.exam_name}` : ""}.`}
      icon={MessageSquareText}
      actions={
        <button
          disabled={submitting || (metrics?.comments_pending ?? 0) > 0}
          onClick={handleSubmitAll}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit All Comments"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Students</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Written</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.comments_written ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.comments_pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Submitted</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.submitted ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] whitespace-nowrap">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] whitespace-nowrap">Mean Grade</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] whitespace-nowrap">Position</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Comment</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading comment records...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No exam results published yet. Comments can be written after exams are processed.</td></tr>
            ) : (
              comments.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49] whitespace-nowrap">{c.student_name}</td>
                  <td className="px-4 py-3 text-[#071D49] font-bold whitespace-nowrap">{c.mean_grade}</td>
                  <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{c.class_position}</td>
                  <td className="px-4 py-3 text-[#64748B] min-w-[300px]">
                    {editingId === c.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-lg border border-[#D8E0EC] p-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Write your comment..."
                      />
                    ) : (
                      c.comment || <span className="italic text-amber-600">No comment yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusChip label={c.status} tone={getStatusTone(c.status)} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {editingId === c.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-slate-50">Cancel</button>
                        <button
                          disabled={saving}
                          onClick={() => handleSaveComment(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#071D49] px-3 py-1.5 text-xs font-black text-white hover:bg-blue-900 disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    ) : c.status !== "Submitted" ? (
                      <button
                        onClick={() => { setEditingId(c.id); setEditText(c.comment || ""); }}
                        className="text-blue-600 hover:underline font-semibold text-xs"
                      >
                        {c.comment ? "Edit" : "Write Comment"}
                      </button>
                    ) : null}
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
