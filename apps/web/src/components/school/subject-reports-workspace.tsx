"use client";

import { FileText } from "lucide-react";
import { AcademicIntelligenceReport } from "./academic-intelligence-report";

const reports = [
  { title: "Exam summary", view: "Overview", description: "Subject averages, pass rates and the key findings from your selected exam." },
  { title: "Learner results", view: "Learners", description: "All matching learners with subject results and progress details. You can also choose the current page." },
  { title: "Subject comparison", view: "Comparisons", description: "Compare published results within your appointed subjects." },
  { title: "Performance trends", view: "Trends", description: "Track available exam history and changes in performance." },
  { title: "Marks and readiness", view: "Exam Operations", description: "Review completion and data quality for the selected subject scope." },
  { title: "Performance and score analysis", view: "Performance", description: "Score ranges, quartiles, approved result coverage and subject support priorities." },
  { title: "Advanced analytics", view: "Advanced", description: "Matched progress, performance gaps, risk movement and cohort progression." },
  { title: "Intervention follow-up", view: "Interventions", description: "Review support plans, measured outcomes and intervention targets." },
];

export function SubjectReportsWorkspace({ filters, disabled }: { filters: Record<string, string>; disabled: boolean }) {
  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      {reports.map(report => <section key={report.view} className="flex flex-col items-start rounded-xl border border-border bg-white p-5">
        <FileText aria-hidden="true" className="mb-3 h-5 w-5 text-info" />
        <h4 className="font-bold text-foreground">{report.title}</h4>
        <p className="mt-2 mb-4 flex-1 text-sm leading-6 text-muted">{report.description}</p>
        <AcademicIntelligenceReport filters={filters} view={report.view} disabled={disabled} subjectOnly buttonLabel={`Preview ${report.title.toLowerCase()}`} />
      </section>)}
    </div>
    <p className="text-sm text-muted">Each document includes school details, the selected filters, a document number and generation details. Check the preview, then download the PDF or print.</p>
  </div>;
}
