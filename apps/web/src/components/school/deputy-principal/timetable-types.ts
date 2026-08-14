export type ReadinessStatus = "READY" | "WARNING" | "BLOCKER";
export type TimetableView = "class" | "teacher" | "resource" | "master";
export type SaveState = "idle" | "saving" | "saved" | "queued" | "failed";

export type TimetableIssue = {
  code: string;
  severity: ReadinessStatus;
  message: string;
  action_url?: string | null;
};

export type ReadinessResponse = {
  status: ReadinessStatus;
  blockers: TimetableIssue[];
  warnings: TimetableIssue[];
  checks: Record<string, boolean | number | string | null>;
  metrics: {
    teaching_days?: number;
    teaching_periods?: number;
    classes?: number;
    active_teachers?: number;
    requirements?: number;
    required_lessons?: number;
  };
};

export type AcademicYear = { id: string; name: string };
export type AcademicTerm = { id: string; academic_year_id: string; name: string };
export type ClassSection = {
  id: string;
  academic_year_id?: string;
  name: string;
  grade_level?: string;
  stream?: string;
  stream_id?: string;
};
export type Subject = { id: string; code?: string; name: string };
export type Teacher = {
  user_id?: string;
  id?: string;
  label?: string;
  name?: string;
  staff_number?: string;
};
export type TeacherAssignment = {
  id: string;
  academic_term_id: string;
  class_section_id: string;
  subject_id: string;
  teacher_user_id: string;
};

export type TimetableVersion = {
  id: string;
  academic_year?: string;
  term_name?: string;
  revision_number?: number;
  source_version_id?: string | null;
  status: "draft" | "published" | string;
  immutable: boolean;
  published_at?: string | null;
  published_by_user_id?: string | null;
  created_at?: string | null;
  row_version?: number;
};

export type TimetableSlot = {
  id: string;
  version_id: string;
  academic_year: string;
  term_name: string;
  class_section_id: string;
  class_name: string;
  stream_id?: string | null;
  stream_name?: string | null;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  resource_id?: string | null;
  resource_name?: string | null;
  room_id?: string | null;
  day_of_week: number;
  period_id?: string | null;
  starts_at: string;
  ends_at: string;
  duration_periods?: number;
  parallel_key?: string | null;
  locked?: boolean;
  row_version?: number;
  status: "draft" | "published" | string;
};

export type PlannerResponse = {
  version: TimetableVersion | null;
  slots: TimetableSlot[];
  metrics: {
    total_slots?: number;
    unique_classes?: number;
    unique_teachers?: number;
    draft?: boolean;
    published?: boolean;
  };
};

export type ConfigurationPeriod = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  period_type: string;
  is_teaching: boolean;
  order_index: number;
};

export type ConfigurationDay = {
  day_of_week: number;
  name: string;
  is_teaching_day: boolean;
  periods: ConfigurationPeriod[];
};

export type TimetableConfiguration = {
  academic_year: string;
  term_name: string;
  row_version?: number;
  days: ConfigurationDay[];
  common_blocks: TimetableCommonBlock[];
};

export type TimetableCommonBlock = {
  id?: string;
  name: string;
  activity_type: string;
  target_scope: "school" | "grade" | "class" | "stream";
  target_ids: string[];
  day_of_week: number;
  period_id: string;
  duration_periods: number;
  resource_id?: string | null;
  is_locked: boolean;
  metadata?: Record<string, unknown>;
};

export type ConfigurationResponse = TimetableConfiguration | { configuration: TimetableConfiguration | null } | null;

export function configurationFrom(response?: ConfigurationResponse) {
  if (!response) return null;
  return "configuration" in response ? response.configuration : response;
}

export type TimetableRequirement = {
  id?: string;
  class_section_id: string;
  stream_id?: string | null;
  subject_id: string;
  teacher_id?: string | null;
  periods_per_week: number;
  duration_periods: number;
  resource_id?: string | null;
  parallel_key?: string | null;
  preferred_days?: number[];
  preferred_start_period_ids?: string[];
  row_version?: number;
};

export type RequirementsResponse = {
  items: TimetableRequirement[];
  metrics?: Record<string, number>;
  row_version?: number;
};

export type AvailabilityRule = {
  id?: string;
  teacher_id: string;
  day_of_week: number;
  period_id: string;
  state: "available" | "prefer_free" | "unavailable" | "protected";
  reason?: string | null;
  row_version?: number;
};

export type AvailabilityResponse = { items: AvailabilityRule[]; row_version?: number };

export type TimetableResource = {
  id: string;
  name: string;
  resource_type: string;
  capacity?: number | null;
  is_exclusive: boolean;
  status: string;
  row_version?: number;
};

export type ResourcesResponse = {
  items: TimetableResource[];
  metrics?: Record<string, number>;
};

export type ViewResponse = {
  view: TimetableView;
  version: TimetableVersion | null;
  items: TimetableSlot[];
  metrics?: Record<string, number>;
};

