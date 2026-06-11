export interface AcademicRisk {
  id: string;
  classStream: string;
  subject: string;
  department: string;
  riskType: string;
  affectedStudents: string;
  responsibleTeacher: string;
  hod: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "assigned" | "in-progress" | "resolved" | "escalated" | "closed";
  dueDate: string;
  lastUpdate: string;
}

export interface AcademicActivity {
  id: string;
  week: string;
  dateRange: string;
  focus: string;
  syllabusPercent: string;
  keyActivities: string;
  assessmentActivity: string;
  responsibleOffice: string;
  status: "pending" | "in-progress" | "completed";
}

export interface DepartmentSummary {
  id: string;
  name: string;
  hod: string;
  teachers: number;
  subjects: number;
  syllabusCoverage: string;
  performance: string;
  missingLogs: number;
  pendingReports: number;
  riskLevel: "on-track" | "warning" | "critical";
  lastReview: string;
}

export interface SubjectControl {
  id: string;
  name: string;
  curriculumType: string;
  department: string;
  classesOffered: string;
  assignedTeachers: number;
  hod: string;
  coverage: string;
  performanceMean: string;
  status: "active" | "needs-teacher" | "archived";
}

export interface TeacherWorkload {
  id: string;
  teacher: string;
  department: string;
  subjects: string;
  classes: string;
  lessonsPerWeek: number;
  classTeacherRole: string;
  hodRole: string;
  logsSubmitted: string;
  syllabusCoverage: string;
  workloadStatus: "balanced" | "overloaded" | "underloaded" | "missing-assignment";
}

export interface TimetableHealth {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  requiredLessons: number;
  scheduledLessons: number;
  missingLessons: number;
  conflicts: number;
  status: "healthy" | "warning" | "critical";
}

export interface LessonPlan {
  id: string;
  teacher: string;
  subject: string;
  className: string;
  week: string;
  topic: string;
  submittedDate: string;
  reviewStatus: "draft" | "submitted" | "approved" | "returned";
  hodReview: "pending" | "approved" | "returned";
  deanReview: "pending" | "approved" | "returned";
}

export interface LessonLog {
  id: string;
  date: string;
  teacher: string;
  className: string;
  subject: string;
  timetabledLesson: string;
  topicTaught: string;
  attendanceLink: string;
  logStatus: "submitted" | "missing" | "late";
  hodReview: "pending" | "reviewed" | "returned";
  deanStatus: "pending" | "reviewed" | "flagged";
}

export interface SyllabusCoverage {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  department: string;
  expectedCoverage: string;
  actualCoverage: string;
  gap: string;
  lastTopic: string;
  lastUpdated: string;
  riskLevel: "on-track" | "slightly-behind" | "behind" | "critical";
}

export interface ContinuousAssessment {
  id: string;
  name: string;
  type: string;
  subject: string;
  className: string;
  teacher: string;
  dueDate: string;
  marksSubmitted: string;
  missingMarks: number;
  classMean: string;
  status: "pending" | "in-progress" | "completed" | "overdue";
}

export interface ExamReview {
  id: string;
  exam: string;
  className: string;
  subject: string;
  department: string;
  teacher: string;
  meanScore: string;
  targetMean: string;
  deviation: string;
  missingMarks: number;
  reviewStatus: "pending" | "reviewed" | "returned";
}

export interface ClassPerformance {
  id: string;
  className: string;
  stream: string;
  classTeacher: string;
  meanScore: string;
  previousMean: string;
  change: string;
  target: string;
  riskLevel: "on-track" | "warning" | "critical";
}

export interface AcademicIntervention {
  id: string;
  title: string;
  type: string;
  target: string;
  department: string;
  responsiblePerson: string;
  startDate: string;
  dueDate: string;
  progress: string;
  status: "active" | "overdue" | "completed";
}

