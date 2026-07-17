"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, CheckCircle2, Download, Pencil, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { DeputyTimetableReliefWorkspace } from "./timetable-relief-workspace";

type AcademicYear = { id: string; name: string };
type AcademicTerm = { id: string; academic_year_id: string; name: string };
type ClassSection = { id: string; academic_year_id: string; name: string; grade_level?: string; stream?: string };
type Subject = { id: string; code?: string; name: string };
type Teacher = { user_id: string; label: string; staff_number?: string };
type TeacherAssignment = {
  id: string;
  academic_term_id: string;
  class_section_id: string;
  subject_id: string;
  teacher_user_id: string;
};

type TimetableVersion = {
  id: string;
  academic_year: string;
  term_name: string;
  status: "draft" | "published";
  immutable: boolean;
  published_at?: string | null;
};

type TimetableSlot = {
  id: string;
  version_id: string;
  academic_year: string;
  term_name: string;
  class_section_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  room_id?: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published";
};

type PlannerResponse = {
  version: TimetableVersion | null;
  slots: TimetableSlot[];
  metrics: {
    total_slots: number;
    unique_classes: number;
    unique_teachers: number;
    draft: boolean;
    published: boolean;
  };
};

type SlotPayload = {
  academic_year: string;
  term_name: string;
  class_section_id: string;
  subject_id: string;
  teacher_id: string;
  room_id?: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const EMPTY_SLOT: SlotPayload = {
  academic_year: "",
  term_name: "",
  class_section_id: "",
  subject_id: "",
  teacher_id: "",
  room_id: "",
  day_of_week: 1,
  starts_at: "08:00",
  ends_at: "08:40",
};

function timeLabel(value: string) {
  return value.slice(0, 5);
}

function unwrapRows<T>(value: T[] | { items?: T[] } | undefined): T[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}

export function DeputyTimetableManagementWorkspace() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"builder" | "published" | "relief">("builder");
  const [selectedYearName, setSelectedYearName] = useState("");
  const [selectedTermName, setSelectedTermName] = useState("");
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotDraft, setSlotDraft] = useState<SlotPayload>(EMPTY_SLOT);
  const [publicationNotes, setPublicationNotes] = useState("");

  const yearsQuery = useSchoolQuery<AcademicYear[]>("/api/academics/academic-years");
  const termsQuery = useSchoolQuery<AcademicTerm[]>("/api/academics/academic-terms");
  const classesQuery = useSchoolQuery<ClassSection[]>("/api/academics/class-sections");
  const subjectsQuery = useSchoolQuery<Subject[]>("/api/academics/subjects");
  const teachersQuery = useSchoolQuery<Teacher[]>("/api/academics/teachers");
  const assignmentsQuery = useSchoolQuery<TeacherAssignment[]>("/api/academics/teacher-assignments?limit=300");

  const years = unwrapRows(yearsQuery.data);
  const allTerms = unwrapRows(termsQuery.data);
  const allClasses = unwrapRows(classesQuery.data);
  const allSubjects = unwrapRows(subjectsQuery.data);
  const allTeachers = unwrapRows(teachersQuery.data);
  const assignments = unwrapRows(assignmentsQuery.data);

  const selectedYear = years.find((year) => year.name === selectedYearName) ?? years[0] ?? null;
  const terms = selectedYear ? allTerms.filter((term) => term.academic_year_id === selectedYear.id) : [];
  const selectedTerm = terms.find((term) => term.name === selectedTermName) ?? terms[0] ?? null;
  const classes = selectedYear
    ? allClasses.filter((section) => !section.academic_year_id || section.academic_year_id === selectedYear.id)
    : [];
  const academicYear = selectedYear?.name ?? "";
  const termName = selectedTerm?.name ?? "";
  const plannerPath = academicYear && termName
    ? `/api/timetable/planner?academic_year=${encodeURIComponent(academicYear)}&term_name=${encodeURIComponent(termName)}`
    : null;
  const publishedPath = academicYear && termName
    ? `/api/timetable/published?academic_year=${encodeURIComponent(academicYear)}&term_name=${encodeURIComponent(termName)}&limit=100`
    : null;
  const plannerQuery = useSchoolQuery<PlannerResponse>(plannerPath);
  const publishedQuery = useSchoolQuery<TimetableSlot[]>(publishedPath);
  const planner = plannerQuery.data;
  const plannerSlots = planner?.slots ?? [];
  const publishedSlots = unwrapRows(publishedQuery.data);

  const setupMissing = [
    years.length === 0 ? "academic year" : null,
    terms.length === 0 ? "term" : null,
    classes.length === 0 ? "classes" : null,
    allSubjects.length === 0 ? "subjects" : null,
    allTeachers.length === 0 ? "teachers" : null,
    assignments.length === 0 ? "teacher allocations" : null,
  ].filter(Boolean) as string[];

  const invalidateTimetable = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["school"] }),
      plannerQuery.refetch(),
      publishedQuery.refetch(),
    ]);
  };

  const createMutation = useSchoolMutation<TimetableSlot, SlotPayload>("/api/timetable/slots", "POST");
  const updateMutation = useSchoolMutation<TimetableSlot, SlotPayload>(
    () => `/api/timetable/slots/${encodeURIComponent(editingSlotId ?? "missing")}`,
    "PATCH",
  );
  const cancelMutation = useSchoolMutation<TimetableSlot, { id: string }>(
    ({ id }) => `/api/timetable/slots/${encodeURIComponent(id)}`,
    "DELETE",
  );
  const publishMutation = useSchoolMutation<TimetableVersion, { academic_year: string; term_name: string; notes?: string }>(
    "/api/timetable/versions/publish",
    "POST",
  );
  const reviseMutation = useSchoolMutation<TimetableVersion, { academic_year: string; term_name: string; notes?: string }>(
    "/api/timetable/versions/revise",
    "POST",
  );

  const selectedClassAssignments = assignments.filter((assignment) => (
    assignment.academic_term_id === selectedTerm?.id
    && assignment.class_section_id === slotDraft.class_section_id
  ));
  const assignedSubjectIds = new Set(selectedClassAssignments.map((assignment) => assignment.subject_id));
  const subjectOptions = allSubjects.filter((subject) => assignedSubjectIds.has(subject.id));
  const assignedTeacherIds = new Set(
    selectedClassAssignments
      .filter((assignment) => assignment.subject_id === slotDraft.subject_id)
      .map((assignment) => assignment.teacher_user_id),
  );
  const teacherOptions = allTeachers.filter((teacher) => assignedTeacherIds.has(teacher.user_id));

  const openCreateSlot = () => {
    setEditingSlotId(null);
    setSlotDraft({ ...EMPTY_SLOT, academic_year: academicYear, term_name: termName });
    setSlotModalOpen(true);
  };

  const openEditSlot = (slot: TimetableSlot) => {
    setEditingSlotId(slot.id);
    setSlotDraft({
      academic_year: slot.academic_year,
      term_name: slot.term_name,
      class_section_id: slot.class_section_id,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id,
      room_id: slot.room_id ?? "",
      day_of_week: Number(slot.day_of_week),
      starts_at: timeLabel(slot.starts_at),
      ends_at: timeLabel(slot.ends_at),
    });
    setSlotModalOpen(true);
  };

  const submitSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (slotDraft.starts_at >= slotDraft.ends_at) {
      toast.error("End time must be after start time.");
      return;
    }
    try {
      if (editingSlotId) {
        await updateMutation.mutateAsync(slotDraft);
        toast.success("Timetable slot updated.");
      } else {
        await createMutation.mutateAsync(slotDraft);
        toast.success("Timetable slot added to the draft.");
      }
      setSlotModalOpen(false);
      setEditingSlotId(null);
      await invalidateTimetable();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timetable slot could not be saved.");
    }
  };

  const cancelSlot = async (slot: TimetableSlot) => {
    if (!window.confirm(`Remove ${slot.subject_name} for ${slot.class_name} from the draft?`)) return;
    try {
      await cancelMutation.mutateAsync({ id: slot.id });
      toast.success("Timetable slot removed from the draft.");
      await invalidateTimetable();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timetable slot could not be removed.");
    }
  };

  const publishTimetable = async () => {
    try {
      await publishMutation.mutateAsync({
        academic_year: academicYear,
        term_name: termName,
        notes: publicationNotes.trim() || undefined,
      });
      setPublishModalOpen(false);
      setPublicationNotes("");
      setActiveTab("published");
      toast.success(`${academicYear} ${termName} timetable published.`);
      await invalidateTimetable();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timetable could not be published.");
    }
  };

  const createRevision = async () => {
    try {
      await reviseMutation.mutateAsync({
        academic_year: academicYear,
        term_name: termName,
        notes: `Revision started ${new Date().toLocaleDateString()}`,
      });
      setActiveTab("builder");
      toast.success("A draft revision was created from the published timetable.");
      await invalidateTimetable();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "A timetable revision could not be created.");
    }
  };

  const downloadCsv = (rows: TimetableSlot[]) => {
    if (rows.length === 0) {
      toast.error("There are no timetable slots to export.");
      return;
    }
    const csv = [
      ["Day", "Start", "End", "Class", "Subject", "Teacher", "Room"],
      ...rows.map((slot) => [
        DAYS.find((day) => day.value === Number(slot.day_of_week))?.label ?? String(slot.day_of_week),
        timeLabel(slot.starts_at),
        timeLabel(slot.ends_at),
        slot.class_name,
        slot.subject_name,
        slot.teacher_name,
        slot.room_id ?? "",
      ]),
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${academicYear}-${termName}-timetable.csv`.replaceAll(" ", "-").toLowerCase();
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderSchedule = (rows: TimetableSlot[], editable: boolean) => (
    <div className="overflow-x-auto rounded-lg border border-[#D8E0EC]">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-[#F8FAFC] text-[#071D49]">
          <tr>
            <th className="px-4 py-3">Day</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Class</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Teacher</th>
            <th className="px-4 py-3">Room</th>
            {editable ? <th className="px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D8E0EC] bg-white text-[#334155]">
          {rows.length === 0 ? (
            <tr><td colSpan={editable ? 7 : 6} className="px-4 py-10 text-center text-[#64748B]">No timetable slots exist for this academic year and term.</td></tr>
          ) : rows.map((slot) => (
            <tr key={slot.id} className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-bold text-[#071D49]">{DAYS.find((day) => day.value === Number(slot.day_of_week))?.label}</td>
              <td className="px-4 py-3">{timeLabel(slot.starts_at)} - {timeLabel(slot.ends_at)}</td>
              <td className="px-4 py-3">{slot.class_name}</td>
              <td className="px-4 py-3">{slot.subject_name}</td>
              <td className="px-4 py-3">{slot.teacher_name}</td>
              <td className="px-4 py-3">{slot.room_id || "General classroom"}</td>
              {editable ? (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => openEditSlot(slot)} className="rounded-md border border-[#C8D5EA] p-2 text-[#174EA6]" aria-label={`Edit ${slot.subject_name} for ${slot.class_name}`}><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => cancelSlot(slot)} className="rounded-md border border-rose-200 p-2 text-rose-700" aria-label={`Remove ${slot.subject_name} for ${slot.class_name}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5" data-testid="deputy-timetable-management-workspace">
      <section className="rounded-xl border border-[#D8E0EC] bg-white p-5 text-[#071D49]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#47658F]"><CalendarClock className="h-4 w-4" /> Academic timetable</div>
            <h2 className="mt-2 text-2xl font-black">Timetable Builder</h2>
            <p className="mt-1 text-sm text-[#64748B]">Create a conflict-free school timetable from configured classes, subjects, terms, and teacher allocations.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">Academic year
              <select aria-label="Timetable academic year" value={academicYear} onChange={(event) => { setSelectedYearName(event.target.value); setSelectedTermName(""); }} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3">
                {years.length === 0 ? <option value="">No academic year</option> : years.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">Term
              <select aria-label="Timetable term" value={termName} onChange={(event) => setSelectedTermName(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3">
                {terms.length === 0 ? <option value="">No term</option> : terms.map((term) => <option key={term.id} value={term.name}>{term.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      {setupMissing.length > 0 ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="font-black">Academic setup is incomplete</p>
          <p className="mt-1 text-sm">Configure {setupMissing.join(", ")} before building the timetable. Teacher allocations must match the selected class, subject, and term.</p>
          <Link href="/school/deputy-principal/academics" className="mt-3 inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-black text-white">Open Academic Setup</Link>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#D8E0EC] bg-white p-2">
        {([
          ["builder", "Draft Builder"],
          ["published", "Published Timetable"],
          ["relief", "Relief Lessons"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} className={`rounded-lg px-4 py-2 text-sm font-black ${activeTab === id ? "bg-[#071D49] text-white" : "text-[#47658F] hover:bg-[#EEF4FF]"}`}>{label}</button>
        ))}
      </div>

      {activeTab === "relief" ? <DeputyTimetableReliefWorkspace /> : null}

      {activeTab === "builder" ? (
        <section className="space-y-4 rounded-xl border border-[#D8E0EC] bg-white p-5 text-[#071D49]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-black">{academicYear || "Academic year"} {termName || "term"} draft</h3>
              <p className="mt-1 text-sm text-[#64748B]">{planner?.version?.status === "published" ? "This timetable is published and locked. Create a revision to make changes." : "Changes remain private until the timetable is published."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => plannerQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" /> Refresh</button>
              {planner?.version?.status === "published" ? (
                <button type="button" onClick={createRevision} disabled={reviseMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#174EA6] px-4 py-2 text-sm font-black text-white disabled:opacity-50"><Pencil className="h-4 w-4" /> Create revision</button>
              ) : (
                <>
                  <button type="button" onClick={openCreateSlot} disabled={setupMissing.length > 0 || !academicYear || !termName} className="inline-flex items-center gap-2 rounded-lg bg-[#174EA6] px-4 py-2 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add lesson</button>
                  <button type="button" onClick={() => setPublishModalOpen(true)} disabled={plannerSlots.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Publish timetable</button>
                </>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#F8FAFC] p-4"><p className="text-sm text-[#64748B]">Lessons</p><p className="mt-1 text-2xl font-black">{planner?.metrics.total_slots ?? 0}</p></div>
            <div className="rounded-lg bg-[#F8FAFC] p-4"><p className="text-sm text-[#64748B]">Classes covered</p><p className="mt-1 text-2xl font-black">{planner?.metrics.unique_classes ?? 0}</p></div>
            <div className="rounded-lg bg-[#F8FAFC] p-4"><p className="text-sm text-[#64748B]">Teachers scheduled</p><p className="mt-1 text-2xl font-black">{planner?.metrics.unique_teachers ?? 0}</p></div>
          </div>
          {plannerQuery.isLoading ? <p className="py-8 text-center text-[#64748B]">Loading timetable draft...</p> : renderSchedule(plannerSlots, planner?.version?.status !== "published")}
        </section>
      ) : null}

      {activeTab === "published" ? (
        <section className="space-y-4 rounded-xl border border-[#D8E0EC] bg-white p-5 text-[#071D49]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h3 className="text-xl font-black">Published timetable</h3><p className="mt-1 text-sm text-[#64748B]">The schedule visible to teachers, classes, students, and parents.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 py-2 text-sm font-bold"><Printer className="h-4 w-4" /> Print</button>
              <button type="button" onClick={() => downloadCsv(publishedSlots)} className="inline-flex items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 py-2 text-sm font-bold"><Download className="h-4 w-4" /> Download CSV</button>
              {publishedSlots.length > 0 && planner?.version?.status === "published" ? <button type="button" onClick={createRevision} className="inline-flex items-center gap-2 rounded-lg bg-[#174EA6] px-4 py-2 text-sm font-black text-white"><Pencil className="h-4 w-4" /> Create revision</button> : null}
            </div>
          </div>
          {publishedQuery.isLoading ? <p className="py-8 text-center text-[#64748B]">Loading published timetable...</p> : renderSchedule(publishedSlots, false)}
        </section>
      ) : null}

      <Modal open={slotModalOpen} onClose={() => setSlotModalOpen(false)} title={editingSlotId ? "Edit timetable lesson" : "Add timetable lesson"}>
        <form onSubmit={submitSlot} className="grid gap-4 py-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Class
            <select required value={slotDraft.class_section_id} onChange={(event) => setSlotDraft((current) => ({ ...current, class_section_id: event.target.value, subject_id: "", teacher_id: "" }))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3">
              <option value="">Select class</option>{classes.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Subject
            <select required value={slotDraft.subject_id} onChange={(event) => setSlotDraft((current) => ({ ...current, subject_id: event.target.value, teacher_id: "" }))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3">
              <option value="">Select allocated subject</option>{subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            {slotDraft.class_section_id && subjectOptions.length === 0 ? <span className="mt-1 block text-xs text-amber-700">No subject teacher allocation exists for this class and term.</span> : null}
          </label>
          <label className="text-sm font-bold text-[#071D49]">Teacher
            <select required value={slotDraft.teacher_id} onChange={(event) => setSlotDraft((current) => ({ ...current, teacher_id: event.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3">
              <option value="">Select assigned teacher</option>{teacherOptions.map((teacher) => <option key={teacher.user_id} value={teacher.user_id}>{teacher.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Day
            <select required value={slotDraft.day_of_week} onChange={(event) => setSlotDraft((current) => ({ ...current, day_of_week: Number(event.target.value) }))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3">{DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Room
            <input value={slotDraft.room_id ?? ""} onChange={(event) => setSlotDraft((current) => ({ ...current, room_id: event.target.value }))} placeholder="e.g. Lab 1 or Room 4" className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Starts at
            <input type="time" required value={slotDraft.starts_at} onChange={(event) => setSlotDraft((current) => ({ ...current, starts_at: event.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Ends at
            <input type="time" required value={slotDraft.ends_at} onChange={(event) => setSlotDraft((current) => ({ ...current, ends_at: event.target.value }))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] px-3" />
          </label>
          <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4 sm:col-span-2">
            <button type="button" onClick={() => setSlotModalOpen(false)} className="rounded-lg border border-[#C8D5EA] px-4 py-2 font-bold text-[#071D49]">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !slotDraft.teacher_id} className="rounded-lg bg-[#174EA6] px-4 py-2 font-black text-white disabled:opacity-50">{editingSlotId ? "Save changes" : "Add lesson"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={publishModalOpen} onClose={() => setPublishModalOpen(false)} title="Publish school timetable">
        <div className="space-y-4 py-3 text-[#071D49]">
          <p className="text-sm text-[#64748B]">Publishing locks this draft and makes it visible to the school. Future changes require a tracked revision.</p>
          <label className="block text-sm font-bold">Publication notes
            <textarea value={publicationNotes} onChange={(event) => setPublicationNotes(event.target.value)} rows={3} placeholder="Optional notes for this timetable version" className="mt-1 w-full rounded-lg border border-[#C8D5EA] p-3" />
          </label>
          <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
            <button type="button" onClick={() => setPublishModalOpen(false)} className="rounded-lg border border-[#C8D5EA] px-4 py-2 font-bold">Keep draft</button>
            <button type="button" onClick={publishTimetable} disabled={publishMutation.isPending} className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white disabled:opacity-50">{publishMutation.isPending ? "Publishing..." : "Publish timetable"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
