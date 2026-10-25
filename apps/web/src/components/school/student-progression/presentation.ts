import type { ProgressionAction, ProgressionStatus, ProgressionStudent } from "@/lib/modules/student-progression";

export const STATUS_LABELS: Record<ProgressionStatus, string> = {
  upcoming: "Upcoming", promoted: "Promoted", repeating: "Repeating", held: "On hold", transferred: "Transferred",
  expelled: "Expelled", withdrawn: "Withdrawn", graduated: "Graduated", completed: "Completed", enrolled: "Enrolled", exception: "Needs attention",
};

export const ACTIONS: Record<ProgressionAction, { label: string; confirm: string; description: string }> = {
  hold: { label: "Hold promotion", confirm: "Confirm hold", description: "Pause automatic progression for these learners until the school releases the hold." },
  repeat: { label: "Repeat current grade", confirm: "Confirm repetition", description: "Record the school's decision for these learners to repeat their current grade in the next academic year." },
  release: { label: "Resume automatic progression", confirm: "Resume progression", description: "Remove the individual progression exception. The calendar and school rules will determine the next transition." },
  promote: { label: "Promote now", confirm: "Confirm promotion", description: "Move these learners to their next configured grade and academic year, preserving their streams. MyShule prepares the destination automatically." },
  place: { label: "Change class or stream", confirm: "Save placement", description: "Correct a grade, class or stream placement. Previous placements remain in the learner's history." },
  subjects: { label: "Change subjects", confirm: "Save subject selections", description: "Choose the learner's current subjects from this class's available offerings." },
  reverse: { label: "Reverse promotion", confirm: "Confirm reversal", description: "Correct the selected transition and pause further automatic progression for this learner. Existing academic records remain preserved." },
  transfer: { label: "Transfer out", confirm: "Confirm transfer", description: "Record the learner's transfer out of this school and exclude them from automatic progression." },
  expel: { label: "Record expulsion", confirm: "Submit expulsion", description: "Submit the school's expulsion decision with a reason. Required school approvals apply before the exit takes effect." },
  withdraw: { label: "Withdraw learner", confirm: "Confirm withdrawal", description: "Record the learner's withdrawal from this school and exclude them from automatic progression." },
  reinstate: { label: "Reinstate learner", confirm: "Confirm reinstatement", description: "Return this learner to active enrolment in the selected year, class and stream while preserving their exit history." },
};

const exited = new Set(["transferred", "transferred_out", "expelled", "withdrawn", "graduated", "alumni", "archived", "inactive"]);
export function availableActions(student: ProgressionStudent): ProgressionAction[] {
  if (exited.has(student.student_status.toLowerCase()) || ["transferred", "expelled", "withdrawn", "graduated", "completed"].includes(student.status)) return ["reinstate"];
  return ["hold", "repeat", ...(student.status === "held" || student.status === "repeating" ? ["release" as const] : []), "promote", "place", "subjects", ...(student.latest_transition_id ? ["reverse" as const] : []), "transfer", "withdraw", "expel"];
}

export function displayDate(value: string, timezone: string, withTime = false) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  try { return new Intl.DateTimeFormat("en-KE", { timeZone: timezone, day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } as const : {}) }).format(date); }
  catch { return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date); }
}
