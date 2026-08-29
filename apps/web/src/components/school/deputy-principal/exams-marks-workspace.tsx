"use client";

import { ExamWorkflowTracker } from "../exam-workflow-tracker";

export function DeputyExamsMarksWorkspace() {
  return (
    <ExamWorkflowTracker
      endpoint="/admin-command/deputy/exams"
      heading="School exam and report-card progress"
    />
  );
}
