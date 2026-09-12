"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { createDepartment, createSubject } from "./api-client";
import { Panel, StatusChip, type Tone } from "./shared";

type SubjectsDepartmentsRecord = {
  id: string;
  name: string;
  type: string;
  department: string;
  hod: string;
  teachers_count: number;
  status: string;
};

type SubjectsDepartmentsData = {
  metrics: {
    total_subjects: number;
    total_departments: number;
    unassigned_subjects: number;
  };
  subjectsdepartmentsList: SubjectsDepartmentsRecord[];
};

const subjectTypes = [
  "CBC Learning Area",
  "Junior School Core",
  "Senior School Core",
  "Senior School Elective",
  "8-4-4 Subject",
  "Practical / Technical",
  "Co-curricular",
];

const emptySubjectForm = {
  name: "",
  type: "CBC Learning Area",
  department: "",
  level_coverage: "",
  status: "Active",
};

const emptyDepartmentForm = {
  name: "",
  hod: "",
  notes: "",
};

function getStatusTone(st: string): Tone {
  if (["Active", "Available", "Approved", "Completed", "Resolved", "Present", "Functional", "On Track", "Cleared", "Published", "Admitted", "Generated"].includes(st)) return "success";
  if (["Pending", "In Progress", "Pending Approval", "Scheduled", "Draft", "Behind", "Warning", "Pending Review", "Not Started"].includes(st)) return "warning";
  if (["Overdue", "Critical", "Rejected", "Escalated", "Expired", "Damaged", "Flagged", "Absent", "Suspended"].includes(st)) return "danger";
  if (["Issued", "Submitted", "On Leave", "Graduated", "Downloaded"].includes(st)) return "info";
  return "neutral";
}

export function SubjectsDepartmentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<SubjectsDepartmentsData>("/admin-command/principal/subjects-departments");
  const [isSaving, setIsSaving] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const items = data?.subjectsdepartmentsList || [];
  const departments = Array.from(new Set(items.map((item) => item.department).filter(Boolean))).sort();

  const openSubjectForm = () => {
    setFormError(null);
    setSubjectForm(emptySubjectForm);
    setSubjectOpen(true);
  };

  const openDepartmentForm = () => {
    setFormError(null);
    setDepartmentForm(emptyDepartmentForm);
    setDepartmentOpen(true);
  };

  const handleCreateSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = subjectForm.name.trim();
    const department = subjectForm.department.trim();
    if (!name) {
      setFormError("Subject name is required.");
      return;
    }
    if (!department) {
      setFormError("Department is required. Create or type the department that owns this subject.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await createSubject({
        name,
        subject_name: name,
        type: subjectForm.type,
        department,
        level_coverage: subjectForm.level_coverage.trim() || null,
        status: subjectForm.status,
      });
      toast.success("Subject submitted for this school.");
      setSubjectOpen(false);
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create subject.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDepartment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = departmentForm.name.trim();
    if (!name) {
      setFormError("Department name is required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await createDepartment({
        name,
        department_name: name,
        hod: departmentForm.hod.trim() || null,
        notes: departmentForm.notes.trim() || null,
      });
      toast.success("Department submitted for this school.");
      setDepartmentOpen(false);
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create department.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel
      title="Subjects & Departments"
      description="Define the subjects, learning areas, departments, and HOD ownership used by timetable, exams, marks, report cards, and teacher assignments."
      icon={BookOpen}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openDepartmentForm}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
          <button
            type="button"
            onClick={openSubjectForm}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Subject
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Subjects</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_subjects ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Departments</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_departments ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Unassigned Subjects</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.unassigned_subjects ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Department</th>
              <th className="px-4 py-3 font-bold">HOD</th>
              <th className="px-4 py-3 font-bold">Teachers</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading subjects and departments...</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  No subjects or departments are configured. Add departments and subjects before setting timetables, creating exam papers, assigning teachers, or opening marks entry.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{row.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.department || "-"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.hod || "Not assigned"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.teachers_count}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status || "Active"} tone={getStatusTone(row.status || "Active")} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={subjectOpen}
        onClose={() => !isSaving && setSubjectOpen(false)}
        title="Add subject or learning area"
        description="This subject becomes available for timetable setup, exam setup, marks entry, report cards, and teacher duty assignment."
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setSubjectOpen(false)} disabled={isSaving} className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="principal-subject-create-form" disabled={isSaving} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSaving ? "Saving..." : "Save subject"}
            </button>
          </>
        }
      >
        <form id="principal-subject-create-form" onSubmit={handleCreateSubject} className="space-y-4">
          {formError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{formError}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Subject name
              <input value={subjectForm.name} onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))} placeholder="Mathematics" className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400" required />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Type
              <select value={subjectForm.type} onChange={(event) => setSubjectForm((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400">
                {subjectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Department
              <input list="principal-departments" value={subjectForm.department} onChange={(event) => setSubjectForm((current) => ({ ...current, department: event.target.value }))} placeholder="Mathematics Department" className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400" required />
              <datalist id="principal-departments">
                {departments.map((department) => <option key={department} value={department} />)}
              </datalist>
            </label>
            <label className="space-y-1 text-sm font-bold text-[#334155] md:col-span-2">
              Level coverage
              <input value={subjectForm.level_coverage} onChange={(event) => setSubjectForm((current) => ({ ...current, level_coverage: event.target.value }))} placeholder="Grade 7-9, Form 1-4, or whole school" className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400" />
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={departmentOpen}
        onClose={() => !isSaving && setDepartmentOpen(false)}
        title="Add department"
        description="Departments group subjects and give HOD dashboards a real ownership boundary."
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setDepartmentOpen(false)} disabled={isSaving} className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="principal-department-create-form" disabled={isSaving} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSaving ? "Saving..." : "Save department"}
            </button>
          </>
        }
      >
        <form id="principal-department-create-form" onSubmit={handleCreateDepartment} className="space-y-4">
          {formError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{formError}</div> : null}
          <label className="block space-y-1 text-sm font-bold text-[#334155]">
            Department name
            <input value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} placeholder="Science Department" className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400" required />
          </label>
          <label className="block space-y-1 text-sm font-bold text-[#334155]">
            HOD label
            <input value={departmentForm.hod} onChange={(event) => setDepartmentForm((current) => ({ ...current, hod: event.target.value }))} placeholder="Assign after staff setup, or type a label for now" className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400" />
          </label>
          <label className="block space-y-1 text-sm font-bold text-[#334155]">
            Notes
            <textarea value={departmentForm.notes} onChange={(event) => setDepartmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional setup notes" rows={3} className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400" />
          </label>
        </form>
      </Modal>
    </Panel>
  );
}
