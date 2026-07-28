"use client";

import { AcademicIntelligenceWorkspace } from "../academic-intelligence-workspace";

export function AnalysisWorkspace({
  onOpenMarks,
  onOpenReportCards,
}: {
  onOpenMarks?: () => void;
  onOpenReportCards?: () => void;
}) {
  return (
    <AcademicIntelligenceWorkspace
      audience="exams-manager"
      onOpenMarks={onOpenMarks}
      onOpenReportCards={onOpenReportCards}
    />
  );
}
