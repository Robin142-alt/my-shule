"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { useState } from "react";
import type { SyllabusWorkspaceData } from "@/lib/modules/syllabus-types";
import {
  PrincipalHeader,
  PrincipalPanel,
  PrincipalMetrics,
  principalStyles as styles,
} from "./workspace-ui";
import { Card } from "@/components/ui/card";
import { AlertCircle, UserPlus, Users, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";
import { UserManagementPanel } from "@/components/school/user-management-panel";
import { usePermissions } from "@/components/providers/permission-context";
import { buildSchoolStaffOptions, type SchoolStaffOptionInput } from "@/lib/school/staff-option-label";

type PrincipalStaffData = {
  status: "active" | "degraded" | "setup_required";
  totalStaff: number;
  teachingStaff: number;
  supportStaff: number;
  onLeave: number;
  attendanceToday?: Array<{ user_id: string; status: string }>;
  staffDistribution: Array<{ label: string; value: number }>;
  recentOnboarding: Array<any>;
};

type TeacherOption = SchoolStaffOptionInput & { status?: string };

export function PrincipalStaffRolesWorkspace() {
  const { data, isLoading, error, refetch } =
    useSchoolQuery<PrincipalStaffData>("/admin-command/principal/staff");
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { data: yearsData } = useSchoolQuery<any[]>(
    "/academics/academic-years",
  );
  const { data: classesData } = useSchoolQuery<any[]>(
    "/academics/class-sections",
  );
  const { data: subjectsData } = useSchoolQuery<any[]>("/academics/subjects");
  const { data: classTeachersData, refetch: refetchClassTeachers } =
    useSchoolQuery<any[]>("/academics/class-teachers");
  const { data: teachersData } = useSchoolQuery<TeacherOption[]>(
    "/academics/teachers",
  );
  const { data: streamsData } = useSchoolQuery<
    Array<{ id: string; name: string; class_section_id: string }>
  >("/academics/class-streams");
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const academicAccess = hasPermission("academics:read");
  const oversight = useSchoolQuery<SyllabusWorkspaceData>(
    academicAccess ? "/academics/syllabus" : null,
  );
  const [term, setTerm] = useState("");
  const [teacherClassId, setTeacherClassId] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [isClassTeacherModalOpen, setIsClassTeacherModalOpen] = useState(false);
  const [isSubmittingCT, setIsSubmittingCT] = useState(false);
  const [ctFormError, setCtFormError] = useState("");

  const teacherOptions = buildSchoolStaffOptions(teachersData);

  const teacherLabelByUserId = new Map(
    teacherOptions.map((teacher) => [teacher.value, teacher.label]),
  );
  const classLabelById = new Map(
    (classesData ?? []).map((classSection) => [
      String(classSection.id),
      classSection.name ||
        classSection.custom_label ||
        classSection.grade_level ||
        "Class section",
    ]),
  );
  const yearLabelById = new Map(
    (yearsData ?? []).map((year) => [
      String(year.id),
      year.name || year.label || "Academic year",
    ]),
  );

  const hasTeachers = teacherOptions.length > 0;
  const hasPrerequisites =
    hasTeachers &&
    classesData &&
    classesData.length > 0 &&
    subjectsData &&
    subjectsData.length > 0;

  const hasCTPrerequisites =
    hasTeachers &&
    yearsData &&
    yearsData.length > 0 &&
    classesData &&
    classesData.length > 0;

  const teacherAssignmentBlockReason = !hasTeachers
    ? "Invite and activate teaching staff before assigning subject teachers"
    : !hasPrerequisites
      ? "Cannot assign teachers before classes and subjects exist"
      : "";

  const classTeacherBlockReason = !hasTeachers
    ? "Invite and activate teaching staff before assigning class teachers"
    : !hasCTPrerequisites
      ? "Cannot assign class teachers before academic years and classes exist"
      : "";

  const handleAssignTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi("/academics/teacher-assignments", {
        method: "POST",
        body: {
          class_section_id: formData.get("class_section_id"),
          stream_id: formData.get("stream_id") || undefined,
          subject_id: formData.get("subject_id"),
          teacher_user_id: formData.get("teacher_user_id"),
        },
      });
      setIsAssignModalOpen(false);
      toast.success("Subject teacher assigned until reassigned or ended.");
      await Promise.all([
        refetch(),
        refetchClassTeachers(),
        ...(academicAccess ? [oversight.refetch()] : []),
      ]);
    } catch (err: any) {
      setFormError(err.message || "Failed to assign teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignClassTeacher = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setIsSubmittingCT(true);
    setCtFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi("/academics/class-teachers", {
        method: "POST",
        body: {
          academic_year_id: formData.get("academic_year_id"),
          class_section_id: formData.get("class_section_id"),
          teacher_user_id: formData.get("teacher_user_id"),
        },
      });
      setIsClassTeacherModalOpen(false);
      await Promise.all([
        refetch(),
        refetchClassTeachers(),
        ...(academicAccess ? [oversight.refetch()] : []),
      ]);
    } catch (err: any) {
      setCtFormError(err.message || "Failed to assign class teacher");
    } finally {
      setIsSubmittingCT(false);
    }
  };

  const handleArchiveClassTeacher = async (id: string) => {
    if (
      !confirm("Are you sure you want to remove this class teacher assignment?")
    )
      return;
    try {
      await requestPrincipalApi(`/academics/class-teachers/${id}`, {
        method: "DELETE",
      });
      await Promise.all([
        refetch(),
        refetchClassTeachers(),
        ...(academicAccess ? [oversight.refetch()] : []),
      ]);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive class teacher");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-surface rounded-xl border border-border" />
          <div className="h-64 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">
            Failed to load Staff Overview
          </h2>
        </div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Card>
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const terms = oversight.data?.terms ?? [];
  const currentTerm = terms.find(
    (row) =>
      row.status === "active" &&
      row.starts_on.slice(0, 10) <= today &&
      row.ends_on.slice(0, 10) >= today,
  );
  const selectedTerm = term || currentTerm?.id || "";
  const allocations = (oversight.data?.items ?? []).filter(
    (row) => row.academic_term_id === selectedTerm,
  );
  const visible = teacherOptions
    .map((person) => {
      const rows = allocations.filter(
        (row) => row.teacher_user_id === person.value,
      );
      const subjects = [...new Set(rows.map((row) => row.subject))].join(", ");
      const classes = [
        ...new Set(
          rows.map((row) =>
            [row.class_name, row.stream_name].filter(Boolean).join(" "),
          ),
        ),
      ].join(", ");
      const taught = rows.reduce(
          (sum, row) => sum + (row.progress?.completed ?? 0),
          0,
        ),
        required = rows.reduce(
          (sum, row) => sum + (row.progress?.total ?? 0),
          0,
        );
      return {
        person,
        subjects,
        classes,
        count: rows.length,
        taught,
        required,
        attendance: data.attendanceToday?.find(
          (row) => row.user_id === person.value,
        )?.status,
      };
    })
    .filter((row) =>
      [row.person.label, row.subjects, row.classes]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );
  return (
    <div className={styles.stack}>
      <PrincipalHeader
        title="Staff & teaching allocations"
        icon={Users}
        tone="violet"
        description="Review staff roles, class responsibilities and the work recorded against each allocation."
        actions={
          hasPermission("academics:assign-teachers") && (
            <Button
              disabled={!hasPrerequisites}
              title={teacherAssignmentBlockReason}
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign Teacher
            </Button>
          )
        }
      />
      <PrincipalMetrics
        items={[
          {
            label: "Total active staff",
            value: data.totalStaff,
            icon: Users,
            tone: "blue",
          },
          {
            label: "Teaching staff",
            value: data.teachingStaff,
            icon: Users,
            tone: "violet",
          },
          {
            label: "Support & admin",
            value: data.supportStaff,
            icon: Users,
            tone: "mint",
          },
          {
            label: "On leave",
            value: data.onLeave,
            icon: UserPlus,
            tone: "amber",
          },
        ]}
      />
      <PrincipalPanel
        title="Teaching workload"
        description="Allocations and required syllabus subtopics for the selected term. Attendance is today's recorded status."
      >
        <div className={styles.toolbar}>
          <label className={styles.field}>
            Search staff
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Teacher, subject or class"
            />
          </label>
          <label className={styles.field}>
            Academic term
            <select
              value={selectedTerm}
              onChange={(e) => {
                setTerm(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Choose a term</option>
              {terms.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.starts_on.slice(0, 4)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {oversight.error ? (
          <p role="alert" className={styles.error}>
            {oversight.error.message}
            <WorkspaceRetry onRetry={() => oversight.refetch()} />
          </p>
        ) : oversight.isLoading ? (
          <p role="status">Loading teaching records…</p>
        ) : !visible.length ? (
          <p className={styles.empty}>No matching teachers.</p>
        ) : (
          <div className={styles.tableShell}>
            <table>
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Assigned classes</th>
                  <th>Subjects</th>
                  <th>Subtopics taught</th>
                  <th>Attendance today</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(page * 12, page * 12 + 12).map((row) => (
                  <tr key={row.person.value}>
                    <td>
                      <strong>{row.person.label}</strong>
                    </td>
                    <td>{row.classes || "—"}</td>
                    <td>
                      {row.subjects || "—"}
                      {row.count > 0 && <small>{row.count} allocations</small>}
                    </td>
                    <td>
                      {row.required
                        ? `${row.taught} / ${row.required}`
                        : "No coverage record"}
                    </td>
                    <td>
                      {row.attendance?.replaceAll("_", " ") || "Not recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {visible.length > 12 && (
          <div className={styles.actions}>
            <Button
              variant="outline"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Previous staff
            </Button>
            <Button
              variant="outline"
              disabled={(page + 1) * 12 >= visible.length}
              onClick={() => setPage(page + 1)}
            >
              Next staff
            </Button>
          </div>
        )}
      </PrincipalPanel>
      <details className={styles.panel}>
        <summary className={styles.panelHeading}>
          Invite &amp; Manage Staff
        </summary>
        <div className="rounded-[var(--radius-xl)] bg-white p-1">
          <UserManagementPanel />
        </div>
      </details>

      <div className="grid gap-4">
        <Card className="border border-border bg-surface p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Class Teachers
            </h2>
            {hasPermission("academics:assign-teachers") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsClassTeacherModalOpen(true)}
                disabled={!hasCTPrerequisites}
                title={classTeacherBlockReason}
              >
                <Plus className="h-4 w-4 mr-1" /> Assign Class Teacher
              </Button>
            )}
          </div>

          {!classTeachersData || classTeachersData.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-surface rounded-lg border border-border">
              <Users className="h-10 w-10 text-muted mb-3" />
              <p className="text-muted">No class teachers assigned</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {classTeachersData.map((ct: any) => {
                const teacherUserId = String(ct.teacher_user_id ?? "");
                const classSectionId = String(ct.class_section_id ?? "");
                const academicYearId = String(ct.academic_year_id ?? "");
                const teacherLabel =
                  ct.teacher_name ||
                  ct.teacher_label ||
                  teacherLabelByUserId.get(teacherUserId) ||
                  "Unlinked teacher";
                const classLabel =
                  ct.class_section_name ||
                  ct.class_name ||
                  classLabelById.get(classSectionId) ||
                  "Class section";
                const yearLabel =
                  ct.academic_year_name ||
                  ct.year_name ||
                  yearLabelById.get(academicYearId) ||
                  "Academic year";

                return (
                  <div
                    key={ct.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        Teacher: {teacherLabel}
                      </div>
                      <div className="text-xs text-muted">
                        {classLabel} - {yearLabel}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/20 hover:bg-red-500/20"
                        disabled={!hasPermission("academics:assign-teachers")}
                        onClick={() => handleArchiveClassTeacher(ct.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Subject Teacher"
      >
        <form
          aria-label="Assign subject teacher"
          onSubmit={handleAssignTeacher}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            The teacher continues across terms and follows the cohort as
            students are promoted, until reassigned or ended.
          </p>
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Teacher
            </label>
            <select name="teacher_user_id" required className="input-base">
              <option value="">Select teacher...</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.value} value={teacher.value}>
                  {teacher.label}
                </option>
              ))}
            </select>
            {!hasTeachers && (
              <p className="text-xs text-amber-600">
                Invite and activate teaching staff before assigning subjects.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Class Section
            </label>
            <select
              name="class_section_id"
              value={teacherClassId}
              onChange={(event) => setTeacherClassId(event.target.value)}
              required
              className="input-base"
            >
              <option value="">Select Class Section...</option>
              {classesData?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <label className="block space-y-2 text-sm font-semibold text-foreground">
            Stream
            <select
              key={teacherClassId}
              name="stream_id"
              disabled={!teacherClassId}
              className="input-base"
              defaultValue=""
            >
              <option value="">All current streams / no stream</option>
              {(streamsData ?? [])
                .filter((stream) => stream.class_section_id === teacherClassId)
                .map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Subject
            </label>
            <select name="subject_id" required className="input-base">
              <option value="">Select Subject...</option>
              {subjectsData?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Assign Teacher
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isClassTeacherModalOpen}
        onClose={() => setIsClassTeacherModalOpen(false)}
        title="Assign Class Teacher"
      >
        <form onSubmit={handleAssignClassTeacher} className="space-y-4">
          {ctFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {ctFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Teacher
            </label>
            <select name="teacher_user_id" required className="input-base">
              <option value="">Select teacher...</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.value} value={teacher.value}>
                  {teacher.label}
                </option>
              ))}
            </select>
            {!hasTeachers && (
              <p className="text-xs text-amber-600">
                Invite and activate teaching staff before assigning class
                responsibility.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Academic Year
            </label>
            <select name="academic_year_id" required className="input-base">
              <option value="">Select Academic Year...</option>
              {yearsData?.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Class Section
            </label>
            <select name="class_section_id" required className="input-base">
              <option value="">Select Class Section...</option>
              {classesData?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingCT}>
              {isSubmittingCT && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Assign Class Teacher
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