export interface DepartmentReview {
  id: string;
  reviewPeriod: string;
  department: string;
  hod: string;
  reportStatus: "submitted" | "pending" | "overdue";
  coverageStatus: "on-track" | "behind";
  performanceStatus: "on-track" | "below-target";
  teacherIssues: number;
  deanReviewStatus: "pending" | "approved" | "returned";
  dueDate: string;
}

export interface TeacherReport {
  id: string;
  teacher: string;
  department: string;
  subject: string;
  className: string;
  reportPeriod: string;
  submissionStatus: "submitted" | "missing";
  hodStatus: "pending" | "approved";
  deanStatus: "pending" | "approved";
  keyRisk: string;
}

export interface StudentSupportCase {
  id: string;
  student: string;
  admissionNo: string;
  className: string;
  stream: string;
  mainConcern: string;
  subjectsAffected: string;
  currentMean: string;
  previousMean: string;
  interventionStatus: "active" | "resolved" | "pending";
  responsiblePerson: string;
}

export interface ReportReadiness {
  id: string;
  className: string;
  stream: string;
  classTeacher: string;
  marksStatus: "complete" | "missing";
  commentsStatus: "complete" | "missing";
  gradeStatus: "complete" | "pending";
  attendanceLinked: "yes" | "no";
  deanReview: "pending" | "approved";
  principalApproval: "pending" | "approved";
}

export interface AcademicReport {
  id: string;
  name: string;
  type: string;
  scope: string;
  generatedBy: string;
  dateGenerated: string;
  format: string;
  status: "ready" | "processing" | "failed";
}

export interface AcademicMessage {
  id: string;
  title: string;
  audience: string;
  channel: string;
  sentBy: string;
  sentDate: string;
  deliveryStatus: "delivered" | "failed" | "pending";
  replies: number;
}

export interface ApprovalFollowUp {
  id: string;
  item: string;
  type: string;
  submittedBy: string;
  department: string;
  relatedClassSubject: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  status: "pending" | "approved" | "returned";
}

export interface DeanDataset {
  risks: AcademicRisk[];
  activities: AcademicActivity[];
  departments: DepartmentSummary[];
  subjects: SubjectControl[];
  teacherWorkloads: TeacherWorkload[];
  timetableHealth: TimetableHealth[];
  lessonPlans: LessonPlan[];
  lessonLogs: LessonLog[];
  syllabusCoverage: SyllabusCoverage[];
  continuousAssessments: ContinuousAssessment[];
  examReviews: ExamReview[];
  classPerformance: ClassPerformance[];
  interventions: AcademicIntervention[];
  departmentReviews: DepartmentReview[];
  teacherReports: TeacherReport[];
  studentSupportCases: StudentSupportCase[];
  reportReadiness: ReportReadiness[];
  academicReports: AcademicReport[];
  messages: AcademicMessage[];
  approvals: ApprovalFollowUp[];
}

export function createEmptyDeanDataset(): DeanDataset {
  return {
    risks: [],
    activities: [],
    departments: [],
    subjects: [],
    teacherWorkloads: [],
    timetableHealth: [],
    lessonPlans: [],
    lessonLogs: [],
    syllabusCoverage: [],
    continuousAssessments: [],
    examReviews: [],
    classPerformance: [],
    interventions: [],
    departmentReviews: [],
    teacherReports: [],
    studentSupportCases: [],
    reportReadiness: [],
    academicReports: [],
    messages: [],
    approvals: [],
  };
}

