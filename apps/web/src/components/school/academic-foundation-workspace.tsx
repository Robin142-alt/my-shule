"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Loader2,
  School,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export type AcademicFoundationTab = "calendar" | "classes" | "subjects" | "allocations";

type AcademicYear = { id: string; name: string; starts_on?: string; ends_on?: string; status?: string };
type AcademicTerm = { id: string; academic_year_id: string; name: string; starts_on?: string; ends_on?: string; status?: string };
type ClassSection = { id: string; academic_year_id?: string; name: string; grade_level?: string; capacity?: number };
type ClassStream = { id: string; class_section_id: string; class_section_name?: string; name: string; capacity?: number };
type Subject = { id: string; code: string; name: string; department_id?: string | null };
type Department = { id: string; name: string; head_of_department_user_id?: string | null; head_of_department_name?: string | null };
type TeacherOption = { id?: string; user_id?: string; label?: string; full_name?: string; email?: string; staff_number?: string };
type ClassTeacherAssignment = {
  id: string;
  academic_year_id: string;
  academic_year_name?: string;
  class_section_id: string;
  class_section_name?: string;
  teacher_user_id: string;
  teacher_name?: string;
};
type SubjectTeacherAssignment = {
  id: string;
  academic_term_id: string;
  academic_term_name?: string;
  class_section_id: string;
  class_section_name?: string;
  subject_id: string;
  subject_name?: string;
  teacher_user_id: string;
  teacher_name?: string;
};
type AcademicFoundationResponse = {
  years: AcademicYear[];
  terms: AcademicTerm[];
  classes: ClassSection[];
  streams: ClassStream[];
  subjects: Subject[];
  departments: Department[];
  teachers: TeacherOption[];
  classTeachers: ClassTeacherAssignment[];
  teacherAssignments: SubjectTeacherAssignment[];
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/15 bg-[#0D2A5B] px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-cyan-300";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function dateLabel(input?: string) {
  if (!input) return "Not set";
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? input : parsed.toLocaleDateString("en-KE");
}

function SetupForm({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="border-white/10 bg-white/5 p-4 text-white md:p-5">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-white/60">{description}</p>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-center text-sm font-semibold text-white/60">
      {children}
    </div>
  );
}

function LoadingRows() {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-white/65">Loading school academic setup...</div>;
}

export function AcademicFoundationWorkspace({
  actorRole,
  schoolName,
  initialTab = "calendar",
}: {
  actorRole: "Principal" | "Deputy Principal";
  schoolName: string;
  initialTab?: AcademicFoundationTab;
}) {
  const [activeTab, setActiveTab] = useState<AcademicFoundationTab>(initialTab);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const foundationQuery = useSchoolQuery<AcademicFoundationResponse>("/academics/foundation");

  const years = foundationQuery.data?.years ?? [];
  const terms = foundationQuery.data?.terms ?? [];
  const classes = foundationQuery.data?.classes ?? [];
  const streams = foundationQuery.data?.streams ?? [];
  const subjects = foundationQuery.data?.subjects ?? [];
  const departments = foundationQuery.data?.departments ?? [];
  const classTeachers = foundationQuery.data?.classTeachers ?? [];
  const subjectTeachers = foundationQuery.data?.teacherAssignments ?? [];
  const teachers = useMemo(
    () => (foundationQuery.data?.teachers ?? []).map((teacher) => ({
      id: teacher.user_id || teacher.id || "",
      label: teacher.label || teacher.full_name || teacher.staff_number || teacher.email || "Unnamed staff member",
    })).filter((teacher) => teacher.id),
    [foundationQuery.data?.teachers],
  );

  const labels = useMemo(() => ({
    years: new Map(years.map((item) => [item.id, item.name])),
    terms: new Map(terms.map((item) => [item.id, item.name])),
    classes: new Map(classes.map((item) => [item.id, item.name])),
    subjects: new Map(subjects.map((item) => [item.id, item.name])),
    departments: new Map(departments.map((item) => [item.id, item.name])),
    teachers: new Map(teachers.map((item) => [item.id, item.label])),
  }), [classes, departments, subjects, teachers, terms, years]);

  const isLoading = foundationQuery.isLoading;
  const loadError = foundationQuery.error;

  const refreshAll = async () => {
    await foundationQuery.refetch();
  };

  const runAction = async (action: string, request: () => Promise<unknown>, successMessage: string, form?: HTMLFormElement) => {
    setBusyAction(action);
    setActionError(null);
    try {
      await request();
      await refreshAll();
      form?.reset();
      toast.success(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The academic setup action failed.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const submit = (action: string, path: string, body: Record<string, unknown>, successMessage: string, form: HTMLFormElement) =>
    runAction(action, () => requestDashboardApi(path, { method: "POST", body }), successMessage, form);

  const handleCreateYear = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("year", "/academics/years", {
      name: value(data, "name"),
      starts_on: value(data, "starts_on"),
      ends_on: value(data, "ends_on"),
    }, "Academic year created.", form);
  };

  const handleCreateTerm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("term", "/academics/terms", {
      academic_year_id: value(data, "academic_year_id"),
      name: value(data, "name"),
      starts_on: value(data, "starts_on"),
      ends_on: value(data, "ends_on"),
    }, "Academic term created.", form);
  };

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("class", "/academics/class-sections", {
      academic_year_id: value(data, "academic_year_id"),
      name: value(data, "name"),
      grade_level: value(data, "grade_level"),
      capacity: Number(value(data, "capacity")),
    }, "Class, form, or grade created.", form);
  };

  const handleCreateStream = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("stream", "/academics/class-streams", {
      class_section_id: value(data, "class_section_id"),
      name: value(data, "name"),
      capacity: Number(value(data, "capacity")),
    }, "Stream created.", form);
  };

  const handleCreateDepartment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("department", "/academics/departments", {
      name: value(data, "name"),
      head_of_department_user_id: value(data, "head_of_department_user_id") || null,
    }, "Department created.", form);
  };

  const handleAssignHod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const departmentId = value(data, "department_id");
    return runAction(
      "hod",
      () => requestDashboardApi(`/academics/departments/${departmentId}`, {
        method: "PATCH",
        body: { head_of_department_user_id: value(data, "head_of_department_user_id") || null },
      }),
      "Head of Department assignment updated.",
      form,
    );
  };

  const handleCreateSubject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("subject", "/academics/subjects", {
      code: value(data, "code"),
      name: value(data, "name"),
      department_id: value(data, "department_id") || undefined,
    }, "Subject or learning area created.", form);
  };

  const handleAssignClassTeacher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("class-teacher", "/academics/class-teachers", {
      academic_year_id: value(data, "academic_year_id"),
      class_section_id: value(data, "class_section_id"),
      teacher_user_id: value(data, "teacher_user_id"),
    }, "Class teacher assigned.", form);
  };

  const handleAssignSubjectTeacher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("subject-teacher", "/academics/teacher-assignments", {
      academic_term_id: value(data, "academic_term_id"),
      class_section_id: value(data, "class_section_id"),
      subject_id: value(data, "subject_id"),
      teacher_user_id: value(data, "teacher_user_id"),
    }, "Subject teacher assigned.", form);
  };

  const setupChecks = [
    ["Academic year", years.length > 0],
    ["Current term", terms.length > 0],
    ["Classes/forms/grades", classes.length > 0],
    ["Streams", streams.length > 0],
    ["Subjects/learning areas", subjects.length > 0],
    ["Departments", departments.length > 0],
    ["Class teachers", classTeachers.length > 0],
    ["HODs", departments.some((department) => department.head_of_department_user_id)],
    ["Subject teachers", subjectTeachers.length > 0],
  ] as const;
  const completedChecks = setupChecks.filter(([, complete]) => complete).length;

  const tabs: Array<{ id: AcademicFoundationTab; label: string; icon: typeof CalendarDays }> = [
    { id: "calendar", label: "Academic Calendar", icon: CalendarDays },
    { id: "classes", label: "Classes & Streams", icon: Layers3 },
    { id: "subjects", label: "Subjects & Departments", icon: BookOpen },
    { id: "allocations", label: "Teacher Allocations", icon: UsersRound },
  ];

  return (
    <section aria-label="Academic foundation setup" className="space-y-5 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{actorRole} academic administration</p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">Academic Foundation</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-white/65">
              Configure the school-owned academic structure used by admissions, timetables, attendance, teaching, exams, marks, and report cards for {schoolName}.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-200/25 bg-cyan-200/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Setup readiness</p>
            <p className="mt-1 text-2xl font-black">{completedChecks} / {setupChecks.length}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {setupChecks.map(([label, complete]) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold">
              <CheckCircle2 className={`h-4 w-4 ${complete ? "text-emerald-300" : "text-white/25"}`} />
              <span className={complete ? "text-white" : "text-white/55"}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-red-300/30 bg-red-400/10 p-4 text-sm font-bold text-red-100">
          Academic setup could not be loaded: {loadError.message}. Retry the live school setup request. If it fails again, the error has been recorded for platform support.
        </div>
      ) : null}
      {actionError ? (
        <div role="alert" className="rounded-xl border border-red-300/30 bg-red-400/10 p-4 text-sm font-bold text-red-100">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Academic setup areas">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-black transition ${
                active ? "border-cyan-300 bg-cyan-300 text-[#071D49]" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? <LoadingRows /> : null}

      {!isLoading && activeTab === "calendar" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Create academic year" description="Set the school year before creating terms, classes, admissions, or exams.">
              <form onSubmit={handleCreateYear} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Academic year name<input name="name" required className={fieldClass} placeholder="e.g. 2026 Academic Year" /></label>
                <label className="text-sm font-bold">Starts on<input type="date" name="starts_on" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Ends on<input type="date" name="ends_on" required className={fieldClass} /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null}>
                  {busyAction === "year" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Academic Year
                </button>
              </form>
            </SetupForm>
            <SetupForm title="Create term" description="Terms are attached to the selected academic year and drive attendance, fees, and exams.">
              <form onSubmit={handleCreateTerm} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Academic year<select name="academic_year_id" required className={fieldClass} defaultValue=""><option value="">Select academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label className="sm:col-span-2 text-sm font-bold">Term name<input name="name" required className={fieldClass} placeholder="e.g. Term 1" /></label>
                <label className="text-sm font-bold">Starts on<input type="date" name="starts_on" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Ends on<input type="date" name="ends_on" required className={fieldClass} /></label>
                {years.length === 0 ? <p className="sm:col-span-2 text-xs font-bold text-amber-200">Create an academic year first.</p> : null}
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || years.length === 0}>
                  {busyAction === "term" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Term
                </button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Academic years" description="School-scoped years currently available.">
              {years.length === 0 ? <EmptyState>No academic year exists. Use the form above to create the first one.</EmptyState> : (
                <div className="space-y-2">{years.map((year) => <div key={year.id} className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="font-black">{year.name}</p><p className="text-xs font-semibold text-white/55">{dateLabel(year.starts_on)} to {dateLabel(year.ends_on)}</p></div>)}</div>
              )}
            </SetupForm>
            <SetupForm title="Terms" description="Configured terms and their academic-year ownership.">
              {terms.length === 0 ? <EmptyState>No terms exist. Create a term after the academic year.</EmptyState> : (
                <div className="space-y-2">{terms.map((term) => <div key={term.id} className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="font-black">{term.name}</p><p className="text-xs font-semibold text-white/55">{labels.years.get(term.academic_year_id) || "Academic year"} - {dateLabel(term.starts_on)} to {dateLabel(term.ends_on)}</p></div>)}</div>
              )}
            </SetupForm>
          </div>
        </div>
      ) : null}

      {!isLoading && activeTab === "classes" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Create class, form, or grade" description="Use the labels your school uses: Grade 7, Form 1, PP2, or a custom class name.">
              <form onSubmit={handleCreateClass} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Academic year<select name="academic_year_id" required className={fieldClass} defaultValue=""><option value="">Select academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label className="text-sm font-bold">Class/form/grade name<input name="name" required className={fieldClass} placeholder="e.g. Form 1" /></label>
                <label className="text-sm font-bold">Grade level<input name="grade_level" required className={fieldClass} placeholder="e.g. 9 or Form 1" /></label>
                <label className="sm:col-span-2 text-sm font-bold">Capacity<input type="number" name="capacity" min="1" defaultValue="45" required className={fieldClass} /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || years.length === 0}>{busyAction === "class" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Class / Form / Grade</button>
              </form>
            </SetupForm>
            <SetupForm title="Create stream" description="Streams belong to one class/form/grade and are selectable in admissions and attendance.">
              <form onSubmit={handleCreateStream} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} defaultValue=""><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Stream name<input name="name" required className={fieldClass} placeholder="e.g. North, Blue, A" /></label>
                <label className="text-sm font-bold">Capacity<input type="number" name="capacity" min="1" defaultValue="45" required className={fieldClass} /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || classes.length === 0}>{busyAction === "stream" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Stream</button>
              </form>
            </SetupForm>
          </div>
          <SetupForm title="Configured classes and streams" description="This is the live structure other school modules use.">
            {classes.length === 0 ? <EmptyState>No classes exist. Create the first class after setting the academic year.</EmptyState> : (
              <div className="grid gap-3 md:grid-cols-2">{classes.map((item) => {
                const linkedStreams = streams.filter((stream) => stream.class_section_id === item.id);
                return <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.name}</p><p className="text-xs font-semibold text-white/55">Grade level: {item.grade_level || "Not set"} | Capacity: {item.capacity || "Not set"}</p></div><School className="h-5 w-5 text-cyan-200" /></div><div className="mt-3 flex flex-wrap gap-2">{linkedStreams.length ? linkedStreams.map((stream) => <span key={stream.id} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2.5 py-1 text-xs font-bold text-cyan-100">{stream.name}</span>) : <span className="text-xs font-semibold text-amber-200">No streams yet</span>}</div></div>;
              })}</div>
            )}
          </SetupForm>
        </div>
      ) : null}

      {!isLoading && activeTab === "subjects" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Create department" description="Create an academic department and optionally choose an active staff member as HOD.">
              <form onSubmit={handleCreateDepartment} className="space-y-3">
                <label className="block text-sm font-bold">Department name<input name="name" required className={fieldClass} placeholder="e.g. Sciences" /></label>
                <label className="block text-sm font-bold">Head of Department<select name="head_of_department_user_id" className={fieldClass} defaultValue=""><option value="">Assign later</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                {teachers.length === 0 ? <p className="text-xs font-bold text-amber-200">Invite and activate staff before assigning a HOD.</p> : null}
                <button className={primaryButtonClass} disabled={busyAction !== null}>{busyAction === "department" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Department</button>
              </form>
            </SetupForm>
            <SetupForm title="Create subject or learning area" description="Subjects are school-specific and can be linked to an academic department.">
              <form onSubmit={handleCreateSubject} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">Code<input name="code" required className={fieldClass} placeholder="e.g. MAT" /></label>
                <label className="text-sm font-bold">Subject / learning area<input name="name" required className={fieldClass} placeholder="e.g. Mathematics" /></label>
                <label className="sm:col-span-2 text-sm font-bold">Department<select name="department_id" className={fieldClass} defaultValue=""><option value="">No department yet</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null}>{busyAction === "subject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Subject / Learning Area</button>
              </form>
            </SetupForm>
          </div>
          <SetupForm title="Assign or change HOD" description="Update the department head without deleting the department.">
            <form onSubmit={handleAssignHod} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="text-sm font-bold">Department<select name="department_id" required className={fieldClass} defaultValue=""><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
              <label className="text-sm font-bold">Head of Department<select name="head_of_department_user_id" required className={fieldClass} defaultValue=""><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
              <button className={primaryButtonClass} disabled={busyAction !== null || departments.length === 0 || teachers.length === 0}>{busyAction === "hod" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save HOD</button>
            </form>
          </SetupForm>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Departments" description="Current department ownership and HOD assignments.">
              {departments.length === 0 ? <EmptyState>No departments exist. Create the first department above.</EmptyState> : <div className="space-y-2">{departments.map((department) => <div key={department.id} className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="font-black">{department.name}</p><p className="text-xs font-semibold text-white/55">HOD: {department.head_of_department_name || labels.teachers.get(department.head_of_department_user_id || "") || "Not assigned"}</p></div>)}</div>}
            </SetupForm>
            <SetupForm title="Subjects and learning areas" description="Current school subject catalogue.">
              {subjects.length === 0 ? <EmptyState>No subjects exist. Create the first subject or learning area above.</EmptyState> : <div className="space-y-2">{subjects.map((subject) => <div key={subject.id} className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="font-black">{subject.name} <span className="text-cyan-200">({subject.code})</span></p><p className="text-xs font-semibold text-white/55">Department: {labels.departments.get(subject.department_id || "") || "Not linked"}</p></div>)}</div>}
            </SetupForm>
          </div>
        </div>
      ) : null}

      {!isLoading && activeTab === "allocations" ? (
        <div role="tabpanel" className="space-y-5">
          {teachers.length === 0 ? <div className="rounded-xl border border-amber-200/25 bg-amber-200/10 p-4 text-sm font-bold text-amber-100">No active staff are available. The Principal must invite and activate staff before assigning class teachers, HODs, or subject teachers.</div> : null}
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Assign class teacher" description="Assign pastoral and register responsibility for a class/form/grade in an academic year.">
              <form onSubmit={handleAssignClassTeacher} className="space-y-3">
                <label className="block text-sm font-bold">Academic year<select name="academic_year_id" required className={fieldClass} defaultValue=""><option value="">Select academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} defaultValue=""><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Teacher<select name="teacher_user_id" required className={fieldClass} defaultValue=""><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || years.length === 0 || classes.length === 0 || teachers.length === 0}>{busyAction === "class-teacher" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Class Teacher</button>
              </form>
            </SetupForm>
            <SetupForm title="Assign subject teacher" description="Assign an active teacher to one subject, class, and term scope.">
              <form onSubmit={handleAssignSubjectTeacher} className="space-y-3">
                <label className="block text-sm font-bold">Academic term<select name="academic_term_id" required className={fieldClass} defaultValue=""><option value="">Select term</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} defaultValue=""><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Subject / learning area<select name="subject_id" required className={fieldClass} defaultValue=""><option value="">Select subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Teacher<select name="teacher_user_id" required className={fieldClass} defaultValue=""><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || terms.length === 0 || classes.length === 0 || subjects.length === 0 || teachers.length === 0}>{busyAction === "subject-teacher" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Subject Teacher</button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Class teachers" description="Active class teacher responsibilities.">
              {classTeachers.length === 0 ? <EmptyState>No class teachers assigned. Complete the year, class, and staff setup, then assign one above.</EmptyState> : <div className="space-y-2">{classTeachers.map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.teacher_name || labels.teachers.get(assignment.teacher_user_id) || "Teacher"}</p><p className="text-xs font-semibold text-white/55">{assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"} - {assignment.academic_year_name || labels.years.get(assignment.academic_year_id) || "Academic year"}</p></div><button type="button" className={secondaryButtonClass} disabled={busyAction !== null} onClick={() => runAction(`remove-class-${assignment.id}`, () => requestDashboardApi(`/academics/class-teachers/${assignment.id}`, { method: "DELETE" }), "Class teacher assignment removed.")}>{busyAction === `remove-class-${assignment.id}` ? "Removing..." : "Remove"}</button></div>)}</div>}
            </SetupForm>
            <SetupForm title="Subject teachers" description="Active subject, class, and term allocations.">
              {subjectTeachers.length === 0 ? <EmptyState>No subject teachers assigned. Complete term, class, subject, and staff setup first.</EmptyState> : <div className="space-y-2">{subjectTeachers.map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.teacher_name || labels.teachers.get(assignment.teacher_user_id) || "Teacher"}</p><p className="text-xs font-semibold text-white/55">{assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - {assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"} - {assignment.academic_term_name || labels.terms.get(assignment.academic_term_id) || "Term"}</p></div><button type="button" className={secondaryButtonClass} disabled={busyAction !== null} onClick={() => runAction(`remove-subject-${assignment.id}`, () => requestDashboardApi(`/academics/teacher-assignments/${assignment.id}`, { method: "DELETE" }), "Subject teacher assignment removed.")}>{busyAction === `remove-subject-${assignment.id}` ? "Removing..." : "Remove"}</button></div>)}</div>}
            </SetupForm>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white/60">
        <div className="flex items-start gap-3"><GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" /><p>All records on this page are loaded from and saved to the current school tenant. Once configured, the same classes, streams, subjects, departments, and teacher allocations become selectable in admissions, attendance, timetable, exams, and marks entry.</p></div>
      </div>
    </section>
  );
}