export type CandidateSlot = {
  day_of_week: number;
  period_id: string;
  period_ids?: string[];
  state: "VALID" | "PREFERRED";
  score?: number;
  reasons: string[];
};

export type ValidSlotsResponse = { items: CandidateSlot[]; best: CandidateSlot | null };
export type FindBestSlotResponse = { best: CandidateSlot | null; items: CandidateSlot[]; alternatives?: CandidateSlot[] };

export type UnscheduledLesson = {
  id: string;
  requirement_id: string;
  class_section_id: string;
  stream_id?: string | null;
  subject_id: string;
  teacher_id?: string | null;
  remaining_periods: number;
  duration_periods: number;
  resource_id?: string | null;
  reason_code: string;
  reason_message: string;
  status: string;
  row_version?: number;
};

export type UnscheduledResponse = { items: UnscheduledLesson[] };

export type ValidationConflict = {
  code: string;
  message: string;
  slot_ids?: string[];
  requirement_id?: string;
};

export type TimetableImpactSummary = {
  baseline: boolean;
  source_version_id: string | null;
  added_lessons: number;
  updated_lessons: number;
  removed_lessons: number;
  changed_lessons: number;
  teacher_ids?: string[];
  teacher_count: number;
  class_section_ids?: string[];
  class_count: number;
  stream_ids?: string[];
  stream_count: number;
  resource_ids?: string[];
  resource_count: number;
  parallel_keys?: string[];
  parallel_group_count: number;
};

export type ValidationResponse = {
  valid: boolean;
  hard_conflicts: ValidationConflict[];
  warnings: ValidationConflict[];
  summary: {
    slots: number;
    required_lessons?: number;
    scheduled_required_lessons?: number;
    hard_conflicts: number;
    warnings: number;
    unscheduled: number;
  };
  impact: TimetableImpactSummary;
};

export type GenerationResponse = {
  status?: "COMPLETED" | "PARTIAL" | string;
  run: {
    id: string;
    status: string;
    scope?: Record<string, unknown>;
    required_lessons: number;
    scheduled_lessons: number;
    unscheduled_lessons: number;
    warnings: number | ValidationConflict[];
    started_at?: string;
    completed_at?: string;
  };
  version: TimetableVersion;
  placements?: Array<Record<string, unknown>>;
  gaps?: Array<Record<string, unknown>>;
  warnings?: Array<Record<string, unknown>>;
  slots?: TimetableSlot[];
  unscheduled?: UnscheduledLesson[];
};

export type HistoryResponse = {
  items: TimetableVersion[];
  active_published_id?: string | null;
  draft_id?: string | null;
};

export type OfflineAware<T> = T & { _offline?: boolean };

export type SlotPayload = {
  academic_year: string;
  term_name: string;
  class_section_id: string;
  subject_id: string;
  teacher_id: string;
  resource_id?: string;
  room_id?: string;
  day_of_week: number;
  period_id?: string;
  starts_at: string;
  ends_at: string;
  duration_periods?: number;
  parallel_key?: string;
  expected_row_version?: number;
};

export const TIMETABLE_DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

export function rowsFrom<T>(value: T[] | { items?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}

export function teacherId(teacher: Teacher) {
  return teacher.user_id || teacher.id || "";
}

export function teacherLabel(teacher: Teacher) {
  return teacher.label || teacher.name || teacher.staff_number || teacherId(teacher) || "Teacher";
}

export function dayLabel(day: number) {
  return TIMETABLE_DAYS.find((candidate) => candidate.value === Number(day))?.label ?? `Day ${day}`;
}

export function nextConfiguredDay(current: number, direction: -1 | 1, configuredDays: number[]) {
  const available = [...new Set(configuredDays.map(Number).filter((day) => day >= 1 && day <= 7))].sort((a, b) => a - b);
  const days = available.length > 0 ? available : TIMETABLE_DAYS.map((day) => day.value);
  const index = Math.max(0, days.indexOf(current));
  return days[(index + direction + days.length) % days.length];
}

export function timeLabel(value?: string | null) {
  return value ? String(value).slice(0, 5) : "--:--";
}

export function isOfflineQueued(value: unknown): value is { _offline: true } {
  return Boolean(value && typeof value === "object" && (value as { _offline?: boolean })._offline === true);
}

export function slotDisplayName(slot: TimetableSlot, view: TimetableView) {
  if (view === "teacher") return `${slot.class_name}${slot.stream_name ? ` ${slot.stream_name}` : ""}`;
  if (view === "resource") return `${slot.class_name} - ${slot.subject_name}`;
  if (view === "master") return `${slot.class_name} - ${slot.subject_name}`;
  return slot.subject_name;
}

export function currentSchoolDay() {
  const browserDay = new Date().getDay();
  return browserDay === 0 ? 7 : browserDay;
}