// Generate realistic live data
export function generateLiveDeanDataset(): DeanDataset {
  return {
    risks: [
      {
        id: "R-101",
        classStream: "Form 3 East",
        subject: "Mathematics",
        department: "Sciences",
        riskType: "Syllabus behind",
        affectedStudents: "45",
        responsibleTeacher: "Mr. Otieno",
        hod: "Mrs. Njoroge",
        severity: "high",
        status: "new",
        dueDate: "2026-06-15",
        lastUpdate: "Today",
      },
      {
        id: "R-102",
        classStream: "Form 4 West",
        subject: "Physics",
        department: "Sciences",
        riskType: "Low performance",
        affectedStudents: "38",
        responsibleTeacher: "Ms. Wanjiku",
        hod: "Mrs. Njoroge",
        severity: "critical",
        status: "assigned",
        dueDate: "2026-06-12",
        lastUpdate: "Yesterday",
      },
    ],
    activities: [
      {
        id: "A-01",
        week: "Week 1",
        dateRange: "May 4 - May 8",
        focus: "Orientation and baseline assessment",
        syllabusPercent: "5%",
        keyActivities: "Goal setting, Subject prep",
        assessmentActivity: "Baseline test",
        responsibleOffice: "HODs",
        status: "completed",
      },
      {
        id: "A-06",
        week: "Week 6",
        dateRange: "Jun 8 - Jun 12",
        focus: "Midterm review",
        syllabusPercent: "50%",
        keyActivities: "Review of CAT 1",
        assessmentActivity: "Midterm Exam",
        responsibleOffice: "Exams Office",
        status: "in-progress",
      },
    ],
    departments: [
      {
        id: "D-01",
        name: "Sciences",
        hod: "Mrs. Njoroge",
        teachers: 12,
        subjects: 4,
        syllabusCoverage: "45%",
        performance: "B- (8.4)",
        missingLogs: 3,
        pendingReports: 1,
        riskLevel: "warning",
        lastReview: "2026-05-15",
      },
      {
        id: "D-02",
        name: "Languages",
        hod: "Mr. Omondi",
        teachers: 8,
        subjects: 3,
        syllabusCoverage: "52%",
        performance: "B (9.1)",
        missingLogs: 0,
        pendingReports: 0,
        riskLevel: "on-track",
        lastReview: "2026-05-20",
      },
    ],
    subjects: [
      {
        id: "S-101",
        name: "Mathematics",
        curriculumType: "8-4-4",
        department: "Sciences",
        classesOffered: "Form 1 - Form 4",
        assignedTeachers: 6,
        hod: "Mrs. Njoroge",
        coverage: "48%",
        performanceMean: "52%",
        status: "active",
      },
    ],
    teacherWorkloads: [
      {
        id: "TW-01",
        teacher: "Mr. Otieno",
        department: "Sciences",
        subjects: "Mathematics, Physics",
        classes: "F3 East, F4 West",
        lessonsPerWeek: 28,
        classTeacherRole: "F3 East",
        hodRole: "-",
        logsSubmitted: "100%",
        syllabusCoverage: "42%",
        workloadStatus: "overloaded",
      },
    ],
    timetableHealth: [
      {
        id: "TH-01",
        className: "Form 3 East",
        subject: "Mathematics",
        teacher: "Mr. Otieno",
        requiredLessons: 6,
        scheduledLessons: 6,
        missingLessons: 0,
        conflicts: 0,
        status: "healthy",
      },
    ],
    lessonPlans: [
      {
        id: "LP-001",
        teacher: "Mr. Otieno",
        subject: "Mathematics",
        className: "Form 3 East",
        week: "Week 6",
        topic: "Calculus",
        submittedDate: "2026-06-08",
        reviewStatus: "submitted",
        hodReview: "approved",
        deanReview: "pending",
      },
    ],
    lessonLogs: [
      {
        id: "LL-100",
        date: "2026-06-10",
        teacher: "Mr. Otieno",
        className: "Form 3 East",
        subject: "Mathematics",
        timetabledLesson: "Period 2",
        topicTaught: "Differentiation",
        attendanceLink: "View Attendance",
        logStatus: "submitted",
        hodReview: "reviewed",
        deanStatus: "pending",
      },
    ],
    syllabusCoverage: [
      {
        id: "SC-01",
        className: "Form 3 East",
        subject: "Mathematics",
        teacher: "Mr. Otieno",
        department: "Sciences",
        expectedCoverage: "50%",
        actualCoverage: "42%",
        gap: "-8%",
        lastTopic: "Differentiation",
        lastUpdated: "2026-06-08",
        riskLevel: "slightly-behind",
      },
    ],
    continuousAssessments: [
      {
        id: "CA-101",
        name: "CAT 1 Term 2",
        type: "CAT",
        subject: "Mathematics",
        className: "Form 3 East",
        teacher: "Mr. Otieno",
        dueDate: "2026-05-25",
        marksSubmitted: "40/45",
        missingMarks: 5,
        classMean: "54%",
        status: "pending",
      },
    ],
    examReviews: [
      {
        id: "ER-01",
        exam: "Term 1 End",
        className: "Form 3 East",
        subject: "Mathematics",
        department: "Sciences",
        teacher: "Mr. Otieno",
        meanScore: "6.2",
        targetMean: "7.0",
        deviation: "-0.8",
        missingMarks: 0,
        reviewStatus: "reviewed",
      },
    ],
    classPerformance: [
      {
        id: "CP-3E",
        className: "Form 3",
        stream: "East",
        classTeacher: "Mr. Otieno",
        meanScore: "B-",
        previousMean: "C+",
        change: "+1.2",
        target: "B",
        riskLevel: "on-track",
      },
    ],
    interventions: [
      {
        id: "INT-01",
        title: "F3 East Math Catch-up",
        type: "Remedial teaching",
        target: "Form 3 East",
        department: "Sciences",
        responsiblePerson: "Mr. Otieno",
        startDate: "2026-06-12",
        dueDate: "2026-07-01",
        progress: "0%",
        status: "active",
      },
    ],
    departmentReviews: [
      {
        id: "DR-Q1",
        reviewPeriod: "Mid Term 2",
        department: "Sciences",
        hod: "Mrs. Njoroge",
        reportStatus: "submitted",
        coverageStatus: "behind",
        performanceStatus: "on-track",
        teacherIssues: 1,
        deanReviewStatus: "pending",
        dueDate: "2026-06-15",
      },
    ],
    teacherReports: [
      {
        id: "TR-01",
        teacher: "Mr. Otieno",
        department: "Sciences",
        subject: "Mathematics",
        className: "Form 3 East",
        reportPeriod: "Mid Term 2",
        submissionStatus: "submitted",
        hodStatus: "approved",
        deanStatus: "pending",
        keyRisk: "Syllabus delay",
      },
    ],
    studentSupportCases: [
      {
        id: "SS-100",
        student: "David Kamau",
        admissionNo: "ADM-9021",
        className: "Form 3",
        stream: "East",
        mainConcern: "Repeated failures",
        subjectsAffected: "Math, Physics",
        currentMean: "D",
        previousMean: "C-",
        interventionStatus: "active",
        responsiblePerson: "Counsellor",
      },
    ],
    reportReadiness: [
      {
        id: "RR-3E",
        className: "Form 3",
        stream: "East",
        classTeacher: "Mr. Otieno",
        marksStatus: "missing",
        commentsStatus: "missing",
        gradeStatus: "pending",
        attendanceLinked: "yes",
        deanReview: "pending",
        principalApproval: "pending",
      },
    ],
    academicReports: [
      {
        id: "REP-01",
        name: "Mid Term Academic Summary",
        type: "Term academic summary",
        scope: "All Classes",
        generatedBy: "Dean of Academics",
        dateGenerated: "2026-06-10",
        format: "PDF",
        status: "ready",
      },
    ],
    messages: [
      {
        id: "MSG-01",
        title: "Reminder: Midterm Reports Due",
        audience: "All teachers",
        channel: "In-app",
        sentBy: "Dean of Academics",
        sentDate: "2026-06-08",
        deliveryStatus: "delivered",
        replies: 0,
      },
    ],
    approvals: [
      {
        id: "APP-01",
        item: "Midterm Department Report",
        type: "Department report review",
        submittedBy: "Mrs. Njoroge",
        department: "Sciences",
        relatedClassSubject: "-",
        priority: "high",
        dueDate: "2026-06-12",
        status: "pending",
      },
    ],
  };
}
