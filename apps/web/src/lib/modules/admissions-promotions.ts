import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";

export type PromotionPlacement = {
  id: string;
  version: number;
  cohort_id: string;
  academic_year_id?: string;
  cohort_name: string;
  class_section_id: string;
  class_section_name: string;
  stream_id: string | null;
  stream_name: string | null;
  student_count: number;
  students: Array<{ id: string; name: string }>;
};

export type PromotionOptions = {
  placements: PromotionPlacement[];
  classes: Array<{ id: string; name: string; academic_year_id: string; academic_level_id?: string; order_index?: number }>;
  streams: Array<{ id: string; name: string; class_section_id: string }>;
  years: Array<{ id: string; name: string; starts_on?: string }>;
};

export type PromotionCommand = {
  request_id: string;
  reason: string;
  mappings: Array<{
    source_placement_id: string;
    expected_version: number;
    student_ids?: string[];
    target_class_section_id: string;
    target_stream_id: string | null;
  }>;
};

export type PromotionPreview = {
  can_commit: boolean;
  warnings: string[];
  blockers: string[];
  mappings: Array<{ source_placement_id: string; student_count: number; subject_count: number; teacher_count: number }>;
};

export type PromotionResult = {
  request_id: string;
  promoted_students: number;
  moved_cohorts: number;
  results: Array<{ source_placement_id: string; target_placement_id: string; cohort_id: string; student_ids: string[]; subject_count: number; teacher_count: number }>;
};

export const fetchPromotionOptions = () => requestSchoolApiProxy<PromotionOptions>("/admissions/promotions/options");
export const previewPromotion = (command: PromotionCommand) => requestSchoolApiProxy<PromotionPreview>("/admissions/promotions/preview", { method: "POST", body: command });
export const commitPromotion = (command: PromotionCommand) => requestSchoolApiProxy<PromotionResult>("/admissions/promotions/commit", { method: "POST", body: command });
