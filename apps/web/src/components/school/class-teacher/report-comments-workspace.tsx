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
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit All Comments"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Students</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Written</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.comments_written ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.comments_pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Submitted</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.submitted ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border whitespace-nowrap">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border whitespace-nowrap">Mean Grade</th>
              <th className="px-4 py-3 font-bold border-b border-border whitespace-nowrap">Position</th>
              <th className="px-4 py-3 font-bold border-b border-border">Comment</th>
              <th className="px-4 py-3 font-bold border-b border-border whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading comment records...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No exam results published yet. Comments can be written after exams are processed.</td></tr>
            ) : (
              comments.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{c.student_name}</td>
                  <td className="px-4 py-3 text-foreground font-bold whitespace-nowrap">{c.mean_grade}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{c.class_position}</td>
                  <td className="px-4 py-3 text-muted min-w-[300px]">
                    {editingId === c.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-lg border border-border p-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted hover:bg-slate-50">Cancel</button>
                        <button
                          disabled={saving}
                          onClick={() => handleSaveComment(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white hover:bg-blue-900 disabled:opacity-50"
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
