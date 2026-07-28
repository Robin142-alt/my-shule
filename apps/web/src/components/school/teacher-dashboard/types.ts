export type TeacherView =
  | "overview"
  | "timetable"
  | "classes"
  | "attendance"
  | "lesson-log"
  | "syllabus-coverage"
  | "assignments"
  | "assessments-cats"
  | "exams-marks"
  | "academic-intelligence"
  | "learner-progress"
  | "discipline-welfare"
  | "parent-communication"
  | "teaching-resources"
  | "store-requests"
  | "reports"
  | "notifications"
  | "profile"
  | "class-teacher"
  | "club"
  | "invigilation";

export type TeacherAction = 
  | "attendance" 
  | "marks" 
  | "assignment" 
  | "resource" 
  | "sms" 
  | "cbt" 
  | "report" 
  | "requisition" 
  | "import" 
  | "concern"
  | "lesson-log"
  | null;

export type DetailPanel = {
  title: string;
  rows: Array<[string, string]>;
};

// We will use empty states primarily instead of mock data, but we keep the types
// to define the shapes of expected backend responses.
export type ClassRecord = {
  id: string;
  name: string;
  learners: number;
  room: string;
  lesson: string;
  attendance: "Submitted" | "Pending" | "Late";
  absent: number;
  coverage: number;
};

export type MarkBatch = {
  id: string;
  className: string;
  exam: string;
  submitted: number;
  total: number;
  status: "Open" | "Submitted" | "Needs review";
};

export type AssignmentRecord = {
  id: string;
  title: string;
  className: string;
  dueDate: string;
  submitted: number;
  total: number;
  status: "Draft" | "Published" | "Grading";
};

export type ResourceRecord = {
  id: string;
  title: string;
  className: string;
  type: string;
  status: "Draft" | "Published";
};

export type MessageRecord = {
  id: string;
  audience: string;
  body: string;
  status: "Queued";
  time: string;
};
