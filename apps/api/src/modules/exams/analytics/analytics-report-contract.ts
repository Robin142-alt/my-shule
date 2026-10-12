export const ANALYTICS_REPORT_SECTIONS = ['all', 'summary', 'performance', 'learners', 'risk', 'subjects', 'comparisons', 'trends', 'operations', 'reports', 'interventions', 'targets', 'advanced', 'exam-analysis', 'library'] as const;
export type AnalyticsReportSection = typeof ANALYTICS_REPORT_SECTIONS[number];
export const ANALYTICS_REPORT_LABELS: Record<AnalyticsReportSection, string> = {
  all: 'Complete exam analytics', summary: 'Exam analytics summary', performance: 'Performance and score analysis',
  learners: 'Learner results', risk: 'Learners requiring attention', subjects: 'Subject comparison', comparisons: 'All area comparisons',
  trends: 'Exam performance trends', operations: 'Exam readiness', reports: 'Report-card readiness',
  interventions: 'Intervention follow-up', targets: 'Targets and outcomes', advanced: 'Advanced analytics', 'exam-analysis': 'Exam analysis',
  library: 'Exam Analytics report',
};
export const ANALYTICS_VIEW_REPORT: Record<string, AnalyticsReportSection> = {
  Overview:'summary', Performance:'performance', Comparisons:'comparisons', Learners:'learners', 'At Risk':'risk',
  Trends:'trends', 'Exam Operations':'operations', Reports:'reports', Interventions:'interventions', Targets:'targets', Advanced:'advanced', 'Exam Analysis':'exam-analysis',
};
export interface AnalyticsPrintReport {
  document_number: string;
  title: string;
  school_name: string;
  school_address: string | null;
  school_motto: string | null;
  generated_at: string;
  generated_by: string;
  scope: string;
  exam: string;
  period: string;
  filters: { label: string; value: string }[];
  metrics: { label: string; value: string }[];
  sections: { title: string; headers: string[]; rows: string[][]; note?: string;
    empty_message?: string;
    metric?: { value: string; unit: string };
    chart?: { kind: 'bar' | 'line'; label: string; points: { label: string; value: number | null }[]; total: number };
  }[];
  notes: string[];
}
export interface AnalyticsReportResponse {
  report: AnalyticsPrintReport;
  filename: string;
  pdf_base64: string;
  csv_base64?: string;
  csv_filename?: string;
}

/** Shared methods are printed once even when a collection contains many related views. */
export function analyticsReportMethods(report:AnalyticsPrintReport) {
  const groups=new Map<string,string[]>();
  for(const section of report.sections)if(section.note){
    const titles=groups.get(section.note)??[];titles.push(section.title);groups.set(section.note,titles);
  }
  return [...groups].map(([note,titles])=>({title:titles.join(' · '),note}));
}
