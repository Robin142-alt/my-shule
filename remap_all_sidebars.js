const fs = require('fs');

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

const NavData = {
  'principal': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'setup-checklist', label: 'Setup Checklist', icon: 'Settings' },
    { id: 'school-profile', label: 'School Profile', icon: 'Building2' },
    { id: 'academic-setup', label: 'Academic Setup', icon: 'GraduationCap' },
    { id: 'classes-streams', label: 'Classes & Streams', icon: 'Building2' },
    { id: 'subjects-departments', label: 'Subjects & Departments', icon: 'BookOpenCheck' },
    { id: 'staff-roles', label: 'Staff & Roles', icon: 'Users' },
    { id: 'students', label: 'Students', icon: 'Users' },
    { id: 'attendance', label: 'Attendance', icon: 'CalendarDays' },
    { id: 'academics', label: 'Academics', icon: 'GraduationCap' },
    { id: 'finance-overview', label: 'Finance Overview', icon: 'CircleDollarSign' },
    { id: 'communication', label: 'Communication', icon: 'MessageSquareText' }
  ],
  'deputy-principal': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'daily-operations', label: 'Daily Operations', icon: 'CalendarDays' },
    { id: 'staff-attendance', label: 'Staff Attendance', icon: 'CalendarDays' },
    { id: 'student-attendance', label: 'Student Attendance', icon: 'CalendarDays' },
    { id: 'discipline-cases', label: 'Discipline Cases', icon: 'ShieldAlert' },
    { id: 'academic-monitoring', label: 'Academic Monitoring', icon: 'GraduationCap' },
    { id: 'duty-rosters', label: 'Duty Rosters', icon: 'CalendarDays' },
    { id: 'health-welfare', label: 'Health & Welfare', icon: 'Stethoscope' },
    { id: 'transport-boarding', label: 'Transport & Boarding', icon: 'BusFront' },
    { id: 'parent-meetings', label: 'Parent Meetings', icon: 'Users' },
    { id: 'events-calendar', label: 'Events Calendar', icon: 'CalendarDays' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'admin': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'users-access', label: 'Users & Access', icon: 'Users' },
    { id: 'data-imports', label: 'Data Imports', icon: 'FileSpreadsheet' },
    { id: 'system-logs', label: 'System Logs', icon: 'ClipboardList' },
    { id: 'sms-email-logs', label: 'SMS/Email Logs', icon: 'MessageSquareText' },
    { id: 'term-rollover', label: 'Term Rollover', icon: 'CalendarDays' },
    { id: 'id-card-generation', label: 'ID Card Generation', icon: 'ClipboardList' },
    { id: 'document-templates', label: 'Document Templates', icon: 'FileSpreadsheet' },
    { id: 'data-quality', label: 'Data Quality', icon: 'ShieldAlert' },
    { id: 'integrations', label: 'Integrations', icon: 'Settings' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ],
  'dean-academics': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'curriculum-coverage', label: 'Curriculum Coverage', icon: 'BookOpenCheck' },
    { id: 'lesson-plans', label: 'Lesson Plans', icon: 'FileSpreadsheet' },
    { id: 'lesson-logs', label: 'Lesson Logs', icon: 'ClipboardList' },
    { id: 'teacher-workload', label: 'Teacher Workload', icon: 'Users' },
    { id: 'department-performance', label: 'Department Performance', icon: 'GraduationCap' },
    { id: 'academic-interventions', label: 'Academic Interventions', icon: 'ShieldAlert' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'exams-manager': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'exam-setup', label: 'Exam Setup', icon: 'Settings' },
    { id: 'exam-timetable', label: 'Exam Timetable', icon: 'CalendarDays' },
    { id: 'marks-entry', label: 'Marks Entry', icon: 'GraduationCap' },
    { id: 'moderation', label: 'Moderation', icon: 'ShieldAlert' },
    { id: 'report-cards', label: 'Report Cards', icon: 'FileSpreadsheet' },
    { id: 'transcripts', label: 'Transcripts', icon: 'ClipboardList' },
    { id: 'analysis', label: 'Analysis', icon: 'Activity' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'hod': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'department-teachers', label: 'Department Teachers', icon: 'Users' },
    { id: 'subject-allocation', label: 'Subject Allocation', icon: 'BookOpenCheck' },
    { id: 'syllabus-tracking', label: 'Syllabus Tracking', icon: 'ClipboardList' },
    { id: 'assessments', label: 'Assessments', icon: 'GraduationCap' },
    { id: 'marks-moderation', label: 'Marks Moderation', icon: 'ShieldAlert' },
    { id: 'resource-requests', label: 'Resource Requests', icon: 'FileSpreadsheet' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'teacher': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'my-timetable', label: 'My Timetable', icon: 'CalendarDays' },
    { id: 'attendance', label: 'Attendance', icon: 'CalendarDays' },
    { id: 'subjects-classes', label: 'Subjects & Classes', icon: 'BookOpenCheck' },
    { id: 'lesson-plans', label: 'Lesson Plans', icon: 'FileSpreadsheet' },
    { id: 'lesson-logs', label: 'Lesson Logs', icon: 'ClipboardList' },
    { id: 'assignments-homework', label: 'Assignments/Homework', icon: 'FileSpreadsheet' },
    { id: 'marks-entry', label: 'Marks Entry', icon: 'GraduationCap' },
    { id: 'student-notes', label: 'Student Notes', icon: 'ClipboardList' },
    { id: 'resource-requests', label: 'Resource Requests', icon: 'FileSpreadsheet' },
    { id: 'messages', label: 'Messages', icon: 'MessageSquareText' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'class-teacher': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'my-class-register', label: 'My Class Register', icon: 'Users' },
    { id: 'attendance', label: 'Attendance', icon: 'CalendarDays' },
    { id: 'academic-progress', label: 'Academic Progress', icon: 'GraduationCap' },
    { id: 'discipline-welfare', label: 'Discipline & Welfare', icon: 'ShieldAlert' },
    { id: 'health-fees', label: 'Health & Fees', icon: 'CircleDollarSign' },
    { id: 'parent-communication', label: 'Parent Communication', icon: 'MessageSquareText' },
    { id: 'class-tasks', label: 'Class Tasks & Timetable', icon: 'CalendarDays' },
    { id: 'documents-requests', label: 'Documents & Requests', icon: 'FileSpreadsheet' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ],
  'bursar': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'fee-structures', label: 'Fee Structures', icon: 'CircleDollarSign' },
    { id: 'invoices', label: 'Invoices', icon: 'FileSpreadsheet' },
    { id: 'payments', label: 'Payments', icon: 'CircleDollarSign' },
    { id: 'receipts', label: 'Receipts', icon: 'ClipboardList' },
    { id: 'mpesa-reconciliation', label: 'M-Pesa Reconciliation', icon: 'Activity' },
    { id: 'arrears', label: 'Arrears', icon: 'ShieldAlert' },
    { id: 'waivers-discounts', label: 'Waivers & Discounts', icon: 'CircleDollarSign' },
    { id: 'expenses', label: 'Expenses', icon: 'FileSpreadsheet' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ],
  'secretary': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'reception-queue', label: 'Reception Queue', icon: 'Users' },
    { id: 'visitors', label: 'Visitors', icon: 'Users' },
    { id: 'appointments', label: 'Appointments', icon: 'CalendarDays' },
    { id: 'calls-log', label: 'Calls Log', icon: 'ClipboardList' },
    { id: 'letters-documents', label: 'Letters & Documents', icon: 'FileSpreadsheet' },
    { id: 'parent-messages', label: 'Parent Messages', icon: 'MessageSquareText' },
    { id: 'student-clearance', label: 'Student Clearance', icon: 'ShieldAlert' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'admissions': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'enquiries-applications', label: 'Enquiries & Applications', icon: 'Users' },
    { id: 'interviews-assessments', label: 'Interviews & Assessments', icon: 'CalendarDays' },
    { id: 'verification-selection', label: 'Verification & Selection', icon: 'ShieldAlert' },
    { id: 'clearance-enrolment', label: 'Clearance & Enrolment', icon: 'ClipboardList' },
    { id: 'placements-transfers', label: 'Placements & Transfers', icon: 'Building2' },
    { id: 'parents-communication', label: 'Parents & Communication', icon: 'MessageSquareText' },
    { id: 'data-imports', label: 'Data Imports & Templates', icon: 'FileSpreadsheet' },
    { id: 'tasks-followups', label: 'Tasks & Follow-ups', icon: 'Activity' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'discipline-master': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'incidents-cases', label: 'Incidents & Cases', icon: 'ShieldAlert' },
    { id: 'conduct-profiles', label: 'Conduct Profiles', icon: 'Users' },
    { id: 'investigations', label: 'Investigations', icon: 'Activity' },
    { id: 'actions-interventions', label: 'Actions & Interventions', icon: 'ShieldAlert' },
    { id: 'detention-corrective', label: 'Detention & Corrective', icon: 'CalendarDays' },
    { id: 'class-monitoring', label: 'Class Monitoring', icon: 'Building2' },
    { id: 'parents-counselling', label: 'Parents & Counselling', icon: 'MessageSquareText' },
    { id: 'templates-settings', label: 'Templates & Settings', icon: 'Settings' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'guidance-counselling': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'referrals', label: 'Referrals', icon: 'ClipboardList' },
    { id: 'sessions', label: 'Sessions', icon: 'CalendarDays' },
    { id: 'follow-ups', label: 'Follow-ups', icon: 'Activity' },
    { id: 'welfare-notes', label: 'Welfare Notes', icon: 'FileSpreadsheet' },
    { id: 'parent-engagement', label: 'Parent Engagement', icon: 'MessageSquareText' },
    { id: 'appointments', label: 'Appointments', icon: 'CalendarDays' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'nurse': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'sick-bay-queue', label: 'Sick Bay Queue', icon: 'Users' },
    { id: 'visits', label: 'Visits', icon: 'CalendarDays' },
    { id: 'medicine-inventory', label: 'Medicine Inventory', icon: 'Boxes' },
    { id: 'dispensing-log', label: 'Dispensing Log', icon: 'ClipboardList' },
    { id: 'parent-notifications', label: 'Parent Notifications', icon: 'MessageSquareText' },
    { id: 'appointments', label: 'Appointments', icon: 'CalendarDays' },
    { id: 'health-reports', label: 'Health Reports', icon: 'FileSpreadsheet' }
  ],
  'librarian': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'books', label: 'Books', icon: 'Library' },
    { id: 'issue-book', label: 'Issue Book', icon: 'ClipboardList' },
    { id: 'return-book', label: 'Return Book', icon: 'ClipboardList' },
    { id: 'borrowers', label: 'Borrowers', icon: 'Users' },
    { id: 'overdue-books', label: 'Overdue Books', icon: 'ShieldAlert' },
    { id: 'fines-damaged', label: 'Fines/Lost/Damaged', icon: 'CircleDollarSign' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'storekeeper': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'items', label: 'Items', icon: 'Boxes' },
    { id: 'stock-in', label: 'Stock In', icon: 'ClipboardList' },
    { id: 'stock-issue', label: 'Stock Issue', icon: 'ClipboardList' },
    { id: 'requests', label: 'Requests', icon: 'ClipboardList' },
    { id: 'low-stock', label: 'Low Stock', icon: 'ShieldAlert' },
    { id: 'stocktake', label: 'Stocktake', icon: 'Activity' },
    { id: 'damagedmissing', label: 'Damaged/Missing', icon: 'ShieldAlert' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'procurement-officer': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'purchase-requests', label: 'Purchase Requests', icon: 'ClipboardList' },
    { id: 'suppliers', label: 'Suppliers', icon: 'Users' },
    { id: 'quotations', label: 'Quotations', icon: 'FileSpreadsheet' },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: 'ClipboardList' },
    { id: 'deliveries', label: 'Deliveries', icon: 'BusFront' },
    { id: 'invoices-payments', label: 'Invoices & Payments', icon: 'CircleDollarSign' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'boarding-master': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'hostels', label: 'Hostels', icon: 'Building2' },
    { id: 'rooms-beds', label: 'Rooms & Beds', icon: 'Building2' },
    { id: 'allocation', label: 'Allocation', icon: 'ClipboardList' },
    { id: 'boarding-attendance', label: 'Boarding Attendance', icon: 'CalendarDays' },
    { id: 'leave-exit', label: 'Leave/Exit', icon: 'ShieldAlert' },
    { id: 'incidents', label: 'Incidents', icon: 'ShieldAlert' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'security-officer': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'gate-register', label: 'Gate Register', icon: 'ClipboardList' },
    { id: 'visitors', label: 'Visitors', icon: 'Users' },
    { id: 'student-exit-passes', label: 'Student Exit Passes', icon: 'ShieldAlert' },
    { id: 'staff-movement', label: 'Staff Movement', icon: 'ClipboardList' },
    { id: 'incidents', label: 'Incidents', icon: 'ShieldAlert' },
    { id: 'emergency-protocols', label: 'Emergency Protocols', icon: 'ShieldAlert' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'transport-manager': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'routes', label: 'Routes', icon: 'BusFront' },
    { id: 'vehicles', label: 'Vehicles', icon: 'BusFront' },
    { id: 'drivers', label: 'Drivers', icon: 'Users' },
    { id: 'student-transport-list', label: 'Student Transport List', icon: 'Users' },
    { id: 'trips', label: 'Trips', icon: 'CalendarDays' },
    { id: 'fuel-maintenance', label: 'Fuel & Maintenance', icon: 'Activity' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'laboratory-technician': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'lab-inventory', label: 'Lab Inventory', icon: 'Boxes' },
    { id: 'apparatus-issue', label: 'Apparatus Issue', icon: 'ClipboardList' },
    { id: 'chemicals', label: 'Chemicals', icon: 'FlaskConical' },
    { id: 'lab-timetable', label: 'Lab Timetable', icon: 'CalendarDays' },
    { id: 'safety-incidents', label: 'Safety Incidents', icon: 'ShieldAlert' },
    { id: 'maintenance', label: 'Maintenance', icon: 'Settings' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'ict-manager': [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'assets', label: 'Assets', icon: 'Boxes' },
    { id: 'asset-assignment', label: 'Asset Assignment', icon: 'ClipboardList' },
    { id: 'maintenance', label: 'Maintenance', icon: 'Settings' },
    { id: 'loans-returns', label: 'Loans & Returns', icon: 'ClipboardList' },
    { id: 'facilities-issues', label: 'Facilities Issues', icon: 'ShieldAlert' },
    { id: 'helpdesk', label: 'Helpdesk Tickets', icon: 'MessageSquareText' },
    { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet' }
  ],
  'student': [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutGrid' },
    { id: 'timetable', label: 'Timetable', icon: 'CalendarDays' },
    { id: 'assignments', label: 'Assignments', icon: 'FileSpreadsheet' },
    { id: 'materials', label: 'Materials', icon: 'Library' },
    { id: 'library', label: 'Library', icon: 'Library' },
    { id: 'notices-messages', label: 'Notices & Messages', icon: 'MessageSquareText' },
    { id: 'fees', label: 'Fees', icon: 'CircleDollarSign' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ],
  'parent': [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutGrid' },
    { id: 'attendance', label: 'Attendance', icon: 'CalendarDays' },
    { id: 'academics', label: 'Academics', icon: 'GraduationCap' },
    { id: 'fees-statements', label: 'Fees & Statements', icon: 'CircleDollarSign' },
    { id: 'discipline-health', label: 'Discipline & Health', icon: 'ShieldAlert' },
    { id: 'messages', label: 'Messages', icon: 'MessageSquareText' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ]
};

NavData['grade-master'] = NavData['class-teacher'];
NavData['accountant'] = NavData['bursar'];

let codeStr = 'const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem[]> = {\n';
for (const [role, items] of Object.entries(NavData)) {
    codeStr += '  "' + role + '": [\n';
    for (const item of items) {
        codeStr += '    { id: "' + item.id + '", label: "' + item.label + '", href: toSchoolPath("' + item.id + '"), icon: ' + item.icon + ' },\n';
    }
    codeStr += '    ...supportSidebarItems,\n';
    codeStr += '  ],\n';
}
codeStr += '};\n\nconst roleToDashboardRole';

sd = sd.replace(/const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem\[\]> = \{[\s\S]*?const roleToDashboardRole/, codeStr);

const allLabels = {};
for (const [role, items] of Object.entries(NavData)) {
    for (const item of items) {
        allLabels[item.id] = item.label;
    }
}

let labelStr = 'export const schoolSectionLabels: Record<string, string> = {\n';
for (const [id, label] of Object.entries(allLabels)) {
    labelStr += '  "' + id + '": "' + label + '",\n';
}
labelStr += '  "setup-checklist": "Setup Checklist",\n';
labelStr += '  "principal-overview": "Overview",\n';
labelStr += '  "finance-overview": "Finance Overview",\n';
labelStr += '  "support-new-ticket": "New Ticket",\n';
labelStr += '  "support-my-tickets": "My Tickets",\n';
labelStr += '  "support-knowledge-base": "Knowledge Base",\n';
labelStr += '  "support-system-status": "System Status",\n';
labelStr += '  settings: "Settings",\n';
labelStr += '};\n\nfunction buildSchoolProfile';

sd = sd.replace(/export const schoolSectionLabels: Record<string, string> = \{[\s\S]*?function buildSchoolProfile/, labelStr);

if (!sd.includes('Activity,')) {
    sd = sd.replace(/import \{/, 'import {\n  Activity,');
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');
console.log('Successfully remapped all role sidebars in school-data.ts!');
