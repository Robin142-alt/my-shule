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
import {
  AcademicCurriculumConfigurationEditor,
  validateAcademicCurriculumConfiguration,
} from "@/components/school/academic-curriculum-builder";
import {
  AcademicAttendancePolicyEditor,
  AcademicGradeBandsEditor,
  AcademicReportCardPolicyEditor,
  validateAcademicGradeBands,
  validateAttendanceConfiguration,
} from "@/components/school/academic-policy-builders";
import { AcademicAssignmentEndButton, AcademicRecordManager, AcademicTeacherReassignmentButton } from "@/components/school/academic-record-manager";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { buildSchoolStaffOptions, type SchoolStaffOptionInput } from "@/lib/school/staff-option-label";

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
type TeacherOption = SchoolStaffOptionInput;
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
  academic_term_id: string | null;
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
type AcademicRoleAppointment = LifecycleRecord & { subject_id?: string | null; role_type: string; teacher_user_id: string; teacher_name?: string; department_id?: string | null; academic_year_id?: string | null; class_section_id?: string | null; stream_id?: string | null; appointment_type?: string; effective_from?: string; effective_to?: string | null; reason?: string };
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

function BulkLifecyclePanel({
  groups,
  tenantId,
  onUpdated,
}: {
  groups: BulkGroup[];
  tenantId: string;
  onUpdated: () => Promise<unknown> | unknown;
}) {
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
        tenantId,
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
        tenantId,
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
  tenantId,
  initialTab = "calendar",
  initialRoleType = "",
}: {
  actorRole: "Principal" | "Deputy Principal";
  schoolName: string;
  tenantId: string;
  initialTab?: AcademicFoundationTab;
  initialRoleType?: "" | "head_of_subject";
}) {
  const [activeTab, setActiveTab] = useState<AcademicFoundationTab>(initialTab);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recordSearch, setRecordSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [recordSort, setRecordSort] = useState<"name-asc" | "name-desc" | "recent">("name-asc");
  const [policySetupType, setPolicySetupType] = useState<"grading" | "attendance" | "report-card">("grading");
  const [selectedClassSubjectIds, setSelectedClassSubjectIds] = useState<string[]>([]);
  const [teacherClassId, setTeacherClassId] = useState("");
  const [teacherSubjectId, setTeacherSubjectId] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const foundationQuery = useSchoolQuery<AcademicFoundationResponse>("/academics/foundation", {
    tenantId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

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
  const selectedTeacherSubject = activeSubjects.find((subject) => subject.id === teacherSubjectId);
  const activeClassSubjectAssignments = classSubjectAssignments.filter(isActive);
  const activeDepartments = departments.filter(isActive);
  const activeClassTeachers = classTeachers.filter(isActive);
  const activeSubjectTeachers = subjectTeachers.filter(isActive);
  const activeGradingSystems = gradingSystems.filter(isActive);
  const activeAttendanceSettings = attendanceSettings.filter(isActive);
  const activeReportCardSettings = reportCardSettings.filter(isActive);
  const activeRoleAppointments = roleAppointments.filter(isActive);
  const activeCurriculumConfigurations = curriculumConfigurations.filter(isActive);
  const teachers = useMemo(
    () => buildSchoolStaffOptions(foundationQuery.data?.teachers).map((teacher) => ({
      id: teacher.value,
      label: teacher.label,
    })),
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
    const result = await foundationQuery.refetch();
    if (result.error) throw result.error;
    return result.data;
  };

  const runAction = async (action: string, request: () => Promise<unknown>, successMessage: string, form?: HTMLFormElement) => {
    setBusyAction(action);
    setActionError(null);
    try {
      await request();
      await refreshAll();
      form?.reset();
      toast.success(successMessage);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The academic setup action failed.";
      setActionError(message);
      toast.error(message);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const submit = (action: string, path: string, body: Record<string, unknown>, successMessage: string, form: HTMLFormElement) =>
    runAction(action, () => requestDashboardApi(path, { method: "POST", tenantId, body }), successMessage, form);

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
        tenantId,
        body: {
          head_of_department_user_id: value(data, "head_of_department_user_id") || null,
          appointment_type: value(data, "appointment_type") || "permanent",
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
      name: value(data, "name"),
      department_id: value(data, "department_id") || undefined,
      curriculum_model: value(data, "curriculum_model") || "Custom",
      subject_type: value(data, "subject_type") || "academic",
      is_compulsory: data.get("is_compulsory") === "on",
      is_examinable: data.get("is_examinable") === "on",
      is_practical: data.get("is_practical") === "on",
      is_co_curricular: data.get("is_co_curricular") === "on",
    }, "Subject or learning area created.", form);
  };

  const handleAssignClassSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const subjectIds = [...new Set(selectedClassSubjectIds)].slice(0, 100);
    if (subjectIds.length === 0) {
      const message = "Select at least one subject or learning area.";
      setActionError(message);
      toast.error(message);
      return;
    }
    const saved = await submit("class-subject", "/academics/class-subjects/bulk", {
      academic_term_id: value(data, "academic_term_id"),
      class_section_id: value(data, "class_section_id"),
      subject_ids: subjectIds,
      is_compulsory: data.get("is_compulsory") === "on",
      is_examinable: data.get("is_examinable") === "on",
      reason: value(data, "reason") || undefined,
    }, `${subjectIds.length} ${subjectIds.length === 1 ? "subject" : "subjects"} assigned to the class and term.`, form);
    if (saved) setSelectedClassSubjectIds([]);
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
      reason: value(data, "reason") || undefined,
    }, "Class teacher assigned.", form);
  };

  const handleAssignSubjectTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const assignmentType = value(data, "assignment_type") || "primary";
    const saved = await submit("subject-teacher", "/academics/teacher-assignments", {
      class_section_id: value(data, "class_section_id"),
      subject_id: value(data, "subject_id"),
      teacher_user_id: value(data, "teacher_user_id"),
      stream_id: value(data, "stream_id") || undefined,
      assignment_type: assignmentType,
      is_primary: assignmentType !== "supporting",
      mark_entry_allowed: data.get("mark_entry_allowed") === "on",
      lesson_record_allowed: data.get("lesson_record_allowed") === "on",
      report_comment_allowed: data.get("report_comment_allowed") === "on",
      reason: value(data, "reason") || undefined,
    }, "Subject teacher assigned.", form);
    if (saved) { setTeacherClassId(""); setTeacherSubjectId(""); }
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
        const validation = validateAcademicGradeBands(rules);
        if (validation) throw new Error(validation);
        body.rules = rules;
      } else if (kind === "attendance") {
        const configuration = JSON.parse(value(data, "configuration") || "{}") as Record<string, unknown>;
        const validation = validateAttendanceConfiguration(configuration);
        if (validation) throw new Error(validation);
        body.configuration = configuration;
      } else {
        body.configuration = JSON.parse(value(data, "configuration") || "{}") as Record<string, unknown>;
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Review the policy choices and try again.";
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
    if (value(data, "role_type") === "head_of_subject" && !value(data, "subject_id")) {
      setActionError("Select a subject for the Head of Subject appointment.");
      return;
    }
    return submit("academic-role", "/academics/academic-roles", {
      role_type: value(data, "role_type"),
      subject_id: value(data, "subject_id") || undefined,
      teacher_user_id: value(data, "teacher_user_id"),
      department_id: value(data, "department_id") || undefined,
      academic_year_id: value(data, "academic_year_id") || undefined,
      class_section_id: value(data, "class_section_id") || undefined,
      stream_id: value(data, "stream_id") || undefined,
      appointment_type: value(data, "appointment_type") || "permanent",
      reason: value(data, "reason"),
    }, "Academic role assigned with appointment history preserved.", form);
  };

  const handleCreateCurriculumConfiguration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const curriculumModel = value(data, "curriculum_model");
    let configuration: Record<string, unknown> = {};
    try {
      configuration = JSON.parse(value(data, "configuration") || "{}") as Record<string, unknown>;
    } catch {
      const message = "Curriculum structure could not be read. Review the guided fields and try again.";
      setActionError(message);
      toast.error(message);
      return;
    }
    const validation = validateAcademicCurriculumConfiguration(curriculumModel, configuration);
    if (validation) {
      setActionError(validation);
      toast.error(validation);
      return;
    }
    return submit("curriculum-configuration", "/academics/curriculum-configurations", {
      name: value(data, "name"),
      curriculum_model: curriculumModel,
      configuration,
      status: value(data, "status") || "draft",
      reason: value(data, "reason") || undefined,
    }, "Curriculum configuration created.", form);
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
  const policySteps = [
    {
      id: "grading",
      step: "1",
      title: "Grading system",
      description: "Set grade bands, points, and report remarks.",
      count: activeGradingSystems.length,
    },
    {
      id: "attendance",
      step: "2",
      title: "Attendance policy",
      description: "Choose register sessions and the late-arrival time.",
      count: activeAttendanceSettings.length,
    },
    {
      id: "report-card",
      step: "3",
      title: "Report-card policy",
      description: "Choose grading, ranking, comments, and signatures.",
      count: activeReportCardSettings.length,
    },
  ] as const;

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

      <BulkLifecyclePanel groups={bulkGroups} tenantId={tenantId} onUpdated={refreshAll} />

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
                <label className="text-sm font-bold">Class/form/grade name<input name="name" required className={fieldClass} placeholder="e.g. Grade 9 or Form 1" /></label>

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
                    <div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.name}</p><p className="text-xs font-semibold text-white/55">{item.curriculum_model || "Custom"} | Enrolment {activeCount}/{item.capacity || "not set"} | <span className="capitalize">{statusLabel(item)}</span></p>{overCapacity ? <p className="mt-1 text-xs font-black text-red-200">Over capacity by {activeCount - Number(item.capacity)}</p> : null}</div><School className="h-5 w-5 text-cyan-200" /></div>
                    <div className="mt-3 space-y-2">{linkedStreams.length ? linkedStreams.map((stream) => <div key={stream.id} className="flex items-center justify-between gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-2.5 py-2"><span className="text-xs font-bold text-cyan-100">{stream.name} - enrolment {Number(stream.active_student_count ?? 0)}/{stream.capacity || "not set"} - {statusLabel(stream)}</span><AcademicRecordManager entityType="class-stream" record={stream} title={`${item.name} ${stream.name}`} fields={[{ name: "name", label: "Stream name" }, { name: "capacity", label: "Capacity", type: "number" }, { name: "stream_teacher_user_id", label: "Stream teacher", type: "select", options: teachers.map((teacher) => ({ value: teacher.id, label: teacher.label })) }, { name: "class_section_id", label: "Class/form/grade", type: "select", options: activeClasses.map((entry) => ({ value: entry.id, label: entry.name })) }]} mergeCandidates={activeStreams.filter((candidate) => candidate.class_section_id === item.id).map((candidate) => ({ id: candidate.id, label: `${item.name} ${candidate.name}` }))} onUpdated={refreshAll} /></div>) : <span className="text-xs font-semibold text-amber-200">No streams yet</span>}</div>
                    <div className="mt-3"><AcademicRecordManager entityType="class-section" record={item} title={item.name} fields={[{ name: "academic_year_id", label: "Academic year", type: "select", options: activeYears.map((year) => ({ value: year.id, label: year.name })) }, { name: "name", label: "Class/form/grade name" }, { name: "curriculum_model", label: "Curriculum model", type: "select", options: ["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => ({ value: model, label: model })) }, { name: "capacity", label: "Capacity", type: "number" }, { name: "enrolment_open", label: "Open for enrolment", type: "checkbox" }]} mergeCandidates={activeClasses.map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>
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

                <label className="block text-sm font-bold">Description<textarea name="description" rows={2} className={fieldClass} /></label>
                <label className="block text-sm font-bold">Head of Department<select name="head_of_department_user_id" className={fieldClass} defaultValue=""><option value="">Assign later</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                {teachers.length === 0 ? <p className="text-xs font-bold text-amber-200">Invite and activate staff before assigning a HOD.</p> : null}
                <button className={primaryButtonClass} disabled={busyAction !== null}>{busyAction === "department" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Department</button>
              </form>
            </SetupForm>
            <SetupForm title="Create subject or learning area" description="Subjects are school-specific and can be linked to an academic department.">
              <form onSubmit={handleCreateSubject} className="grid gap-3 sm:grid-cols-2">

                <label className="text-sm font-bold">Subject / learning area<input name="name" required className={fieldClass} placeholder="e.g. Mathematics" /></label>

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


              <label className="text-sm font-bold">Reason<input name="reason" required className={fieldClass} placeholder="Appointment or reassignment reason" /></label>
              <button className={primaryButtonClass} disabled={busyAction !== null || activeDepartments.length === 0 || teachers.length === 0}>{busyAction === "hod" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save HOD</button>
            </form>
          </SetupForm>
          <SetupForm title="Assign subjects to class and term" description="Select one or several subjects to create the exact class and term offerings used by teacher allocation, timetables, exams, marks, and report cards.">
            <form onSubmit={handleAssignClassSubject} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
              <label className="text-sm font-bold">Academic term<select name="academic_term_id" required defaultValue="" className={fieldClass}><option value="">Select term</option>{activeTerms.map((term) => <option key={term.id} value={term.id}>{term.name} - {labels.years.get(term.academic_year_id)}</option>)}</select></label>
              <label className="text-sm font-bold">Class/form/grade<select name="class_section_id" required defaultValue="" className={fieldClass}><option value="">Select class</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name} - {labels.years.get(item.academic_year_id || "")}</option>)}</select></label>
              <fieldset disabled={busyAction !== null} aria-busy={busyAction === "class-subject"} className="rounded-lg border border-white/15 bg-[#0D2A5B] p-3 disabled:cursor-wait disabled:opacity-70 md:col-span-2 xl:col-span-1 xl:row-span-2">
                <legend className="px-1 text-sm font-bold">Subjects / learning areas</legend>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-100" aria-live="polite">{selectedClassSubjectIds.length} selected</span>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs font-black text-cyan-200 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={activeSubjects.length === 0 || selectedClassSubjectIds.length === Math.min(activeSubjects.length, 100)} onClick={() => setSelectedClassSubjectIds(activeSubjects.slice(0, 100).map((subject) => subject.id))}>Select all</button>
                    <button type="button" className="text-xs font-black text-white/70 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedClassSubjectIds.length === 0} onClick={() => setSelectedClassSubjectIds([])}>Clear</button>
                  </div>
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto pr-1" aria-describedby="class-subject-selection-help">
                  {activeSubjects.map((subject) => {
                    const selected = selectedClassSubjectIds.includes(subject.id);
                    const limitReached = !selected && selectedClassSubjectIds.length >= 100;
                    return (
                      <label key={subject.id} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm font-semibold transition ${selected ? "border-cyan-300/70 bg-cyan-300/15 text-white" : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.07]"} ${limitReached ? "cursor-not-allowed opacity-50" : ""}`}>
                        <input
                          type="checkbox"
                          name="subject_ids"
                          value={subject.id}
                          checked={selected}
                          disabled={limitReached}
                          onChange={() => setSelectedClassSubjectIds((current) => current.includes(subject.id) ? current.filter((id) => id !== subject.id) : [...current, subject.id].slice(0, 100))}
                        />
                        <span>{subject.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p id="class-subject-selection-help" className="mt-2 text-xs font-semibold text-white/50">Choose up to 100 subjects. The settings below apply to every selected subject.</p>
              </fieldset>


              <label className="text-sm font-bold">Reason / setup note<input name="reason" className={fieldClass} placeholder="Why this offering applies" /></label>
              <div className="flex flex-wrap gap-4 md:col-span-2 xl:col-span-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_compulsory" defaultChecked /> Compulsory for this class</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_examinable" defaultChecked /> Examinable in this term</label></div>
              {(activeTerms.length === 0 || activeClasses.length === 0 || activeSubjects.length === 0) ? <p className="text-xs font-bold text-amber-200 md:col-span-2 xl:col-span-3">Create an active academic term, class, and subject before assigning the offering.</p> : null}
              <button className={`${primaryButtonClass} md:col-span-2 xl:col-span-3`} disabled={busyAction !== null || activeTerms.length === 0 || activeClasses.length === 0 || activeSubjects.length === 0 || selectedClassSubjectIds.length === 0}>{busyAction === "class-subject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{selectedClassSubjectIds.length === 0 ? "Select Subjects to Assign" : `Assign ${selectedClassSubjectIds.length} ${selectedClassSubjectIds.length === 1 ? "Subject" : "Subjects"} to Class`}</button>
            </form>
          </SetupForm>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Departments" description="Current department ownership and HOD assignments.">
              {visible(departments).length === 0 ? <EmptyState>No matching departments. Create the first department above.</EmptyState> : <div className="space-y-2">{visible(departments).map((department) => <div key={department.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{department.name}</p><p className="text-xs font-semibold text-white/55">HOD: {department.head_of_department_name || labels.teachers.get(department.head_of_department_user_id || "") || "Not assigned"} - <span className="capitalize">{statusLabel(department)}</span></p>{department.description ? <p className="mt-1 text-xs text-white/45">{department.description}</p> : null}</div><AcademicRecordManager entityType="department" record={department} title={department.name} fields={[{ name: "name", label: "Department name" }, { name: "description", label: "Description", type: "textarea" }, { name: "head_of_department_user_id", label: "Head of Department", type: "select", options: teachers.map((teacher) => ({ value: teacher.id, label: teacher.label })) }, { name: "appointment_type", label: "Appointment type", type: "select", options: [{ value: "permanent", label: "Permanent" }, { value: "acting", label: "Acting" }] }, ]} mergeCandidates={activeDepartments.map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
            <SetupForm title="Subjects and learning areas" description="Current school subject catalogue.">
              {visible(subjects).length === 0 ? <EmptyState>No matching subjects. Create the first subject or learning area above.</EmptyState> : <div className="space-y-2">{visible(subjects).map((subject) => <div key={subject.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{subject.name}</p><p className="text-xs font-semibold text-white/55">{subject.curriculum_model || "Custom"} {subject.subject_type || "academic"} - Department: {labels.departments.get(subject.department_id || "") || "Not linked"} - <span className="capitalize">{statusLabel(subject)}</span></p><p className="text-xs text-white/45">{subject.is_compulsory ? "Compulsory" : "Optional"} | {subject.is_examinable ? "Examinable" : "Non-examinable"}{subject.is_practical ? " | Practical" : ""}{subject.is_co_curricular ? " | Co-curricular" : ""}</p></div><AcademicRecordManager entityType="subject" record={subject} title={subject.name} fields={[{ name: "name", label: "Subject / learning area" }, { name: "curriculum_model", label: "Curriculum model", type: "select", options: ["CBC", "CBE", "8-4-4", "International", "Hybrid", "Custom"].map((model) => ({ value: model, label: model })) }, { name: "subject_type", label: "Subject type", type: "select", options: [{ value: "academic", label: "Academic subject" }, { value: "learning_area", label: "Learning area" }, { value: "technical", label: "Technical" }, { value: "co_curricular", label: "Co-curricular" }] }, { name: "department_id", label: "Department", type: "select", options: activeDepartments.map((entry) => ({ value: entry.id, label: entry.name })) }, { name: "is_compulsory", label: "Compulsory", type: "checkbox" }, { name: "is_examinable", label: "Examinable", type: "checkbox" }, { name: "is_practical", label: "Practical", type: "checkbox" }, { name: "is_co_curricular", label: "Co-curricular", type: "checkbox" }]} mergeCandidates={activeSubjects.map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
          </div>
          <SetupForm title="Class and term subject offerings" description="Manage the subject catalogue actually available to each class and term. Existing marks and teacher work remain linked when an offering is retired.">
            {visible(classSubjectAssignments).length === 0 ? <EmptyState>No matching class subject offerings. Assign the first subject to a class and term above.</EmptyState> : <div className="grid gap-2 md:grid-cols-2">{visible(classSubjectAssignments).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - {assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"}</p><p className="text-xs font-semibold text-white/55">{assignment.academic_term_name || labels.terms.get(assignment.academic_term_id) || "Term"} - {assignment.is_compulsory ? "Compulsory" : "Optional"} - {assignment.is_examinable ? "Examinable" : "Non-examinable"} - {statusLabel(assignment)}</p><p className="text-xs font-semibold text-white/45">{assignment.reason}</p></div><AcademicRecordManager entityType="class-subject" record={assignment} title={`${assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - ${assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"}`} fields={[{ name: "academic_term_id", label: "Academic term", type: "select", options: activeTerms.map((term) => ({ value: term.id, label: `${term.name} - ${labels.years.get(term.academic_year_id) || "Academic year"}` })) }, { name: "class_section_id", label: "Class/form/grade", type: "select", options: activeClasses.map((item) => ({ value: item.id, label: item.name })) }, { name: "subject_id", label: "Subject / learning area", type: "select", options: activeSubjects.map((subject) => ({ value: subject.id, label: subject.name })) }, { name: "is_compulsory", label: "Compulsory", type: "checkbox" }, { name: "is_examinable", label: "Examinable", type: "checkbox" }, { name: "reason", label: "Reason / setup note", type: "textarea" }]} onUpdated={refreshAll} /></div>)}</div>}
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
                <div><label className="text-sm font-bold">Assignment type<select name="assignment_type" defaultValue="permanent" className={fieldClass}><option value="permanent">Permanent</option><option value="temporary">Temporary</option></select></label></div>

                <label className="block text-sm font-bold">Reason / appointment note<input name="reason" className={fieldClass} placeholder="Why this responsibility is assigned" /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || activeYears.length === 0 || activeClasses.length === 0 || teachers.length === 0}>{busyAction === "class-teacher" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Class Teacher</button>
              </form>
            </SetupForm>
            <SetupForm title="Assign subject teacher" description="The teacher continues across terms and follows the class as students are promoted, until reassigned or ended.">
              <form aria-label="Assign subject teacher" onSubmit={handleAssignSubjectTeacher} className="space-y-3">
                <label className="block text-sm font-bold">Class/form/grade<select name="class_section_id" required className={fieldClass} value={teacherClassId} onChange={(event) => setTeacherClassId(event.target.value)}><option value="">Select class</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Subject / learning area<select name="subject_id" required className={fieldClass} value={teacherSubjectId} onChange={(event) => setTeacherSubjectId(event.target.value)}><option value="">Select subject</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label className="block text-sm font-bold">Teacher<select name="teacher_user_id" required className={fieldClass} defaultValue=""><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <label className="block text-sm font-bold">Stream<select key={teacherClassId} name="stream_id" disabled={!teacherClassId} defaultValue="" className={fieldClass}><option value="">All current streams / no stream</option>{activeStreams.filter((stream) => stream.class_section_id === teacherClassId).map((stream) => <option key={stream.id} value={stream.id}>{stream.name}</option>)}</select></label>
                {selectedTeacherSubject ? <p className="text-sm font-semibold text-white/65" aria-live="polite">Department: {labels.departments.get(selectedTeacherSubject.department_id || "") || "Not linked"} · Curriculum: {selectedTeacherSubject.curriculum_model || "Custom"}</p> : null}
                <label className="block text-sm font-bold">Type<select name="assignment_type" defaultValue="primary" className={fieldClass}><option value="primary">Primary</option><option value="supporting">Supporting</option><option value="temporary">Temporary</option></select></label>
                <div className="grid gap-2 sm:grid-cols-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="mark_entry_allowed" defaultChecked /> Enter marks</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="lesson_record_allowed" defaultChecked /> Record lessons</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="report_comment_allowed" defaultChecked /> Report comments</label></div>
                <label className="block text-sm font-bold">Reason / allocation note<input name="reason" className={fieldClass} placeholder="Why this teaching allocation is assigned" /></label>
                <button className={primaryButtonClass} disabled={busyAction !== null || activeClasses.length === 0 || activeSubjects.length === 0 || teachers.length === 0}>{busyAction === "subject-teacher" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign Subject Teacher</button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Class teachers" description="Current assignments and retained reassignment history.">
              {(showArchived ? classTeachers : activeClassTeachers).length === 0 ? <EmptyState>No class teachers assigned. Complete the year, class, and staff setup, then assign one above.</EmptyState> : <div className="space-y-2">{(showArchived ? classTeachers : activeClassTeachers).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.teacher_name || labels.teachers.get(assignment.teacher_user_id) || "Teacher"}</p><p className="text-xs font-semibold text-white/55">{assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"} - {assignment.academic_year_name || labels.years.get(assignment.academic_year_id) || "Academic year"} - {assignment.assignment_type || "permanent"} - <span className="capitalize">{assignment.status || "active"}</span></p></div>{isActive(assignment) ? <AcademicAssignmentEndButton assignmentType="class-teacher" assignmentId={assignment.id} label="class teacher assignment" onUpdated={refreshAll} /> : null}</div>)}</div>}
            </SetupForm>
            <SetupForm title="Subject teachers" description="Current teaching allocations, permissions, and retained history.">
              {(showArchived ? subjectTeachers : activeSubjectTeachers).length === 0 ? <EmptyState>No subject teachers assigned. Set up classes, subjects, and active staff, then assign a teacher above.</EmptyState> : <div className="space-y-2">{(showArchived ? subjectTeachers : activeSubjectTeachers).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{assignment.teacher_name || labels.teachers.get(assignment.teacher_user_id) || "Teacher"}</p><p className="text-xs font-semibold text-white/55">{assignment.subject_name || labels.subjects.get(assignment.subject_id) || "Subject"} - {assignment.class_section_name || labels.classes.get(assignment.class_section_id) || "Class"} - {assignment.academic_term_id ? assignment.academic_term_name || labels.terms.get(assignment.academic_term_id) || "Term" : "Across terms"} - <span className="capitalize">{assignment.status || "active"}</span></p><p className="text-xs font-semibold text-white/45">{assignment.is_primary ? "Primary" : "Supporting"} | marks {assignment.mark_entry_allowed ? "allowed" : "blocked"} | lessons {assignment.lesson_record_allowed ? "allowed" : "blocked"} | comments {assignment.report_comment_allowed ? "allowed" : "blocked"}</p></div>{isActive(assignment) ? <div className="flex flex-wrap gap-2"><AcademicTeacherReassignmentButton assignmentId={assignment.id} currentTeacherId={assignment.teacher_user_id} teachers={teachers} onUpdated={refreshAll} /><AcademicAssignmentEndButton assignmentType="teacher-assignment" assignmentId={assignment.id} label="subject teacher assignment" onUpdated={refreshAll} /></div> : null}</div>)}</div>}
            </SetupForm>
          </div>
        </div>
      ) : null}

      {!isLoading && activeTab === "roles-curriculum" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Assign academic leadership role" description="Assign a staff member to an academic responsibility. Reassignment ends the previous holder without erasing history.">
              <form onSubmit={handleAssignAcademicRole} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Role<select name="role_type" required defaultValue={initialRoleType} className={fieldClass}><option value="">Select academic role</option><option value="assistant_class_teacher">Assistant Class Teacher</option><option value="grade_master">Grade Master</option><option value="form_master">Form Master</option><option value="dean_of_academics">Dean of Academics</option><option value="exams_manager">Exams Manager</option><option value="head_of_subject">Head of Subject (HOS)</option><option value="subject_coordinator">Subject Coordinator</option><option value="curriculum_coordinator">Curriculum Coordinator</option><option value="academic_year_coordinator">Academic Year Coordinator</option><option value="timetable_coordinator">Timetable Coordinator</option></select></label>
                <label className="sm:col-span-2 text-sm font-bold">Staff member<select name="teacher_user_id" required defaultValue="" className={fieldClass}><option value="">Select active staff member</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
                <label className="text-sm font-bold">Subject scope (required for HOS)<select name="subject_id" defaultValue="" className={fieldClass}><option value="">Select subject</option>{activeSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Department scope<select name="department_id" defaultValue="" className={fieldClass}><option value="">Whole school / not applicable</option>{activeDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Academic year scope<select name="academic_year_id" defaultValue="" className={fieldClass}><option value="">Not applicable</option>{activeYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Class scope<select name="class_section_id" defaultValue="" className={fieldClass}><option value="">Not applicable</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Stream scope<select name="stream_id" defaultValue="" className={fieldClass}><option value="">Not applicable</option>{activeStreams.map((item) => <option key={item.id} value={item.id}>{item.class_section_name} {item.name}</option>)}</select></label>
                <label className="text-sm font-bold">Appointment type<select name="appointment_type" defaultValue="permanent" className={fieldClass}><option value="permanent">Permanent</option><option value="acting">Acting</option><option value="temporary">Temporary</option></select></label>


                <label className="text-sm font-bold">Reason<input name="reason" required minLength={3} className={fieldClass} placeholder="Appointment or transfer reason" /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null || teachers.length === 0}>{busyAction === "academic-role" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save role appointment</button>
              </form>
            </SetupForm>
            <SetupForm title="Create curriculum configuration" description="Choose the school curriculum, levels, pathways, assessment approach, and promotion defaults without technical configuration fields.">
              <form onSubmit={handleCreateCurriculumConfiguration} className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-bold">Configuration name<input name="name" required className={fieldClass} placeholder="e.g. 2027 Senior School Pathways" /></label>
                <label className="text-sm font-bold">Status<select name="status" defaultValue="draft" className={fieldClass}><option value="draft">Draft</option><option value="active">Active</option></select></label>


                <div className="sm:col-span-2">
                  <AcademicCurriculumConfigurationEditor configurationName="configuration" />
                </div>
                <label className="sm:col-span-2 text-sm font-bold">Reason / setup note<input name="reason" className={fieldClass} /></label>
                <button className={`${primaryButtonClass} sm:col-span-2`} disabled={busyAction !== null}>{busyAction === "curriculum-configuration" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create curriculum version</button>
              </form>
            </SetupForm>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SetupForm title="Academic role appointments" description="Active appointments and retained appointment history.">
              {(showArchived ? roleAppointments : activeRoleAppointments).length === 0 ? <EmptyState>No matching academic role appointments. Assign the first role above.</EmptyState> : <div className="space-y-2">{(showArchived ? roleAppointments : activeRoleAppointments).map((appointment) => <div key={appointment.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black capitalize">{appointment.role_type.replaceAll("_", " ")} - {appointment.teacher_name || labels.teachers.get(appointment.teacher_user_id) || "Staff member"}</p><p className="text-xs font-semibold text-white/55">{appointment.subject_id ? subjects.find(subject => subject.id === appointment.subject_id)?.name || "Assigned subject" : appointment.department_id ? labels.departments.get(appointment.department_id) : appointment.class_section_id ? labels.classes.get(appointment.class_section_id) : appointment.stream_id ? labels.streams.get(appointment.stream_id) : "Whole-school scope"} - {appointment.appointment_type || "permanent"} - {statusLabel(appointment)}</p><p className="text-xs font-semibold text-white/45">{appointment.reason}</p></div>{isActive(appointment) ? <AcademicAssignmentEndButton assignmentType="academic-role" assignmentId={appointment.id} label="academic role appointment" onUpdated={refreshAll} /> : null}</div>)}</div>}
            </SetupForm>
            <SetupForm title="Curriculum configurations" description="Current, draft, and historical curriculum structures.">
              {visible(curriculumConfigurations).length === 0 ? <EmptyState>No matching curriculum configurations. Create the first version above.</EmptyState> : <div className="space-y-2">{visible(curriculumConfigurations).map((configuration) => <div key={configuration.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{configuration.name} <span className="text-cyan-200">({configuration.curriculum_model})</span></p><p className="text-xs font-semibold text-white/55">{statusLabel(configuration)}{configuration.based_on_id ? " - versioned from an earlier configuration" : ""}</p></div><AcademicRecordManager entityType="curriculum-configuration" record={configuration} title={configuration.name} fields={[{ name: "name", label: "Configuration name" }, { name: "configuration", label: "Curriculum structure", type: "curriculum-configuration" }]} onUpdated={refreshAll} /></div>)}</div>}
            </SetupForm>
          </div>
        </div>
      ) : null}

      {!isLoading && activeTab === "policies" ? (
        <div role="tabpanel" className="space-y-5">
          <Card className="border-white/10 bg-white/5 p-4 text-white md:p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Guided school policy setup</p>
                <h3 className="mt-1 text-xl font-black">Set up grading, attendance, and report cards</h3>
                <p className="mt-1 max-w-3xl text-sm font-semibold text-white/60">
                  Complete the three steps in order. Each saved policy remains editable and is shared with exams, attendance, marks, and report cards for this school.
                </p>
              </div>
              <p className="text-xs font-bold text-white/55">
                {policySteps.filter((step) => step.count > 0).length} of {policySteps.length} policy areas configured
              </p>
            </div>
            <div role="tablist" aria-label="Academic policy setup steps" className="mt-5 grid gap-3 lg:grid-cols-3">
              {policySteps.map((step) => {
                const selected = policySetupType === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setPolicySetupType(step.id)}
                    className={`flex min-h-28 items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                      selected
                        ? "border-cyan-200 bg-cyan-300 text-[#071D49]"
                        : "border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${selected ? "bg-[#071D49] text-cyan-200" : "bg-white/10 text-cyan-200"}`}>
                      {step.step}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-black">{step.title}</span>
                        {step.count > 0 ? (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${selected ? "border-[#071D49]/20 bg-white/50" : "border-emerald-200/20 bg-emerald-300/10 text-emerald-200"}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> {step.count} configured
                          </span>
                        ) : null}
                      </span>
                      <span className={`mt-1 block text-xs font-semibold ${selected ? "text-[#071D49]/70" : "text-white/55"}`}>{step.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {policySetupType === "grading" ? (
            <>
              <SetupForm title="Create grading system" description="Start from a Kenyan secondary or CBC template, then adjust each grade band using normal form controls.">
                <form onSubmit={handleCreatePolicy("grading")} className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-bold">Policy name<input name="name" required className={fieldClass} placeholder="e.g. 2026 Secondary A-E grading" /></label>
                  <label className="block text-sm font-bold">Description<input name="description" className={fieldClass} placeholder="Where this grading system applies" /></label>


                  <div className="lg:col-span-2"><AcademicGradeBandsEditor name="rules" /></div>
                  <button className={`${primaryButtonClass} lg:col-span-2 lg:justify-self-start`} disabled={busyAction !== null}>{busyAction === "grading-policy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save grading system</button>
                </form>
              </SetupForm>
              <SetupForm title="Saved grading systems" description="Review or manage the grading policies available to exams and report cards.">
                {visible(gradingSystems).length === 0 ? <EmptyState>No grading system has been saved yet. Use the guided form above to create the first one.</EmptyState> : <div className="grid gap-3 lg:grid-cols-2">{visible(gradingSystems).map((policy) => <div key={policy.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{policy.name}</p><p className="mt-1 text-xs font-semibold text-white/55">{policy.rules?.length ?? 0} grade bands - {statusLabel(policy)}</p><p className="mt-1 text-xs font-semibold text-white/45">{policy.description || "No description"}</p></div><AcademicRecordManager entityType="grading-system" record={policy} title={policy.name} fields={[{ name: "name", label: "Policy name" }, { name: "description", label: "Description", type: "textarea" }, { name: "rules", label: "Grade bands and assessment rules", type: "grade-bands" }]} mergeCandidates={activeGradingSystems.map((candidate) => ({ id: candidate.id, label: candidate.name }))} onUpdated={refreshAll} /></div>)}</div>}
              </SetupForm>
            </>
          ) : null}

          {policySetupType === "attendance" ? (
            <>
              <SetupForm title="Create attendance policy" description="Choose the school register sessions and late-arrival threshold without editing configuration code.">
                <form onSubmit={handleCreatePolicy("attendance")} className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-bold">Policy name<input name="name" required className={fieldClass} placeholder="e.g. Daily learner register" /></label>
                  <label className="block text-sm font-bold">Description<input name="description" className={fieldClass} placeholder="Register times, late rules, or escalation notes" /></label>
                  <div className="lg:col-span-2"><AcademicAttendancePolicyEditor name="configuration" /></div>
                  <button className={`${primaryButtonClass} lg:col-span-2 lg:justify-self-start`} disabled={busyAction !== null}>{busyAction === "attendance-policy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save attendance policy</button>
                </form>
              </SetupForm>
              <SetupForm title="Saved attendance policies" description="Review or manage the register rules used by the school.">
                {visible(attendanceSettings).length === 0 ? <EmptyState>No attendance policy has been saved yet. Use the guided form above to create the first one.</EmptyState> : <div className="grid gap-3 lg:grid-cols-2">{visible(attendanceSettings).map((policy) => {
                  const sessions = Array.isArray(policy.configuration?.sessions) ? policy.configuration.sessions.map(String) : [];
                  const lateAfter = typeof policy.configuration?.late_after === "string" ? policy.configuration.late_after : "Not set";
                  return <div key={policy.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{policy.name}</p><p className="mt-1 text-xs font-semibold text-white/55">{sessions.length > 0 ? sessions.join(", ") : "No sessions"} - late after {lateAfter} - {statusLabel(policy)}</p><p className="mt-1 text-xs font-semibold text-white/45">{policy.description || "No description"}</p></div><AcademicRecordManager entityType="attendance-setting" record={policy} title={policy.name} fields={[{ name: "name", label: "Policy name" }, { name: "description", label: "Description", type: "textarea" }, { name: "configuration", label: "Register schedule", type: "attendance-policy" }]} onUpdated={refreshAll} /></div>;
                })}</div>}
              </SetupForm>
            </>
          ) : null}

          {policySetupType === "report-card" ? (
            <>
              <SetupForm title="Create report-card policy" description="Choose the grading system and what approved learner reports display.">
                <form onSubmit={handleCreatePolicy("report-card")} className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-bold">Policy name<input name="name" required className={fieldClass} placeholder="e.g. End-term report card" /></label>
                  <label className="block text-sm font-bold">Grading system<select name="grading_system_id" required className={fieldClass} defaultValue=""><option value="">Select grading system</option>{activeGradingSystems.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}</select></label>
                  <div className="flex flex-wrap gap-4 lg:col-span-2"><label className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-bold"><input type="checkbox" name="show_rank" defaultChecked /> Show learner rank</label><label className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-bold"><input type="checkbox" name="show_attendance" defaultChecked /> Show attendance summary</label></div>
                  <div className="lg:col-span-2"><AcademicReportCardPolicyEditor name="configuration" /></div>
                  {activeGradingSystems.length === 0 ? <div className="rounded-xl border border-amber-200/25 bg-amber-200/10 p-4 text-sm font-bold text-amber-100 lg:col-span-2">Create a grading system in step 1 before saving a report-card policy. <button type="button" onClick={() => setPolicySetupType("grading")} className="ml-1 underline underline-offset-4">Open grading setup</button></div> : null}
                  <button className={`${primaryButtonClass} lg:col-span-2 lg:justify-self-start`} disabled={busyAction !== null || activeGradingSystems.length === 0}>{busyAction === "report-card-policy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save report-card policy</button>
                </form>
              </SetupForm>
              <SetupForm title="Saved report-card policies" description="Review or manage ranking, attendance, comments, and approval lines.">
                {visible(reportCardSettings).length === 0 ? <EmptyState>No report-card policy has been saved yet. Create a grading system first, then use the guided form above.</EmptyState> : <div className="grid gap-3 lg:grid-cols-2">{visible(reportCardSettings).map((policy) => <div key={policy.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{policy.name}</p><p className="mt-1 text-xs font-semibold text-white/55">Rank {policy.show_rank ? "shown" : "hidden"} - attendance {policy.show_attendance ? "shown" : "hidden"} - {statusLabel(policy)}</p></div><AcademicRecordManager entityType="report-card-setting" record={policy} title={policy.name} fields={[{ name: "name", label: "Policy name" }, { name: "grading_system_id", label: "Grading system", type: "select", options: activeGradingSystems.map((entry) => ({ value: entry.id, label: entry.name })) }, { name: "show_rank", label: "Show rank", type: "checkbox" }, { name: "show_attendance", label: "Show attendance", type: "checkbox" }, { name: "configuration", label: "Comments and approval lines", type: "report-card-policy" }]} onUpdated={refreshAll} /></div>)}</div>}
              </SetupForm>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white/60">
        <div className="flex items-start gap-3"><GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" /><p>All records on this page are loaded from and saved to the current school tenant. Once configured, the same classes, streams, subjects, departments, and teacher allocations become selectable in admissions, attendance, timetable, exams, and marks entry.</p></div>
      </div>
    </section>
  );
}
