const fs = require('fs');

let content = fs.readFileSync('apps/web/src/lib/routing/experience-routes.ts', 'utf-8');
const match = content.match(/export const SCHOOL_SECTIONS = \[([\s\S]*?)\] as const;/);

if (match) {
    const existingStr = match[1];
    const existing = existingStr.split(',').map(s => s.trim().replace(/\"/g, '').replace(/\'/g, '')).filter(s => s);
    const newItems = ['setup-checklist', 'school-profile', 'academic-setup', 'classes-streams', 'subjects-departments', 'staff-roles', 'students', 'attendance', 'academics', 'finance-overview', 'communication', 'daily-operations', 'staff-attendance', 'student-attendance', 'discipline-cases', 'academic-monitoring', 'duty-rosters', 'health-welfare', 'transport-boarding', 'parent-meetings', 'events-calendar', 'reports', 'users-access', 'data-imports', 'system-logs', 'sms-email-logs', 'term-rollover', 'id-card-generation', 'document-templates', 'data-quality', 'integrations', 'settings', 'curriculum-coverage', 'lesson-plans', 'lesson-logs', 'teacher-workload', 'department-performance', 'academic-interventions', 'exam-setup', 'exam-timetable', 'marks-entry', 'moderation', 'report-cards', 'transcripts', 'analysis', 'department-teachers', 'subject-allocation', 'syllabus-tracking', 'assessments', 'marks-moderation', 'resource-requests', 'my-timetable', 'subjects-classes', 'assignments-homework', 'student-notes', 'messages', 'my-class-register', 'academic-progress', 'discipline-welfare', 'health-fees', 'parent-communication', 'class-tasks', 'documents-requests', 'fee-structures', 'invoices', 'payments', 'receipts', 'mpesa-reconciliation', 'arrears', 'waivers-discounts', 'expenses', 'reception-queue', 'visitors', 'appointments', 'calls-log', 'letters-documents', 'parent-messages', 'student-clearance', 'enquiries-applications', 'interviews-assessments', 'verification-selection', 'clearance-enrolment', 'placements-transfers', 'parents-communication', 'tasks-followups', 'incidents-cases', 'conduct-profiles', 'investigations', 'actions-interventions', 'detention-corrective', 'class-monitoring', 'parents-counselling', 'templates-settings', 'referrals', 'sessions', 'follow-ups', 'welfare-notes', 'parent-engagement', 'sick-bay-queue', 'visits', 'medicine-inventory', 'dispensing-log', 'parent-notifications', 'health-reports', 'books', 'issue-book', 'return-book', 'borrowers', 'overdue-books', 'fines-damaged', 'items', 'stock-in', 'stock-issue', 'requests', 'low-stock', 'stocktake', 'damagedmissing', 'purchase-requests', 'suppliers', 'quotations', 'purchase-orders', 'deliveries', 'invoices-payments', 'hostels', 'rooms-beds', 'allocation', 'boarding-attendance', 'leave-exit', 'incidents', 'gate-register', 'student-exit-passes', 'staff-movement', 'emergency-protocols', 'routes', 'vehicles', 'drivers', 'student-transport-list', 'trips', 'fuel-maintenance', 'lab-inventory', 'apparatus-issue', 'chemicals', 'lab-timetable', 'safety-incidents', 'maintenance', 'assets', 'asset-assignment', 'loans-returns', 'facilities-issues', 'helpdesk', 'timetable', 'assignments', 'materials', 'library', 'notices-messages', 'fees', 'fees-statements', 'discipline-health', 'overview'];
    
    const combined = [...new Set([...existing, ...newItems])];
    
    const newArrayStr = 'export const SCHOOL_SECTIONS = [\n  "' + combined.join('",\n  "') + '"\n] as const;';
    
    content = content.replace(match[0], newArrayStr);
    fs.writeFileSync('apps/web/src/lib/routing/experience-routes.ts', content, 'utf-8');
    console.log('Added missing types to SCHOOL_SECTIONS.');
} else {
    console.log('Regex did not match.');
}
