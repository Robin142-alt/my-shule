"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Loader2,
  Search,
  Settings2,
  School,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { AcademicAssignmentEndButton, AcademicRecordManager, AcademicTeacherReassignmentButton } from "@/components/school/academic-record-manager";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export type AcademicFoundationTab = "calendar" | "classes" | "subjects" | "allocations" | "roles-curriculum" | "policies";

type LifecycleRecord = { id: string; status?: string; is_active?: boolean; version?: number; archived_at?: string | null };
type AcademicYear = LifecycleRecord & { name: string; starts_on?: string; ends_on?: string; is_current?: boolean; display_order?: number };
type AcademicTerm = LifecycleRecord & { academic_year_id: string; name: string; starts_on?: string; ends_on?: string; is_current?: boolean; display_order?: number };
type AcademicCalendarPeriod = LifecycleRecord & { academic_year_id: string; academic_term_id?: string | null; name: string; period_type: string; starts_on?: string; ends_on?: string; description?: string | null };
type ClassSection = LifecycleRecord & { academic_year_id?: string; name: string; code?: string; grade_level?: string; capacity?: number; curriculum_model?: string; enrolment_open?: boolean; active_student_count?: number };
type ClassStream = LifecycleRecord & { class_section_id: string; class_section_name?: string; name: string; code?: string; capacity?: number; stream_teacher_user_id?: string | null; active_student_count?: number };
type Subject = LifecycleRecord & { code: string; name: string; abbreviation?: string; department_id?: string | null; curriculum_model?: string; subject_type?: string; is_compulsory?: boolean; is_examinable?: boolean; is_practical?: boolean; is_co_curricular?: boolean };
type Department = LifecycleRecord & { name: string; code?: string; description?: string; head_of_department_user_id?: string | null; head_of_department_name?: string | null };
type PolicySetting = LifecycleRecord & {
  name: string;
  description?: string | null;
  grading_system_id?: string | null;
  show_rank?: boolean;
  show_attendance?: boolean;
  rules?: Array<Record<string, unknown>>;
  configuration?: Record<string, unknown>;
  effective_from?: string | null;
  effective_to?: string | null;
};
type TeacherOption = { id?: string; user_id?: string; label?: string; full_name?: string; email?: string; staff_number?: string };
type ClassTeacherAssignment = {
  id: string;
  academic_year_id: string;
  academic_year_name?: string;
  class_section_id: string;
  class_section_name?: string;
  teacher_user_id: string;
  teacher_name?: string;
  status?: string;
  assignment_type?: string;
  effective_from?: string;
  effective_to?: string | null;
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
  status?: string;
  assignment_type?: string;
  is_primary?: boolean;
  mark_entry_allowed?: boolean;
  lesson_record_allowed?: boolean;
  report_comment_allowed?: boolean;
  effective_from?: string;
  effective_to?: string | null;
};
type ClassSubjectAssignment = LifecycleRecord & { academic_term_id: string; academic_term_name?: string; class_section_id: string; class_section_name?: string; subject_id: string; subject_name?: string; is_compulsory?: boolean; is_examinable?: boolean; effective_from?: string | null; effective_to?: string | null; reason?: string | null };
type AcademicRoleAppointment = LifecycleRecord & { role_type: string; teacher_user_id: string; teacher_name?: string; department_id?: string | null; academic_year_id?: string | null; class_section_id?: string | null; stream_id?: string | null; appointment_type?: string; effective_from?: string; effective_to?: string | null; reason?: string };
type CurriculumConfiguration = LifecycleRecord & { name: string; curriculum_model: string; configuration?: Record<string, unknown>; effective_from?: string; effective_to?: string | null; based_on_id?: string | null };
type AcademicFoundationResponse = {
  years: AcademicYear[];
  terms: AcademicTerm[];
  calendarPeriods: AcademicCalendarPeriod[];
  classes: ClassSection[];
  streams: ClassStream[];
  subjects: Subject[];
  classSubjectAssignments: ClassSubjectAssignment[];
  departments: Department[];
  teachers: TeacherOption[];
  classTeachers: ClassTeacherAssignment[];
  teacherAssignments: SubjectTeacherAssignment[];
  gradingSystems: PolicySetting[];
  attendanceSettings: PolicySetting[];
  reportCardSettings: PolicySetting[];
  roleAppointments: AcademicRoleAppointment[];
  curriculumConfigurations: CurriculumConfiguration[];
};

type BulkEntityType =
  | "academic-year"
  | "academic-term"
  | "calendar-period"
  | "class-section"
  | "class-stream"
  | "department"
  | "subject"
  | "class-subject"
  | "grading-system"
  | "attendance-setting"
  | "report-card-setting"
  | "curriculum-configuration";
