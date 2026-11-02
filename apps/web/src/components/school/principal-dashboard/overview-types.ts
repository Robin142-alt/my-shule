export type OverviewSection = 'students' | 'staff' | 'approvals' | 'communication' | 'exams-reports'
  | 'student-progression' | 'fees' | 'visitors' | 'sick-bay' | 'academic-setup' | 'academics'
  | 'attendance' | 'discipline' | 'syllabus-coverage' | 'exam-analytics' | 'library' | 'boarding' | 'transport' | 'reports';
export type OverviewNavigate = (section: OverviewSection) => void;
export type SectionData<T> = { state: 'ready'; data: T } | { state: 'error' | 'locked' | 'hidden' };
export type WaitingVisitor = {
  id: string; visitor_name: string; role_relationship: string; purpose: string;
  arrival_time: string; person_to_see: string; ticket_number: string; status: string;
};
export type OverviewDetails = {
  generatedAt: string;
  calendar: SectionData<{ name: string; year: string; week: number; weeks: number; days_left: number } | null>;
  lessons: SectionData<{ taught: number; recorded: number }>;
  health: SectionData<{ cases: number }>;
  visitors: SectionData<WaitingVisitor[]>;
  finance: SectionData<{ collectedTodayMinor: string; arrearsMinor: string; currency: string }>;
};
