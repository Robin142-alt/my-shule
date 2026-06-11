import type { StatusTone } from "@/lib/dashboard/types";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

export type PracticalSummaryCard = {
  label: string;
  value: string;
  helper: string;
  source: string;
  tone?: StatusTone;
};

export type PracticalRoleProfile = {
  title: string;
  subtitle: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  todayContext: string;
  sectionNoun: string;
  summaryCards: PracticalSummaryCard[];
  urgentAlerts: string[];
  emptyState: string;
};

const accountantProfile: PracticalRoleProfile = {
  title: "Accountant Fee Collection",
  subtitle: "Fee payments, receipts, balances, M-Pesa confirmations, reminders, and daily collection reports.",
  sidebarTitle: "Fee Desk",
  sidebarSubtitle: "Payments and balances",
  todayContext: "Fees, receipts, confirmations, reversals, and parent fee reminders needing attention today.",
  sectionNoun: "fee desk",
  summaryCards: [
    { label: "Collected Today", value: "KSh 248,500", helper: "Cash, bank, and M-Pesa", source: "From fee records", tone: "ok" },
    { label: "M-Pesa Confirmed", value: "37", helper: "1 callback needs retry", source: "From M-Pesa confirmations", tone: "warning" },
    { label: "Balances Above KSh 10k", value: "42", helper: "Parent reminders ready", source: "From student ledgers", tone: "warning" },
    { label: "Receipts Printed", value: "29", helper: "8 SMS receipts queued", source: "From receipt records", tone: "ok" },
  ],
  urgentAlerts: ["1 failed M-Pesa confirmation", "3 payment reversal requests", "42 fee reminders pending"],
  emptyState: "No fee exceptions waiting right now.",
};

const teacherProfile: PracticalRoleProfile = {
  title: "Teacher Teaching Desk",
  subtitle: "Lessons, class attendance, assignments, marks, student concerns, and parent updates.",
  sidebarTitle: "Teaching Desk",
  sidebarSubtitle: "Lessons and learners",
  todayContext: "Lessons, attendance, assignments, marks, and learner concerns needing action today.",
  sectionNoun: "teaching desk",
  summaryCards: [
    { label: "Lessons Today", value: "6", helper: "2 already completed", source: "From timetable", tone: "ok" },
    { label: "Attendance Pending", value: "1", helper: "Form 2 West register", source: "From class registers", tone: "warning" },
    { label: "Assignments Due", value: "3", helper: "Marking starts today", source: "From assignment records", tone: "warning" },
    { label: "Student Concerns", value: "2", helper: "Class teacher follow-up", source: "From learner notes", tone: "warning" },
  ],
  urgentAlerts: ["Form 2 West attendance register missing", "2 students need follow-up notes", "Mathematics marks due today"],
  emptyState: "No urgent teaching follow-ups right now.",
};

