export const ANALYTICS_REPORT_SECTIONS = ['summary', 'learners', 'subjects', 'trends', 'operations'] as const;
export type AnalyticsReportSection = typeof ANALYTICS_REPORT_SECTIONS[number];
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
  sections: { title: string; headers: string[]; rows: string[][]; note?: string }[];
  notes: string[];
}
export interface AnalyticsReportResponse {
  report: AnalyticsPrintReport;
  filename: string;
  pdf_base64: string;
}
