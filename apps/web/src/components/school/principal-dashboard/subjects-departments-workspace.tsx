"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, BookOpen, Layers, Plus, Loader2, Users2 } from "lucide-react";
import {
  PrincipalHeader,
  PrincipalMetrics,
  PrincipalPanel,
  principalStyles as styles,
} from "./workspace-ui";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/providers/permission-context";
import { buildSchoolStaffOptions, type SchoolStaffOptionInput } from "@/lib/school/staff-option-label";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type PrincipalSubjectsData = {
  status: "active" | "degraded" | "setup_required";
  totalSubjects: number;
  coreSubjects: number;
  electiveSubjects: number;
  departments: number;
  subjectDistribution: Array<{ label: string; value: number }>;
  departmentHeads: Array<any>;
};

type StaffOption = SchoolStaffOptionInput;

export function PrincipalSubjectsDepartmentsWorkspace() {
  const { data, isLoading, error, refetch } =
    useSchoolQuery<PrincipalSubjectsData>("/admin-command/principal/subjects");
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  type Mapping = {
    subject_id: string;
    class_section_name: string;
    stream_name?: string;
    status: string;
    teacher_name?: string;
  };
  type Curriculum = {
    years: Array<{ id: string }>;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      department_id?: string;
      status: string;
    }>;
    departments: Array<{
      id: string;
      name: string;
      head_of_department_name?: string;
      head_of_department_user_id?: string;
      is_active: boolean;
    }>;
    teachers: StaffOption[];
    classSubjectAssignments: Mapping[];
    teacherAssignments: Mapping[];
  };
  const foundation = useSchoolQuery<Curriculum>("/academics/foundation");
  const yearsData = foundation.data?.years;
  const subjects = (foundation.data?.subjects ?? []).filter(
    (row) => row.status === "active",
  );
  const departments = (foundation.data?.departments ?? []).filter(
    (row) => row.is_active,
  );
  const staffData = foundation.data?.teachers;
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(0);
  const { hasPermission } = usePermissions();

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [deptFormError, setDeptFormError] = useState("");

  const hasYears = yearsData && yearsData.length > 0;
  const staffOptions = buildSchoolStaffOptions(staffData);
  const staffLabelByUserId = new Map(
    staffOptions.map((staff) => [staff.value, staff.label]),
  );

  const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi("/academics/subjects", {
        method: "POST",
        body: {
          name: formData.get("name"),
          department_id: formData.get("department") || undefined,
        },
      });
      setIsSubjectModalOpen(false);
      await Promise.all([refetch(), foundation.refetch()]);
    } catch (err: any) {
      setFormError(err.message || "Failed to create subject");
    } finally {
      setIsSubmitting(false);
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
            Failed to load Subjects Overview
          </h2>
        </div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Card>
    );
  }

  const handleCreateDepartment = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setIsSubmittingDept(true);
    setDeptFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi("/academics/departments", {
        method: "POST",
        body: {
          name: formData.get("name"),
          head_of_department_user_id:
            formData.get("head_of_department_user_id") || null,
        },
      });
      setIsDepartmentModalOpen(false);
      await Promise.all([refetch(), foundation.refetch()]);
    } catch (err: any) {
      setDeptFormError(err.message || "Failed to create department");
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const needle = search.trim().toLowerCase();
  const register = subjects
    .map((subject) => {
      const mappings = (foundation.data?.classSubjectAssignments ?? []).filter(
        (row) => row.subject_id === subject.id && row.status === "active",
      );
      const assignments = (foundation.data?.teacherAssignments ?? []).filter(
        (row) => row.subject_id === subject.id && row.status === "active",
      );
      const teachers = [
        ...new Set(assignments.map((row) => row.teacher_name).filter(Boolean)),
      ].join(", ");
      const classes = [
        ...new Set(
          mappings.map((row) =>
            [row.class_section_name, row.stream_name].filter(Boolean).join(" "),
          ),
        ),
      ].join(", ");
      return {
        subject,
        teachers,
        classes,
        departmentName: departments.find(
          (row) => row.id === subject.department_id,
        )?.name,
      };
    })
    .filter(
      (row) =>
        (!department || (row.subject.department_id || "none") === department) &&
        [
          row.subject.name,
          row.subject.code,
          row.teachers,
          row.classes,
          row.departmentName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    );
  return (
    <div className={styles.stack}>
      <PrincipalHeader
        title="Subjects & departments"
        icon={BookOpen}
        description="Review curriculum mappings, departmental leadership and teacher allocations."
        actions={
          hasPermission("academics:write") && (
            <>
              <Button
                disabled={!hasYears}
                onClick={() => setIsSubjectModalOpen(true)}
              >
                Create Subject
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDepartmentModalOpen(true)}
              >
                Add Department
              </Button>
            </>
          )
        }
      />
      <PrincipalMetrics
        items={[
          {
            label: "Subjects",
            value: data.totalSubjects,
            icon: BookOpen,
            tone: "blue",
          },
          {
            label: "Departments",
            value: data.departments,
            icon: Layers,
            tone: "violet",
          },
          {
            label: "Core subjects",
            value: data.coreSubjects,
            icon: BookOpen,
            tone: "mint",
          },
          {
            label: "Electives",
            value: data.electiveSubjects,
            icon: BookOpen,
            tone: "amber",
          },
        ]}
      />
      {foundation.error ? (
        <div role="alert" className={styles.error}>
          {foundation.error.message}
          <WorkspaceRetry onRetry={() => foundation.refetch()} />
        </div>
      ) : foundation.isLoading ? (
        <p className={styles.empty}>Loading the curriculum register…</p>
      ) : (
        <>
          <PrincipalPanel
            title="Subject register"
            description="Search a subject, class, department or assigned teacher."
          >
            <div className={styles.toolbar}>
              <label className={styles.field}>
                Search
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label className={styles.field}>
                Department
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All departments</option>
                  <option value="none">Unassigned</option>
                  {departments.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!register.length ? (
              <p className={styles.empty}>No matching subjects.</p>
            ) : (
              <div className={styles.tableShell}>
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Department</th>
                      <th>Mapped classes</th>
                      <th>Teachers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {register.slice(page * 12, page * 12 + 12).map((row) => (
                      <tr key={row.subject.id}>
                        <td>
                          <strong>{row.subject.name}</strong>
                          <small>{row.subject.code}</small>
                        </td>
                        <td>{row.departmentName || "Unassigned"}</td>
                        <td>{row.classes || "No active mapping"}</td>
                        <td>
                          {row.teachers || "No current teacher allocation"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {register.length > 12 && (
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  Previous subjects
                </Button>
                <Button
                  variant="outline"
                  disabled={(page + 1) * 12 >= register.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next subjects
                </Button>
              </div>
            )}
          </PrincipalPanel>
          <div className={styles.columns}>
            <PrincipalPanel title="Department heads" tone="violet">
              {departments.length ? (
                departments.map((row) => (
                  <article key={row.id} className={styles.calendarItem}>
                    <div>
                      <strong>{row.name}</strong>
                      <p>
                        {row.head_of_department_name ||
                          staffLabelByUserId.get(
                            row.head_of_department_user_id || "",
                          ) ||
                          "No HOD assigned"}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <p className={styles.empty}>No departments configured.</p>
              )}
            </PrincipalPanel>
            <PrincipalPanel title="Subjects by department" tone="mint">
              {data.subjectDistribution?.length ? (
                data.subjectDistribution.map((row) => (
                  <div className={styles.distributionRow} key={row.label}>
                    <span>{row.label}</span>
                    <meter
                      aria-label={row.label}
                      min={0}
                      max={Math.max(1, data.totalSubjects)}
                      value={row.value}
                    />
                    <strong>{row.value}</strong>
                  </div>
                ))
              ) : (
                <p className={styles.empty}>
                  No subject distribution recorded.
                </p>
              )}
            </PrincipalPanel>
          </div>
        </>
      )}
      <Modal
        open={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Create Subject"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject Name</label>
            <input
              name="name"
              required
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g. Mathematics"
            />
            <label className={styles.field}>
              Department
              <select name="department">
                <option value="">Unassigned</option>
                {departments.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Subject
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        title="Create Department"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          {deptFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {deptFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Department Name</label>
            <input
              name="name"
              required
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g. Languages, Sciences"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Head of Department</label>
            <select
              name="head_of_department_user_id"
              className="w-full border rounded p-2 text-sm"
            >
              <option value="">No HOD yet</option>
              {staffOptions.map((staff) => (
                <option key={staff.value} value={staff.value}>
                  {staff.label}
                </option>
              ))}
            </select>
            {staffOptions.length === 0 && (
              <p className="text-xs text-amber-600">
                Invite and activate staff before assigning a department head.
              </p>
            )}
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingDept}>
              {isSubmittingDept && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
