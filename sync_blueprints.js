const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const lines = rawBlueprint.split('\n');

let currentRole = null;
let currentSection = null;
const blueprintRoles = {};

for(let line of lines) {
  line = line.trim();
  const roleMatch = line.match(/^# \d+\. (.+) (Dashboard|Portal)/);
  if (roleMatch) {
    currentRole = roleMatch[1].trim();
    if (currentRole === 'Parent') currentRole = 'Parent Portal';
    if (currentRole === 'Student') currentRole = 'Student Portal';
    blueprintRoles[currentRole] = [];
    continue;
  }
  // also handle "# 24. Parent Portal" without Dashboard
  if (line.match(/^# \d+\. Parent Portal/)) {
    currentRole = 'Parent Portal';
    blueprintRoles[currentRole] = [];
    continue;
  }
  if (line.match(/^# \d+\. Student Portal/)) {
    currentRole = 'Student Portal';
    blueprintRoles[currentRole] = [];
    continue;
  }

  if (!currentRole) continue;

  if (line.toLowerCase().includes('sidebar items')) {
    currentSection = 'sidebar';
    continue;
  } else if (line.startsWith('## ') && !line.toLowerCase().includes('sidebar')) {
    currentSection = null;
  }

  if (currentSection === 'sidebar') {
    if (line.match(/^\d+\.\s+(.+)/)) {
      const itemMatch = line.match(/^\d+\.\s+(.+)/);
      blueprintRoles[currentRole].push(itemMatch[1].trim());
    }
  }
}

const mapping = {
  "Super Admin": "superadmin",
  "Principal": "principal",
  "Deputy Principal": "deputy-principal",
  "School Admin": "admin",
  "Dean of Academics": "dean-academics",
  "Exams Manager": "exams-manager",
  "HOD": "hod",
  "Teacher": "teacher",
  "Class Teacher / Grade Master": "class-teacher",
  "Accountant / Bursar": "accountant",
  "Secretary / Front Office": "secretary",
  "Admissions Officer": "admissions",
  "Discipline Master": "discipline-master",
  "Counsellor": "guidance-counselling",
  "Nurse / Sick Bay": "nurse",
  "Librarian": "librarian",
  "Storekeeper": "storekeeper",
  "Procurement Officer": "procurement-officer", 
  "Boarding Master": "boarding-master",
  "Security Officer": "security-officer",
  "Transport Manager": "transport-manager",
  "Laboratory Technician": "laboratory-technician",
  "ICT / Assets Officer": "ict-manager",
  "Parent Portal": "parent",
  "Student Portal": "student",
};

const iconMap = {
  'overview': 'LayoutGrid',
  'dashboard': 'LayoutGrid',
  'setup checklist': 'Settings',
  'school profile': 'Building2',
  'academic setup': 'GraduationCap',
  'classes & streams': 'Building2',
  'subjects & departments': 'BookOpenCheck',
  'staff & roles': 'Users',
  'students': 'Users',
  'attendance': 'CalendarDays',
  'attendance follow-up': 'CalendarDays',
  'academics': 'GraduationCap',
  'class academics': 'GraduationCap',
  'exams & report cards': 'FileSpreadsheet',
  'finance overview': 'CircleDollarSign',
  'discipline': 'ShieldAlert',
  'communication': 'MessageSquareText',
  'approvals': 'ClipboardList',
  'reports': 'FileSpreadsheet',
  'settings': 'Settings',
  'daily operations': 'CalendarDays',
  'staff attendance': 'CalendarDays',
  'student attendance': 'CalendarDays',
  'discipline cases': 'ShieldAlert',
  'academic monitoring': 'GraduationCap',
  'duty rosters': 'CalendarDays',
  'health & welfare': 'Stethoscope',
  'transport & boarding': 'BusFront',
  'parent meetings': 'Users',
  'events calendar': 'CalendarDays',
  'users & access': 'Users',
  'data imports': 'FileSpreadsheet',
  'system logs': 'ClipboardList',
  'sms/email logs': 'MessageSquareText',
  'term rollover': 'CalendarDays',
  'id card generation': 'ClipboardList',
  'document templates': 'FileSpreadsheet',
  'data quality': 'ShieldAlert',
  'integrations': 'Settings',
  'curriculum coverage': 'BookOpenCheck',
  'lesson plans': 'FileSpreadsheet',
  'lesson logs': 'ClipboardList',
  'teacher workload': 'Users',
  'department performance': 'GraduationCap',
  'academic interventions': 'ShieldAlert',
  'exam setup': 'Settings',
  'exam timetable': 'CalendarDays',
  'marks entry': 'GraduationCap',
  'moderation': 'ShieldAlert',
  'report cards': 'FileSpreadsheet',
  'transcripts': 'ClipboardList',
  'analysis': 'Activity',
  'department teachers': 'Users',
  'subject allocation': 'BookOpenCheck',
  'syllabus tracking': 'ClipboardList',
  'assessments': 'GraduationCap',
  'marks moderation': 'ShieldAlert',
  'resource requests': 'FileSpreadsheet',
  'my timetable': 'CalendarDays',
  'subjects & classes': 'BookOpenCheck',
  'assignments/homework': 'FileSpreadsheet',
  'student notes': 'ClipboardList',
  'messages': 'MessageSquareText',
  'my class': 'Users',
  'learner profiles': 'Users',
  'parent contacts': 'MessageSquareText',
  'report comments': 'MessageSquareText',
  'discipline follow-up': 'ShieldAlert',
  'welfare notes': 'FileSpreadsheet',
  'fee structures': 'CircleDollarSign',
  'invoices': 'FileSpreadsheet',
  'payments': 'CircleDollarSign',
  'receipts': 'ClipboardList',
  'm-pesa reconciliation': 'Activity',
  'arrears': 'ShieldAlert',
  'waivers & discounts': 'CircleDollarSign',
  'expenses': 'FileSpreadsheet',
  'reception queue': 'Users',
  'visitors': 'Users',
  'appointments': 'CalendarDays',
  'calls log': 'ClipboardList',
  'letters & documents': 'FileSpreadsheet',
  'parent messages': 'MessageSquareText',
  'student clearance': 'ShieldAlert',
  'applications': 'Users',
  'interviews': 'CalendarDays',
  'admissions': 'Users',
  'class placement': 'Building2',
  'documents': 'FileSpreadsheet',
  'parent linking': 'Users',
  'incident log': 'ClipboardList',
  'cases': 'ShieldAlert',
  'actions & sanctions': 'ShieldAlert',
  'parent summons': 'MessageSquareText',
  'counselling referrals': 'Users',
  'referrals': 'ClipboardList',
  'sessions': 'CalendarDays',
  'follow-ups': 'Activity',
  'parent engagement': 'MessageSquareText',
  'sick bay queue': 'Users',
  'visits': 'CalendarDays',
  'medicine inventory': 'Boxes',
  'dispensing log': 'ClipboardList',
  'parent notifications': 'MessageSquareText',
  'health reports': 'FileSpreadsheet',
  'books': 'Library',
  'issue book': 'ClipboardList',
  'return book': 'ClipboardList',
  'borrowers': 'Users',
  'overdue books': 'ShieldAlert',
  'fines/lost/damaged': 'CircleDollarSign',
  'items': 'Boxes',
  'stock in': 'ClipboardList',
  'stock issue': 'ClipboardList',
  'requests': 'ClipboardList',
  'low stock': 'ShieldAlert',
  'stocktake': 'Activity',
  'damaged/missing': 'ShieldAlert',
  'purchase requests': 'ClipboardList',
  'suppliers': 'Users',
  'quotations': 'FileSpreadsheet',
  'purchase orders': 'ClipboardList',
  'deliveries': 'BusFront',
  'invoices & payments': 'CircleDollarSign',
  'hostels': 'Building2',
  'rooms & beds': 'Building2',
  'allocation': 'ClipboardList',
  'boarding attendance': 'CalendarDays',
  'leave/exit': 'ShieldAlert',
  'incidents': 'ShieldAlert',
  'gate register': 'ClipboardList',
  'student exit passes': 'ShieldAlert',
  'staff movement': 'ClipboardList',
  'emergency protocols': 'ShieldAlert',
  'routes': 'BusFront',
  'vehicles': 'BusFront',
  'drivers': 'Users',
  'student transport list': 'Users',
  'trips': 'CalendarDays',
  'fuel & maintenance': 'Activity',
  'lab inventory': 'Boxes',
  'apparatus issue': 'ClipboardList',
  'chemicals': 'FlaskConical',
  'lab timetable': 'CalendarDays',
  'safety incidents': 'ShieldAlert',
  'maintenance': 'Settings',
  'assets': 'Boxes',
  'asset assignment': 'ClipboardList',
  'loans & returns': 'ClipboardList',
  'facilities issues': 'ShieldAlert',
  'fees': 'CircleDollarSign',
  'behavior': 'ShieldAlert',
  'health': 'Stethoscope',
  'downloads': 'FileSpreadsheet',
  'notifications': 'MessageSquareText',
  'assignments': 'FileSpreadsheet',
  'materials': 'Library',
  'library': 'Library',
  'notices & messages': 'MessageSquareText',
};

const getIcon = (label) => {
  const clean = label.toLowerCase();
  return iconMap[clean] || 'LayoutGrid';
};

const toId = (label) => {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

let codeStr = 'const schoolNavMap: Record<SchoolExperienceRole | PortalViewer, ExperienceNavItem[]> = {\n';

const allLabels = {};

for (const [bpRole, bpItems] of Object.entries(blueprintRoles)) {
  const feRole = mapping[bpRole];
  if (!feRole || bpRole === 'Super Admin') continue;

  codeStr += '  "' + feRole + '": [\n';
  
  for (const label of bpItems) {
    const id = toId(label);
    const icon = getIcon(label);
    codeStr += '    { id: "' + id + '", label: "' + label + '", href: toSchoolPath("' + id + '"), icon: ' + icon + ' },\n';
    allLabels[id] = label;
  }
  
  codeStr += '    ...supportSidebarItems,\n';
  codeStr += '  ],\n';
}
codeStr += '};\n\nconst roleToDashboardRole';

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// Also handle accountant/bursar and class-teacher/grade-master if needed
// Actually we can inject grade-master manually
codeStr = codeStr.replace('const roleToDashboardRole', '  "grade-master": [],\n  "bursar": []\n};\n\nschoolNavMap["grade-master"] = schoolNavMap["class-teacher"];\nschoolNavMap["bursar"] = schoolNavMap["accountant"];\n\nconst roleToDashboardRole');

const mapRegex = /const schoolNavMap: Record<SchoolExperienceRole(?: \| PortalViewer)?, ExperienceNavItem\[\]> = \{[\s\S]*?const roleToDashboardRole/;
if (!sd.match(mapRegex)) {
  console.error("Failed to match schoolNavMap regex!");
  process.exit(1);
}

sd = sd.replace(mapRegex, codeStr);

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

const labelRegex = /export const schoolSectionLabels: Record<string, string> = \{[\s\S]*?function buildSchoolProfile/;
if (!sd.match(labelRegex)) {
  console.error("Failed to match schoolSectionLabels regex!");
  process.exit(1);
}

sd = sd.replace(labelRegex, labelStr);

// ensure icons are imported
const uniqueIcons = [...new Set(Object.values(iconMap))];
let importIcons = uniqueIcons.join(', ');
// we should just add the ones we need
sd = sd.replace(/import \{[^}]+\} from ["']lucide-react["'];/, 'import { ' + importIcons + ' } from "lucide-react";');

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');
console.log("Updated school-data.ts with exact blueprint mapping!");
