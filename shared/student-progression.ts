/** Public school-scoped progression contract. All IDs are resolved server-side in the authenticated school. */
export type ProgressionAction = 'hold' | 'repeat' | 'release' | 'promote' | 'place' | 'subjects' | 'reverse' | 'transfer' | 'expel' | 'withdraw' | 'reinstate';
export type ProgressionStatus = 'upcoming' | 'promoted' | 'repeating' | 'held' | 'transferred' | 'expelled' | 'withdrawn' | 'graduated' | 'completed' | 'enrolled' | 'exception';
export type ProgressionYear = { id: string; name: string; starts_on: string; ends_on: string; status: string; is_current: boolean };
export type ProgressionClass = { id: string; name: string; academic_year_id: string; curriculum_model: string; grade_level: string };
export type ProgressionStream = { id: string; name: string; class_section_id: string };
export type ProgressionStudent = {
  id: string; name: string; admission_number: string; version: string;
  academic_year_id: string | null; academic_year_name: string | null;
  class_section_id: string | null; class_name: string | null; stream_id: string | null; stream_name: string | null;
  curriculum_model: string | null; status: ProgressionStatus; student_status: string;
  next_class_name: string | null; message: string | null; latest_transition_id: string | null;
};
export type ProgressionRun = {
  id: string; academic_year_id: string; status: 'upcoming' | 'running' | 'completed' | 'attention' | 'failed';
  processed: number; promoted: number; repeated: number; graduated: number; held: number; exceptions: number;
  message: string | null; updated_at: string;
};
export type ProgressionOverview = {
  timezone: string; selected_year_id: string | null; automation: { status: string; message: string; next_run_at: string | null };
  permissions: { manage: boolean; approve: boolean };
  counts: Record<string, number>; students: ProgressionStudent[]; total: number;
  years: ProgressionYear[]; classes: ProgressionClass[]; streams: ProgressionStream[]; runs: ProgressionRun[];
  approvals: Array<{ id: string; action: ProgressionAction; student_count: number; reason: string; requested_by: string; created_at: string }>;
};
export type ProgressionStudentDetail = {
  student: ProgressionStudent;
  subjects: Array<{ id: string; name: string; code: string; compulsory: boolean; selected: boolean }>;
  timeline: Array<{ id: string; action: string; outcome: string; reason: string; actor: string; created_at: string;
    from_class: string | null; from_year: string | null; to_class: string | null; to_year: string | null; reversible: boolean }>;
};
export type ProgressionCommand = {
  request_id: string; action: ProgressionAction; reason: string; academic_year_id: string;
  students: Array<{ id: string; expected_version: string }>;
  target_class_section_id?: string; target_stream_id?: string | null; subject_ids?: string[]; transition_id?: string;
};
export type ProgressionCommandResult = { status: 'completed' | 'pending_approval'; affected: number; message: string; approval_id?: string; replayed?: boolean };
