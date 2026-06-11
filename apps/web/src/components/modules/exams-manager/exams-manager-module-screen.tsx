"use client";

import { useMemo } from "react";
import type { DashboardRole, DashboardSnapshot } from "@/lib/dashboard/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";

import { OverviewWorkspace } from "./workspaces/overview-workspace";
import { ExamCalendarWorkspace } from "./workspaces/exam-calendar-workspace";
import { ExamSetupWorkspace } from "./workspaces/exam-setup-workspace";
import { ExamClassesWorkspace } from "./workspaces/exam-classes-workspace";
import { PapersComponentsWorkspace } from "./workspaces/papers-components-workspace";
import { ExamTimetableWorkspace } from "./workspaces/exam-timetable-workspace";
import { InvigilationWorkspace } from "./workspaces/invigilation-workspace";
import { ExamAttendanceWorkspace } from "./workspaces/exam-attendance-workspace";
import { MarksMonitorWorkspace } from "./workspaces/marks-monitor-workspace";
import { MyMarksWorkspace } from "./workspaces/my-marks-workspace";
import { ImportsTemplatesWorkspace } from "./workspaces/imports-templates-workspace";
import { ModerationWorkspace } from "./workspaces/moderation-workspace";
import { GradingRubricsWorkspace } from "./workspaces/grading-rubrics-workspace";
import { ResultsProcessingWorkspace } from "./workspaces/results-processing-workspace";
import { ReportCardsWorkspace } from "./workspaces/report-cards-workspace";
import { ApprovalsPublishingWorkspace } from "./workspaces/approvals-publishing-workspace";
import { StudentCasesWorkspace } from "./workspaces/student-cases-workspace";
import { CommunicationWorkspace } from "./workspaces/communication-workspace";
import { ReportsWorkspace } from "./workspaces/reports-workspace";
import { AuditLogsWorkspace } from "./workspaces/audit-logs-workspace";
import { ExamSettingsWorkspace } from "./workspaces/exam-settings-workspace";
export function ExamsManagerModuleScreen({
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

  const workspaces: Record<string, React.ReactNode> = {
    "overview": <OverviewWorkspace model={model} />,
    "exam-calendar": <ExamCalendarWorkspace model={model} />,
    "exam-setup": <ExamSetupWorkspace model={model} />,
    "exam-classes": <ExamClassesWorkspace model={model} />,
    "papers-components": <PapersComponentsWorkspace model={model} />,
    "exam-timetable": <ExamTimetableWorkspace model={model} />,
    "invigilation": <InvigilationWorkspace model={model} />,
    "exam-attendance": <ExamAttendanceWorkspace model={model} />,
    "marks-monitor": <MarksMonitorWorkspace model={model} />,
    "my-marks": <MyMarksWorkspace model={model} />,
    "imports-templates": <ImportsTemplatesWorkspace model={model} />,
    "moderation": <ModerationWorkspace model={model} />,
    "grading-rubrics": <GradingRubricsWorkspace model={model} />,
    "results-processing": <ResultsProcessingWorkspace model={model} />,
    "report-cards": <ReportCardsWorkspace model={model} />,
    "approvals-publishing": <ApprovalsPublishingWorkspace model={model} />,
    "student-cases": <StudentCasesWorkspace model={model} />,
    "communication-exam": <CommunicationWorkspace model={model} />,
    "reports-exam": <ReportsWorkspace model={model} />,
    "audit-logs": <AuditLogsWorkspace model={model} />,
    "exam-settings": <ExamSettingsWorkspace model={model} />,
  };

  const content = workspaces[moduleName] || <PlaceholderWorkspace title="Workspace Not Found" desc="The requested workspace does not exist." />;

  return (
    <div className="space-y-6">
      {content}
    </div>
  );
}



function PlaceholderWorkspace({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title={title} description={desc} />
      <Card className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Workspace under construction</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          This workspace is registered in the architecture and mapped to the sidebar, but the detailed UI implementation is pending.
        </p>
      </Card>
    </div>
  );
}
