/** The same analytic definition drives the screen, data download and printed report. */
export const LIBRARY_CATEGORIES = ['Overview', 'Performance', 'Trends', 'Comparisons', 'Subjects', 'Classes & Streams', 'Students', 'Rankings', 'Distributions', 'Deep Insights'] as const;
export type LibraryCategory = typeof LIBRARY_CATEGORIES[number];
export type AnalyticValue = string | number | null;
export interface AnalyticRow { values: AnalyticValue[]; drill?: Record<string, string> }
export interface LibraryAnalytic {
  id: string; category: LibraryCategory; title: string; question: string;
  kind: 'metric' | 'table' | 'bar' | 'line' | 'matrix' | 'insight';
  columns: string[]; rows: AnalyticRow[]; note: string;
  total: number; page: number; page_size: number;
  value_column?: number;
}
export interface AnalyticsLibrary {
  version: 1;
  catalog: Omit<LibraryAnalytic, 'rows'>[];
  items: LibraryAnalytic[];
  history: { cycles: number; limit: number; first: string | null; last: string | null };
  comparison_options: {id:string;name:string}[];
  source_read_at?: string;
}
export const OVERVIEW_ANALYTICS = ['mean', 'pass-rate', 'matched-growth', 'coverage', 'exam-trend', 'observations'];
export class InvalidAnalyticSelectionError extends Error {}
