export type SyllabusSubtopic = { id: string; title: string; required: boolean; archived: boolean; expected_on?: string | null };
export type SyllabusTopic = { id: string; title: string; expected_on: string; archived: boolean; subtopics: SyllabusSubtopic[] };
export type SyllabusMilestone = { id: string; title: string; due_on: string; subtopic_ids: string[] };
export type SyllabusPlan = {
  id: string; subject_id: string; subject: string; academic_year_id: string; academic_term_id: string; grade_level: string;
  version: number; topics: SyllabusTopic[]; milestones: SyllabusMilestone[]; can_manage: boolean;
};
export type SyllabusCoverage = { subtopic_id: string; completed: boolean; completed_at: string | null; teacher_user_id: string; note: string; version: number };
export type SyllabusAllocation = {
  id: string; teacher_user_id: string; teacher_name: string; subject_id: string; subject: string; class_section_id: string;
  class_name: string; stream_id: string | null; stream_name: string | null; grade_level: string; academic_year_id: string;
  year_name: string; academic_term_id: string; term_name: string; can_record: boolean; syllabus_id: string | null;
  records: SyllabusCoverage[]; progress: null | {
    total: number; completed: number; percentage: number; expected_percentage: number; completed_topics: number; total_topics: number; status: string;
    remaining: Array<{ id: string; title: string; topic: string; due_on: string }>;
    overdue: Array<{ id: string; title: string; topic: string; due_on: string }>;
    milestones: Array<SyllabusMilestone & { total: number; completed: number; status: string }>;
  };
};
export type SyllabusWorkspaceData = {
  school_id: string; generated_at: string; generated_by?: string; can_monitor: boolean;
  rights: Array<{ subject_id: string; academic_year_id: string | null }>;
  subjects: Array<{ id: string; name: string }>;
  years: Array<{ id: string; name: string; status: string }>;
  terms: Array<{ id: string; academic_year_id: string; name: string; starts_on: string; ends_on: string; status: string }>;
  grades: Array<{ grade_level: string; academic_year_id: string }>;
  syllabi: SyllabusPlan[]; items: SyllabusAllocation[];
};
export const syllabusButton = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-info disabled:opacity-50';
export const syllabusField = 'mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground';
