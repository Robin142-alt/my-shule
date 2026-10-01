"use client";

import { ExamWorkflowTracker } from "../exam-workflow-tracker";

const workflowActions = [
  { view: "exam-setup", label: "Open exam setup" },
  { view: "marks-entry", label: "Open marks entry" },
  { view: "report-cards", label: "Open report cards" },
] as const;

export function ExamWorkflowWorkspace({ onNavigate }: {
  onNavigate: (view: typeof workflowActions[number]["view"]) => void;
}) {
  return (
    <div className="space-y-4">
      <ExamWorkflowTracker heading="Exam Workflow" compact />
      <nav aria-label="Exam workflow actions" className="flex flex-wrap gap-3">
        {workflowActions.map(({ view, label }) => (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-white px-4 text-sm font-semibold text-info hover:bg-info-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