type BulkRecord = LifecycleRecord & { name?: string; code?: string };
type BulkGroup = { entityType: BulkEntityType; label: string; records: BulkRecord[] };

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/15 bg-[#0D2A5B] px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-cyan-300";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-[#071D49] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";
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

function recordLabel(record: BulkRecord) {
  return record.name || record.code || record.id;
}

function BulkLifecyclePanel({ groups, onUpdated }: { groups: BulkGroup[]; onUpdated: () => Promise<unknown> | unknown }) {
  const [entityType, setEntityType] = useState<BulkEntityType | "">(groups[0]?.entityType ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<"activate" | "deactivate" | "archive" | "restore">("archive");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Array<{ id: string; label: string; total: number; recommendation: string }> | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupKey = groups.map((group) => group.entityType).join("|");

  useEffect(() => {
    if (!groups.some((group) => group.entityType === entityType)) setEntityType(groups[0]?.entityType ?? "");
    setSelected([]);
    setPreview(null);
  }, [entityType, groupKey]);

  const activeGroup = groups.find((group) => group.entityType === entityType);
  if (!activeGroup || activeGroup.records.length === 0) return null;

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 100));
    setPreview(null);
  };

  const reviewImpact = async () => {
    setBusy("preview");
    setError(null);
    try {
      const dependencies = await requestDashboardApi<Array<Record<string, unknown>>>(`/academics/setup/${entityType}/bulk-dependencies`, {
        method: "POST",
        body: { ids: selected },
        timeoutMs: 30_000,
      });
      const dependencyById = new Map(dependencies.map((dependency) => [String(dependency.entity_id), dependency]));
      const impacts = selected.map((id) => {
        const dependency = dependencyById.get(id);
        return {
          id,
          label: recordLabel(activeGroup.records.find((record) => record.id === id) ?? { id }),
          total: Number(dependency?.total ?? 0),
          recommendation: String(dependency?.recommendation ?? "Review linked records before continuing."),
        };
      });
      setPreview(impacts);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Bulk impact could not be loaded.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const applyBulkAction = async () => {
    setBusy("apply");
    setError(null);
    try {
      const result = await requestDashboardApi<Record<string, unknown>>(`/academics/setup/${entityType}/bulk-lifecycle`, {
        method: "POST",
        body: { ids: selected, action, reason: reason.trim() },
        timeoutMs: 60_000,
      });
      await onUpdated();
      const completed = Number(result.completed ?? 0);
      const failed = Number(result.failed ?? 0);
      failed > 0
        ? toast.warning(`${completed} records updated; ${failed} require individual review.`)
        : toast.success(`${completed} records updated.`);
      setSelected([]);
      setPreview(null);
      setReason("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Bulk lifecycle action failed.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <summary className="cursor-pointer text-sm font-black text-white">Bulk management with dependency preview</summary>
      <div className="mt-4 space-y-4">
        {error ? <div role="alert" className="rounded-lg border border-red-300/30 bg-red-400/10 p-3 text-sm font-bold text-red-100">{error}</div> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold">Record type<select value={entityType} onChange={(event) => setEntityType(event.target.value as BulkEntityType)} className={fieldClass}>{groups.map((group) => <option key={group.entityType} value={group.entityType}>{group.label}</option>)}</select></label>
          <label className="text-sm font-bold">Lifecycle action<select value={action} onChange={(event) => { setAction(event.target.value as typeof action); setPreview(null); }} className={fieldClass}><option value="activate">Activate</option><option value="deactivate">Deactivate</option><option value="archive">Archive</option><option value="restore">Restore</option></select></label>
          <label className="text-sm font-bold">Reason<input value={reason} onChange={(event) => setReason(event.target.value)} className={fieldClass} placeholder="Why this bulk change is required" /></label>
        </div>
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeGroup.records.map((record) => <label key={record.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(record.id)} onChange={() => toggle(record.id)} /> <span>{recordLabel(record)}</span><span className="ml-auto text-xs capitalize text-white/45">{statusLabel(record)}</span></label>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null || selected.length === 0} onClick={reviewImpact} className={primaryButtonClass}>{busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Review impact ({selected.length})</button>
          <button type="button" disabled={busy !== null || !preview || !reason.trim()} onClick={applyBulkAction} className="min-h-10 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-black text-white disabled:opacity-40">{busy === "apply" ? "Applying..." : `Confirm ${action}`}</button>
        </div>
        {preview ? <div className="grid gap-2 sm:grid-cols-2">{preview.map((item) => <div key={item.id} className="rounded-lg border border-amber-200/20 bg-amber-200/10 p-3 text-sm"><p className="font-black">{item.label}: {item.total} linked records</p><p className="mt-1 text-white/65">{item.recommendation}</p></div>)}</div> : null}
      </div>
    </details>
  );
}

function isActive(record: LifecycleRecord | { status?: string }) {
  return record.status !== "archived" && record.status !== "inactive" && record.status !== "closed" && record.status !== "ended" && (!("is_active" in record) || record.is_active !== false);
}

function statusLabel(record: LifecycleRecord | { status?: string }) {
  return record.status || (("is_active" in record) && record.is_active === false ? "inactive" : "active");
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
  const [recordSearch, setRecordSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [recordSort, setRecordSort] = useState<"name-asc" | "name-desc" | "recent">("name-asc");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const foundationQuery = useSchoolQuery<AcademicFoundationResponse>("/academics/foundation");

  const years = foundationQuery.data?.years ?? [];
  const terms = foundationQuery.data?.terms ?? [];
  const calendarPeriods = foundationQuery.data?.calendarPeriods ?? [];
  const classes = foundationQuery.data?.classes ?? [];
  const streams = foundationQuery.data?.streams ?? [];
  const subjects = foundationQuery.data?.subjects ?? [];
  const classSubjectAssignments = foundationQuery.data?.classSubjectAssignments ?? [];
  const departments = foundationQuery.data?.departments ?? [];
  const classTeachers = foundationQuery.data?.classTeachers ?? [];
  const subjectTeachers = foundationQuery.data?.teacherAssignments ?? [];
  const gradingSystems = foundationQuery.data?.gradingSystems ?? [];
  const attendanceSettings = foundationQuery.data?.attendanceSettings ?? [];
  const reportCardSettings = foundationQuery.data?.reportCardSettings ?? [];
  const roleAppointments = foundationQuery.data?.roleAppointments ?? [];
  const curriculumConfigurations = foundationQuery.data?.curriculumConfigurations ?? [];
  const activeYears = years.filter(isActive);
  const activeTerms = terms.filter(isActive);
  const activeCalendarPeriods = calendarPeriods.filter(isActive);
  const activeClasses = classes.filter(isActive);
  const activeStreams = streams.filter(isActive);
  const activeSubjects = subjects.filter(isActive);
  const activeClassSubjectAssignments = classSubjectAssignments.filter(isActive);
  const activeDepartments = departments.filter(isActive);
  const activeClassTeachers = classTeachers.filter(isActive);
  const activeSubjectTeachers = subjectTeachers.filter(isActive);
  const activeRoleAppointments = roleAppointments.filter(isActive);
  const activeCurriculumConfigurations = curriculumConfigurations.filter(isActive);
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
    streams: new Map(streams.map((item) => [item.id, item.name])),
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

  const visible = <T extends LifecycleRecord & Record<string, unknown>>(records: T[]) => records.filter((record) => {
    if (!showArchived && !isActive(record)) return false;
    const query = recordSearch.trim().toLowerCase();
    return !query || Object.values(record).some((item) => typeof item === "string" && item.toLowerCase().includes(query));
  }).sort((left, right) => {
    if (recordSort === "recent") return Number(right.version ?? 0) - Number(left.version ?? 0);
    const leftLabel = String(left.name ?? left.code ?? left.id);
    const rightLabel = String(right.name ?? right.code ?? right.id);
    return recordSort === "name-desc" ? rightLabel.localeCompare(leftLabel) : leftLabel.localeCompare(rightLabel);
  });

  const handleCreateYear = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("year", "/academics/years", {
      name: value(data, "name"),
      starts_on: value(data, "starts_on"),
      ends_on: value(data, "ends_on"),
      is_current: data.get("is_current") === "on",
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
      is_current: data.get("is_current") === "on",
      display_order: Number(value(data, "display_order") || 0),
    }, "Academic term created.", form);
  };

  const handleCreateCalendarPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("calendar-period", "/academics/calendar-periods", {
      academic_year_id: value(data, "academic_year_id"),
      academic_term_id: value(data, "academic_term_id") || undefined,
      name: value(data, "name"),
      period_type: value(data, "period_type"),
      starts_on: value(data, "starts_on"),
      ends_on: value(data, "ends_on"),
      description: value(data, "description") || undefined,
      reason: value(data, "reason") || undefined,
    }, "Academic calendar period created.", form);
  };

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("class", "/academics/class-sections", {
      academic_year_id: value(data, "academic_year_id"),
      name: value(data, "name"),
      code: value(data, "code") || undefined,
      grade_level: value(data, "grade_level"),
      capacity: Number(value(data, "capacity")),
      curriculum_model: value(data, "curriculum_model") || "Custom",
      enrolment_open: data.get("enrolment_open") === "on",
    }, "Class, form, or grade created.", form);
  };

  const handleCreateStream = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("stream", "/academics/class-streams", {
      class_section_id: value(data, "class_section_id"),
      name: value(data, "name"),
      code: value(data, "code") || undefined,
      capacity: Number(value(data, "capacity")),
      stream_teacher_user_id: value(data, "stream_teacher_user_id") || undefined,
    }, "Stream created.", form);
  };

  const handleCreateDepartment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("department", "/academics/departments", {
      name: value(data, "name"),
      code: value(data, "code") || undefined,
      description: value(data, "description") || undefined,
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
        body: {
          head_of_department_user_id: value(data, "head_of_department_user_id") || null,
          appointment_type: value(data, "appointment_type") || "permanent",
          effective_from: value(data, "effective_from") || undefined,
          effective_to: value(data, "effective_to") || undefined,
          reason: value(data, "reason"),
        },
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
      abbreviation: value(data, "abbreviation") || undefined,
      department_id: value(data, "department_id") || undefined,
      curriculum_model: value(data, "curriculum_model") || "Custom",
      subject_type: value(data, "subject_type") || "academic",
      is_compulsory: data.get("is_compulsory") === "on",
      is_examinable: data.get("is_examinable") === "on",
      is_practical: data.get("is_practical") === "on",
      is_co_curricular: data.get("is_co_curricular") === "on",
    }, "Subject or learning area created.", form);
  };

  const handleAssignClassSubject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("class-subject", "/academics/class-subjects", {
      academic_term_id: value(data, "academic_term_id"),
      class_section_id: value(data, "class_section_id"),
      subject_id: value(data, "subject_id"),
      is_compulsory: data.get("is_compulsory") === "on",
      is_examinable: data.get("is_examinable") === "on",
      effective_from: value(data, "effective_from") || undefined,
      effective_to: value(data, "effective_to") || undefined,
      reason: value(data, "reason") || undefined,
    }, "Subject assigned to class and term.", form);
  };

  const handleAssignClassTeacher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("class-teacher", "/academics/class-teachers", {
      academic_year_id: value(data, "academic_year_id"),
      class_section_id: value(data, "class_section_id"),
      teacher_user_id: value(data, "teacher_user_id"),
      assignment_type: value(data, "assignment_type") || "permanent",
      effective_from: value(data, "effective_from") || undefined,
      effective_to: value(data, "effective_to") || undefined,
      reason: value(data, "reason") || undefined,
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
      stream_id: value(data, "stream_id") || undefined,
      department_id: value(data, "department_id") || undefined,
      curriculum_model: value(data, "curriculum_model") || undefined,
      assignment_type: value(data, "assignment_type") || "permanent",
      is_primary: data.get("is_primary") === "on",
      mark_entry_allowed: data.get("mark_entry_allowed") === "on",
      lesson_record_allowed: data.get("lesson_record_allowed") === "on",
      report_comment_allowed: data.get("report_comment_allowed") === "on",
      effective_from: value(data, "effective_from") || undefined,
      effective_to: value(data, "effective_to") || undefined,
      reason: value(data, "reason") || undefined,
    }, "Subject teacher assigned.", form);
  };

  const handleCreatePolicy = (kind: "grading" | "attendance" | "report-card") => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const path = kind === "grading" ? "grading-systems" : kind === "attendance" ? "attendance-settings" : "report-card-settings";
    const body: Record<string, unknown> = { name: value(data, "name") };
    try {
      if (kind === "grading") {
        const rules = JSON.parse(value(data, "rules") || "[]") as unknown;
        if (!Array.isArray(rules)) throw new Error("Grading rules must be a JSON array.");
        body.rules = rules;
        body.effective_from = value(data, "effective_from") || undefined;
        body.effective_to = value(data, "effective_to") || undefined;
      } else if (kind === "attendance") {
        body.configuration = JSON.parse(value(data, "configuration") || "{}") as Record<string, unknown>;
      } else {
        body.configuration = JSON.parse(value(data, "configuration") || "{}") as Record<string, unknown>;
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Policy configuration must be valid JSON.";
      setActionError(message);
      toast.error(message);
      return;
    }
    if (kind === "report-card") {
      body.grading_system_id = value(data, "grading_system_id") || null;
      body.show_rank = data.get("show_rank") === "on";
      body.show_attendance = data.get("show_attendance") === "on";
    } else body.description = value(data, "description") || undefined;
    return submit(`${kind}-policy`, `/academics/${path}`, body, `${kind === "report-card" ? "Report card" : kind} policy created.`, form);
  };

  const handleAssignAcademicRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return submit("academic-role", "/academics/academic-roles", {
      role_type: value(data, "role_type"),
      teacher_user_id: value(data, "teacher_user_id"),
      department_id: value(data, "department_id") || undefined,
      academic_year_id: value(data, "academic_year_id") || undefined,
      class_section_id: value(data, "class_section_id") || undefined,
      stream_id: value(data, "stream_id") || undefined,
      appointment_type: value(data, "appointment_type") || "permanent",
      effective_from: value(data, "effective_from"),
      effective_to: value(data, "effective_to") || undefined,
      reason: value(data, "reason"),
    }, "Academic role assigned with appointment history preserved.", form);
  };

  const handleCreateCurriculumConfiguration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    let configuration: Record<string, unknown> = {};
    try {
      configuration = JSON.parse(value(data, "configuration") || "{}") as Record<string, unknown>;
    } catch {
      const message = "Curriculum configuration must be valid JSON.";
      setActionError(message);
      toast.error(message);
      return;
    }
    return submit("curriculum-configuration", "/academics/curriculum-configurations", {
      name: value(data, "name"),
      curriculum_model: value(data, "curriculum_model"),
      configuration,
      effective_from: value(data, "effective_from"),
      effective_to: value(data, "effective_to") || undefined,
      status: value(data, "status") || "draft",
      reason: value(data, "reason") || undefined,
    }, "Effective-dated curriculum configuration created.", form);
  };

  const setupChecks = [
    ["Academic year", activeYears.length > 0],
    ["Current term", activeTerms.length > 0],
    ["Classes/forms/grades", activeClasses.length > 0],
    ["Streams", activeStreams.length > 0],
    ["Subjects/learning areas", activeSubjects.length > 0],
    ["Class subject offerings", activeClassSubjectAssignments.length > 0],
    ["Curriculum configuration", activeCurriculumConfigurations.length > 0],
    ["Departments", activeDepartments.length > 0],
    ["Class teachers", activeClassTeachers.length > 0],
    ["HODs", activeDepartments.some((department) => department.head_of_department_user_id)],
    ["Subject teachers", activeSubjectTeachers.length > 0],
  ] as const;
  const completedChecks = setupChecks.filter(([, complete]) => complete).length;

  const tabs: Array<{ id: AcademicFoundationTab; label: string; icon: typeof CalendarDays }> = [
    { id: "calendar", label: "Academic Calendar", icon: CalendarDays },
    { id: "classes", label: "Classes & Streams", icon: Layers3 },
    { id: "subjects", label: "Subjects & Departments", icon: BookOpen },
    { id: "allocations", label: "Teacher Allocations", icon: UsersRound },
    { id: "roles-curriculum", label: "Roles & Curriculum", icon: GraduationCap },
    { id: "policies", label: "Grading & Policies", icon: Settings2 },
  ];

  const bulkGroups: BulkGroup[] = activeTab === "calendar" ? [
    { entityType: "academic-year", label: "Academic years", records: visible(years) },
    { entityType: "academic-term", label: "Terms", records: visible(terms) },
    { entityType: "calendar-period", label: "Reporting, exam, holiday, and activity periods", records: visible(calendarPeriods) },
  ] : activeTab === "classes" ? [
    { entityType: "class-section", label: "Classes/forms/grades", records: visible(classes) },
    { entityType: "class-stream", label: "Streams", records: visible(streams) },
  ] : activeTab === "subjects" ? [
    { entityType: "subject", label: "Subjects", records: visible(subjects) },
    { entityType: "class-subject", label: "Class subject offerings", records: visible(classSubjectAssignments) },
    { entityType: "department", label: "Departments", records: visible(departments) },
  ] : activeTab === "roles-curriculum" ? [
    { entityType: "curriculum-configuration", label: "Curriculum versions", records: visible(curriculumConfigurations) },
  ] : activeTab === "policies" ? [
    { entityType: "grading-system", label: "Grading systems", records: visible(gradingSystems) },
    { entityType: "attendance-setting", label: "Attendance policies", records: visible(attendanceSettings) },
    { entityType: "report-card-setting", label: "Report-card policies", records: visible(reportCardSettings) },
  ] : [];

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

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6" role="tablist" aria-label="Academic setup areas">
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

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search academic setup records</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
          <input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} className={`${fieldClass} mt-0 pl-9`} placeholder="Search academic years, classes, subjects, departments, or policies" />
        </label>
        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-bold text-white/75">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="h-4 w-4" /> Show inactive and archived
        </label>
        <label className="min-w-44 text-sm font-bold text-white/75"><span className="sr-only">Sort records</span><select value={recordSort} onChange={(event) => setRecordSort(event.target.value as typeof recordSort)} className={`${fieldClass} mt-0`}><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="recent">Most recently changed</option></select></label>
      </div>

      <BulkLifecyclePanel groups={bulkGroups} onUpdated={refreshAll} />

      {isLoading ? <LoadingRows /> : null}

      {!isLoading && activeTab === "calendar" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Create academic year" description="Set the school year before creating terms, classes, admissions, or exams.">
              <form onSubmit={handleCreateYear} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Academic year name<input name="name" required className={fieldClass} placeholder="e.g. 2026 Academic Year" /></label>
                <label className="text-sm font-bold">Starts on<input type="date" name="starts_on" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Ends on<input type="date" name="ends_on" required className={fieldClass} /></label>
                <label className="sm:col-span-2 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_current" /> Make this the current academic year</label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null}>
                  {busyAction === "year" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Academic Year
                </button>
              </form>
            </SetupForm>
            <SetupForm title="Create term" description="Terms are attached to the selected academic year and drive attendance, fees, and exams.">
              <form onSubmit={handleCreateTerm} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Academic year<select name="academic_year_id" required className={fieldClass} defaultValue=""><option value="">Select academic year</option>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label className="sm:col-span-2 text-sm font-bold">Term name<input name="name" required className={fieldClass} placeholder="e.g. Term 1" /></label>
                <label className="text-sm font-bold">Starts on<input type="date" name="starts_on" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Ends on<input type="date" name="ends_on" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Display order<input type="number" name="display_order" min="0" defaultValue="1" className={fieldClass} /></label>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_current" /> Current term</label>
                {activeYears.length === 0 ? <p className="sm:col-span-2 text-xs font-bold text-amber-200">Create or restore an active academic year first.</p> : null}
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || activeYears.length === 0}>
                  {busyAction === "term" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Term
                </button>
              </form>
            </SetupForm>
          </div>
          <SetupForm title="Add reporting, exam, holiday, or activity period" description="Maintain operational periods inside the school year or term without changing historical academic records.">
            <form onSubmit={handleCreateCalendarPeriod} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-bold">Academic year<select name="academic_year_id" required defaultValue="" className={fieldClass}><option value="">Select academic year</option>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
              <label className="text-sm font-bold">Term scope<select name="academic_term_id" defaultValue="" className={fieldClass}><option value="">Whole academic year</option>{activeTerms.map((term) => <option key={term.id} value={term.id}>{term.name} - {labels.years.get(term.academic_year_id)}</option>)}</select></label>
              <label className="text-sm font-bold">Period type<select name="period_type" required defaultValue="" className={fieldClass}><option value="">Select period type</option>{["reporting", "exam", "holiday", "activity", "boarding", "transport", "other"].map((type) => <option key={type} value={type} className="capitalize">{type}</option>)}</select></label>
              <label className="text-sm font-bold">Period name<input name="name" required className={fieldClass} placeholder="e.g. End-term examination" /></label>
              <label className="text-sm font-bold">Starts on<input type="date" name="starts_on" required className={fieldClass} /></label>
              <label className="text-sm font-bold">Ends on<input type="date" name="ends_on" required className={fieldClass} /></label>
              <label className="text-sm font-bold">Description<input name="description" className={fieldClass} placeholder="Purpose and school activity" /></label>
              <label className="text-sm font-bold">Setup note<input name="reason" className={fieldClass} placeholder="Why this period is being added" /></label>
              <button className={`${primaryButtonClass} sm:col-span-2 xl:col-span-4`} disabled={busyAction !== null || activeYears.length === 0}>{busyAction === "calendar-period" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Add Calendar Period</button>
            </form>
          </SetupForm>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Academic years" description="School-scoped years currently available.">
              {visible(years).length === 0 ? <EmptyState>No matching academic years. Create the first year or show archived records.</EmptyState> : (
                <div className="space-y-2">{visible(years).map((year) => <div key={year.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{year.name}{year.is_current ? <span className="ml-2 text-xs text-emerald-300">Current</span> : null}</p><p className="text-xs font-semibold text-white/55">{dateLabel(year.starts_on)} to {dateLabel(year.ends_on)} - <span className="capitalize">{statusLabel(year)}</span></p></div><AcademicRecordManager entityType="academic-year" record={year} title={year.name} fields={[{ name: "name", label: "Academic year name" }, { name: "starts_on", label: "Starts on", type: "date" }, { name: "ends_on", label: "Ends on", type: "date" }, { name: "display_order", label: "Display order", type: "number" }, { name: "is_current", label: "Current year", type: "checkbox" }]} onUpdated={refreshAll} /></div>)}</div>
              )}
            </SetupForm>
            <SetupForm title="Terms" description="Configured terms and their academic-year ownership.">
              {visible(terms).length === 0 ? <EmptyState>No matching terms. Create a term after the academic year.</EmptyState> : (
                <div className="space-y-2">{visible(terms).map((term) => <div key={term.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{term.name}{term.is_current ? <span className="ml-2 text-xs text-emerald-300">Current</span> : null}</p><p className="text-xs font-semibold text-white/55">{labels.years.get(term.academic_year_id) || "Academic year"} - {dateLabel(term.starts_on)} to {dateLabel(term.ends_on)} - order {term.display_order ?? 0} - <span className="capitalize">{statusLabel(term)}</span></p></div><AcademicRecordManager entityType="academic-term" record={term} title={term.name} fields={[{ name: "name", label: "Term name" }, { name: "starts_on", label: "Starts on", type: "date" }, { name: "ends_on", label: "Ends on", type: "date" }, { name: "display_order", label: "Display order", type: "number" }, { name: "is_current", label: "Current term", type: "checkbox" }]} onUpdated={refreshAll} /></div>)}</div>
              )}
            </SetupForm>
          </div>
          <SetupForm title="Calendar periods" description="Reporting, examination, holiday, activity, boarding, and transport periods retained with lifecycle history.">
            {visible(calendarPeriods).length === 0 ? <EmptyState>No matching calendar periods. Add the first operational period above.</EmptyState> : <div className="grid gap-2 md:grid-cols-2">{visible(calendarPeriods).map((period) => <div key={period.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{period.name} <span className="text-cyan-200 capitalize">({period.period_type})</span></p><p className="text-xs font-semibold text-white/55">{labels.years.get(period.academic_year_id) || "Academic year"}{period.academic_term_id ? ` - ${labels.terms.get(period.academic_term_id) || "Term"}` : ""} - {dateLabel(period.starts_on)} to {dateLabel(period.ends_on)} - {statusLabel(period)}</p>{period.description ? <p className="mt-1 text-xs text-white/45">{period.description}</p> : null}</div><AcademicRecordManager entityType="calendar-period" record={period} title={period.name} fields={[{ name: "academic_year_id", label: "Academic year", type: "select", options: activeYears.map((year) => ({ value: year.id, label: year.name })) }, { name: "academic_term_id", label: "Term scope", type: "select", options: activeTerms.map((term) => ({ value: term.id, label: term.name })) }, { name: "name", label: "Period name" }, { name: "period_type", label: "Period type", type: "select", options: ["reporting", "exam", "holiday", "activity", "boarding", "transport", "other"].map((type) => ({ value: type, label: type })) }, { name: "starts_on", label: "Starts on", type: "date" }, { name: "ends_on", label: "Ends on", type: "date" }, { name: "description", label: "Description", type: "textarea" }]} onUpdated={refreshAll} /></div>)}</div>}
          </SetupForm>
        </div>
      ) : null}

      {!isLoading && activeTab === "classes" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Create class, form, or grade" description="Use the labels your school uses: Grade 7, Form 1, PP2, or a custom class name.">
              <form onSubmit={handleCreateClass} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Academic year<select name="academic_year_id" required className={fieldClass} defaultValue=""><option value="">Select academic year</option>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label className="text-sm font-bold">Class/form/grade name<input name="name" required className={fieldClass} placeholder="e.g. Form 1" /></label>
                <label className="text-sm font-bold">Class code<input name="code" className={fieldClass} placeholder="e.g. F1" /></label>
                <label className="text-sm font-bold">Grade level<input name="grade_level" required className={fieldClass} placeholder="e.g. 9 or Form 1" /></label>
                <label className="text-sm font-bold">Curriculum<select name="curriculum_model" defaultValue="Custom" className={fieldClass}>{["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                <label className="text-sm font-bold">Capacity<input type="number" name="capacity" min="1" defaultValue="45" required className={fieldClass} /></label>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="enrolment_open" defaultChecked /> Open for enrolment</label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || years.length === 0}>{busyAction === "class" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Class / Form / Grade</button>
              </form>
            </SetupForm>
            <SetupForm title="Create stream" description="Streams belong to one class/form/grade and are selectable in admissions and attendance.">
              <form onSubmit={handleCreateStream} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} defaultValue=""><option value="">Select class</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Stream name<input name="name" required className={fieldClass} placeholder="e.g. North, Blue, A" /></label>
                <label className="text-sm font-bold">Stream code<input name="code" className={fieldClass} placeholder="e.g. N" /></label>
                <label className="text-sm font-bold">Capacity<input type="number" name="capacity" min="1" defaultValue="45" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Stream teacher<select name="stream_teacher_user_id" defaultValue="" className={fieldClass}><option value="">Assign later</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || activeClasses.length === 0}>{busyAction === "stream" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Stream</button>
              </form>
            </SetupForm>
          </div>
          <SetupForm title="Configured classes and streams" description="This is the live structure other school modules use.">
            {visible(classes).length === 0 ? <EmptyState>No matching classes. Create the first class after setting the academic year.</EmptyState> : (
              <div className="grid gap-3 md:grid-cols-2">{visible(classes).map((item) => {
                const linkedStreams = streams.filter((stream) => stream.class_section_id === item.id && (showArchived || isActive(stream)));
                const activeCount = Number(item.active_student_count ?? 0);
                const overCapacity = Boolean(item.capacity && activeCount > item.capacity);
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${overCapacity ? "border-red-300/40 bg-red-400/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.name} {item.code ? <span className="text-cyan-200">({item.code})</span> : null}</p><p className="text-xs font-semibold text-white/55">Grade: {item.grade_level || "Not set"} | {item.curriculum_model || "Custom"} | Enrolment {activeCount}/{item.capacity || "not set"} | <span className="capitalize">{statusLabel(item)}</span></p>{overCapacity ? <p className="mt-1 text-xs font-black text-red-200">Over capacity by {activeCount - Number(item.capacity)}</p> : null}</div><School className="h-5 w-5 text-cyan-200" /></div>
                    <div className="mt-3 space-y-2">{linkedStreams.length ? linkedStreams.map((stream) => <div key={stream.id} className="flex items-center justify-between gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-2.5 py-2"><span className="text-xs font-bold text-cyan-100">{stream.name}{stream.code ? ` (${stream.code})` : ""} - enrolment {Number(stream.active_student_count ?? 0)}/{stream.capacity || "not set"} - {statusLabel(stream)}</span><AcademicRecordManager entityType="class-stream" record={stream} title={`${item.name} ${stream.name}`} fields={[{ name: "name", label: "Stream name" }, { name: "code", label: "Stream code" }, { name: "capacity", label: "Capacity", type: "number" }, { name: "stream_teacher_user_id", label: "Stream teacher", type: "select", options: teachers.map((teacher) => ({ value: teacher.id, label: teacher.label })) }, { name: "class_section_id", label: "Class/form/grade", type: "select", options: activeClasses.map((entry) => ({ value: entry.id, label: entry.name })) }]} mergeCandidates={activeStreams.filter((candidate) => candidate.class_section_id === item.id).map((candidate) => ({ id: candidate.id, label: `${item.name} ${candidate.name}` }))} onUpdated={refreshAll} /></div>) : <span className="text-xs font-semibold text-amber-200">No streams yet</span>}</div>
                    <div className="mt-3"><AcademicRecordManager entityType="class-section" record={item} title={item.name} fields={[{ name: "academic_year_id", label: "Academic year", type: "select", options: activeYears.map((year) => ({ value: year.id, label: year.name })) }, { name: "name", label: "Class/form/grade name" }, { name: "code", label: "Class code" }, { name: "grade_level", label: "Grade level" }, { name: "curriculum_model", label: "Curriculum model", type: "select", options: ["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => ({ value: model, label: model })) }, { name: "capacity", label: "Capacity", type: "number" }, { name: "enrolment_open", label: "Open for enrolment", type: "checkbox" }]} mergeCandidates={activeClasses.map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>
                  </div>
                );
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
                <label className="block text-sm font-bold">Department code<input name="code" className={fieldClass} placeholder="e.g. SCI" /></label>
                <label className="block text-sm font-bold">Description<textarea name="description" rows={2} className={fieldClass} /></label>
                <label className="block text-sm font-bold">Head of Department<select name="head_of_department_user_id" className={fieldClass} defaultValue=""><option value="">Assign later</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                {teachers.length === 0 ? <p className="text-xs font-bold text-amber-200">Invite and activate staff before assigning a HOD.</p> : null}
                <button className={primaryButtonClass} disabled={busyAction !== null}>{busyAction === "department" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Department</button>
              </form>
            </SetupForm>
            <SetupForm title="Create subject or learning area" description="Subjects are school-specific and can be linked to an academic department.">
              <form onSubmit={handleCreateSubject} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">Code<input name="code" required className={fieldClass} placeholder="e.g. MAT" /></label>
                <label className="text-sm font-bold">Subject / learning area<input name="name" required className={fieldClass} placeholder="e.g. Mathematics" /></label>
                <label className="text-sm font-bold">Abbreviation<input name="abbreviation" className={fieldClass} placeholder="e.g. Maths" /></label>
                <label className="text-sm font-bold">Curriculum<select name="curriculum_model" defaultValue="Custom" className={fieldClass}>{["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                <label className="sm:col-span-2 text-sm font-bold">Subject type<select name="subject_type" defaultValue="academic" className={fieldClass}><option value="academic">Academic subject</option><option value="learning_area">Learning area</option><option value="technical">Technical</option><option value="co_curricular">Co-curricular</option></select></label>
                <label className="sm:col-span-2 text-sm font-bold">Department<select name="department_id" className={fieldClass} defaultValue=""><option value="">No department yet</option>{activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
                <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_compulsory" defaultChecked /> Compulsory</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_examinable" defaultChecked /> Examinable</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_practical" /> Practical</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_co_curricular" /> Co-curricular</label></div>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null}>{busyAction === "subject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Subject / Learning Area</button>
              </form>
            </SetupForm>
          </div>
          <SetupForm title="Assign or change HOD" description="Update the department head without deleting the department.">
            <form onSubmit={handleAssignHod} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
              <label className="text-sm font-bold">Department<select name="department_id" required className={fieldClass} defaultValue=""><option value="">Select department</option>{activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
              <label className="text-sm font-bold">Head of Department<select name="head_of_department_user_id" className={fieldClass} defaultValue=""><option value="">Remove current HOD</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
              <label className="text-sm font-bold">Appointment type<select name="appointment_type" className={fieldClass} defaultValue="permanent"><option value="permanent">Permanent</option><option value="acting">Acting</option></select></label>
              <label className="text-sm font-bold">Effective from<input type="date" name="effective_from" defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label>
              <label className="text-sm font-bold">Effective to<input type="date" name="effective_to" className={fieldClass} /></label>
              <label className="text-sm font-bold">Reason<input name="reason" required className={fieldClass} placeholder="Appointment or reassignment reason" /></label>
              <button className={primaryButtonClass} disabled={busyAction !== null || activeDepartments.length === 0 || teachers.length === 0}>{busyAction === "hod" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save HOD</button>
            </form>
          </SetupForm>
          <SetupForm title="Assign subject to class and term" description="Create the exact class and term offering used by teacher allocation, timetables, exams, marks, and report cards.">
            <form onSubmit={handleAssignClassSubject} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
              <label className="text-sm font-bold">Academic term<select name="academic_term_id" required defaultValue="" className={fieldClass}><option value="">Select term</option>{activeTerms.map((term) => <option key={term.id} value={term.id}>{term.name} - {labels.years.get(term.academic_year_id)}</option>)}</select></label>
              <label className="text-sm font-bold">Class/form/grade<select name="class_section_id" required defaultValue="" className={fieldClass}><option value="">Select class</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name} - {labels.years.get(item.academic_year_id || "")}</option>)}</select></label>
              <label className="text-sm font-bold">Subject / learning area<select name="subject_id" required defaultValue="" className={fieldClass}><option value="">Select subject</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} ({subject.code})</option>)}</select></label>
              <label className="text-sm font-bold">Effective from<input type="date" name="effective_from" className={fieldClass} /></label>
              <label className="text-sm font-bold">Effective to<input type="date" name="effective_to" className={fieldClass} /></label>
              <label className="text-sm font-bold">Reason / setup note<input name="reason" className={fieldClass} placeholder="Why this offering applies" /></label>
              <div className="flex flex-wrap gap-4 md:col-span-2 xl:col-span-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_compulsory" defaultChecked /> Compulsory for this class</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_examinable" defaultChecked /> Examinable in this term</label></div>
              {(activeTerms.length === 0 || activeClasses.length === 0 || activeSubjects.length === 0) ? <p className="text-xs font-bold text-amber-200 md:col-span-2 xl:col-span-3">Create an active academic term, class, and subject before assigning the offering.</p> : null}
              <button className={`${primaryButtonClass} md:col-span-2 xl:col-span-3`} disabled={busyAction !== null || activeTerms.length === 0 || activeClasses.length === 0 || activeSubjects.length === 0}>{busyAction === "class-subject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Subject to Class</button>
            </form>
          </SetupForm>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Departments" description="Current department ownership and HOD assignments.">
              {visible(departments).length === 0 ? <EmptyState>No matching departments. Create the first department above.</EmptyState> : <div className="space-y-2">{visible(departments).map((department) => <div key={department.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{department.name} {department.code ? <span className="text-cyan-200">({department.code})</span> : null}</p><p className="text-xs font-semibold text-white/55">HOD: {department.head_of_department_name || labels.teachers.get(department.head_of_department_user_id || "") || "Not assigned"} - <span className="capitalize">{statusLabel(department)}</span></p>{department.description ? <p className="mt-1 text-xs text-white/45">{department.description}</p> : null}</div><AcademicRecordManager entityType="department" record={department} title={department.name} fields={[{ name: "name", label: "Department name" }, { name: "code", label: "Department code" }, { name: "description", label: "Description", type: "textarea" }, { name: "head_of_department_user_id", label: "Head of Department", type: "select", options: teachers.map((teacher) => ({ value: teacher.id, label: teacher.label })) }, { name: "appointment_type", label: "Appointment type", type: "select", options: [{ value: "permanent", label: "Permanent" }, { value: "acting", label: "Acting" }] }, { name: "effective_from", label: "Effective from", type: "date" }, { name: "effective_to", label: "Effective to", type: "date" }]} mergeCandidates={activeDepartments.map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
            <SetupForm title="Subjects and learning areas" description="Current school subject catalogue.">
              {visible(subjects).length === 0 ? <EmptyState>No matching subjects. Create the first subject or learning area above.</EmptyState> : <div className="space-y-2">{visible(subjects).map((subject) => <div key={subject.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{subject.name} <span className="text-cyan-200">({subject.code})</span></p><p className="text-xs font-semibold text-white/55">{subject.curriculum_model || "Custom"} {subject.subject_type || "academic"} - Department: {labels.departments.get(subject.department_id || "") || "Not linked"} - <span className="capitalize">{statusLabel(subject)}</span></p><p className="text-xs text-white/45">{subject.is_compulsory ? "Compulsory" : "Optional"} | {subject.is_examinable ? "Examinable" : "Non-examinable"}{subject.is_practical ? " | Practical" : ""}{subject.is_co_curricular ? " | Co-curricular" : ""}</p></div><AcademicRecordManager entityType="subject" record={subject} title={subject.name} fields={[{ name: "code", label: "Subject code" }, { name: "name", label: "Subject / learning area" }, { name: "abbreviation", label: "Abbreviation" }, { name: "curriculum_model", label: "Curriculum model", type: "select", options: ["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => ({ value: model, label: model })) }, { name: "subject_type", label: "Subject type", type: "select", options: [{ value: "academic", label: "Academic subject" }, { value: "learning_area", label: "Learning area" }, { value: "technical", label: "Technical" }, { value: "co_curricular", label: "Co-curricular" }] }, { name: "department_id", label: "Department", type: "select", options: activeDepartments.map((entry) => ({ value: entry.id, label: entry.name })) }, { name: "is_compulsory", label: "Compulsory", type: "checkbox" }, { name: "is_examinable", label: "Examinable", type: "checkbox" }, { name: "is_practical", label: "Practical", type: "checkbox" }, { name: "is_co_curricular", label: "Co-curricular", type: "checkbox" }]} mergeCandidates={activeSubjects.map((candidate) => ({ id: candidate.id, label: `${candidate.name} (${candidate.code})` }))} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
          </div>
          <SetupForm title="Class and term subject offerings" description="Manage the subject catalogue actually available to each class and term. Existing marks and teacher work remain linked when an offering is retired.">
            {visible(classSubjectAssignments).length === 0 ? <EmptyState>No matching class subject offerings. Assign the first subject to a class and term above.</EmptyState> : <div className="grid gap-2 md:grid-cols-2">{visible(classSubjectAssignments).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - {assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"}</p><p className="text-xs font-semibold text-white/55">{assignment.academic_term_name || labels.terms.get(assignment.academic_term_id) || "Term"} - {assignment.is_compulsory ? "Compulsory" : "Optional"} - {assignment.is_examinable ? "Examinable" : "Non-examinable"} - {statusLabel(assignment)}</p><p className="text-xs font-semibold text-white/45">{dateLabel(assignment.effective_from || undefined)} to {dateLabel(assignment.effective_to || undefined)}{assignment.reason ? ` - ${assignment.reason}` : ""}</p></div><AcademicRecordManager entityType="class-subject" record={assignment} title={`${assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - ${assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"}`} fields={[{ name: "academic_term_id", label: "Academic term", type: "select", options: activeTerms.map((term) => ({ value: term.id, label: `${term.name} - ${labels.years.get(term.academic_year_id) || "Academic year"}` })) }, { name: "class_section_id", label: "Class/form/grade", type: "select", options: activeClasses.map((item) => ({ value: item.id, label: item.name })) }, { name: "subject_id", label: "Subject / learning area", type: "select", options: activeSubjects.map((subject) => ({ value: subject.id, label: `${subject.name} (${subject.code})` })) }, { name: "is_compulsory", label: "Compulsory", type: "checkbox" }, { name: "is_examinable", label: "Examinable", type: "checkbox" }, { name: "effective_from", label: "Effective from", type: "date" }, { name: "effective_to", label: "Effective to", type: "date" }, { name: "reason", label: "Reason / setup note", type: "textarea" }]} onUpdated={refreshAll} /></div>)}</div>}
          </SetupForm>
        </div>
      ) : null}

      {!isLoading && activeTab === "allocations" ? (
        <div role="tabpanel" className="space-y-5">
          {teachers.length === 0 ? <div className="rounded-xl border border-amber-200/25 bg-amber-200/10 p-4 text-sm font-bold text-amber-100">No active staff are available. The Principal must invite and activate staff before assigning class teachers, HODs, or subject teachers.</div> : null}
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Assign class teacher" description="Assign pastoral and register responsibility for a class/form/grade in an academic year.">
              <form onSubmit={handleAssignClassTeacher} className="space-y-3">
                <label className="block text-sm font-bold">Academic year<select name="academic_year_id" required className={fieldClass} defaultValue=""><option value="">Select academic year</option>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} defaultValue=""><option value="">Select class</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Teacher<select name="teacher_user_id" required className={fieldClass} defaultValue=""><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Assignment type<select name="assignment_type" defaultValue="permanent" className={fieldClass}><option value="permanent">Permanent</option><option value="temporary">Temporary</option></select></label><label className="text-sm font-bold">Effective from<input type="date" name="effective_from" defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label></div>
                <label className="block text-sm font-bold">Effective to (optional)<input type="date" name="effective_to" className={fieldClass} /></label>
                <label className="block text-sm font-bold">Reason / appointment note<input name="reason" className={fieldClass} placeholder="Why this responsibility is assigned" /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || activeYears.length === 0 || activeClasses.length === 0 || teachers.length === 0}>{busyAction === "class-teacher" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Class Teacher</button>
              </form>
            </SetupForm>
            <SetupForm title="Assign subject teacher" description="Assign an active teacher to one subject, class, and term scope.">
              <form onSubmit={handleAssignSubjectTeacher} className="space-y-3">
                <label className="block text-sm font-bold">Academic term<select name="academic_term_id" required className={fieldClass} defaultValue=""><option value="">Select term</option>{activeTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} defaultValue=""><option value="">Select class</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Subject / learning area<select name="subject_id" required className={fieldClass} defaultValue=""><option value="">Select subject</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Teacher<select name="teacher_user_id" required className={fieldClass} defaultValue=""><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold">Stream<select name="stream_id" defaultValue="" className={fieldClass}><option value="">All streams / none</option>{activeStreams.map((stream) => <option key={stream.id} value={stream.id}>{stream.class_section_name} {stream.name}</option>)}</select></label><label className="text-sm font-bold">Department<select name="department_id" defaultValue="" className={fieldClass}><option value="">Use subject department</option>{activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label className="text-sm font-bold">Curriculum<select name="curriculum_model" defaultValue="" className={fieldClass}><option value="">Use subject curriculum</option>{["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => <option key={model} value={model}>{model}</option>)}</select></label></div>
                <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold">Type<select name="assignment_type" defaultValue="permanent" className={fieldClass}><option value="permanent">Permanent</option><option value="temporary">Temporary</option></select></label><label className="text-sm font-bold">Effective from<input type="date" name="effective_from" defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label><label className="text-sm font-bold">Effective to<input type="date" name="effective_to" className={fieldClass} /></label></div>
                <div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_primary" defaultChecked /> Primary teacher</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="mark_entry_allowed" defaultChecked /> Enter marks</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="lesson_record_allowed" defaultChecked /> Record lessons</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="report_comment_allowed" defaultChecked /> Report comments</label></div>
                <label className="block text-sm font-bold">Reason / allocation note<input name="reason" className={fieldClass} placeholder="Why this teaching allocation is assigned" /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || activeTerms.length === 0 || activeClasses.length === 0 || activeSubjects.length === 0 || teachers.length === 0}>{busyAction === "subject-teacher" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Subject Teacher</button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Class teachers" description="Current assignments and retained reassignment history.">
              {(showArchived ? classTeachers : activeClassTeachers).length === 0 ? <EmptyState>No class teachers assigned. Complete the year, class, and staff setup, then assign one above.</EmptyState> : <div className="space-y-2">{(showArchived ? classTeachers : activeClassTeachers).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.teacher_name || labels.teachers.get(assignment.teacher_user_id) || "Teacher"}</p><p className="text-xs font-semibold text-white/55">{assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"} - {assignment.academic_year_name || labels.years.get(assignment.academic_year_id) || "Academic year"} - {assignment.assignment_type || "permanent"} - <span className="capitalize">{assignment.status || "active"}</span></p><p className="text-xs font-semibold text-white/45">{dateLabel(assignment.effective_from)} to {dateLabel(assignment.effective_to || undefined)}</p></div>{isActive(assignment) ? <AcademicAssignmentEndButton assignmentType="class-teacher" assignmentId={assignment.id} label="class teacher assignment" onUpdated={refreshAll} /> : null}</div>)}</div>}
            </SetupForm>
            <SetupForm title="Subject teachers" description="Current teaching allocations, permissions, and retained history.">
              {(showArchived ? subjectTeachers : activeSubjectTeachers).length === 0 ? <EmptyState>No subject teachers assigned. Complete term, class, subject, and staff setup first.</EmptyState> : <div className="space-y-2">{(showArchived ? subjectTeachers : activeSubjectTeachers).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.teacher_name || labels.teachers.get(assignment.teacher_user_id) || "Teacher"}</p><p className="text-xs font-semibold text-white/55">{assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - {assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"} - {assignment.academic_term_name || labels.terms.get(assignment.academic_term_id) || "Term"} - <span className="capitalize">{assignment.status || "active"}</span></p><p className="text-xs font-semibold text-white/45">{assignment.is_primary ? "Primary" : "Supporting"} | marks {assignment.mark_entry_allowed ? "allowed" : "blocked"} | lessons {assignment.lesson_record_allowed ? "allowed" : "blocked"} | comments {assignment.report_comment_allowed ? "allowed" : "blocked"}</p></div>{isActive(assignment) ? <div className="flex flex-wrap gap-2"><AcademicTeacherReassignmentButton assignmentId={assignment.id} currentTeacherId={assignment.teacher_user_id} teachers={teachers} onUpdated={refreshAll} /><AcademicAssignmentEndButton assignmentType="teacher-assignment" assignmentId={assignment.id} label="subject teacher assignment" onUpdated={refreshAll} /></div> : null}</div>)}</div>}
            </SetupForm>
          </div>
        </div>
      ) : null}

      {!isLoading && activeTab === "roles-curriculum" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Assign academic leadership role" description="Create an effective-dated appointment. Reassignment ends the previous holder without erasing history.">
              <form onSubmit={handleAssignAcademicRole} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Role<select name="role_type" required defaultValue="" className={fieldClass}><option value="">Select academic role</option><option value="assistant_class_teacher">Assistant Class Teacher</option><option value="grade_master">Grade Master</option><option value="form_master">Form Master</option><option value="dean_of_academics">Dean of Academics</option><option value="exams_manager">Exams Manager</option><option value="subject_coordinator">Subject Coordinator</option><option value="curriculum_coordinator">Curriculum Coordinator</option><option value="academic_year_coordinator">Academic Year Coordinator</option><option value="timetable_coordinator">Timetable Coordinator</option></select></label>
                <label className="sm:col-span-2 text-sm font-bold">Staff member<select name="teacher_user_id" required defaultValue="" className={fieldClass}><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <label className="text-sm font-bold">Department scope<select name="department_id" defaultValue="" className={fieldClass}><option value="">Whole school / not applicable</option>{activeDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Academic year scope<select name="academic_year_id" defaultValue="" className={fieldClass}><option value="">Not applicable</option>{activeYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Class scope<select name="class_section_id" defaultValue="" className={fieldClass}><option value="">Not applicable</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Stream scope<select name="stream_id" defaultValue="" className={fieldClass}><option value="">Not applicable</option>{activeStreams.map((item) => <option key={item.id} value={item.id}>{item.class_section_name} {item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Appointment type<select name="appointment_type" defaultValue="permanent" className={fieldClass}><option value="permanent">Permanent</option><option value="acting">Acting</option><option value="temporary">Temporary</option></select></label>
                <label className="text-sm font-bold">Effective from<input name="effective_from" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label>
                <label className="text-sm font-bold">Effective to<input name="effective_to" type="date" className={fieldClass} /></label>
                <label className="text-sm font-bold">Reason<input name="reason" required minLength={3} className={fieldClass} placeholder="Appointment or transfer reason" /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || teachers.length === 0}>{busyAction === "academic-role" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save role appointment</button>
              </form>
            </SetupForm>
            <SetupForm title="Create curriculum configuration" description="Create current or future CBC, CBE, 8-4-4, international, hybrid, or custom structures without rewriting history.">
              <form onSubmit={handleCreateCurriculumConfiguration} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Configuration name<input name="name" required className={fieldClass} placeholder="e.g. 2027 Senior School Pathways" /></label>
                <label className="text-sm font-bold">Curriculum model<select name="curriculum_model" required defaultValue="" className={fieldClass}><option value="">Select model</option>{["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                <label className="text-sm font-bold">Status<select name="status" defaultValue="draft" className={fieldClass}><option value="draft">Draft</option><option value="active">Active</option><option value="future">Future</option></select></label>
                <label className="text-sm font-bold">Effective from<input name="effective_from" type="date" required className={fieldClass} /></label>
                <label className="text-sm font-bold">Effective to<input name="effective_to" type="date" className={fieldClass} /></label>
                <label className="sm:col-span-2 text-sm font-bold">Structure (JSON)<textarea name="configuration" rows={6} defaultValue={'{\n  "pathways": [],\n  "tracks": [],\n  "promotion_rules": {}\n}'} className={fieldClass} /></label>
                <label className="sm:col-span-2 text-sm font-bold">Reason / setup note<input name="reason" className={fieldClass} /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null}>{busyAction === "curriculum-configuration" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create curriculum version</button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Academic role appointments" description="Active appointments and retained appointment history.">
              {(showArchived ? roleAppointments : activeRoleAppointments).length === 0 ? <EmptyState>No matching academic role appointments. Assign the first role above.</EmptyState> : <div className="space-y-2">{(showArchived ? roleAppointments : activeRoleAppointments).map((appointment) => <div key={appointment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black capitalize">{appointment.role_type.replaceAll("_", " ")} - {appointment.teacher_name || labels.teachers.get(appointment.teacher_user_id) || "Staff member"}</p><p className="text-xs font-semibold text-white/55">{appointment.department_id ? labels.departments.get(appointment.department_id) : appointment.class_section_id ? labels.classes.get(appointment.class_section_id) : appointment.stream_id ? labels.streams.get(appointment.stream_id) : "Whole-school scope"} - {appointment.appointment_type || "permanent"} - {statusLabel(appointment)}</p><p className="text-xs font-semibold text-white/45">{dateLabel(appointment.effective_from)} to {dateLabel(appointment.effective_to || undefined)}{appointment.reason ? ` - ${appointment.reason}` : ""}</p></div>{isActive(appointment) ? <AcademicAssignmentEndButton assignmentType="academic-role" assignmentId={appointment.id} label="academic role appointment" onUpdated={refreshAll} /> : null}</div>)}</div>}
            </SetupForm>
            <SetupForm title="Curriculum configurations" description="Current, future, and historical effective-dated curriculum structures.">
              {visible(curriculumConfigurations).length === 0 ? <EmptyState>No matching curriculum configurations. Create the first version above.</EmptyState> : <div className="space-y-2">{visible(curriculumConfigurations).map((configuration) => <div key={configuration.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{configuration.name} <span className="text-cyan-200">({configuration.curriculum_model})</span></p><p className="text-xs font-semibold text-white/55">{dateLabel(configuration.effective_from)} to {dateLabel(configuration.effective_to || undefined)} - {statusLabel(configuration)}{configuration.based_on_id ? " - versioned from an earlier configuration" : ""}</p></div><AcademicRecordManager entityType="curriculum-configuration" record={configuration} title={configuration.name} fields={[{ name: "name", label: "Configuration name" }, { name: "curriculum_model", label: "Curriculum model", type: "select", options: ["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => ({ value: model, label: model })) }, { name: "effective_from", label: "Effective from", type: "date" }, { name: "effective_to", label: "Effective to", type: "date" }, { name: "configuration", label: "Curriculum structure (JSON)", type: "json" }]} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
          </div>
        </div>
      ) : null}

      {!isLoading && activeTab === "policies" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <SetupForm title="Create grading system" description="Define the named grading policy that exams and report cards will use.">
              <form onSubmit={handleCreatePolicy("grading")} className="space-y-3">
                <label className="block text-sm font-bold">Policy name<input name="name" required className={fieldClass} placeholder="e.g. Secondary A-E grading" /></label>
                <label className="block text-sm font-bold">Description<textarea name="description" className={fieldClass} rows={3} placeholder="Explain where this grading system applies" /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">Effective from<input type="date" name="effective_from" className={fieldClass} /></label><label className="block text-sm font-bold">Effective to<input type="date" name="effective_to" className={fieldClass} /></label></div>
                <label className="block text-sm font-bold">Grade bands and assessment rules (JSON array)<textarea name="rules" required className={fieldClass} rows={7} defaultValue={'[\n  { "min": 80, "max": 100, "label": "A", "points": 12, "remark": "Excellent" },\n  { "min": 70, "max": 79, "label": "B", "points": 10, "remark": "Very good" }\n]'} /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null}>{busyAction === "grading-policy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create grading system</button>
              </form>
            </SetupForm>
            <SetupForm title="Create attendance policy" description="Record the school attendance rule or register configuration.">
              <form onSubmit={handleCreatePolicy("attendance")} className="space-y-3">
                <label className="block text-sm font-bold">Policy name<input name="name" required className={fieldClass} placeholder="e.g. Daily register policy" /></label>
                <label className="block text-sm font-bold">Description<textarea name="description" className={fieldClass} rows={3} placeholder="Register times, late rules, and escalation expectations" /></label>
                <label className="block text-sm font-bold">Register configuration (JSON)<textarea name="configuration" className={fieldClass} rows={5} defaultValue={'{\n  "sessions": ["morning", "afternoon"],\n  "late_after": "08:00"\n}'} /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null}>{busyAction === "attendance-policy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create attendance policy</button>
              </form>
            </SetupForm>
            <SetupForm title="Create report-card policy" description="Choose the grading system and what approved reports display.">
              <form onSubmit={handleCreatePolicy("report-card")} className="space-y-3">
                <label className="block text-sm font-bold">Policy name<input name="name" required className={fieldClass} placeholder="e.g. End-term report card" /></label>
                <label className="block text-sm font-bold">Grading system<select name="grading_system_id" required className={fieldClass} defaultValue=""><option value="">Select grading system</option>{gradingSystems.filter(isActive).map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}</select></label>
                <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="show_rank" defaultChecked /> Show rank</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="show_attendance" defaultChecked /> Show attendance</label></div>
                <label className="block text-sm font-bold">Template, comments, and signatures (JSON)<textarea name="configuration" className={fieldClass} rows={5} defaultValue={'{\n  "class_teacher_comment": true,\n  "principal_comment": true,\n  "signature_lines": ["Class Teacher", "Principal"]\n}'} /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || gradingSystems.filter(isActive).length === 0}>{busyAction === "report-card-policy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create report-card policy</button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <SetupForm title="Grading systems" description="Edit, archive, restore, or safely remove grading policies.">
              {visible(gradingSystems).length === 0 ? <EmptyState>No matching grading systems. Create the first policy above.</EmptyState> : <div className="space-y-2">{visible(gradingSystems).map((policy) => <div key={policy.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"><div><p className="font-black">{policy.name}</p><p className="text-xs font-semibold text-white/55">{policy.description || "No description"} - {dateLabel(policy.effective_from || undefined)} to {dateLabel(policy.effective_to || undefined)} - {statusLabel(policy)}</p></div><AcademicRecordManager entityType="grading-system" record={policy} title={policy.name} fields={[{ name: "name", label: "Policy name" }, { name: "description", label: "Description", type: "textarea" }, { name: "effective_from", label: "Effective from", type: "date" }, { name: "effective_to", label: "Effective to", type: "date" }, { name: "rules", label: "Grade bands and assessment rules (JSON)", type: "json" }]} mergeCandidates={gradingSystems.filter(isActive).map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
            <SetupForm title="Attendance settings" description="Manage school attendance policies without losing history.">
              {visible(attendanceSettings).length === 0 ? <EmptyState>No matching attendance policies. Create the first policy above.</EmptyState> : <div className="space-y-2">{visible(attendanceSettings).map((policy) => <div key={policy.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"><div><p className="font-black">{policy.name}</p><p className="text-xs font-semibold text-white/55">{policy.description || "No description"} - {statusLabel(policy)}</p></div><AcademicRecordManager entityType="attendance-setting" record={policy} title={policy.name} fields={[{ name: "name", label: "Policy name" }, { name: "description", label: "Description", type: "textarea" }, { name: "configuration", label: "Register configuration (JSON)", type: "json" }]} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
            <SetupForm title="Report-card settings" description="Control report-card grading, ranking, and attendance display.">
              {visible(reportCardSettings).length === 0 ? <EmptyState>No matching report-card policies. Create one after a grading system.</EmptyState> : <div className="space-y-2">{visible(reportCardSettings).map((policy) => <div key={policy.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"><div><p className="font-black">{policy.name}</p><p className="text-xs font-semibold text-white/55">Rank {policy.show_rank ? "shown" : "hidden"} - attendance {policy.show_attendance ? "shown" : "hidden"} - {statusLabel(policy)}</p></div><AcademicRecordManager entityType="report-card-setting" record={policy} title={policy.name} fields={[{ name: "name", label: "Policy name" }, { name: "grading_system_id", label: "Grading system", type: "select", options: gradingSystems.filter(isActive).map((entry) => ({ value: entry.id, label: entry.name })) }, { name: "show_rank", label: "Show rank", type: "checkbox" }, { name: "show_attendance", label: "Show attendance", type: "checkbox" }, { name: "configuration", label: "Template and comment configuration (JSON)", type: "json" }]} onUpdated={refreshAll} /></div>)}</div>}
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