export const practicalRoleProfiles: Record<SchoolExperienceRole, PracticalRoleProfile> = {
  principal: {
    title: "Principal Command Center",
    subtitle: "Live daily school operations, approvals, alerts, and reports.",
    sidebarTitle: "Leadership Desk",
    sidebarSubtitle: "School overview",
    todayContext: "Attendance, fees, discipline, sick bay, visitors, boarding, transport, approvals, and school alerts.",
    sectionNoun: "leadership desk",
    summaryCards: [
      { label: "Students Present", value: "1,186", helper: "18 absent, 12 late", source: "From teacher registers", tone: "ok" },
      { label: "Fees Today", value: "KSh 248,500", helper: "1 M-Pesa retry", source: "From accountant records", tone: "warning" },
      { label: "Visitors Inside", value: "6", helper: "2 parents waiting", source: "From security gate log", tone: "warning" },
      { label: "Pending Approvals", value: "15", helper: "Fees, stock, exeats, discipline", source: "From office requests", tone: "critical" },
    ],
    urgentAlerts: ["7 attendance registers missing", "4 discipline cases awaiting review", "1 school bus marked for maintenance"],
    emptyState: "No urgent leadership action is waiting right now.",
  },
  "deputy-principal": {
    title: "Deputy Principal Operations",
    subtitle: "Daily discipline, attendance follow-up, staff duty, student movement, and serious case handling.",
    sidebarTitle: "Operations Desk",
    sidebarSubtitle: "Discipline and attendance",
    todayContext: "Discipline cases, late students, missing registers, duty issues, and student movement needing action.",
    sectionNoun: "operations desk",
    summaryCards: [
      { label: "Discipline Cases", value: "4", helper: "2 serious cases", source: "From teacher reports", tone: "warning" },
      { label: "Late Students", value: "12", helper: "Morning gate log", source: "From attendance and security", tone: "warning" },
      { label: "Missing Registers", value: "7", helper: "Class teachers to follow up", source: "From attendance registers", tone: "critical" },
      { label: "Duty Issues", value: "3", helper: "Replacement teachers needed", source: "From staff duty roster", tone: "warning" },
    ],
    urgentAlerts: ["Dormitory case needs review", "Form 2 North register missing", "One student movement note incomplete"],
    emptyState: "No serious discipline or attendance escalation right now.",
  },
  secretary: {
    title: "Secretary Front Office",
    subtitle: "Parent walk-ins, student search, visitor support, letters, appointments, and communication logs.",
    sidebarTitle: "Front Office",
    sidebarSubtitle: "Parents and documents",
    todayContext: "Parents, visitors, document requests, appointments, calls, and complaints waiting at the front office.",
    sectionNoun: "front office",
    summaryCards: [
      { label: "Parents Waiting", value: "5", helper: "Fee and report queries", source: "From front office queue", tone: "warning" },
      { label: "Documents Requested", value: "9", helper: "Letters and statements", source: "From document requests", tone: "warning" },
      { label: "Appointments Today", value: "6", helper: "Principal and deputy", source: "From appointment book", tone: "ok" },
      { label: "Complaints Logged", value: "4", helper: "2 assigned to departments", source: "From parent desk", tone: "warning" },
    ],
    urgentAlerts: ["2 parents waiting over 10 minutes", "Transfer letter pending signature", "Visitor slip printer needs paper"],
    emptyState: "No parents or documents waiting right now.",
  },
  bursar: accountantProfile,
  accountant: accountantProfile,
  teacher: teacherProfile,
  "dean-academics": {
    title: "Dean of Academics Desk",
    subtitle: "Academic quality, syllabus coverage, performance, exam readiness, and teacher follow-up.",
    sidebarTitle: "Academic Desk",
    sidebarSubtitle: "Quality and results",
    todayContext: "Missing marks, syllabus gaps, class performance, report card progress, and teacher submissions.",
    sectionNoun: "academic desk",
    summaryCards: [
      { label: "Syllabus Coverage", value: "82%", helper: "3 classes behind pace", source: "From HOD reports", tone: "warning" },
      { label: "Missing Marks", value: "19", helper: "Before deadline", source: "From exams manager", tone: "critical" },
      { label: "Upcoming Exams", value: "4", helper: "Moderation needed", source: "From exam timetable", tone: "warning" },
      { label: "Report Progress", value: "68%", helper: "Drafts in preparation", source: "From report card records", tone: "ok" },
    ],
    urgentAlerts: ["Mathematics marks missing", "Grade 8 East performance drop", "2 teacher reports overdue"],
    emptyState: "No academic quality alert waiting right now.",
  },
  "exams-manager": {
    title: "Exams Manager Desk",
    subtitle: "Exam setup, marks collection, validation, grade processing, report cards, and print queues.",
    sidebarTitle: "Exams Desk",
    sidebarSubtitle: "Marks and reports",
    todayContext: "Active exams, marks entry, missing marks, validation issues, report cards, and print/export work.",
    sectionNoun: "exams desk",
    summaryCards: [
      { label: "Active Exams", value: "5", helper: "2 in marks entry", source: "From exam setup", tone: "ok" },
      { label: "Marks Submitted", value: "76%", helper: "19 marks missing", source: "From teacher submissions", tone: "warning" },
      { label: "Report Cards Ready", value: "214", helper: "Draft only", source: "From report generator", tone: "ok" },
      { label: "Print Queue", value: "3", helper: "Awaiting validation", source: "From print records", tone: "warning" },
    ],
    urgentAlerts: ["Grade 7 East missing Kiswahili marks", "One invalid score range", "Report cards need validation"],
    emptyState: "No exam processing issue waiting right now.",
  },
  hod: {
    title: "Head of Department Desk",
    subtitle: "Department teachers, subjects, lesson coverage, performance, resources, and reports.",
    sidebarTitle: "Department Desk",
    sidebarSubtitle: "Subjects and teachers",
    todayContext: "Teacher workload, subject performance, missing marks, resource requests, and lesson coverage.",
    sectionNoun: "department desk",
    summaryCards: [
      { label: "Teachers", value: "8", helper: "2 need follow-up", source: "From department roster", tone: "ok" },
      { label: "Lessons Covered", value: "91%", helper: "One class behind", source: "From lesson reports", tone: "warning" },
      { label: "Missing Marks", value: "6", helper: "Department subjects", source: "From exams records", tone: "warning" },
      { label: "Resources Requested", value: "4", helper: "Lab and textbooks", source: "From resource requests", tone: "warning" },
    ],
    urgentAlerts: ["Chemistry practical resources pending", "Form 4 South weak topic report", "Two lesson plans need review"],
    emptyState: "No department issue waiting right now.",
  },
  "class-teacher": {
    title: "Class Teacher Desk",
    subtitle: "Class register, attendance, welfare, fees follow-up, discipline, parent communication, and class reports.",
    sidebarTitle: "Class Desk",
    sidebarSubtitle: "Class welfare",
    todayContext: "Class attendance, absent learners, fee follow-ups, discipline, parent messages, and academic concerns.",
    sectionNoun: "class desk",
    summaryCards: [
      { label: "Class Attendance", value: "94%", helper: "3 absent learners", source: "From class register", tone: "ok" },
      { label: "Fee Defaulters", value: "8", helper: "Parent SMS ready", source: "From fee balances", tone: "warning" },
      { label: "Discipline Cases", value: "2", helper: "One repeat concern", source: "From discipline records", tone: "warning" },
      { label: "Parent Messages", value: "5", helper: "2 unread", source: "From parent messages", tone: "warning" },
    ],
    urgentAlerts: ["3 absent learners need parent SMS", "One welfare note needs follow-up", "Fee reminder list ready"],
    emptyState: "No class follow-up waiting right now.",
  },
  "grade-master": {
    title: "Grade/Form Master Desk",
    subtitle: "Grade-wide attendance, streams, class teachers, discipline, academics, and parent escalations.",
    sidebarTitle: "Grade Desk",
    sidebarSubtitle: "Streams and follow-up",
    todayContext: "Stream comparison, class teacher submissions, discipline trends, academic risks, and parent follow-ups.",
    sectionNoun: "grade desk",
    summaryCards: [
      { label: "Total Students", value: "312", helper: "4 streams", source: "From class lists", tone: "ok" },
      { label: "Attendance Rate", value: "92%", helper: "One stream below target", source: "From attendance registers", tone: "warning" },
      { label: "Discipline Cases", value: "5", helper: "2 repeat concerns", source: "From discipline records", tone: "warning" },
      { label: "Teacher Reports", value: "3", helper: "Pending submission", source: "From class teachers", tone: "warning" },
    ],
    urgentAlerts: ["Form 2 West attendance below target", "Parent escalation awaiting owner", "Missing marks in two streams"],
    emptyState: "No grade-wide escalation waiting right now.",
  },
  nurse: {
    title: "Nurse Sick Bay",
    subtitle: "Student visits, vitals, medicine dispensing, stock warnings, referrals, and parent alerts.",
    sidebarTitle: "Sick Bay",
    sidebarSubtitle: "Health and medicine",
    todayContext: "Sick bay cases, medicine stock, referrals, parent alerts, and students ready for release.",
    sectionNoun: "sick bay",
    summaryCards: [
      { label: "Treated Today", value: "3", helper: "1 referred case", source: "From sick bay register", tone: "warning" },
      { label: "In Sick Bay", value: "1", helper: "Monitoring vitals", source: "From nurse records", tone: "warning" },
      { label: "Low Stock", value: "2", helper: "Paracetamol and gloves", source: "From medicine stock", tone: "critical" },
      { label: "Parent Alerts", value: "3", helper: "All sent", source: "From SMS records", tone: "ok" },
    ],
    urgentAlerts: ["Paracetamol below reorder level", "One hospital referral follow-up", "Expired medicine batch check due"],
    emptyState: "No sick bay or medicine alert waiting right now.",
  },
  "guidance-counselling": {
    title: "School Counsellor Desk",
    subtitle: "Referrals, counselling sessions, follow-ups, welfare notes, parent meetings, and confidential reports.",
    sidebarTitle: "Counselling Desk",
    sidebarSubtitle: "Student welfare",
    todayContext: "New referrals, sessions, high-risk welfare cases, parent meetings, and follow-ups due.",
    sectionNoun: "counselling desk",
    summaryCards: [
      { label: "New Referrals", value: "4", helper: "2 from teachers", source: "From discipline and teachers", tone: "warning" },
      { label: "Sessions Today", value: "5", helper: "One urgent", source: "From counselling calendar", tone: "warning" },
      { label: "Follow-ups Due", value: "6", helper: "Guardian calls needed", source: "From welfare notes", tone: "warning" },
      { label: "Resolved Cases", value: "2", helper: "This week", source: "From counselling records", tone: "ok" },
    ],
    urgentAlerts: ["High-risk welfare case needs session", "Parent meeting due today", "Teacher referral awaiting intake"],
    emptyState: "No counselling follow-up waiting right now.",
  },
  "discipline-master": {
    title: "Discipline Master Desk",
    subtitle: "Case handling, investigations, evidence, parent notices, referrals, escalations, and letters.",
    sidebarTitle: "Discipline Desk",
    sidebarSubtitle: "Cases and actions",
    todayContext: "New cases, serious incidents, repeat offenders, parent notices, investigations, and escalations.",
    sectionNoun: "discipline desk",
    summaryCards: [
      { label: "New Cases", value: "4", helper: "2 serious", source: "From teacher reports", tone: "warning" },
      { label: "Repeat Offenders", value: "3", helper: "Needs intervention", source: "From discipline history", tone: "critical" },
      { label: "Parent Notices", value: "5", helper: "2 pending SMS", source: "From parent communication", tone: "warning" },
      { label: "Resolved Cases", value: "7", helper: "This week", source: "From discipline records", tone: "ok" },
    ],
    urgentAlerts: ["Dormitory bullying case under review", "Parent summons letter pending", "Counsellor referral required"],
    emptyState: "No discipline case waiting right now.",
  },
  librarian: {
    title: "Librarian Library Desk",
    subtitle: "Books, barcode scanning, issuing, returns, fines, overdue notices, and stock count.",
    sidebarTitle: "Library Desk",
    sidebarSubtitle: "Books and borrowers",
    todayContext: "Book issuing, returns, barcode labels, overdue books, fines, lost/damaged books, and stock records.",
    sectionNoun: "library desk",
    summaryCards: [
      { label: "Issued Today", value: "28", helper: "Barcode scans", source: "From issue records", tone: "ok" },
      { label: "Returned Today", value: "19", helper: "3 late returns", source: "From return records", tone: "ok" },
      { label: "Overdue Books", value: "14", helper: "SMS reminders ready", source: "From borrower records", tone: "warning" },
      { label: "Fines Pending", value: "KSh 2,400", helper: "Lost/damaged follow-up", source: "From fine records", tone: "warning" },
    ],
    urgentAlerts: ["14 overdue books need SMS", "2 damaged books need marking", "Barcode labels pending for new books"],
    emptyState: "No library issue waiting right now.",
  },
  storekeeper: {
    title: "Storekeeper Store Desk",
    subtitle: "Stock, consumables, assets, issues, approvals, procurement, movement history, and stock take.",
    sidebarTitle: "Store Desk",
    sidebarSubtitle: "Stock and assets",
    todayContext: "Low stock, items issued, department requests, damaged items, procurement, and movement records.",
    sectionNoun: "store desk",
    summaryCards: [
      { label: "Low Stock Items", value: "11", helper: "Chalk, toners, gloves", source: "From stock records", tone: "critical" },
      { label: "Issued Today", value: "24", helper: "6 departments", source: "From issue slips", tone: "ok" },
      { label: "Pending Requests", value: "9", helper: "3 high-value", source: "From department requests", tone: "warning" },
      { label: "Damaged Items", value: "3", helper: "Asset report due", source: "From asset records", tone: "warning" },
    ],
    urgentAlerts: ["Toner below reorder level", "Projector movement needs approval", "Stock take variance in kitchen supplies"],
    emptyState: "No stock issue waiting right now.",
  },
  "boarding-master": {
    title: "Boarding Master Hostel Desk",
    subtitle: "Hostel roll call, dorm allocation, exeats, sick referrals, supplies, incidents, and parent notices.",
    sidebarTitle: "Hostel Desk",
    sidebarSubtitle: "Boarders and dorms",
    todayContext: "Roll call status, missing boarders, exeat requests, sick boarders, dorm issues, and supplies.",
    sectionNoun: "hostel desk",
    summaryCards: [
      { label: "Boarders Present", value: "418", helper: "Morning roll call complete", source: "From hostel roll call", tone: "ok" },
      { label: "Missing Boarders", value: "1", helper: "Deputy alerted", source: "From roll call register", tone: "critical" },
      { label: "Exeats Pending", value: "2", helper: "Parent SMS needed", source: "From exeat requests", tone: "warning" },
      { label: "Dorm Issues", value: "4", helper: "Supplies and repairs", source: "From dorm reports", tone: "warning" },
    ],
    urgentAlerts: ["One boarder missing from roll call", "Two exeat requests pending", "Dorm B supplies request needs store follow-up"],
    emptyState: "No hostel issue waiting right now.",
  },
  "security-officer": {
    title: "Security Gate Desk",
    subtitle: "Fast visitor check-in/out, returning visitor search, vehicle log, visitor slips, and emergency visibility.",
    sidebarTitle: "Gate Desk",
    sidebarSubtitle: "Visitors and vehicles",
    todayContext: "Visitors inside, waiting visitors, overstays, vehicles, blocklist alerts, and emergency lists.",
    sectionNoun: "gate desk",
    summaryCards: [
      { label: "Visitors Inside", value: "6", helper: "1 overstayed", source: "From gate log", tone: "warning" },
      { label: "Visitors Waiting", value: "2", helper: "Parents at reception", source: "From visitor queue", tone: "warning" },
      { label: "Vehicles Inside", value: "4", helper: "Event parking", source: "From vehicle log", tone: "ok" },
      { label: "Blocklist Alerts", value: "0", helper: "No match today", source: "From security list", tone: "ok" },
    ],
    urgentAlerts: ["One visitor overstayed pass time", "Two parents waiting at reception", "Visitor slip printer check due"],
    emptyState: "No visitor or gate alert waiting right now.",
  },
  "transport-manager": {
    title: "Transport Manager Fleet Desk",
    subtitle: "Routes, vehicles, drivers, trip attendance, fuel, maintenance, fees, and parent alerts.",
    sidebarTitle: "Transport Desk",
    sidebarSubtitle: "Routes and vehicles",
    todayContext: "Active routes, picked learners, missed pickups, vehicle issues, fuel alerts, and maintenance.",
    sectionNoun: "transport desk",
    summaryCards: [
      { label: "Active Routes", value: "9", helper: "7 completed", source: "From trip records", tone: "ok" },
      { label: "Students Not Picked", value: "3", helper: "Parent alerts sent", source: "From trip attendance", tone: "warning" },
      { label: "Vehicle Issues", value: "1", helper: "Bus KDK 214F", source: "From vehicle reports", tone: "critical" },
      { label: "Fuel Alerts", value: "2", helper: "Review consumption", source: "From fuel records", tone: "warning" },
    ],
    urgentAlerts: ["Bus KDK 214F marked for maintenance", "Route 4 had missed pickup alert", "Fuel record variance needs review"],
    emptyState: "No transport issue waiting right now.",
  },
  "laboratory-technician": {
    title: "Laboratory Technician Desk",
    subtitle: "Practicals, chemicals, apparatus, issue/return, breakages, lab assets, and safety alerts.",
    sidebarTitle: "Laboratory Desk",
    sidebarSubtitle: "Practicals and safety",
    todayContext: "Practical requests, chemical stock, apparatus, breakages, lab bookings, and safety warnings.",
    sectionNoun: "laboratory desk",
    summaryCards: [
      { label: "Practical Requests", value: "5", helper: "2 due today", source: "From teacher requests", tone: "warning" },
      { label: "Chemicals Low", value: "3", helper: "Reorder needed", source: "From chemical inventory", tone: "critical" },
      { label: "Apparatus Issued", value: "27", helper: "Return by 4 PM", source: "From apparatus log", tone: "ok" },
      { label: "Safety Alerts", value: "1", helper: "Hazard label check", source: "From safety records", tone: "warning" },
    ],
    urgentAlerts: ["Chemistry practical setup due", "Hydrochloric acid low stock", "Microscope breakage report pending"],
    emptyState: "No lab practical or safety issue waiting right now.",
  },
  admissions: {
    title: "Admissions Officer Desk",
    subtitle: "Inquiries, applications, documents, interviews, decisions, onboarding, and admission letters.",
    sidebarTitle: "Admissions Desk",
    sidebarSubtitle: "Applications and onboarding",
    todayContext: "New inquiries, pending applications, missing documents, interviews, decisions, and onboarding steps.",
    sectionNoun: "admissions desk",
    summaryCards: [
      { label: "New Inquiries", value: "14", helper: "5 parent calls", source: "From inquiry list", tone: "warning" },
      { label: "Applications Pending", value: "23", helper: "7 missing documents", source: "From applications", tone: "warning" },
      { label: "Interviews Today", value: "6", helper: "Assessment panel ready", source: "From interview schedule", tone: "ok" },
      { label: "Onboarded", value: "3", helper: "First invoice generated", source: "From student creation", tone: "ok" },
    ],
    urgentAlerts: ["7 applications missing documents", "Two admission letters pending print", "Parent SMS onboarding queued"],
    emptyState: "No admission issue waiting right now.",
  },
  admin: {
    title: "School Admin Desk",
    subtitle: "School records, users, documents, reports, parent support, and daily office actions.",
    sidebarTitle: "Admin Desk",
    sidebarSubtitle: "School office",
    todayContext: "Student records, documents, staff support, reports, fee follow-ups, and parent requests.",
    sectionNoun: "admin desk",
    summaryCards: [
      { label: "Office Tasks", value: "18", helper: "6 urgent", source: "From admin records", tone: "warning" },
      { label: "Documents", value: "12", helper: "Letters and reports", source: "From document center", tone: "warning" },
      { label: "Parent Requests", value: "7", helper: "Front office support", source: "From parent desk", tone: "warning" },
      { label: "Reports Ready", value: "4", helper: "Print/export available", source: "From reports", tone: "ok" },
    ],
    urgentAlerts: ["Student document checklist missing", "Parent request pending", "Report export ready"],
    emptyState: "No school admin task waiting right now.",
  },
  student: {
    title: "Student School Desk",
    subtitle: "Timetable, assignments, exam results, library books, notices, and teacher messages.",
    sidebarTitle: "Student Desk",
    sidebarSubtitle: "Learning and school life",
    todayContext: "Lessons, assignments, notices, library due dates, exam results, and teacher messages for today.",
    sectionNoun: "student desk",
    summaryCards: [
      { label: "Lessons Today", value: "7", helper: "Next: Mathematics", source: "From timetable", tone: "ok" },
      { label: "Assignments Due", value: "2", helper: "English and Biology", source: "From teacher records", tone: "warning" },
      { label: "Library Books", value: "1", helper: "Due Friday", source: "From library records", tone: "warning" },
      { label: "Unread Notices", value: "3", helper: "Class and school notices", source: "From communication desk", tone: "warning" },
    ],
    urgentAlerts: ["Biology assignment due today", "Library book due this week", "Class teacher message unread"],
    emptyState: "No urgent student task waiting right now.",
  },
  "ict-manager": {
    title: "ICT and Computer Lab Desk",
    subtitle: "Computers, projectors, routers, printers, software, lab bookings, repairs, and device status.",
    sidebarTitle: "ICT Desk",
    sidebarSubtitle: "Devices and labs",
    todayContext: "Device faults, lab bookings, repair requests, assigned assets, software licences, and network alerts.",
    sectionNoun: "ICT desk",
    summaryCards: [
      { label: "Working Devices", value: "84", helper: "6 under repair", source: "From ICT asset records", tone: "ok" },
      { label: "Lab Bookings", value: "5", helper: "2 practical sessions today", source: "From lab timetable", tone: "warning" },
      { label: "Repair Requests", value: "4", helper: "Projector and printers", source: "From staff requests", tone: "warning" },
      { label: "Network Alerts", value: "1", helper: "Router check pending", source: "From system monitor", tone: "critical" },
    ],
    urgentAlerts: ["Router in computer lab needs restart", "Projector repair request pending", "Printer toner issue from secretary"],
    emptyState: "No ICT device issue waiting right now.",
  },
  "procurement-officer": {
    title: "Procurement Dashboard",
    subtitle: "Manage school purchasing and supplies",
    sidebarTitle: "Procurement",
    sidebarSubtitle: "Purchasing & Supplies",
    todayContext: "Today's Purchasing",
    sectionNoun: "Orders",
    summaryCards: [],
    urgentAlerts: [],
    emptyState: "No procurement data available",
  },
};

