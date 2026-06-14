"use client";
import { DocxOperationalWorkspace } from "@/components/school/docx-operational-workspace";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import type { DashboardRole, DashboardSnapshot } from "@/lib/dashboard/types";
import { fetchDeanDatasetLive } from "@/lib/modules/dean-live";
import { createEmptyDeanDataset } from "@/lib/modules/dean-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";
import { 
  AcademicCalendarWorkspace, 
  SubjectsWorkspace, 
  SyllabusCoverageWorkspace, 
  TimetableOversightWorkspace 
} from "./dean-academic-workspaces";
import { 
  DepartmentsWorkspace, 
  TeacherWorkloadWorkspace, 
  LessonPlansWorkspace, 
  LessonLogsWorkspace 
} from "./dean-staff-workspaces";
import {
  ContinuousAssessmentWorkspace,
  ExamReviewWorkspace,
  ExamPerformanceAnalyticsWorkspace,
  ReportCardOversightWorkspace
} from "./dean-assessment-workspaces";
import {
  AcademicInterventionsWorkspace,
  StudentAcademicSupportWorkspace,
  DepartmentReviewsWorkspace,
  TeacherAcademicReportsWorkspace
} from "./dean-intervention-workspaces";
import {
  AcademicReportsWorkspace,
  MessagesNoticesWorkspace,
  ApprovalsFollowUpsWorkspace,
  MyTeachingWorkspace,
  DeanSettingsWorkspace
} from "./dean-admin-workspaces";

export function DeanModuleScreen({
  role,
  moduleName,
  snapshot,
  online,
}: {
  role: DashboardRole;
  moduleName: string;
  snapshot: DashboardSnapshot;
  online: boolean;
}) {
  const model = useMemo(
    () => buildSchoolErpModel({ role, tenant: snapshot.tenant, online }),
    [online, role, snapshot.tenant],
  );

  const liveSession = useLiveTenantSession(snapshot.tenant.id);
  const liveDeanQuery = useQuery({
    queryKey: ["dean-module", liveSession.session?.tenantId],
    queryFn: () => fetchDeanDatasetLive(liveSession.session!),
    enabled: Boolean(liveSession.session),
  });

  const dataset = liveDeanQuery.data ?? createEmptyDeanDataset();
  const isLoading = Boolean(liveSession.session && liveDeanQuery.isLoading);

  const workspaces: Record<string, React.ReactNode> = {
    "command-center": <CommandCenterWorkspace model={model} dataset={dataset} isLoading={isLoading} />,
    "academic-calendar": <AcademicCalendarWorkspace dataset={dataset} />,
    "departments": <DepartmentsWorkspace dataset={dataset} />,
    "subjects": <SubjectsWorkspace dataset={dataset} />,
    "teacher-workload": <TeacherWorkloadWorkspace dataset={dataset} />,
    "timetable-oversight": <TimetableOversightWorkspace dataset={dataset} />,
    "lesson-plans": <LessonPlansWorkspace dataset={dataset} />,
    "lesson-logs": <LessonLogsWorkspace dataset={dataset} />,
    "syllabus-coverage": <SyllabusCoverageWorkspace dataset={dataset} />,
    "continuous-assessment": <ContinuousAssessmentWorkspace dataset={dataset} />,
    "exam-review": <ExamReviewWorkspace dataset={dataset} />,
    "performance-analytics": <ExamPerformanceAnalyticsWorkspace dataset={dataset} />,
    "academic-interventions": <AcademicInterventionsWorkspace dataset={dataset} />,
    "department-reviews": <DepartmentReviewsWorkspace dataset={dataset} />,
    "teacher-academic-reports": <TeacherAcademicReportsWorkspace dataset={dataset} />,
    "student-academic-support": <StudentAcademicSupportWorkspace dataset={dataset} />,
    "report-card-oversight": <ReportCardOversightWorkspace dataset={dataset} />,
    "academic-reports": <AcademicReportsWorkspace dataset={dataset} />,
    "messages-notices": <MessagesNoticesWorkspace dataset={dataset} />,
    "approvals-follow-ups": <ApprovalsFollowUpsWorkspace dataset={dataset} />,
    "my-teaching": <MyTeachingWorkspace dataset={dataset} />,
    "dean-settings": <DeanSettingsWorkspace dataset={dataset} />,
  };

  const content = workspaces[moduleName] || <DocxOperationalWorkspace moduleId={moduleName} />;

  if (isLoading && !liveDeanQuery.data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted">Loading academic data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content}
    </div>
  );
}

import type { DeanDataset } from "@/lib/modules/dean-data";

function CommandCenterWorkspace({ model, dataset, isLoading }: { model: any; dataset: DeanDataset; isLoading: boolean }) {
  const coverageBehind = dataset.syllabusCoverage.filter(c => c.riskLevel !== "on-track").length;
  const missingLogs = dataset.lessonLogs.filter(l => l.logStatus !== "submitted").length;
  const pendingReviews = dataset.departmentReviews.filter(r => r.deanReviewStatus === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Center"
        title="Dean of Academics"
        description="Monitor active syllabus gaps, missing logs, and academic interventions today."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">Syllabus Coverage</p>
          <p className="mt-3 metric-value">{dataset.syllabusCoverage.length > 0 ? "76%" : "N/A"}</p>
          <p className="mt-2 text-[13px] text-muted">{coverageBehind} class-subjects behind expected pace</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Missing Lesson Logs</p>
          <p className="mt-3 metric-value text-danger">{missingLogs}</p>
          <p className="mt-2 text-[13px] text-muted">Requires immediate follow-up</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Pending HOD Reviews</p>
          <p className="mt-3 metric-value">{pendingReviews}</p>
          <p className="mt-2 text-[13px] text-muted">Departments awaiting Dean review</p>
        </Card>
      </section>

      {dataset.risks.length > 0 ? (
        <Card className="p-5 overflow-x-auto">
          <p className="font-semibold text-foreground mb-4">Academic Risks</p>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted">
                <th className="pb-3 pr-4 font-medium">Risk ID</th>
                <th className="pb-3 pr-4 font-medium">Class / Subject</th>
                <th className="pb-3 pr-4 font-medium">Risk Type</th>
                <th className="pb-3 pr-4 font-medium">Severity</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataset.risks.map((risk) => (
                <tr key={risk.id} className="border-b last:border-0 hover:bg-surface-muted transition-colors">
                  <td className="py-3 pr-4">{risk.id}</td>
                  <td className="py-3 pr-4">{risk.classStream} · {risk.subject}</td>
                  <td className="py-3 pr-4">{risk.riskType}</td>
                  <td className="py-3 pr-4">{risk.severity}</td>
                  <td className="py-3">{risk.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center mt-6">
          <p className="text-sm font-semibold text-foreground">No critical academic risks today</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Your command center table goes here. Everything looks on track right now.
          </p>
        </Card>
      )}
    </div>
  );
}

