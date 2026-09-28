"use client";
import { useState } from "react";
import { UserCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { updateLearnerNote } from "./api-client";

type LearnerProfile = {
  id: string;
  admission_no: string;
  full_name: string;
  gender: string;
  dob: string;
  parent_name: string;
  special_needs: string | null;
  medical_notes: string | null;
  attendance_rate: number;
  mean_grade: string;
  discipline_cases: number;
  welfare_flags: number;
};

type LearnerProfilesData = {
  metrics: {
    total_learners: number;
    special_needs_count: number;
    medical_conditions: number;
    at_risk: number;
  };
  learners: LearnerProfile[];
};

export function LearnerProfilesWorkspace() {
  const { data, isLoading } = useSchoolQuery<LearnerProfilesData>('/admin-command/class-teacher/learner-profiles');
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const learners = (data?.learners || []).filter(
    (l) => !search || l.full_name.toLowerCase().includes(search.toLowerCase()) || l.admission_no.toLowerCase().includes(search.toLowerCase())
  );
  const metrics = data?.metrics;

  const handleSaveNote = async () => {
    if (!selectedId || !noteText.trim()) return;
    setSaving(true);
    try {
      await updateLearnerNote(selectedId, { note: noteText });
      toast.success("Note saved.");
      setNoteText("");
      setSelectedId(null);
    } catch {
      toast.error("Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Learner Profiles" description="Holistic view of each student — academics, attendance, health, welfare, and discipline." icon={UserCircle}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Learners</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_learners ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Special Needs</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.special_needs_count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Medical Conditions</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.medical_conditions ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">At Risk</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.at_risk ?? 0}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learners by name or admission number..."
            className="w-full rounded-lg border border-border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Adm No</th>
              <th className="px-4 py-3 font-bold border-b border-border">Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Gender</th>
              <th className="px-4 py-3 font-bold border-b border-border">DOB</th>
              <th className="px-4 py-3 font-bold border-b border-border">Parent</th>
              <th className="px-4 py-3 font-bold border-b border-border">Special Needs</th>
              <th className="px-4 py-3 font-bold border-b border-border">Attendance</th>
              <th className="px-4 py-3 font-bold border-b border-border">Mean Grade</th>
              <th className="px-4 py-3 font-bold border-b border-border">Discipline</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">Loading learner profiles...</td></tr>
            ) : learners.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">{search ? "No learners match your search." : "No learners in your class. Contact the secretary to assign students."}</td></tr>
            ) : (
              learners.map((l) => (
                <tr key={l.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-medium text-foreground">{l.admission_no}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{l.full_name}</td>
                  <td className="px-4 py-3 text-muted">{l.gender}</td>
                  <td className="px-4 py-3 text-muted">{l.dob}</td>
                  <td className="px-4 py-3 text-muted">{l.parent_name}</td>
                  <td className="px-4 py-3">{l.special_needs ? <StatusChip label={l.special_needs} tone="info" /> : <span className="text-muted">None</span>}</td>
                  <td className="px-4 py-3">
                    <StatusChip label={`${l.attendance_rate}%`} tone={l.attendance_rate >= 90 ? "success" : l.attendance_rate >= 75 ? "warning" : "danger"} />
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">{l.mean_grade}</td>
                  <td className="px-4 py-3">
                    {l.discipline_cases > 0 ? <StatusChip label={`${l.discipline_cases} case${l.discipline_cases > 1 ? "s" : ""}`} tone="warning" /> : <span className="text-emerald-600 text-xs font-bold">Clean</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setSelectedId(l.id); setNoteText(""); }}
                      className="text-blue-600 hover:underline font-semibold text-xs"
                    >
                      Add Note
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Note Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-foreground mb-3">Add Learner Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note about this learner..."
              className="w-full rounded-lg border border-border p-3 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setSelectedId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted hover:bg-slate-50">Cancel</button>
              <button
                disabled={saving || !noteText.trim()}
                onClick={handleSaveNote}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