export function getPracticalRoleProfile(role: SchoolExperienceRole): PracticalRoleProfile {
  return practicalRoleProfiles[role] ?? practicalRoleProfiles.admin;
}

const friendlyActionReplacements: Array<[RegExp, string]> = [
  [/open audit trail/gi, "View Details"],
  [/generated audit extract/gi, "Download Report"],
  [/generate audit extract/gi, "Download Report"],
  [/trigger repair/gi, "Retry"],
  [/retry sync/gi, "Retry Sync"],
  [/assign finding/gi, "Assign to Staff Member"],
  [/mark resolved/gi, "Mark Issue Solved"],
  [/open system health/gi, "View System Alerts"],
  [/workflow dispatch/gi, "Send Task"],
  [/open priority queue/gi, "Open Urgent Tasks"],
];

const friendlyTextReplacements: Array<[RegExp, string]> = [
  [/tenant-wide/gi, "school-wide"],
  [/\btenant\b/gi, "school"],
  [/event-backed/gi, "live updates"],
  [/event driven/gi, "live updates"],
  [/workspace isolated/gi, "secure role access"],
  [/workspace/gi, "section"],
  [/state machine bound/gi, "progress tracked"],
  [/state machine/gi, "workflow progress"],
  [/capability governed/gi, "permission controlled"],
  [/governed capability/gi, "permission controlled"],
  [/workflow dispatch/gi, "task sent"],
  [/execution timeline/gi, "saved records"],
  [/generated audit extract/gi, "downloaded report"],
  [/audit extract/gi, "downloaded report"],
  [/audit trail/gi, "saved records"],
  [/audit item/gi, "saved record"],
  [/audit state/gi, "history status"],
  [/repair triggered/gi, "retry started"],
  [/demo data fabric/gi, "sample school data"],
  [/demo fabric/gi, "school updates"],
  [/operational fabric/gi, "school operations"],
  [/synthetic workflow/gi, "sample workflow"],
  [/command surface/gi, "dashboard"],
  [/observability/gi, "system health"],
  [/workflow state machines/gi, "task progress"],
  [/workflow action dispatched/gi, "task completed"],
  [/form entry recorded/gi, "form saved"],
  [/widget count/gi, "section count"],
  [/\bwidgets\b/gi, "sections"],
  [/\bwidget\b/gi, "section"],
  [/\bAGP\b/g, "permission check"],
  [/capability resolution/gi, "permission check"],
  [/event emission/gi, "live update"],
  [/audit logging/gi, "saved records"],
  [/module bindings/gi, "connected school desks"],
  [/validating/gi, "checking"],
  [/dispatching/gi, "sending"],
  [/dispatch failed/gi, "could not send"],
  [/fallback activated/gi, "backup action started"],
  [/repair/gi, "retry"],
];

export function schoolFriendlyText(value: string): string {
  const readable = value.replace(/_/g, " ");
  return friendlyTextReplacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), readable);
}

export function schoolFriendlyActionLabel(value: string): string {
  const replaced = friendlyActionReplacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value);
  return schoolFriendlyText(replaced);
}
