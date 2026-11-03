"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import {
  PrincipalHeader,
  PrincipalMetrics,
  PrincipalPanel,
  PrincipalTrend,
  principalStyles as styles,
} from "./workspace-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/providers/permission-context";
import type { SyllabusWorkspaceData } from "@/lib/modules/syllabus-types";
import { BookOpen, GraduationCap, ClipboardList } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type PrincipalAcademicsData = {
  status: "active" | "degraded" | "setup_required";
  activeAssignments: number;
  syllabusCoverage: number;
  averageScore: number;
  performanceTrend: Array<{ label: string; value: number }>;
  departmentPerformance: Array<{ department: string; score: number }>;
};

export function PrincipalAcademicsWorkspace() {
  const { data, isLoading, error, refetch } =
    useSchoolQuery<PrincipalAcademicsData>(
      "/admin-command/principal/academics",
    );
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { hasPermission } = usePermissions();
  const canSeeExams = hasPermission("exams:read");
  const exams = useSchoolQuery<{
    kpis: { school_average: number | null };
    trends: Array<{ exam_series_name: string; average_score: number | null }>;
  }>(canSeeExams ? "/exams/analytics?scope=school&page_size=1" : null);
  const syllabus = useSchoolQuery<SyllabusWorkspaceData>("/academics/syllabus");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Nairobi",
  });
  const currentTerm = syllabus.data?.terms.find(
    (term) =>
      term.starts_on.slice(0, 10) <= today &&
      term.ends_on.slice(0, 10) >= today,
  );
  const totals = (syllabus.data?.items ?? [])
    .filter((row) => !currentTerm || row.academic_term_id === currentTerm.id)
    .reduce(
      (sum, row) => ({
        taught: sum.taught + (row.progress?.completed ?? 0),
        required: sum.required + (row.progress?.total ?? 0),
      }),
      { taught: 0, required: 0 },
    );
  async function generate() {
    if (busy) return;
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    setBusy(true);
    try {
      await requestPrincipalApi("/admin-command/principal/reports/generated", {
        method: "POST",
        body: { type: "department_performance", request_id: id },
      });
      setRequestId("");
      toast.success("Department performance report saved in Reports.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Report generation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.stack}>
      <PrincipalHeader
        icon={GraduationCap}
        title="Academic oversight"
        tone="blue"
        description="Review recorded teaching progress, examination outcomes and departmental results together."
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error.message}
          <WorkspaceRetry onRetry={() => refetch()} />
        </p>
      ) : isLoading ? (
        <p role="status" className={styles.empty}>
          Loading academic records…
        </p>
      ) : (
        data && (
          <>
            <PrincipalMetrics
              items={[
                {
                  label: "Active assignments",
                  value: data.activeAssignments,
                  icon: ClipboardList,
                  tone: "violet",
                },
                {
                  label: "Syllabus coverage",
                  value: totals.required
                    ? Math.round((100 * totals.taught) / totals.required) + "%"
                    : "—",
                  detail: syllabus.isLoading
                    ? "Loading coverage"
                    : totals.required
                      ? `${totals.taught} of ${totals.required} required subtopics`
                      : "No configured coverage total",
                  icon: BookOpen,
                  tone: "mint",
                },
                ...(canSeeExams
                  ? [
                      {
                        label: "School average",
                        value:
                          exams.data?.kpis?.school_average != null
                            ? exams.data.kpis.school_average + "%"
                            : "—",
                        detail: "Latest examination with results",
                        icon: GraduationCap,
                        tone: "blue" as const,
                      },
                    ]
                  : []),
              ]}
            />
            {syllabus.error && (
              <div className={styles.error} role="alert">
                {syllabus.error.message}
                <WorkspaceRetry onRetry={() => syllabus.refetch()} />
              </div>
            )}
            <div className={styles.columns}>
              {canSeeExams && (
                <PrincipalPanel title="Exam performance trend" tone="blue">
                  {exams.error ? (
                    <p role="alert">
                      {exams.error.message}
                      <WorkspaceRetry onRetry={() => exams.refetch()} />
                    </p>
                  ) : exams.isLoading ? (
                    <p role="status">Loading exam results…</p>
                  ) : (
                    <PrincipalTrend
                      label="Weighted school examination averages"
                      percentage
                      points={(exams.data?.trends ?? []).map((row) => ({
                        label: row.exam_series_name,
                        value: row.average_score,
                      }))}
                    />
                  )}
                </PrincipalPanel>
              )}
              <PrincipalPanel
                title="Department Performance"
                description="Mean of submitted, reviewed, locked and published assessment marks by department."
                tone="violet"
                actions={
                  hasPermission("reports:write") &&
                  canSeeExams && (
                    <Button disabled={busy} onClick={() => void generate()}>
                      {busy ? "Generating…" : "Detailed Report"}
                    </Button>
                  )
                }
              >
                {data.departmentPerformance.length ? (
                  data.departmentPerformance.map((row) => (
                    <div
                      className={styles.distributionRow}
                      key={row.department}
                    >
                      <span>{row.department}</span>
                      <meter
                        min={0}
                        max={100}
                        value={row.score}
                        aria-label={row.department}
                      />
                      <strong>{row.score}%</strong>
                    </div>
                  ))
                ) : (
                  <p className={styles.empty}>
                    No departmental results recorded.
                  </p>
                )}
              </PrincipalPanel>
            </div>
          </>
        )
      )}
    </div>
  );
}
