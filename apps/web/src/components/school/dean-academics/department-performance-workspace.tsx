"use client";

import { AcademicIntelligenceWorkspace } from "../academic-intelligence-workspace";

export function DepartmentPerformanceWorkspace({
  onOpenAssessments,
  onOpenInterventions,
  onOpenReports,
}: {
  onOpenAssessments?: () => void;
  onOpenInterventions?: () => void;
  onOpenReports?: () => void;
}) {
  return (
    <AcademicIntelligenceWorkspace
      audience="dean"
      onOpenMarks={onOpenAssessments}
      onOpenInterventions={onOpenInterventions}
      onOpenReportCards={onOpenReports}
    />
  );
}
