# Expected Backend API Endpoints Analysis Report

This report lists all expected backend API endpoints extracted programmatically from the React frontend codebase (`apps/web/src`).

## Summary of Findings

- **Total Raw References Found**: 1287
- **Unique Endpoints Identified**: 871

## Unique Endpoints List

| Method | Normalized Backend Path | Parameters | Frontend Usages (Count) |
|---|---|---|---|
| **GET** | `/${apiBase}/dashboard` | apiBase (path) | 2 |
| **POST** | `/${apiBase}/records` | apiBase (path) | 1 |
| **PATCH** | `/${apiBase}/records/${encodeURIComponent(record.id)}/status` | apiBase (path) | 1 |
| **PATCH** | `/${apiBase}/records/${record.id}/status` | apiBase (path) | 1 |
| **POST** | `/${baseUrl}/auth/email-verification/request` | baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/auth/email-verification/verify` | baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/auth/invitations/accept` | baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/auth/parent/otp/request` | baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/auth/parent/otp/verify` | baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/auth/password-recovery/request` | baseUrl (path) | 2 |
| **POST** | `/${baseUrl}/auth/password-recovery/reset` | baseUrl (path) | 2 |
| **GET** | `/${baseUrl}/dashboard/layout` | ${qs}, baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/support/public/status-subscriptions` | baseUrl (path) | 1 |
| **POST** | `/${baseUrl}/support/public/status-subscriptions/unsubscribe` | baseUrl (path) | 1 |
| **GET** | `/${baseUrl}/support/public/system-status` | baseUrl (path) | 2 |
| **POST** | `/academic/communications` | None | 3 |
| **POST** | `/academic/dean/action` | None | 1 |
| **POST** | `/academic/dean/lock-batch` | None | 1 |
| **POST** | `/academic/exams-manager/export-marks` | None | 1 |
| **POST** | `/academic/exams-manager/import-marks` | None | 1 |
| **POST** | `/academic/exams-manager/zeraki-sync` | None | 1 |
| **POST** | `/academic/grade-master/comment` | None | 1 |
| **POST** | `/academic/grade-master/compile` | None | 1 |
| **POST** | `/academic/hod/department-meetings` | None | 1 |
| **POST** | `/academic/hod/requests` | None | 3 |
| **POST** | `/academic/hod/subject-allocation` | None | 1 |
| **POST** | `/academic/marks/enter` | None | 1 |
| **GET** | `/academics/academic-terms` | None | 3 |
| **GET** | `/academics/academic-years` | None | 5 |
| **POST** | `/academics/assignments` | None | 1 |
| **GET** | `/academics/attendance-settings` | None | 2 |
| **POST** | `/academics/attendance-settings` | None | 2 |
| **DELETE** | `/academics/attendance-settings/${id}` | id (path) | 1 |
| **GET** | `/academics/class-sections` | None | 4 |
| **POST** | `/academics/class-sections` | None | 2 |
| **DELETE** | `/academics/class-sections/${id}` | id (path) | 1 |
| **POST** | `/academics/class-streams` | None | 1 |
| **GET** | `/academics/class-teachers` | None | 1 |
| **POST** | `/academics/class-teachers` | None | 1 |
| **DELETE** | `/academics/class-teachers/${id}` | id (path) | 1 |
| **GET** | `/academics/dean-dataset` | None | 1 |
| **GET** | `/academics/departments` | None | 1 |
| **POST** | `/academics/departments` | None | 1 |
| **DELETE** | `/academics/departments/${id}` | id (path) | 1 |
| **GET** | `/academics/grading-systems` | None | 2 |
| **POST** | `/academics/grading-systems` | None | 2 |
| **DELETE** | `/academics/grading-systems/${id}` | id (path) | 1 |
| **POST** | `/academics/lesson-logs` | None | 1 |
| **GET** | `/academics/my-assignments` | None | 4 |
| **GET** | `/academics/my-lesson-logs` | date | 2 |
| **GET** | `/academics/report-card-settings` | None | 1 |
| **POST** | `/academics/report-card-settings` | None | 1 |
| **DELETE** | `/academics/report-card-settings/${id}` | id (path) | 1 |
| **GET** | `/academics/subjects` | None | 3 |
| **POST** | `/academics/subjects` | None | 4 |
| **GET** | `/academics/subjects${tenantId ` |   | 1 |
| **DELETE** | `/academics/subjects/${id}` | id (path) | 1 |
| **GET** | `/academics/summary` | None | 3 |
| **GET** | `/academics/teacher-assignments` | None | 4 |
| **POST** | `/academics/teacher-assignments` | None | 2 |
| **POST** | `/academics/terms` | None | 4 |
| **GET** | `/academics/terms${tenantId ` |   | 1 |
| **POST** | `/academics/years` | None | 2 |
| **DELETE** | `/academics/years/${id}` | id (path) | 1 |
| **GET** | `/admin-command/accountant/expenses` | None | 1 |
| **GET** | `/admin-command/admin/imports` | None | 1 |
| **GET** | `/admin-command/admin/students` | None | 1 |
| **GET** | `/admin-command/admissions/admissions` | None | 2 |
| **POST** | `/admin-command/admissions/admissions/${id}/admit` | id (path) | 1 |
| **POST** | `/admin-command/admissions/admissions/${id}/letter` | id (path) | 1 |
| **GET** | `/admin-command/admissions/applicant-profiles` | None | 1 |
| **GET** | `/admin-command/admissions/applications` | None | 3 |
| **POST** | `/admin-command/admissions/applications` | None | 1 |
| **POST** | `/admin-command/admissions/applications/${id}/status` | id (path) | 1 |
| **GET** | `/admin-command/admissions/appointments` | None | 1 |
| **GET** | `/admin-command/admissions/class-placement` | None | 2 |
| **POST** | `/admin-command/admissions/class-placement` | None | 1 |
| **GET** | `/admin-command/admissions/communication` | None | 1 |
| **GET** | `/admin-command/admissions/dashboard` | None | 1 |
| **GET** | `/admin-command/admissions/documents` | None | 3 |
| **POST** | `/admin-command/admissions/documents/${id}/verify` | id (path) | 1 |
| **POST** | `/admin-command/admissions/documents/request` | None | 1 |
| **GET** | `/admin-command/admissions/enquiries` | None | 1 |
| **GET** | `/admin-command/admissions/fee-clearance` | None | 1 |
| **GET** | `/admin-command/admissions/imports` | None | 1 |
| **GET** | `/admin-command/admissions/interviews` | None | 3 |
| **POST** | `/admin-command/admissions/interviews` | None | 1 |
| **POST** | `/admin-command/admissions/interviews/${id}/outcome` | id (path) | 1 |
| **GET** | `/admin-command/admissions/overview` | None | 3 |
| **GET** | `/admin-command/admissions/parent-linking` | None | 2 |
| **POST** | `/admin-command/admissions/parent-linking` | None | 1 |
| **POST** | `/admin-command/admissions/parent-linking/${id}/invite` | id (path) | 1 |
| **GET** | `/admin-command/admissions/parents` | None | 1 |
| **GET** | `/admin-command/admissions/placement` | None | 1 |
| **GET** | `/admin-command/admissions/reports` | None | 3 |
| **POST** | `/admin-command/admissions/reports/generate` | None | 1 |
| **GET** | `/admin-command/admissions/selection` | None | 1 |
| **GET** | `/admin-command/admissions/tasks` | None | 1 |
| **GET** | `/admin-command/admissions/templates` | None | 1 |
| **GET** | `/admin-command/admissions/transfers` | None | 1 |
| **POST** | `/admin-command/attendance/absences` | None | 1 |
| **GET** | `/admin-command/boarding-master/allocation` | None | 2 |
| **POST** | `/admin-command/boarding-master/allocation` | None | 1 |
| **POST** | `/admin-command/boarding-master/allocation/${id}/deallocate` | id (path) | 1 |
| **GET** | `/admin-command/boarding-master/boarding-attendance` | None | 2 |
| **POST** | `/admin-command/boarding-master/boarding-attendance` | None | 1 |
| **GET** | `/admin-command/boarding-master/hostels` | None | 2 |
| **POST** | `/admin-command/boarding-master/hostels` | None | 1 |
| **PUT** | `/admin-command/boarding-master/hostels/${id}` | id (path) | 1 |
| **GET** | `/admin-command/boarding-master/incidents` | None | 2 |
| **POST** | `/admin-command/boarding-master/incidents` | None | 1 |
| **POST** | `/admin-command/boarding-master/incidents/${id}/escalate` | id (path) | 1 |
| **POST** | `/admin-command/boarding-master/incidents/${id}/resolve` | id (path) | 1 |
| **GET** | `/admin-command/boarding-master/leave-exit` | None | 2 |
| **POST** | `/admin-command/boarding-master/leave-exit` | None | 1 |
| **POST** | `/admin-command/boarding-master/leave-exit/${id}/approve` | id (path) | 1 |
| **POST** | `/admin-command/boarding-master/leave-exit/${id}/reject` | id (path) | 1 |
| **GET** | `/admin-command/boarding-master/overview` | None | 2 |
| **GET** | `/admin-command/boarding-master/reports` | None | 2 |
| **POST** | `/admin-command/boarding-master/reports/generate` | None | 1 |
| **GET** | `/admin-command/boarding-master/rooms-beds` | None | 2 |
| **POST** | `/admin-command/boarding-master/rooms-beds` | None | 1 |
| **POST** | `/admin-command/boarding-master/rooms-beds/${id}/status` | id (path) | 1 |
| **POST** | `/admin-command/boarding/assign-bed` | None | 1 |
| **POST** | `/admin-command/boarding/incidents` | None | 1 |
| **POST** | `/admin-command/boarding/roll-call` | None | 1 |
| **GET** | `/admin-command/class-teacher/attendance-follow-up` | None | 2 |
| **POST** | `/admin-command/class-teacher/attendance-follow-up/${studentId}/notify` | studentId (path) | 1 |
| **POST** | `/admin-command/class-teacher/attendance-follow-up/${studentId}/resolve` | studentId (path) | 1 |
| **GET** | `/admin-command/class-teacher/class-academics` | None | 2 |
| **GET** | `/admin-command/class-teacher/discipline-follow-up` | None | 2 |
| **POST** | `/admin-command/class-teacher/discipline-follow-up/${incidentId}/escalate` | incidentId (path) | 1 |
| **POST** | `/admin-command/class-teacher/discipline-follow-up/${incidentId}/follow-up` | incidentId (path) | 1 |
| **GET** | `/admin-command/class-teacher/learner-profiles` | None | 2 |
| **POST** | `/admin-command/class-teacher/learner-profiles/${studentId}/note` | studentId (path) | 1 |
| **GET** | `/admin-command/class-teacher/my-class` | None | 2 |
| **GET** | `/admin-command/class-teacher/overview` | None | 2 |
| **GET** | `/admin-command/class-teacher/parent-contacts` | None | 2 |
| **POST** | `/admin-command/class-teacher/parent-contacts/${parentId}/message` | parentId (path) | 1 |
| **GET** | `/admin-command/class-teacher/report-comments` | None | 2 |
| **POST** | `/admin-command/class-teacher/report-comments/${studentId}` | studentId (path) | 1 |
| **POST** | `/admin-command/class-teacher/report-comments/submit-all` | None | 1 |
| **GET** | `/admin-command/class-teacher/reports` | None | 2 |
| **POST** | `/admin-command/class-teacher/reports/generate` | None | 1 |
| **GET** | `/admin-command/class-teacher/welfare-notes` | None | 2 |
| **POST** | `/admin-command/class-teacher/welfare-notes` | None | 1 |
| **POST** | `/admin-command/class-teacher/welfare-notes/${noteId}/escalate` | noteId (path) | 1 |
| **POST** | `/admin-command/clinic/visit` | None | 1 |
| **POST** | `/admin-command/communication-broadcasts` | None | 1 |
| **GET** | `/admin-command/communication-templates` | None | 1 |
| **POST** | `/admin-command/communication-templates` | None | 1 |
| **DELETE** | `/admin-command/communication-templates/${id}` | id (path) | 1 |
| **GET** | `/admin-command/dean-academics/academic-interventions` | None | 2 |
| **GET** | `/admin-command/dean-academics/assessments` | None | 2 |
| **GET** | `/admin-command/dean-academics/curriculum-coverage` | None | 2 |
| **GET** | `/admin-command/dean-academics/department-performance` | None | 2 |
| **GET** | `/admin-command/dean-academics/lesson-logs` | None | 2 |
| **GET** | `/admin-command/dean-academics/lesson-plans` | None | 2 |
| **GET** | `/admin-command/dean-academics/overview` | None | 2 |
| **GET** | `/admin-command/dean-academics/reports` | None | 2 |
| **GET** | `/admin-command/dean-academics/teacher-workload` | None | 2 |
| **GET** | `/admin-command/deputy/academics` | None | 2 |
| **POST** | `/admin-command/deputy/academics/${id}/message-hod` | id (path) | 2 |
| **POST** | `/admin-command/deputy/academics/intervention` | None | 1 |
| **GET** | `/admin-command/deputy/approvals` | None | 2 |
| **POST** | `/admin-command/deputy/approvals/${id}/action` | id (path) | 1 |
| **GET** | `/admin-command/deputy/attendance` | None | 2 |
| **POST** | `/admin-command/deputy/attendance/${attendanceId}/notify` | attendanceId (path) | 1 |
| **POST** | `/admin-command/deputy/attendance/follow-up` | None | 1 |
| **GET** | `/admin-command/deputy/classes` | None | 2 |
| **POST** | `/admin-command/deputy/classes/streams` | None | 1 |
| **GET** | `/admin-command/deputy/communication` | None | 1 |
| **GET** | `/admin-command/deputy/daily-operations` | None | 2 |
| **POST** | `/admin-command/deputy/daily-operations` | None | 1 |
| **GET** | `/admin-command/deputy/discipline` | None | 2 |
| **POST** | `/admin-command/deputy/discipline` | None | 1 |
| **POST** | `/admin-command/deputy/discipline/${id}/escalate` | id (path) | 1 |
| **GET** | `/admin-command/deputy/exams` | None | 2 |
| **POST** | `/admin-command/deputy/exams/${id}/flag-delay` | id (path) | 1 |
| **GET** | `/admin-command/deputy/overview` | None | 2 |
| **GET** | `/admin-command/deputy/reports` | None | 2 |
| **POST** | `/admin-command/deputy/reports/generate` | None | 1 |
| **GET** | `/admin-command/deputy/staff` | None | 2 |
| **GET** | `/admin-command/deputy/staff-duty` | None | 2 |
| **POST** | `/admin-command/deputy/staff-duty/${id}/request-report` | id (path) | 2 |
| **POST** | `/admin-command/deputy/staff-duty/roster` | None | 1 |
| **POST** | `/admin-command/deputy/staff/assign-role` | None | 1 |
| **GET** | `/admin-command/deputy/teaching` | None | 1 |
| **POST** | `/admin-command/deputy/teaching/${id}/log-lesson` | id (path) | 1 |
| **POST** | `/admin-command/deputy/teaching/${id}/mark-attendance` | id (path) | 1 |
| **GET** | `/admin-command/deputy/timetable` | None | 2 |
| **POST** | `/admin-command/deputy/timetable/${id}/assign` | id (path) | 2 |
| **POST** | `/admin-command/deputy/timetable/auto-assign` | None | 1 |
| **GET** | `/admin-command/deputy/welfare` | None | 2 |
| **POST** | `/admin-command/deputy/welfare` | None | 2 |
| **POST** | `/admin-command/deputy/welfare/${id}/open` | id (path) | 1 |
| **POST** | `/admin-command/discipline/incidents` | None | 1 |
| **GET** | `/admin-command/exams-manager/analysis` | None | 2 |
| **GET** | `/admin-command/exams-manager/exam-setup` | None | 2 |
| **POST** | `/admin-command/exams-manager/exam-setup` | None | 1 |
| **GET** | `/admin-command/exams-manager/exam-timetable` | None | 2 |
| **POST** | `/admin-command/exams-manager/exam-timetable` | None | 1 |
| **GET** | `/admin-command/exams-manager/marks-entry` | None | 2 |
| **POST** | `/admin-command/exams-manager/marks-entry` | None | 1 |
| **POST** | `/admin-command/exams-manager/marks-entry/${examId}/lock` | examId (path) | 1 |
| **GET** | `/admin-command/exams-manager/moderation` | None | 2 |
| **POST** | `/admin-command/exams-manager/moderation/${id}/approve` | id (path) | 1 |
| **POST** | `/admin-command/exams-manager/moderation/${id}/reject` | id (path) | 1 |
| **GET** | `/admin-command/exams-manager/overview` | None | 2 |
| **GET** | `/admin-command/exams-manager/publishing` | None | 2 |
| **POST** | `/admin-command/exams-manager/publishing/${examId}/publish` | examId (path) | 1 |
| **POST** | `/admin-command/exams-manager/publishing/${examId}/unpublish` | examId (path) | 1 |
| **GET** | `/admin-command/exams-manager/report-cards` | None | 2 |
| **POST** | `/admin-command/exams-manager/report-cards/${examId}/generate` | examId (path) | 1 |
| **GET** | `/admin-command/exams-manager/reports` | None | 2 |
| **POST** | `/admin-command/exams-manager/reports/generate` | None | 1 |
| **GET** | `/admin-command/exams/academic-setup-approval` | None | 1 |
| **POST** | `/admin-command/exams/cycles` | None | 1 |
| **GET** | `/admin-command/exams/readiness` | None | 1 |
| **POST** | `/admin-command/frontoffice/appointments` | None | 1 |
| **POST** | `/admin-command/frontoffice/dispatch` | None | 10 |
| **POST** | `/admin-command/frontoffice/mail` | None | 1 |
| **POST** | `/admin-command/frontoffice/visitors` | None | 1 |
| **GET** | `/admin-command/guidance-counselling/follow-ups` | None | 2 |
| **POST** | `/admin-command/guidance-counselling/follow-ups` | None | 1 |
| **POST** | `/admin-command/guidance-counselling/follow-ups/${id}/done` | id (path) | 1 |
| **GET** | `/admin-command/guidance-counselling/overview` | None | 2 |
| **GET** | `/admin-command/guidance-counselling/parent-engagement` | None | 2 |
| **POST** | `/admin-command/guidance-counselling/parent-engagement` | None | 1 |
| **POST** | `/admin-command/guidance-counselling/parent-engagement/${id}/notify` | id (path) | 1 |
| **GET** | `/admin-command/guidance-counselling/referrals` | None | 2 |
| **POST** | `/admin-command/guidance-counselling/referrals` | None | 1 |
| **POST** | `/admin-command/guidance-counselling/referrals/${id}/status` | id (path) | 1 |
| **GET** | `/admin-command/guidance-counselling/reports` | None | 2 |
| **POST** | `/admin-command/guidance-counselling/reports/generate` | None | 1 |
| **GET** | `/admin-command/guidance-counselling/sessions` | None | 2 |
| **POST** | `/admin-command/guidance-counselling/sessions` | None | 1 |
| **POST** | `/admin-command/guidance-counselling/sessions/${id}/complete` | id (path) | 1 |
| **GET** | `/admin-command/guidance-counselling/welfare-notes` | None | 2 |
| **POST** | `/admin-command/guidance-counselling/welfare-notes` | None | 1 |
| **POST** | `/admin-command/guidance-counselling/welfare-notes/${id}/flag` | id (path) | 1 |
| **GET** | `/admin-command/hod/coverage-review` | None | 2 |
| **GET** | `/admin-command/hod/department-overview` | None | 1 |
| **GET** | `/admin-command/hod/department-teachers` | None | 2 |
| **GET** | `/admin-command/hod/lesson-plans` | None | 2 |
| **GET** | `/admin-command/hod/marks-moderation` | None | 2 |
| **GET** | `/admin-command/hod/overview` | None | 2 |
| **GET** | `/admin-command/hod/reports` | None | 2 |
| **GET** | `/admin-command/hod/resource-requests` | None | 2 |
| **GET** | `/admin-command/hod/review-queue` | None | 1 |
| **GET** | `/admin-command/hod/subject-allocation` | None | 2 |
| **GET** | `/admin-command/ict-manager/asset-assignment` | None | 2 |
| **POST** | `/admin-command/ict-manager/asset-assignment` | None | 1 |
| **POST** | `/admin-command/ict-manager/asset-assignment/${id}/revoke` | id (path) | 1 |
| **GET** | `/admin-command/ict-manager/assets` | None | 2 |
| **POST** | `/admin-command/ict-manager/assets` | None | 1 |
| **GET** | `/admin-command/ict-manager/facilities-issues` | None | 2 |
| **POST** | `/admin-command/ict-manager/facilities-issues` | None | 1 |
| **POST** | `/admin-command/ict-manager/facilities-issues/${id}/resolve` | id (path) | 1 |
| **GET** | `/admin-command/ict-manager/loans-returns` | None | 2 |
| **POST** | `/admin-command/ict-manager/loans-returns` | None | 1 |
| **POST** | `/admin-command/ict-manager/loans-returns/${id}/return` | id (path) | 1 |
| **GET** | `/admin-command/ict-manager/maintenance` | None | 2 |
| **POST** | `/admin-command/ict-manager/maintenance` | None | 1 |
| **POST** | `/admin-command/ict-manager/maintenance/${id}/complete` | id (path) | 1 |
| **GET** | `/admin-command/ict-manager/overview` | None | 2 |
| **GET** | `/admin-command/ict-manager/reports` | None | 2 |
| **POST** | `/admin-command/ict-manager/reports/generate` | None | 1 |
| **GET** | `/admin-command/laboratory-technician/apparatus-issue` | None | 2 |
| **POST** | `/admin-command/laboratory-technician/apparatus-issue` | None | 1 |
| **POST** | `/admin-command/laboratory-technician/apparatus-issue/${id}/return` | id (path) | 1 |
| **GET** | `/admin-command/laboratory-technician/chemicals` | None | 2 |
| **POST** | `/admin-command/laboratory-technician/chemicals` | None | 1 |
| **POST** | `/admin-command/laboratory-technician/chemicals/${id}/dispose` | id (path) | 1 |
| **GET** | `/admin-command/laboratory-technician/lab-inventory` | None | 2 |
| **POST** | `/admin-command/laboratory-technician/lab-inventory` | None | 1 |
| **GET** | `/admin-command/laboratory-technician/lab-timetable` | None | 2 |
| **POST** | `/admin-command/laboratory-technician/lab-timetable` | None | 1 |
| **GET** | `/admin-command/laboratory-technician/overview` | None | 2 |
| **GET** | `/admin-command/laboratory-technician/reports` | None | 2 |
| **POST** | `/admin-command/laboratory-technician/reports/generate` | None | 1 |
| **GET** | `/admin-command/laboratory-technician/safety-incidents` | None | 2 |
| **POST** | `/admin-command/laboratory-technician/safety-incidents` | None | 1 |
| **POST** | `/admin-command/laboratory-technician/safety-incidents/${id}/resolve` | id (path) | 1 |
| **GET** | `/admin-command/librarian/books` | None | 2 |
| **POST** | `/admin-command/librarian/books` | None | 1 |
| **DELETE** | `/admin-command/librarian/books/${bookId}` | bookId (path) | 1 |
| **GET** | `/admin-command/librarian/borrowers` | None | 2 |
| **GET** | `/admin-command/librarian/fines-lost-damaged` | None | 2 |
| **POST** | `/admin-command/librarian/fines-lost-damaged` | None | 1 |
| **POST** | `/admin-command/librarian/fines-lost-damaged/${fineId}/mark-paid` | fineId (path) | 1 |
| **POST** | `/admin-command/librarian/fines-lost-damaged/${fineId}/waive` | fineId (path) | 1 |
| **GET** | `/admin-command/librarian/issue-book` | None | 2 |
| **POST** | `/admin-command/librarian/issue-book` | None | 1 |
| **GET** | `/admin-command/librarian/overdue-books` | None | 2 |
| **POST** | `/admin-command/librarian/overdue-books/${borrowerId}/remind` | borrowerId (path) | 1 |
| **GET** | `/admin-command/librarian/overview` | None | 2 |
| **GET** | `/admin-command/librarian/reports` | None | 2 |
| **POST** | `/admin-command/librarian/reports/generate` | None | 1 |
| **GET** | `/admin-command/librarian/return-book` | None | 2 |
| **POST** | `/admin-command/librarian/return-book` | None | 1 |
| **POST** | `/admin-command/library/add` | None | 1 |
| **POST** | `/admin-command/library/issue` | None | 1 |
| **POST** | `/admin-command/library/return` | None | 1 |
| **GET** | `/admin-command/nurse/dispensing-log` | None | 2 |
| **POST** | `/admin-command/nurse/dispensing-log` | None | 1 |
| **GET** | `/admin-command/nurse/health-reports` | None | 2 |
| **POST** | `/admin-command/nurse/health-reports/generate` | None | 1 |
| **GET** | `/admin-command/nurse/medicine-inventory` | None | 2 |
| **POST** | `/admin-command/nurse/medicine-inventory` | None | 1 |
| **POST** | `/admin-command/nurse/medicine-inventory/${medicineId}/adjust` | medicineId (path) | 1 |
| **GET** | `/admin-command/nurse/overview` | None | 2 |
| **GET** | `/admin-command/nurse/parent-notifications` | None | 2 |
| **POST** | `/admin-command/nurse/parent-notifications` | None | 1 |
| **POST** | `/admin-command/nurse/parent-notifications/${notificationId}/resend` | notificationId (path) | 1 |
| **GET** | `/admin-command/nurse/sick-bay-queue` | None | 2 |
| **POST** | `/admin-command/nurse/sick-bay-queue` | None | 1 |
| **POST** | `/admin-command/nurse/sick-bay-queue/${entryId}/discharge` | entryId (path) | 1 |
| **GET** | `/admin-command/nurse/visits` | None | 2 |
| **POST** | `/admin-command/nurse/visits` | None | 1 |
| **POST** | `/admin-command/nurse/visits/${visitId}/close` | visitId (path) | 1 |
| **POST** | `/admin-command/nurse/visits/${visitId}/refer` | visitId (path) | 1 |
| **GET** | `/admin-command/parent/dashboard` | None | 1 |
| **GET** | `/admin-command/parent/downloads` | None | 1 |
| **GET** | `/admin-command/parent/health` | None | 1 |
| **GET** | `/admin-command/parent/messages` | None | 1 |
| **GET** | `/admin-command/parent/notifications` | None | 1 |
| **GET** | `/admin-command/principal/academic-setup` | None | 4 |
| **POST** | `/admin-command/principal/academic-setup/term` | None | 1 |
| **POST** | `/admin-command/principal/academic-setup/year` | None | 1 |
| **GET** | `/admin-command/principal/academics` | None | 4 |
| **GET** | `/admin-command/principal/approvals` | None | 4 |
| **POST** | `/admin-command/principal/approvals/${approvalId}/action` | approvalId (path) | 1 |
| **GET** | `/admin-command/principal/attendance` | None | 2 |
| **GET** | `/admin-command/principal/attendance-monitoring` | None | 2 |
| **POST** | `/admin-command/principal/attendance-monitoring/${classId}/alert` | classId (path) | 1 |
| **GET** | `/admin-command/principal/classes` | None | 2 |
| **GET** | `/admin-command/principal/classes-streams` | None | 2 |
| **POST** | `/admin-command/principal/classes-streams` | None | 1 |
| **POST** | `/admin-command/principal/classes-streams/${classId}/streams` | classId (path) | 1 |
| **GET** | `/admin-command/principal/communication` | None | 4 |
| **POST** | `/admin-command/principal/communication/announcement` | None | 1 |
| **POST** | `/admin-command/principal/communication/message` | None | 1 |
| **GET** | `/admin-command/principal/discipline` | None | 4 |
| **POST** | `/admin-command/principal/discipline/${caseId}/escalate` | caseId (path) | 1 |
| **POST** | `/admin-command/principal/discipline/${caseId}/resolve` | caseId (path) | 1 |
| **GET** | `/admin-command/principal/exams` | None | 2 |
| **GET** | `/admin-command/principal/exams-report-cards` | None | 2 |
| **POST** | `/admin-command/principal/exams-report-cards/${examId}/approve` | examId (path) | 1 |
| **POST** | `/admin-command/principal/exams-report-cards/${examId}/publish` | examId (path) | 1 |
| **GET** | `/admin-command/principal/finance-overview` | None | 4 |
| **POST** | `/admin-command/principal/finance-overview/${expenseId}/approve` | expenseId (path) | 1 |
| **GET** | `/admin-command/principal/overview` | None | 6 |
| **GET** | `/admin-command/principal/reports` | None | 5 |
| **POST** | `/admin-command/principal/reports/generate` | None | 1 |
| **GET** | `/admin-command/principal/school-profile` | None | 4 |
| **POST** | `/admin-command/principal/school-profile` | None | 1 |
| **POST** | `/admin-command/principal/school-profile/logo` | None | 1 |
| **GET** | `/admin-command/principal/settings` | None | 2 |
| **GET** | `/admin-command/principal/setup-checklist` | None | 4 |
| **POST** | `/admin-command/principal/setup-checklist/${itemId}/complete` | itemId (path) | 1 |
| **GET** | `/admin-command/principal/staff` | None | 2 |
| **GET** | `/admin-command/principal/staff-roles` | None | 2 |
| **POST** | `/admin-command/principal/staff-roles/${staffId}/role` | staffId (path) | 1 |
| **POST** | `/admin-command/principal/staff-roles/invite` | None | 1 |
| **GET** | `/admin-command/principal/students` | None | 4 |
| **POST** | `/admin-command/principal/students/${studentId}/transfer` | studentId (path) | 1 |
| **POST** | `/admin-command/principal/students/admit` | None | 1 |
| **GET** | `/admin-command/principal/subjects` | None | 2 |
| **GET** | `/admin-command/principal/subjects-departments` | None | 2 |
| **POST** | `/admin-command/principal/subjects-departments/department` | None | 1 |
| **POST** | `/admin-command/principal/subjects-departments/subject` | None | 1 |
| **GET** | `/admin-command/principal/teaching` | None | 2 |
| **GET** | `/admin-command/procurement-officer/deliveries` | None | 2 |
| **POST** | `/admin-command/procurement-officer/deliveries` | None | 1 |
| **POST** | `/admin-command/procurement-officer/deliveries/${id}/confirm` | id (path) | 1 |
| **GET** | `/admin-command/procurement-officer/overview` | None | 2 |
| **GET** | `/admin-command/procurement-officer/purchase-orders` | None | 2 |
| **POST** | `/admin-command/procurement-officer/purchase-orders` | None | 1 |
| **POST** | `/admin-command/procurement-officer/purchase-orders/${id}/approve` | id (path) | 1 |
| **GET** | `/admin-command/procurement-officer/purchase-requests` | None | 2 |
| **POST** | `/admin-command/procurement-officer/purchase-requests` | None | 1 |
| **POST** | `/admin-command/procurement-officer/purchase-requests/${id}/approve` | id (path) | 1 |
| **POST** | `/admin-command/procurement-officer/purchase-requests/${id}/reject` | id (path) | 1 |
| **GET** | `/admin-command/procurement-officer/quotations` | None | 2 |
| **POST** | `/admin-command/procurement-officer/quotations` | None | 1 |
| **POST** | `/admin-command/procurement-officer/quotations/${id}/select` | id (path) | 1 |
| **GET** | `/admin-command/procurement-officer/reports` | None | 2 |
| **POST** | `/admin-command/procurement-officer/reports/generate` | None | 1 |
| **GET** | `/admin-command/procurement-officer/suppliers` | None | 2 |
| **POST** | `/admin-command/procurement-officer/suppliers` | None | 1 |
| **PUT** | `/admin-command/procurement-officer/suppliers/${id}` | id (path) | 1 |
| **POST** | `/admin-command/reports/categories` | None | 1 |
| **POST** | `/admin-command/reports/schedule` | None | 1 |
| **GET** | `/admin-command/school/operational-blueprint` | None | 1 |
| **GET** | `/admin-command/secretary/appointments` | None | 2 |
| **POST** | `/admin-command/secretary/appointments` | None | 1 |
| **POST** | `/admin-command/secretary/appointments/${id}/cancel` | id (path) | 1 |
| **POST** | `/admin-command/secretary/appointments/${id}/confirm` | id (path) | 1 |
| **POST** | `/admin-command/secretary/appointments/${id}/reschedule` | id (path) | 1 |
| **GET** | `/admin-command/secretary/calls-log` | None | 2 |
| **POST** | `/admin-command/secretary/calls-log` | None | 1 |
| **POST** | `/admin-command/secretary/calls-log/${id}/follow-up` | id (path) | 1 |
| **GET** | `/admin-command/secretary/dashboard` | None | 1 |
| **GET** | `/admin-command/secretary/letters-documents` | None | 2 |
| **POST** | `/admin-command/secretary/letters-documents` | None | 1 |
| **POST** | `/admin-command/secretary/letters-documents/${id}/download` | id (path) | 1 |
| **POST** | `/admin-command/secretary/letters-documents/${id}/print` | id (path) | 1 |
| **GET** | `/admin-command/secretary/overview` | None | 2 |
| **GET** | `/admin-command/secretary/parent-messages` | None | 2 |
| **POST** | `/admin-command/secretary/parent-messages` | None | 1 |
| **POST** | `/admin-command/secretary/parent-messages/${id}/read` | id (path) | 1 |
| **POST** | `/admin-command/secretary/parent-messages/${id}/reply` | id (path) | 1 |
| **GET** | `/admin-command/secretary/reception-queue` | None | 2 |
| **POST** | `/admin-command/secretary/reception-queue` | None | 1 |
| **POST** | `/admin-command/secretary/reception-queue/${id}/call` | id (path) | 1 |
| **POST** | `/admin-command/secretary/reception-queue/${id}/complete` | id (path) | 1 |
| **GET** | `/admin-command/secretary/reports` | None | 2 |
| **POST** | `/admin-command/secretary/reports/${id}/download` | id (path) | 1 |
| **POST** | `/admin-command/secretary/reports/generate` | None | 1 |
| **GET** | `/admin-command/secretary/student-clearance` | None | 2 |
| **POST** | `/admin-command/secretary/student-clearance` | None | 1 |
| **POST** | `/admin-command/secretary/student-clearance/${id}/approve` | id (path) | 1 |
| **POST** | `/admin-command/secretary/student-clearance/${id}/complete` | id (path) | 1 |
| **POST** | `/admin-command/secretary/student-clearance/${id}/print` | id (path) | 1 |
| **GET** | `/admin-command/secretary/visitors` | None | 2 |
| **POST** | `/admin-command/secretary/visitors/${id}/check-out` | id (path) | 1 |
| **POST** | `/admin-command/secretary/visitors/${id}/print-slip` | id (path) | 1 |
| **POST** | `/admin-command/secretary/visitors/check-in` | None | 1 |
| **GET** | `/admin-command/security-officer/gate-register` | None | 2 |
| **POST** | `/admin-command/security-officer/gate-register` | None | 1 |
| **POST** | `/admin-command/security-officer/gate-register/${id}/exit` | id (path) | 1 |
| **GET** | `/admin-command/security-officer/incidents` | None | 2 |
| **POST** | `/admin-command/security-officer/incidents` | None | 1 |
| **POST** | `/admin-command/security-officer/incidents/${id}/escalate` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/incidents/${id}/resolve` | id (path) | 1 |
| **GET** | `/admin-command/security-officer/overview` | None | 2 |
| **GET** | `/admin-command/security-officer/reports` | None | 2 |
| **POST** | `/admin-command/security-officer/reports/${id}/download` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/reports/generate` | None | 1 |
| **GET** | `/admin-command/security-officer/staff-movement` | None | 2 |
| **POST** | `/admin-command/security-officer/staff-movement/${id}/return` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/staff-movement/departure` | None | 1 |
| **GET** | `/admin-command/security-officer/student-exit-passes` | None | 2 |
| **POST** | `/admin-command/security-officer/student-exit-passes/${id}/exit` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/student-exit-passes/${id}/return` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/student-exit-passes/${id}/verify` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/student-exit-passes/flag-unauthorized` | None | 1 |
| **GET** | `/admin-command/security-officer/visitors` | None | 2 |
| **POST** | `/admin-command/security-officer/visitors/${id}/check-out` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/visitors/${id}/flag` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/visitors/${id}/print-badge` | id (path) | 1 |
| **POST** | `/admin-command/security-officer/visitors/check-in` | None | 1 |
| **GET** | `/admin-command/storekeeper/damaged-missing` | None | 2 |
| **POST** | `/admin-command/storekeeper/damaged-missing` | None | 1 |
| **POST** | `/admin-command/storekeeper/damaged-missing/${id}/write-off` | id (path) | 1 |
| **GET** | `/admin-command/storekeeper/items` | None | 2 |
| **POST** | `/admin-command/storekeeper/items` | None | 1 |
| **DELETE** | `/admin-command/storekeeper/items/${id}` | id (path) | 1 |
| **PATCH** | `/admin-command/storekeeper/items/${id}` | id (path) | 1 |
| **POST** | `/admin-command/storekeeper/items/issue` | None | 1 |
| **POST** | `/admin-command/storekeeper/items/receive` | None | 1 |
| **GET** | `/admin-command/storekeeper/low-stock` | None | 2 |
| **POST** | `/admin-command/storekeeper/low-stock/${id}/reorder` | id (path) | 1 |
| **GET** | `/admin-command/storekeeper/overview` | None | 2 |
| **GET** | `/admin-command/storekeeper/reports` | None | 2 |
| **GET** | `/admin-command/storekeeper/reports/${id}/download` | id (path) | 1 |
| **POST** | `/admin-command/storekeeper/reports/generate` | None | 1 |
| **GET** | `/admin-command/storekeeper/requests` | None | 2 |
| **POST** | `/admin-command/storekeeper/requests/${id}/approve` | id (path) | 1 |
| **POST** | `/admin-command/storekeeper/requests/${id}/fulfill` | id (path) | 1 |
| **POST** | `/admin-command/storekeeper/requests/${id}/reject` | id (path) | 1 |
| **GET** | `/admin-command/storekeeper/stock-in` | None | 1 |
| **GET** | `/admin-command/storekeeper/stock-issue` | None | 1 |
| **GET** | `/admin-command/storekeeper/stocktake` | None | 2 |
| **POST** | `/admin-command/storekeeper/stocktake` | None | 1 |
| **POST** | `/admin-command/storekeeper/stocktake/${id}/finalize` | id (path) | 1 |
| **POST** | `/admin-command/storekeeper/stocktake/${id}/submit` | id (path) | 1 |
| **GET** | `/admin-command/student/dashboard` | None | 1 |
| **GET** | `/admin-command/student/downloads` | None | 1 |
| **GET** | `/admin-command/student/messages` | None | 1 |
| **GET** | `/admin-command/student/notifications` | None | 1 |
| **GET** | `/admin-command/teacher/academic-setup` | None | 2 |
| **GET** | `/admin-command/teacher/attendance` | None | 1 |
| **GET** | `/admin-command/teacher/cbc-assessments` | None | 2 |
| **GET** | `/admin-command/teacher/clubs` | None | 2 |
| **GET** | `/admin-command/teacher/invigilation` | None | 2 |
| **GET** | `/admin-command/teacher/learner-progress` | None | 2 |
| **GET** | `/admin-command/teacher/lesson-plans` | None | 1 |
| **GET** | `/admin-command/teacher/mark-entry` | None | 2 |
| **GET** | `/admin-command/teacher/messages` | None | 1 |
| **GET** | `/admin-command/teacher/notifications` | None | 2 |
| **GET** | `/admin-command/teacher/profile` | None | 2 |
| **GET** | `/admin-command/teacher/reports` | None | 3 |
| **GET** | `/admin-command/teacher/resource-requests` | None | 1 |
| **GET** | `/admin-command/teacher/resources` | None | 2 |
| **GET** | `/admin-command/teacher/store-requests` | None | 2 |
| **GET** | `/admin-command/teacher/student-notes` | None | 1 |
| **GET** | `/admin-command/teacher/subject-allocations` | None | 2 |
| **GET** | `/admin-command/teacher/syllabus-coverage` | None | 2 |
| **GET** | `/admin-command/teacher/utilities` | None | 1 |
| **GET** | `/admin-command/transport-manager/drivers` | None | 2 |
| **POST** | `/admin-command/transport-manager/drivers` | None | 1 |
| **PATCH** | `/admin-command/transport-manager/drivers/${id}` | id (path) | 1 |
| **POST** | `/admin-command/transport-manager/drivers/${id}/suspend` | id (path) | 1 |
| **GET** | `/admin-command/transport-manager/fuel-maintenance` | None | 2 |
| **POST** | `/admin-command/transport-manager/fuel-maintenance/fuel` | None | 1 |
| **POST** | `/admin-command/transport-manager/fuel-maintenance/maintenance` | None | 1 |
| **GET** | `/admin-command/transport-manager/overview` | None | 2 |
| **GET** | `/admin-command/transport-manager/reports` | None | 2 |
| **POST** | `/admin-command/transport-manager/reports/generate` | None | 1 |
| **GET** | `/admin-command/transport-manager/routes` | None | 2 |
| **POST** | `/admin-command/transport-manager/routes` | None | 1 |
| **PATCH** | `/admin-command/transport-manager/routes/${id}` | id (path) | 1 |
| **POST** | `/admin-command/transport-manager/routes/${routeId}/assign-vehicle` | routeId (path) | 1 |
| **GET** | `/admin-command/transport-manager/student-transport-list` | None | 2 |
| **POST** | `/admin-command/transport-manager/student-transport-list` | None | 1 |
| **DELETE** | `/admin-command/transport-manager/student-transport-list/${id}` | id (path) | 1 |
| **GET** | `/admin-command/transport-manager/trips` | None | 2 |
| **POST** | `/admin-command/transport-manager/trips` | None | 1 |
| **POST** | `/admin-command/transport-manager/trips/${id}/complete` | id (path) | 1 |
| **GET** | `/admin-command/transport-manager/vehicles` | None | 2 |
| **POST** | `/admin-command/transport-manager/vehicles` | None | 1 |
| **PATCH** | `/admin-command/transport-manager/vehicles/${id}` | id (path) | 1 |
| **POST** | `/admin-command/transport-manager/vehicles/${id}/decommission` | id (path) | 1 |
| **POST** | `/admin-command/transport/maintenance` | None | 1 |
| **POST** | `/admin-command/transport/route` | None | 1 |
| **GET** | `/admissions` | None | 1 |
| **GET** | `/admissions/applicants` | None | 1 |
| **POST** | `/admissions/applicants` | None | 1 |
| **GET** | `/admissions/applications` | status, limit | 3 |
| **PATCH** | `/admissions/applications/${encodeURIComponent(record.id)}` | None | 1 |
| **POST** | `/admissions/applications/${id}/enrol` | id (path) | 1 |
| **POST** | `/admissions/applications/${selectedApplicantPreview.id}/approve` | None | 1 |
| **POST** | `/admissions/quick-actions` | None | 1 |
| **GET** | `/admissions/students` | ${params.toString()} | 1 |
| **GET** | `/admissions/students/${encodeURIComponent(studentId)}/profile` | tenantSlug | 1 |
| **GET** | `/ai-insights/dashboard` | None | 1 |
| **GET** | `/api${path}` | path (path) | 1 |
| **GET** | `/approvals` | None | 1 |
| **POST** | `/approvals` | None | 1 |
| **PATCH** | `/approvals/${id}/action` | id (path) | 1 |
| **POST** | `/approvals/${id}/approve` | id (path) | 1 |
| **POST** | `/approvals/${id}/reject` | id (path) | 1 |
| **GET** | `/approvals/my-requests` | None | 1 |
| **PATCH** | `/approvals/my-requests` | None | 1 |
| **GET** | `/approvals/pending` | None | 1 |
| **GET** | `/assets` | None | 1 |
| **GET** | `/assets/dashboard` | None | 2 |
| **GET** | `/attendance${queryParams}` | queryParams (path) | 1 |
| **POST** | `/attendance/mark` | None | 1 |
| **GET** | `/auth/csrf` | None | 1 |
| **GET** | `/auth/invitations` | limit, offset | 3 |
| **POST** | `/auth/invitations` | None | 2 |
| **DELETE** | `/auth/invitations/${encodeURIComponent(invite.id)}` | None | 1 |
| **POST** | `/auth/invitations/${encodeURIComponent(invite.id)}/resend` | None | 1 |
| **DELETE** | `/auth/invitations/${user.id}` | None | 1 |
| **POST** | `/auth/invitations/${user.id}/resend` | None | 1 |
| **POST** | `/auth/invitations/accept` | None | 1 |
| **POST** | `/auth/login` | None | 3 |
| **POST** | `/auth/logout` | None | 2 |
| **GET** | `/auth/me` | ${query.toString()} | 2 |
| **POST** | `/auth/parent/otp/request` | None | 1 |
| **POST** | `/auth/parent/otp/verify` | None | 1 |
| **POST** | `/auth/refresh` | None | 1 |
| **GET** | `/auth/sessions` | None | 1 |
| **POST** | `/auth/sessions/revoke` | None | 1 |
| **PATCH** | `/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role` | None | 1 |
| **PATCH** | `/auth/tenant-users/${encodeURIComponent(user.id)}/status` | None | 1 |
| **PATCH** | `/auth/tenant-users/${user.id}/role` | None | 1 |
| **PATCH** | `/auth/tenant-users/${user.id}/status` | None | 1 |
| **GET** | `/billing/fee-structures` | None | 5 |
| **POST** | `/billing/fee-structures` | None | 5 |
| **POST** | `/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive` | None | 5 |
| **GET** | `/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students` | None | 5 |
| **POST** | `/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices` | None | 5 |
| **GET** | `/billing/finance-activity` | limit, offset | 8 |
| **POST** | `/billing/invoices` | None | 5 |
| **GET** | `/billing/manual-fee-payments` | None | 1 |
| **POST** | `/billing/manual-fee-payments` | None | 6 |
| **POST** | `/billing/manual-fee-payments/${receipt.id}/${action}` | action (path) | 1 |
| **GET** | `/billing/reconciliation` | ${params.toString()} | 5 |
| **GET** | `/billing/reconciliation/export` | ${params.toString()} | 5 |
| **GET** | `/billing/student-balances` | None | 7 |
| **GET** | `/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement` | None | 5 |
| **GET** | `/billing/student-balances/${encodeURIComponent(studentId)}/statement/export` | None | 5 |
| **GET** | `/billing/waivers` | None | 1 |
| **POST** | `/billing/waivers` | None | 1 |
| **GET** | `/boarding/dashboard` | None | 6 |
| **GET** | `/boarding/exeats` | None | 1 |
| **POST** | `/boarding/exeats` | None | 1 |
| **GET** | `/boarding/roll-calls` | None | 1 |
| **POST** | `/boarding/roll-calls` | None | 1 |
| **GET** | `/clinic/analytics/principal${query}` | query (path) | 1 |
| **GET** | `/clinic/medicines` | None | 1 |
| **GET** | `/clinic/medicines${query}` | query (path) | 1 |
| **GET** | `/clinic/medicines/stock` | None | 1 |
| **POST** | `/clinic/medicines/stock` | None | 1 |
| **GET** | `/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history` | None | 1 |
| **GET** | `/clinic/parent/students/me/history` | None | 1 |
| **GET** | `/clinic/visits` | None | 1 |
| **POST** | `/clinic/visits` | None | 1 |
| **GET** | `/communication/messages` | None | 1 |
| **GET** | `/communication/sms` | None | 1 |
| **POST** | `/communication/sms` | None | 1 |
| **GET** | `/communication/summary` | None | 3 |
| **GET** | `/counselling/${path}${query}` | path (path), query (path) | 1 |
| **GET** | `/counselling/dashboard` | None | 1 |
| **GET** | `/counselling/referrals` | None | 2 |
| **POST** | `/counselling/referrals` | None | 1 |
| **GET** | `/counselling/sessions` | None | 1 |
| **GET** | `/dashboard/feed` | role, limit, offset | 1 |
| **GET** | `/dashboard/layout` | role | 3 |
| **GET** | `/dashboard/summary` | role | 3 |
| **GET** | `/discipline${queryParams}` | queryParams (path) | 1 |
| **GET** | `/discipline/${path}${query}` | path (path), query (path) | 1 |
| **GET** | `/discipline/actions-interventions` | None | 1 |
| **GET** | `/discipline/actions-sanctions` | None | 1 |
| **GET** | `/discipline/audit-trail` | None | 1 |
| **GET** | `/discipline/cases` | None | 1 |
| **POST** | `/discipline/cases` | None | 1 |
| **PATCH** | `/discipline/cases/${caseId}` | caseId (path) | 1 |
| **GET** | `/discipline/class-house-monitoring` | None | 1 |
| **GET** | `/discipline/counselling-referrals` | None | 1 |
| **GET** | `/discipline/detention-programs` | None | 1 |
| **GET** | `/discipline/incident-log` | None | 1 |
| **GET** | `/discipline/incident-register` | None | 1 |
| **GET** | `/discipline/incidents` | None | 1 |
| **POST** | `/discipline/incidents/${encodeURIComponent(record.id)}/actions` | None | 1 |
| **GET** | `/discipline/investigations` | None | 1 |
| **GET** | `/discipline/log-incident` | None | 1 |
| **GET** | `/discipline/overview` | None | 1 |
| **GET** | `/discipline/parent-communication` | None | 1 |
| **GET** | `/discipline/parent-summons` | None | 1 |
| **GET** | `/discipline/parent/incidents` | None | 2 |
| **GET** | `/discipline/report-intake` | None | 1 |
| **GET** | `/discipline/reports` | None | 1 |
| **GET** | `/discipline/reports-downloads` | None | 1 |
| **GET** | `/discipline/serious-cases-approvals` | None | 1 |
| **GET** | `/discipline/settings` | None | 1 |
| **GET** | `/discipline/student-conduct-profiles` | None | 1 |
| **GET** | `/discipline/students/me/behavior-score` | None | 2 |
| **GET** | `/discipline/templates-rules` | None | 1 |
| **GET** | `/discipline/triage-queue` | None | 1 |
| **GET** | `/events/notifications` | limit | 1 |
| **POST** | `/events/notifications/${encodeURIComponent(item.id)}/read` | None | 1 |
| **POST** | `/exams/alignment` | None | 1 |
| **GET** | `/exams/assessment-components` | None | 1 |
| **GET** | `/exams/assessments` | None | 2 |
| **GET** | `/exams/attendance` | None | 1 |
| **GET** | `/exams/audit-logs` | None | 1 |
| **POST** | `/exams/configuration` | None | 1 |
| **GET** | `/exams/dashboard` | None | 1 |
| **GET** | `/exams/dashboard-stats` | None | 1 |
| **POST** | `/exams/draft` | None | 2 |
| **GET** | `/exams/grading-policies` | None | 2 |
| **GET** | `/exams/invigilators` | None | 1 |
| **POST** | `/exams/lifecycle` | None | 1 |
| **GET** | `/exams/mark-entry-windows` | None | 1 |
| **GET** | `/exams/mark-versions` | None | 1 |
| **GET** | `/exams/marks` | exam_series_id, subject_id, class_section_id, exam | 4 |
| **POST** | `/exams/marks` | None | 1 |
| **POST** | `/exams/marks/enter` | None | 2 |
| **GET** | `/exams/marks/school` | status | 2 |
| **GET** | `/exams/report-card-batches` | None | 1 |
| **GET** | `/exams/report-cards` | status | 5 |
| **GET** | `/exams/report-cards/${encodeURIComponent(record.id)}/parent-download` | None | 1 |
| **POST** | `/exams/report-cards/publish` | None | 1 |
| **POST** | `/exams/review` | None | 1 |
| **GET** | `/exams/series` | None | 4 |
| **POST** | `/exams/series/${encodeURIComponent(record.id)}/publish` | None | 1 |
| **GET** | `/exams/series/${examSeriesId}/readiness${tenantId ` |  , examSeriesId (path) | 1 |
| **POST** | `/exams/series/publish` | None | 2 |
| **GET** | `/exams/student-cases` | None | 1 |
| **GET** | `/exams/subject-weightings` | None | 1 |
| **GET** | `/exams/timetable-slots` | None | 1 |
| **GET** | `/fees${queryParams}` | queryParams (path) | 1 |
| **POST** | `/fees/payments` | None | 1 |
| **GET** | `/fees/summary` | None | 1 |
| **GET** | `/finance/accounts-overview` | None | 2 |
| **GET** | `/finance/balances` | None | 1 |
| **POST** | `/finance/balances` | None | 1 |
| **GET** | `/finance/collections` | None | 1 |
| **GET** | `/finance/fee-categories` | None | 1 |
| **POST** | `/finance/fee-categories` | None | 1 |
| **DELETE** | `/finance/fee-categories/${id}` | id (path) | 1 |
| **GET** | `/finance/invoices` | None | 1 |
| **GET** | `/finance/payments` | None | 1 |
| **POST** | `/finance/payments` | None | 1 |
| **GET** | `/finance/summary` | None | 6 |
| **POST** | `/finance/waivers` | None | 1 |
| **GET** | `/grade-master/overview` | None | 1 |
| **GET** | `/health` | None | 1 |
| **GET** | `/health${queryParams}` | queryParams (path) | 1 |
| **GET** | `/health/ready` | None | 1 |
| **POST** | `/health/visits` | None | 1 |
| **GET** | `/hr/attendance` | date | 1 |
| **POST** | `/hr/attendance` | None | 1 |
| **GET** | `/hr/departments` | None | 1 |
| **POST** | `/hr/departments` | None | 1 |
| **GET** | `/hr/job-titles` | None | 1 |
| **POST** | `/hr/job-titles` | None | 1 |
| **GET** | `/hr/leave` | None | 1 |
| **POST** | `/hr/leave/${vars.id}/status` | None | 1 |
| **POST** | `/hr/leave/request` | None | 1 |
| **GET** | `/hr/payroll/bands` | None | 1 |
| **POST** | `/hr/payroll/bands` | None | 1 |
| **GET** | `/hr/payroll/payslips` | month, year | 1 |
| **POST** | `/hr/payroll/payslips` | None | 1 |
| **GET** | `/hr/performance/disciplinary` | None | 1 |
| **POST** | `/hr/performance/disciplinary` | None | 1 |
| **GET** | `/hr/performance/reviews` | None | 1 |
| **POST** | `/hr/performance/reviews` | None | 1 |
| **GET** | `/hr/staff` | department | 4 |
| **POST** | `/hr/staff/accept-invite` | None | 1 |
| **POST** | `/hr/staff/approve` | None | 1 |
| **POST** | `/hr/staff/complete-profile` | None | 1 |
| **POST** | `/hr/staff/invite` | None | 1 |
| **POST** | `/hr/staff/reactivate` | None | 1 |
| **PATCH** | `/hr/staff/role` | None | 1 |
| **PATCH** | `/hr/staff/salary` | None | 1 |
| **GET** | `/integrations/daraja` | None | 1 |
| **PUT** | `/integrations/daraja` | None | 1 |
| **POST** | `/integrations/daraja/test` | environment | 1 |
| **POST** | `/inventory/damaged-items` | None | 1 |
| **GET** | `/inventory/heatmap` | None | 1 |
| **GET** | `/inventory/incidents` | None | 2 |
| **GET** | `/inventory/insights` | None | 1 |
| **GET** | `/inventory/purchase-orders` | limit | 2 |
| **GET** | `/inventory/requests` | status | 4 |
| **PATCH** | `/inventory/requests/${encodeURIComponent(record.id)}/status` | None | 1 |
| **POST** | `/inventory/requisitions` | None | 1 |
| **POST** | `/inventory/stock-issues` | None | 1 |
| **GET** | `/inventory/stock-movements` | None | 1 |
| **POST** | `/inventory/stock-receipts` | None | 1 |
| **POST** | `/inventory/stock-requests` | None | 1 |
| **POST** | `/inventory/stock-returns` | None | 1 |
| **POST** | `/inventory/stocktake-sessions` | None | 1 |
| **GET** | `/inventory/summary` | None | 2 |
| **GET** | `/inventory/suppliers` | None | 2 |
| **GET** | `/iot${path}` | path (path) | 1 |
| **GET** | `/iot/dashboard` | None | 1 |
| **GET** | `/labs/dashboard` | None | 2 |
| **GET** | `/labs/inventory` | None | 1 |
| **POST** | `/labs/inventory` | None | 1 |
| **GET** | `/labs/issues` | None | 1 |
| **POST** | `/labs/issues` | None | 1 |
| **GET** | `/labs/requests` | None | 1 |
| **POST** | `/labs/requests` | None | 1 |
| **GET** | `/library/books` | None | 1 |
| **POST** | `/library/books` | None | 1 |
| **GET** | `/library/catalog` | None | 1 |
| **GET** | `/library/circulation` | None | 1 |
| **POST** | `/library/circulation/issue` | None | 1 |
| **POST** | `/library/circulation/return` | None | 1 |
| **POST** | `/library/issue` | None | 1 |
| **POST** | `/library/issues` | None | 1 |
| **GET** | `/library/loans` | None | 1 |
| **POST** | `/library/loans` | None | 1 |
| **GET** | `/library/loans${queryParams}` | queryParams (path) | 1 |
| **PATCH** | `/library/loans/${loanId}` | loanId (path) | 1 |
| **POST** | `/library/returns` | None | 1 |
| **GET** | `/library/summary` | None | 1 |
| **GET** | `/notifications` | None | 1 |
| **PATCH** | `/notifications/${id}/read` | id (path) | 1 |
| **GET** | `/observability/alerts` | None | 4 |
| **GET** | `/observability/health` | None | 2 |
| **POST** | `/operational-workflows/offline-sync` | None | 1 |
| **GET** | `/operations/reports` | None | 2 |
| **POST** | `/parent-portal/behavior/acknowledge` | None | 1 |
| **POST** | `/parent-portal/fees/pay` | None | 1 |
| **GET** | `/parent/academics` | None | 1 |
| **GET** | `/parent/communication` | None | 1 |
| **GET** | `/parent/dashboard` | None | 1 |
| **GET** | `/parent/finance` | None | 1 |
| **GET** | `/parent/overview` | None | 1 |
| **POST** | `/payments` | None | 1 |
| **GET** | `/payments/mpesa/c2b/payments` | status | 3 |
| **POST** | `/payments/mpesa/c2b/payments/${encodeURIComponent(record.id)}/reconcile` | None | 1 |
| **POST** | `/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile` | selectedPaymentId (path) | 1 |
| **GET** | `/permissions/me` | schoolId | 2 |
| **GET** | `/platform/audit-logs` | None | 1 |
| **GET** | `/platform/backups` | None | 1 |
| **GET** | `/platform/broadcasts` | None | 1 |
| **GET** | `/platform/gateways` | None | 1 |
| **GET** | `/platform/modules` | None | 1 |
| **GET** | `/platform/reports` | None | 1 |
| **GET** | `/platform/schools` | None | 1 |
| **GET** | `/platform/schools/${encodeURIComponent(tenantId)}/modules` | None | 1 |
| **GET** | `/platform/schools/summary` | None | 1 |
| **GET** | `/platform/security-policies` | None | 3 |
| **GET** | `/platform/settings` | None | 1 |
| **GET** | `/platform/sms-settings` | None | 2 |
| **GET** | `/platform/templates` | None | 1 |
| **GET** | `/platform/users` | None | 1 |
| **GET** | `/portals/fees/history${studentId ` |   | 1 |
| **GET** | `/portals/parent/children` | None | 1 |
| **GET** | `/portals/reports${studentId ` |   | 1 |
| **GET** | `/procurement${request.path}` | None | 1 |
| **GET** | `/procurement/dashboard` | None | 4 |
| **POST** | `/procurement/purchase-orders` | None | 1 |
| **PATCH** | `/procurement/requests/${encodeURIComponent(record.id)}/approval` | None | 1 |
| **GET** | `/school/modules/me` | None | 2 |
| **GET** | `/school/settings` | None | 1 |
| **GET** | `/school/sms/wallet` | None | 1 |
| **GET** | `/secretary/inquiries` | None | 1 |
| **POST** | `/secretary/inquiries` | None | 1 |
| **GET** | `/secretary/visitors` | None | 1 |
| **POST** | `/secretary/visitors` | None | 1 |
| **POST** | `/sms/send` | None | 1 |
| **POST** | `/student-portal/assignments/mark-done` | None | 1 |
| **GET** | `/student/academics` | None | 1 |
| **GET** | `/student/attendance` | None | 1 |
| **GET** | `/student/dashboard` | None | 1 |
| **GET** | `/student/overview` | None | 1 |
| **GET** | `/students` | class | 2 |
| **POST** | `/students` | None | 1 |
| **GET** | `/students${queryParams}` | queryParams (path) | 2 |
| **GET** | `/students/${studentId}` | studentId (path) | 2 |
| **PATCH** | `/students/${studentId}` | studentId (path) | 2 |
| **GET** | `/students/${studentId}/attendance` | studentId (path) | 1 |
| **GET** | `/students/${studentId}/discipline` | studentId (path) | 1 |
| **GET** | `/students/${studentId}/fees` | studentId (path) | 1 |
| **GET** | `/students/${studentId}/guardians` | studentId (path) | 1 |
| **GET** | `/students/${studentId}/health` | studentId (path) | 1 |
| **GET** | `/students/${studentId}/library` | studentId (path) | 1 |
| **POST** | `/students/admit` | None | 1 |
| **POST** | `/students/guardians` | None | 1 |
| **GET** | `/students/guardians/directory` | None | 1 |
| **PATCH** | `/students/lifecycle/${studentId}/archive` | studentId (path) | 1 |
| **POST** | `/students/lifecycle/${studentId}/enroll` | studentId (path) | 2 |
| **POST** | `/students/lifecycle/${studentId}/exit` | studentId (path) | 1 |
| **POST** | `/students/lifecycle/${studentId}/initiate-clearance` | studentId (path) | 1 |
| **POST** | `/students/lifecycle/${studentId}/place-in-class` | studentId (path) | 2 |
| **POST** | `/students/lifecycle/${studentId}/promote` | studentId (path) | 1 |
| **POST** | `/students/lifecycle/${studentId}/suspend` | studentId (path) | 1 |
| **GET** | `/students/summary/dashboard` | None | 2 |
| **GET** | `/support${path}` | path (path) | 1 |
| **GET** | `/support${path}${query ` |  , path (path) | 1 |
| **GET** | `/support/admin/notifications/dead-letter` | audience, channel | 1 |
| **POST** | `/support/admin/notifications/dead-letter/${encodeURIComponent(record.id)}/retry` | None | 1 |
| **GET** | `/support/counselling` | None | 1 |
| **POST** | `/support/counselling` | None | 1 |
| **GET** | `/support/discipline` | None | 1 |
| **POST** | `/support/discipline` | None | 1 |
| **GET** | `/support/tickets` | limit | 3 |
| **POST** | `/sync/retry` | None | 1 |
| **GET** | `/tasks` | None | 1 |
| **POST** | `/tasks` | None | 1 |
| **PATCH** | `/tasks/${id}/assign` | id (path) | 1 |
| **PATCH** | `/tasks/${id}/complete` | id (path) | 1 |
| **POST** | `/test-mutation` | None | 2 |
| **GET** | `/test-route` | None | 5 |
| **GET** | `/timetable/my-schedule` | None | 1 |
| **GET** | `/transport${path}` | path (path) | 1 |
| **GET** | `/transport/dashboard` | None | 4 |
| **GET** | `/transport/trips` | None | 1 |
| **POST** | `/transport/trips` | None | 1 |
| **GET** | `/transport/vehicles` | None | 1 |
| **POST** | `/transport/vehicles` | None | 1 |
| **GET** | `/v1/notifications` | status | 1 |
| **PATCH** | `/v1/notifications/${id}/read` | id (path) | 1 |
| **GET** | `/v1/notifications/badges` | None | 1 |
| **PATCH** | `/v1/notifications/read-all` | None | 1 |
| **GET** | `/visitors/appointments` | None | 2 |
| **GET** | `/visitors/dashboard` | None | 4 |
| **GET** | `/visitors/logs` | None | 2 |
| **POST** | `/visitors/logs` | None | 1 |
| **PATCH** | `/visitors/logs/${recordId}/checkout` | recordId (path) | 3 |
| **GET** | `/visitors/student-exits` | None | 1 |
| **POST** | `/workflow/events` | None | 3 |

## Detailed Endpoints Reference

Below is the detailed list of every unique endpoint, showing original paths referenced in the code, parameters, and the exact files and lines where they are used.

### GET `/${apiBase}/dashboard`

- **Original path(s)**: `${apiBase}/dashboard`
- **Parameters**: `apiBase (path)`
- **Usages** (2):
  - `apps\web\src\components\modules\shared\implementation100-live-module.tsx`: line(s) 140
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 964

---

### POST `/${apiBase}/records`

- **Original path(s)**: `${apiBase}/records`
- **Parameters**: `apiBase (path)`
- **Usages** (1):
  - `apps\web\src\components\modules\shared\implementation100-live-module.tsx`: line(s) 181

---

### PATCH `/${apiBase}/records/${encodeURIComponent(record.id)}/status`

- **Original path(s)**: `${apiBase}/records/${encodeURIComponent(record.id)}/status`
- **Parameters**: `apiBase (path)`
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1003

---

### PATCH `/${apiBase}/records/${record.id}/status`

- **Original path(s)**: `${apiBase}/records/${record.id}/status`
- **Parameters**: `apiBase (path)`
- **Usages** (1):
  - `apps\web\src\components\modules\shared\implementation100-live-module.tsx`: line(s) 219

---

### POST `/${baseUrl}/auth/email-verification/request`

- **Original path(s)**: `${baseUrl}/auth/email-verification/request`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\auth\email-verification\request\route.ts`: line(s) 59

---

### POST `/${baseUrl}/auth/email-verification/verify`

- **Original path(s)**: `${baseUrl}/auth/email-verification/verify`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\auth\email-verification\verify\route.ts`: line(s) 32

---

### POST `/${baseUrl}/auth/invitations/accept`

- **Original path(s)**: `${baseUrl}/auth/invitations/accept`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\auth\invitations\accept\route.ts`: line(s) 38

---

### POST `/${baseUrl}/auth/parent/otp/request`

- **Original path(s)**: `${baseUrl}/auth/parent/otp/request`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\auth\parent\otp\request\route.ts`: line(s) 25

---

### POST `/${baseUrl}/auth/parent/otp/verify`

- **Original path(s)**: `${baseUrl}/auth/parent/otp/verify`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\auth\parent\otp\verify\route.ts`: line(s) 37

---

### POST `/${baseUrl}/auth/password-recovery/request`

- **Original path(s)**: `${baseUrl}/auth/password-recovery/request`
- **Parameters**: `baseUrl (path)`
- **Usages** (2):
  - `apps\web\src\app\api\auth\password\forgot\route.ts`: line(s) 44
  - `apps\web\src\app\api\auth\password-recovery\request\route.ts`: line(s) 43

---

### POST `/${baseUrl}/auth/password-recovery/reset`

- **Original path(s)**: `${baseUrl}/auth/password-recovery/reset`
- **Parameters**: `baseUrl (path)`
- **Usages** (2):
  - `apps\web\src\app\api\auth\password\reset\route.ts`: line(s) 35
  - `apps\web\src\app\api\auth\password-recovery\reset\route.ts`: line(s) 35

---

### GET `/${baseUrl}/dashboard/layout`

- **Original path(s)**: `${baseUrl}/dashboard/layout`
- **Parameters**: `${qs}`, `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\dashboard\page.tsx`: line(s) 29

---

### POST `/${baseUrl}/support/public/status-subscriptions`

- **Original path(s)**: `${baseUrl}/support/public/status-subscriptions`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\support\public\status-subscriptions\route.ts`: line(s) 29

---

### POST `/${baseUrl}/support/public/status-subscriptions/unsubscribe`

- **Original path(s)**: `${baseUrl}/support/public/status-subscriptions/unsubscribe`
- **Parameters**: `baseUrl (path)`
- **Usages** (1):
  - `apps\web\src\app\api\support\public\status-subscriptions\unsubscribe\route.ts`: line(s) 29

---

### GET `/${baseUrl}/support/public/system-status`

- **Original path(s)**: `${baseUrl}/support/public/system-status`
- **Parameters**: `baseUrl (path)`
- **Usages** (2):
  - `apps\web\src\app\api\support\public\system-status\route.ts`: line(s) 20
  - `apps\web\src\app\support\status\page.tsx`: line(s) 247

---

### POST `/academic/communications`

- **Original path(s)**: `/api/academic/communications`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\class-teacher\workspaces\communication.tsx`: line(s) 18
  - `apps\web\src\components\school\grade-master-command-center.tsx`: line(s) 383, 529

---

### POST `/academic/dean/action`

- **Original path(s)**: `/api/academic/dean/action`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\dean-academics-command-center.tsx`: line(s) 880

---

### POST `/academic/dean/lock-batch`

- **Original path(s)**: `/api/academic/dean/lock-batch`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\dean-academics-command-center.tsx`: line(s) 458

---

### POST `/academic/exams-manager/export-marks`

- **Original path(s)**: `/api/academic/exams-manager/export-marks`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 950

---

### POST `/academic/exams-manager/import-marks`

- **Original path(s)**: `/api/academic/exams-manager/import-marks`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 933

---

### POST `/academic/exams-manager/zeraki-sync`

- **Original path(s)**: `/api/academic/exams-manager/zeraki-sync`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 970

---

### POST `/academic/grade-master/comment`

- **Original path(s)**: `/api/academic/grade-master/comment`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\grade-master-command-center.tsx`: line(s) 599

---

### POST `/academic/grade-master/compile`

- **Original path(s)**: `/api/academic/grade-master/compile`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\grade-master-command-center.tsx`: line(s) 458

---

### POST `/academic/hod/department-meetings`

- **Original path(s)**: `/api/academic/hod/department-meetings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 417

---

### POST `/academic/hod/requests`

- **Original path(s)**: `/api/academic/hod/requests`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 246, 480, 497

---

### POST `/academic/hod/subject-allocation`

- **Original path(s)**: `/api/academic/hod/subject-allocation`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 319

---

### POST `/academic/marks/enter`

- **Original path(s)**: `/api/academic/marks/enter`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\marks-entry-workspace.tsx`: line(s) 50

---

### GET `/academics/academic-terms`

- **Original path(s)**: `/api/academics/academic-terms`, `/academics/academic-terms`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admin\classes-streams-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 17
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 26

---

### GET `/academics/academic-years`

- **Original path(s)**: `/api/academics/academic-years`, `/academics/academic-years`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\admin\classes-streams-workspace.tsx`: line(s) 12
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 26
  - `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx`: line(s) 25
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 27
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 25

---

### POST `/academics/assignments`

- **Original path(s)**: `/api/academics/assignments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\assignments-homework-workspace.tsx`: line(s) 19

---

### GET `/academics/attendance-settings`

- **Original path(s)**: `/api/academics/attendance-settings`, `/academics/attendance-settings`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\data-setup-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 96

---

### POST `/academics/attendance-settings`

- **Original path(s)**: `/api/academics/attendance-settings`, `/academics/attendance-settings`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\data-setup-workspace.tsx`: line(s) 16
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 139

---

### DELETE `/academics/attendance-settings/${id}`

- **Original path(s)**: `/academics/attendance-settings/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 194

---

### GET `/academics/class-sections`

- **Original path(s)**: `/api/academics/class-sections`, `/academics/class-sections`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\admin\classes-streams-workspace.tsx`: line(s) 14
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 16
  - `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx`: line(s) 26
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 28

---

### POST `/academics/class-sections`

- **Original path(s)**: `/api/academics/class-sections`, `/academics/class-sections`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\classes-streams-workspace.tsx`: line(s) 18
  - `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx`: line(s) 43

---

### DELETE `/academics/class-sections/${id}`

- **Original path(s)**: `/academics/class-sections/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx`: line(s) 87

---

### POST `/academics/class-streams`

- **Original path(s)**: `/academics/class-streams`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx`: line(s) 67

---

### GET `/academics/class-teachers`

- **Original path(s)**: `/academics/class-teachers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 30

---

### POST `/academics/class-teachers`

- **Original path(s)**: `/academics/class-teachers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 80

---

### DELETE `/academics/class-teachers/${id}`

- **Original path(s)**: `/academics/class-teachers/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 100

---

### GET `/academics/dean-dataset`

- **Original path(s)**: `/academics/dean-dataset`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\modules\dean-live.ts`: line(s) 9

---

### GET `/academics/departments`

- **Original path(s)**: `/academics/departments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 27

---

### POST `/academics/departments`

- **Original path(s)**: `/academics/departments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 99

---

### DELETE `/academics/departments/${id}`

- **Original path(s)**: `/academics/departments/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 118

---

### GET `/academics/grading-systems`

- **Original path(s)**: `/api/academics/grading-systems`, `/academics/grading-systems`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\data-setup-workspace.tsx`: line(s) 12
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 95

---

### POST `/academics/grading-systems`

- **Original path(s)**: `/api/academics/grading-systems`, `/academics/grading-systems`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\data-setup-workspace.tsx`: line(s) 15
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 117

---

### DELETE `/academics/grading-systems/${id}`

- **Original path(s)**: `/academics/grading-systems/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 183

---

### POST `/academics/lesson-logs`

- **Original path(s)**: `/api/academics/lesson-logs`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\lesson-logs-workspace.tsx`: line(s) 13

---

### GET `/academics/my-assignments`

- **Original path(s)**: `/api/academics/my-assignments`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 182
  - `apps\web\src\components\school\parent\academics-workspace.tsx`: line(s) 10
  - `apps\web\src\components\school\student\academics-workspace.tsx`: line(s) 14
  - `apps\web\src\components\school\teacher\assignments-homework-workspace.tsx`: line(s) 17

---

### GET `/academics/my-lesson-logs`

- **Original path(s)**: `/api/academics/my-lesson-logs`
- **Parameters**: `date`
- **Usages** (2):
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 183
  - `apps\web\src\components\school\teacher\lesson-logs-workspace.tsx`: line(s) 12

---

### GET `/academics/report-card-settings`

- **Original path(s)**: `/academics/report-card-settings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 97

---

### POST `/academics/report-card-settings`

- **Original path(s)**: `/academics/report-card-settings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 161

---

### DELETE `/academics/report-card-settings/${id}`

- **Original path(s)**: `/academics/report-card-settings/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 205

---

### GET `/academics/subjects`

- **Original path(s)**: `/api/academics/subjects`, `/academics/subjects`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 12
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 29
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 26

---

### POST `/academics/subjects`

- **Original path(s)**: `/academics/subjects`, `/api/academics/subjects`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\modules\academics\AcademicSetup.tsx`: line(s) 55, 53
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 19
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 45

---

### GET `/academics/subjects${tenantId `

- **Original path(s)**: `/api/academics/subjects${tenantId `
- **Parameters**: ` `
- **Usages** (1):
  - `apps\web\src\components\modules\academics\AcademicSetup.tsx`: line(s) 30

---

### DELETE `/academics/subjects/${id}`

- **Original path(s)**: `/academics/subjects/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 64

---

### GET `/academics/summary`

- **Original path(s)**: `/api/academics/summary`, `/academics/summary`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\academics-workspace-admin.tsx`: line(s) 35
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 472
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 355

---

### GET `/academics/teacher-assignments`

- **Original path(s)**: `/api/academics/teacher-assignments`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 309
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 4055
  - `apps\web\src\components\school\teacher\subjects-classes-workspace.tsx`: line(s) 9

---

### POST `/academics/teacher-assignments`

- **Original path(s)**: `/api/academics/teacher-assignments`, `/academics/teacher-assignments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 20
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 56

---

### POST `/academics/terms`

- **Original path(s)**: `/academics/terms`, `/api/academics/terms`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\modules\academics\AcademicSetup.tsx`: line(s) 38, 36
  - `apps\web\src\components\school\admin\classes-streams-workspace.tsx`: line(s) 17
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 66

---

### GET `/academics/terms${tenantId `

- **Original path(s)**: `/api/academics/terms${tenantId `
- **Parameters**: ` `
- **Usages** (1):
  - `apps\web\src\components\modules\academics\AcademicSetup.tsx`: line(s) 21

---

### POST `/academics/years`

- **Original path(s)**: `/api/academics/years`, `/academics/years`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admin\classes-streams-workspace.tsx`: line(s) 16
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 43

---

### DELETE `/academics/years/${id}`

- **Original path(s)**: `/academics/years/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 88

---

### GET `/admin-command/accountant/expenses`

- **Original path(s)**: `/admin-command/accountant/expenses`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\accountant\expenses-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admin/imports`

- **Original path(s)**: `/admin-command/admin/imports`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\imports-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admin/students`

- **Original path(s)**: `/admin-command/admin/students`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\students-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/admissions`

- **Original path(s)**: `/admin-command/admissions/admissions`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admissions\admissions-workspace.tsx`: line(s) 27
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 62

---

### POST `/admin-command/admissions/admissions/${id}/admit`

- **Original path(s)**: `/admin-command/admissions/admissions/${id}/admit`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 65

---

### POST `/admin-command/admissions/admissions/${id}/letter`

- **Original path(s)**: `/admin-command/admissions/admissions/${id}/letter`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 68

---

### GET `/admin-command/admissions/applicant-profiles`

- **Original path(s)**: `/admin-command/admissions/applicant-profiles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\applicant-profiles-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/applications`

- **Original path(s)**: `/admin-command/admissions/applications`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 10
  - `apps\web\src\components\school\admissions\applications-workspace.tsx`: line(s) 26
  - `apps\web\src\components\school\admissions-dashboard\applications-workspace.tsx`: line(s) 11

---

### POST `/admin-command/admissions/applications`

- **Original path(s)**: `/admin-command/admissions/applications`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 13

---

### POST `/admin-command/admissions/applications/${id}/status`

- **Original path(s)**: `/admin-command/admissions/applications/${id}/status`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 16

---

### GET `/admin-command/admissions/appointments`

- **Original path(s)**: `/admin-command/admissions/appointments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\appointments-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/class-placement`

- **Original path(s)**: `/admin-command/admissions/class-placement`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 43
  - `apps\web\src\components\school\admissions\class-placement-workspace.tsx`: line(s) 24

---

### POST `/admin-command/admissions/class-placement`

- **Original path(s)**: `/admin-command/admissions/class-placement`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 46

---

### GET `/admin-command/admissions/communication`

- **Original path(s)**: `/admin-command/admissions/communication`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\communication-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/dashboard`

- **Original path(s)**: `/admin-command/admissions/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\registrar-command-center.tsx`: line(s) 1004

---

### GET `/admin-command/admissions/documents`

- **Original path(s)**: `/admin-command/admissions/documents`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 32
  - `apps\web\src\components\school\admissions\documents-workspace.tsx`: line(s) 25
  - `apps\web\src\components\school\admissions-dashboard\documents-workspace.tsx`: line(s) 11

---

### POST `/admin-command/admissions/documents/${id}/verify`

- **Original path(s)**: `/admin-command/admissions/documents/${id}/verify`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 35

---

### POST `/admin-command/admissions/documents/request`

- **Original path(s)**: `/admin-command/admissions/documents/request`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 38

---

### GET `/admin-command/admissions/enquiries`

- **Original path(s)**: `/admin-command/admissions/enquiries`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\enquiries-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/fee-clearance`

- **Original path(s)**: `/admin-command/admissions/fee-clearance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\fee-clearance-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/imports`

- **Original path(s)**: `/admin-command/admissions/imports`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\imports-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/interviews`

- **Original path(s)**: `/admin-command/admissions/interviews`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\admissions\interviews-workspace.tsx`: line(s) 26
  - `apps\web\src\components\school\admissions-dashboard\interviews-workspace.tsx`: line(s) 11

---

### POST `/admin-command/admissions/interviews`

- **Original path(s)**: `/admin-command/admissions/interviews`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 24

---

### POST `/admin-command/admissions/interviews/${id}/outcome`

- **Original path(s)**: `/admin-command/admissions/interviews/${id}/outcome`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 27

---

### GET `/admin-command/admissions/overview`

- **Original path(s)**: `/admin-command/admissions/overview`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\admissions\overview-workspace.tsx`: line(s) 25
  - `apps\web\src\components\school\admissions-dashboard\overview-workspace.tsx`: line(s) 8

---

### GET `/admin-command/admissions/parent-linking`

- **Original path(s)**: `/admin-command/admissions/parent-linking`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 51
  - `apps\web\src\components\school\admissions\parent-linking-workspace.tsx`: line(s) 27

---

### POST `/admin-command/admissions/parent-linking`

- **Original path(s)**: `/admin-command/admissions/parent-linking`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 54

---

### POST `/admin-command/admissions/parent-linking/${id}/invite`

- **Original path(s)**: `/admin-command/admissions/parent-linking/${id}/invite`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 57

---

### GET `/admin-command/admissions/parents`

- **Original path(s)**: `/admin-command/admissions/parents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\parents-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/placement`

- **Original path(s)**: `/admin-command/admissions/placement`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\placement-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/reports`

- **Original path(s)**: `/admin-command/admissions/reports`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 73
  - `apps\web\src\components\school\admissions\reports-workspace.tsx`: line(s) 22
  - `apps\web\src\components\school\admissions-dashboard\reports-workspace.tsx`: line(s) 11

---

### POST `/admin-command/admissions/reports/generate`

- **Original path(s)**: `/admin-command/admissions/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions\api-client.ts`: line(s) 76

---

### GET `/admin-command/admissions/selection`

- **Original path(s)**: `/admin-command/admissions/selection`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\selection-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/tasks`

- **Original path(s)**: `/admin-command/admissions/tasks`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\tasks-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/templates`

- **Original path(s)**: `/admin-command/admissions/templates`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\templates-workspace.tsx`: line(s) 11

---

### GET `/admin-command/admissions/transfers`

- **Original path(s)**: `/admin-command/admissions/transfers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\transfers-workspace.tsx`: line(s) 11

---

### POST `/admin-command/attendance/absences`

- **Original path(s)**: `/admin-command/attendance/absences`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\attendance-workspace.tsx`: line(s) 39

---

### GET `/admin-command/boarding-master/allocation`

- **Original path(s)**: `/admin-command/boarding-master/allocation`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\allocation-workspace.tsx`: line(s) 26
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 32

---

### POST `/admin-command/boarding-master/allocation`

- **Original path(s)**: `/admin-command/boarding-master/allocation`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 35

---

### POST `/admin-command/boarding-master/allocation/${id}/deallocate`

- **Original path(s)**: `/admin-command/boarding-master/allocation/${id}/deallocate`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 38

---

### GET `/admin-command/boarding-master/boarding-attendance`

- **Original path(s)**: `/admin-command/boarding-master/boarding-attendance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 43
  - `apps\web\src\components\school\boarding-master\boarding-attendance-workspace.tsx`: line(s) 25

---

### POST `/admin-command/boarding-master/boarding-attendance`

- **Original path(s)**: `/admin-command/boarding-master/boarding-attendance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 46

---

### GET `/admin-command/boarding-master/hostels`

- **Original path(s)**: `/admin-command/boarding-master/hostels`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 10
  - `apps\web\src\components\school\boarding-master\hostels-workspace.tsx`: line(s) 26

---

### POST `/admin-command/boarding-master/hostels`

- **Original path(s)**: `/admin-command/boarding-master/hostels`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 13

---

### PUT `/admin-command/boarding-master/hostels/${id}`

- **Original path(s)**: `/admin-command/boarding-master/hostels/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 16

---

### GET `/admin-command/boarding-master/incidents`

- **Original path(s)**: `/admin-command/boarding-master/incidents`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 65
  - `apps\web\src\components\school\boarding-master\incidents-workspace.tsx`: line(s) 25

---

### POST `/admin-command/boarding-master/incidents`

- **Original path(s)**: `/admin-command/boarding-master/incidents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 68

---

### POST `/admin-command/boarding-master/incidents/${id}/escalate`

- **Original path(s)**: `/admin-command/boarding-master/incidents/${id}/escalate`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 71

---

### POST `/admin-command/boarding-master/incidents/${id}/resolve`

- **Original path(s)**: `/admin-command/boarding-master/incidents/${id}/resolve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 74

---

### GET `/admin-command/boarding-master/leave-exit`

- **Original path(s)**: `/admin-command/boarding-master/leave-exit`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 51
  - `apps\web\src\components\school\boarding-master\leave-exit-workspace.tsx`: line(s) 27

---

### POST `/admin-command/boarding-master/leave-exit`

- **Original path(s)**: `/admin-command/boarding-master/leave-exit`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 54

---

### POST `/admin-command/boarding-master/leave-exit/${id}/approve`

- **Original path(s)**: `/admin-command/boarding-master/leave-exit/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 57

---

### POST `/admin-command/boarding-master/leave-exit/${id}/reject`

- **Original path(s)**: `/admin-command/boarding-master/leave-exit/${id}/reject`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 60

---

### GET `/admin-command/boarding-master/overview`

- **Original path(s)**: `/admin-command/boarding-master/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\boarding-master\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/boarding-master/reports`

- **Original path(s)**: `/admin-command/boarding-master/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 79
  - `apps\web\src\components\school\boarding-master\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/boarding-master/reports/generate`

- **Original path(s)**: `/admin-command/boarding-master/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 82

---

### GET `/admin-command/boarding-master/rooms-beds`

- **Original path(s)**: `/admin-command/boarding-master/rooms-beds`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\boarding-master\rooms-beds-workspace.tsx`: line(s) 25

---

### POST `/admin-command/boarding-master/rooms-beds`

- **Original path(s)**: `/admin-command/boarding-master/rooms-beds`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 24

---

### POST `/admin-command/boarding-master/rooms-beds/${id}/status`

- **Original path(s)**: `/admin-command/boarding-master/rooms-beds/${id}/status`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master\api-client.ts`: line(s) 27

---

### POST `/admin-command/boarding/assign-bed`

- **Original path(s)**: `/api/admin-command/boarding/assign-bed`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master-command-center.tsx`: line(s) 337

---

### POST `/admin-command/boarding/incidents`

- **Original path(s)**: `/api/admin-command/boarding/incidents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master-command-center.tsx`: line(s) 484

---

### POST `/admin-command/boarding/roll-call`

- **Original path(s)**: `/api/admin-command/boarding/roll-call`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\boarding-master-command-center.tsx`: line(s) 389

---

### GET `/admin-command/class-teacher/attendance-follow-up`

- **Original path(s)**: `/admin-command/class-teacher/attendance-follow-up`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\class-teacher\attendance-follow-up-workspace.tsx`: line(s) 32

---

### POST `/admin-command/class-teacher/attendance-follow-up/${studentId}/notify`

- **Original path(s)**: `/admin-command/class-teacher/attendance-follow-up/${studentId}/notify`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 46

---

### POST `/admin-command/class-teacher/attendance-follow-up/${studentId}/resolve`

- **Original path(s)**: `/admin-command/class-teacher/attendance-follow-up/${studentId}/resolve`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 50

---

### GET `/admin-command/class-teacher/class-academics`

- **Original path(s)**: `/admin-command/class-teacher/class-academics`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\class-teacher\class-academics-workspace.tsx`: line(s) 30

---

### GET `/admin-command/class-teacher/discipline-follow-up`

- **Original path(s)**: `/admin-command/class-teacher/discipline-follow-up`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\class-teacher\discipline-follow-up-workspace.tsx`: line(s) 33

---

### POST `/admin-command/class-teacher/discipline-follow-up/${incidentId}/escalate`

- **Original path(s)**: `/admin-command/class-teacher/discipline-follow-up/${incidentId}/escalate`
- **Parameters**: `incidentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 58

---

### POST `/admin-command/class-teacher/discipline-follow-up/${incidentId}/follow-up`

- **Original path(s)**: `/admin-command/class-teacher/discipline-follow-up/${incidentId}/follow-up`
- **Parameters**: `incidentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 54

---

### GET `/admin-command/class-teacher/learner-profiles`

- **Original path(s)**: `/admin-command/class-teacher/learner-profiles`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\class-teacher\learner-profiles-workspace.tsx`: line(s) 35

---

### POST `/admin-command/class-teacher/learner-profiles/${studentId}/note`

- **Original path(s)**: `/admin-command/class-teacher/learner-profiles/${studentId}/note`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 86

---

### GET `/admin-command/class-teacher/my-class`

- **Original path(s)**: `/admin-command/class-teacher/my-class`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\class-teacher\my-class-workspace.tsx`: line(s) 32

---

### GET `/admin-command/class-teacher/overview`

- **Original path(s)**: `/admin-command/class-teacher/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\class-teacher\overview-workspace.tsx`: line(s) 30

---

### GET `/admin-command/class-teacher/parent-contacts`

- **Original path(s)**: `/admin-command/class-teacher/parent-contacts`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\class-teacher\parent-contacts-workspace.tsx`: line(s) 32

---

### POST `/admin-command/class-teacher/parent-contacts/${parentId}/message`

- **Original path(s)**: `/admin-command/class-teacher/parent-contacts/${parentId}/message`
- **Parameters**: `parentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 78

---

### GET `/admin-command/class-teacher/report-comments`

- **Original path(s)**: `/admin-command/class-teacher/report-comments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 33
  - `apps\web\src\components\school\class-teacher\report-comments-workspace.tsx`: line(s) 32

---

### POST `/admin-command/class-teacher/report-comments/${studentId}`

- **Original path(s)**: `/admin-command/class-teacher/report-comments/${studentId}`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 62

---

### POST `/admin-command/class-teacher/report-comments/submit-all`

- **Original path(s)**: `/admin-command/class-teacher/report-comments/submit-all`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 66

---

### GET `/admin-command/class-teacher/reports`

- **Original path(s)**: `/admin-command/class-teacher/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 37
  - `apps\web\src\components\school\class-teacher\reports-workspace.tsx`: line(s) 30

---

### POST `/admin-command/class-teacher/reports/generate`

- **Original path(s)**: `/admin-command/class-teacher/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 82

---

### GET `/admin-command/class-teacher/welfare-notes`

- **Original path(s)**: `/admin-command/class-teacher/welfare-notes`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 41
  - `apps\web\src\components\school\class-teacher\welfare-notes-workspace.tsx`: line(s) 32

---

### POST `/admin-command/class-teacher/welfare-notes`

- **Original path(s)**: `/admin-command/class-teacher/welfare-notes`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 70

---

### POST `/admin-command/class-teacher/welfare-notes/${noteId}/escalate`

- **Original path(s)**: `/admin-command/class-teacher/welfare-notes/${noteId}/escalate`
- **Parameters**: `noteId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\class-teacher\api-client.ts`: line(s) 74

---

### POST `/admin-command/clinic/visit`

- **Original path(s)**: `/api/admin-command/clinic/visit`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse-command-center.tsx`: line(s) 23

---

### POST `/admin-command/communication-broadcasts`

- **Original path(s)**: `/admin-command/communication-broadcasts`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx`: line(s) 76

---

### GET `/admin-command/communication-templates`

- **Original path(s)**: `/admin-command/communication-templates`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx`: line(s) 25

---

### POST `/admin-command/communication-templates`

- **Original path(s)**: `/admin-command/communication-templates`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx`: line(s) 43

---

### DELETE `/admin-command/communication-templates/${id}`

- **Original path(s)**: `/admin-command/communication-templates/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx`: line(s) 97

---

### GET `/admin-command/dean-academics/academic-interventions`

- **Original path(s)**: `/admin-command/dean-academics/academic-interventions`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\academic-interventions-workspace.tsx`: line(s) 27
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 4

---

### GET `/admin-command/dean-academics/assessments`

- **Original path(s)**: `/admin-command/dean-academics/assessments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 8
  - `apps\web\src\components\school\dean-academics\assessments-workspace.tsx`: line(s) 27

---

### GET `/admin-command/dean-academics/curriculum-coverage`

- **Original path(s)**: `/admin-command/dean-academics/curriculum-coverage`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 12
  - `apps\web\src\components\school\dean-academics\curriculum-coverage-workspace.tsx`: line(s) 27

---

### GET `/admin-command/dean-academics/department-performance`

- **Original path(s)**: `/admin-command/dean-academics/department-performance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 16
  - `apps\web\src\components\school\dean-academics\department-performance-workspace.tsx`: line(s) 26

---

### GET `/admin-command/dean-academics/lesson-logs`

- **Original path(s)**: `/admin-command/dean-academics/lesson-logs`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 20
  - `apps\web\src\components\school\dean-academics\lesson-logs-workspace.tsx`: line(s) 27

---

### GET `/admin-command/dean-academics/lesson-plans`

- **Original path(s)**: `/admin-command/dean-academics/lesson-plans`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 24
  - `apps\web\src\components\school\dean-academics\lesson-plans-workspace.tsx`: line(s) 27

---

### GET `/admin-command/dean-academics/overview`

- **Original path(s)**: `/admin-command/dean-academics/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 28
  - `apps\web\src\components\school\dean-academics\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/dean-academics/reports`

- **Original path(s)**: `/admin-command/dean-academics/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 32
  - `apps\web\src\components\school\dean-academics\reports-workspace.tsx`: line(s) 22

---

### GET `/admin-command/dean-academics/teacher-workload`

- **Original path(s)**: `/admin-command/dean-academics/teacher-workload`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics\api-client.ts`: line(s) 36
  - `apps\web\src\components\school\dean-academics\teacher-workload-workspace.tsx`: line(s) 26

---

### GET `/admin-command/deputy/academics`

- **Original path(s)**: `/admin-command/deputy/academics`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx`: line(s) 30
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 32

---

### POST `/admin-command/deputy/academics/${id}/message-hod`

- **Original path(s)**: `/admin-command/deputy/academics/${id}/message-hod`
- **Parameters**: `id (path)`
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx`: line(s) 35
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 100

---

### POST `/admin-command/deputy/academics/intervention`

- **Original path(s)**: `/admin-command/deputy/academics/intervention`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 132

---

### GET `/admin-command/deputy/approvals`

- **Original path(s)**: `/admin-command/deputy/approvals`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 44
  - `apps\web\src\components\school\deputy-principal\approvals-workspace.tsx`: line(s) 25

---

### POST `/admin-command/deputy/approvals/${id}/action`

- **Original path(s)**: `/admin-command/deputy/approvals/${id}/action`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 108

---

### GET `/admin-command/deputy/attendance`

- **Original path(s)**: `/admin-command/deputy/attendance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 12
  - `apps\web\src\components\school\deputy-principal\attendance-workspace.tsx`: line(s) 28

---

### POST `/admin-command/deputy/attendance/${attendanceId}/notify`

- **Original path(s)**: `/admin-command/deputy/attendance/${attendanceId}/notify`
- **Parameters**: `attendanceId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 64

---

### POST `/admin-command/deputy/attendance/follow-up`

- **Original path(s)**: `/admin-command/deputy/attendance/follow-up`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 120

---

### GET `/admin-command/deputy/classes`

- **Original path(s)**: `/admin-command/deputy/classes`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 40
  - `apps\web\src\components\school\deputy-principal\classes-streams-workspace.tsx`: line(s) 28

---

### POST `/admin-command/deputy/classes/streams`

- **Original path(s)**: `/admin-command/deputy/classes/streams`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 136

---

### GET `/admin-command/deputy/communication`

- **Original path(s)**: `/admin-command/deputy/communication`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 48

---

### GET `/admin-command/deputy/daily-operations`

- **Original path(s)**: `/admin-command/deputy/daily-operations`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 8
  - `apps\web\src\components\school\deputy-principal\daily-operations-workspace.tsx`: line(s) 34

---

### POST `/admin-command/deputy/daily-operations`

- **Original path(s)**: `/admin-command/deputy/daily-operations`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 60

---

### GET `/admin-command/deputy/discipline`

- **Original path(s)**: `/admin-command/deputy/discipline`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 16
  - `apps\web\src\components\school\deputy-principal\discipline-workspace.tsx`: line(s) 32

---

### POST `/admin-command/deputy/discipline`

- **Original path(s)**: `/admin-command/deputy/discipline`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 68

---

### POST `/admin-command/deputy/discipline/${id}/escalate`

- **Original path(s)**: `/admin-command/deputy/discipline/${id}/escalate`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 72

---

### GET `/admin-command/deputy/exams`

- **Original path(s)**: `/admin-command/deputy/exams`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 36
  - `apps\web\src\components\school\deputy-principal\exams-marks-workspace.tsx`: line(s) 26

---

### POST `/admin-command/deputy/exams/${id}/flag-delay`

- **Original path(s)**: `/admin-command/deputy/exams/${id}/flag-delay`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 104

---

### GET `/admin-command/deputy/overview`

- **Original path(s)**: `/admin-command/deputy/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 4
  - `apps\web\src\components\school\deputy-principal\overview-workspace.tsx`: line(s) 31

---

### GET `/admin-command/deputy/reports`

- **Original path(s)**: `/admin-command/deputy/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 52
  - `apps\web\src\components\school\deputy-principal\reports-workspace.tsx`: line(s) 25

---

### POST `/admin-command/deputy/reports/generate`

- **Original path(s)**: `/admin-command/deputy/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 112

---

### GET `/admin-command/deputy/staff`

- **Original path(s)**: `/admin-command/deputy/staff`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 56
  - `apps\web\src\components\school\deputy-principal\staff-roles-workspace.tsx`: line(s) 25

---

### GET `/admin-command/deputy/staff-duty`

- **Original path(s)**: `/admin-command/deputy/staff-duty`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 24
  - `apps\web\src\components\school\deputy-principal\staff-duty-workspace.tsx`: line(s) 28

---

### POST `/admin-command/deputy/staff-duty/${id}/request-report`

- **Original path(s)**: `/admin-command/deputy/staff-duty/${id}/request-report`
- **Parameters**: `id (path)`
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 84
  - `apps\web\src\components\school\deputy-principal\staff-duty-workspace.tsx`: line(s) 34

---

### POST `/admin-command/deputy/staff-duty/roster`

- **Original path(s)**: `/admin-command/deputy/staff-duty/roster`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 124

---

### POST `/admin-command/deputy/staff/assign-role`

- **Original path(s)**: `/admin-command/deputy/staff/assign-role`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 116

---

### GET `/admin-command/deputy/teaching`

- **Original path(s)**: `/admin-command/deputy/teaching`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\teaching-workspace.tsx`: line(s) 26

---

### POST `/admin-command/deputy/teaching/${id}/log-lesson`

- **Original path(s)**: `/admin-command/deputy/teaching/${id}/log-lesson`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 92

---

### POST `/admin-command/deputy/teaching/${id}/mark-attendance`

- **Original path(s)**: `/admin-command/deputy/teaching/${id}/mark-attendance`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 88

---

### GET `/admin-command/deputy/timetable`

- **Original path(s)**: `/admin-command/deputy/timetable`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 28
  - `apps\web\src\components\school\deputy-principal\timetable-relief-workspace.tsx`: line(s) 29

---

### POST `/admin-command/deputy/timetable/${id}/assign`

- **Original path(s)**: `/admin-command/deputy/timetable/${id}/assign`
- **Parameters**: `id (path)`
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 96
  - `apps\web\src\components\school\deputy-principal\timetable-relief-workspace.tsx`: line(s) 32

---

### POST `/admin-command/deputy/timetable/auto-assign`

- **Original path(s)**: `/admin-command/deputy/timetable/auto-assign`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 128

---

### GET `/admin-command/deputy/welfare`

- **Original path(s)**: `/admin-command/deputy/welfare`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 20
  - `apps\web\src\components\school\deputy-principal\welfare-workspace.tsx`: line(s) 31

---

### POST `/admin-command/deputy/welfare`

- **Original path(s)**: `/admin-command/deputy/welfare`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 76
  - `apps\web\src\components\school\deputy-principal\welfare-workspace.tsx`: line(s) 33

---

### POST `/admin-command/deputy/welfare/${id}/open`

- **Original path(s)**: `/admin-command/deputy/welfare/${id}/open`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\api-client.ts`: line(s) 80

---

### POST `/admin-command/discipline/incidents`

- **Original path(s)**: `/admin-command/discipline/incidents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\discipline-workspace.tsx`: line(s) 37

---

### GET `/admin-command/exams-manager/analysis`

- **Original path(s)**: `/admin-command/exams-manager/analysis`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\analysis-workspace.tsx`: line(s) 28
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 25

---

### GET `/admin-command/exams-manager/exam-setup`

- **Original path(s)**: `/admin-command/exams-manager/exam-setup`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\exams-manager\exam-setup-workspace.tsx`: line(s) 34

---

### POST `/admin-command/exams-manager/exam-setup`

- **Original path(s)**: `/admin-command/exams-manager/exam-setup`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 42

---

### GET `/admin-command/exams-manager/exam-timetable`

- **Original path(s)**: `/admin-command/exams-manager/exam-timetable`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\exams-manager\exam-timetable-workspace.tsx`: line(s) 33

---

### POST `/admin-command/exams-manager/exam-timetable`

- **Original path(s)**: `/admin-command/exams-manager/exam-timetable`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 46

---

### GET `/admin-command/exams-manager/marks-entry`

- **Original path(s)**: `/admin-command/exams-manager/marks-entry`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\exams-manager\marks-entry-workspace.tsx`: line(s) 34

---

### POST `/admin-command/exams-manager/marks-entry`

- **Original path(s)**: `/admin-command/exams-manager/marks-entry`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 50

---

### POST `/admin-command/exams-manager/marks-entry/${examId}/lock`

- **Original path(s)**: `/admin-command/exams-manager/marks-entry/${examId}/lock`
- **Parameters**: `examId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 54

---

### GET `/admin-command/exams-manager/moderation`

- **Original path(s)**: `/admin-command/exams-manager/moderation`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\exams-manager\moderation-workspace.tsx`: line(s) 34

---

### POST `/admin-command/exams-manager/moderation/${id}/approve`

- **Original path(s)**: `/admin-command/exams-manager/moderation/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 58

---

### POST `/admin-command/exams-manager/moderation/${id}/reject`

- **Original path(s)**: `/admin-command/exams-manager/moderation/${id}/reject`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 62

---

### GET `/admin-command/exams-manager/overview`

- **Original path(s)**: `/admin-command/exams-manager/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\exams-manager\overview-workspace.tsx`: line(s) 31

---

### GET `/admin-command/exams-manager/publishing`

- **Original path(s)**: `/admin-command/exams-manager/publishing`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 33
  - `apps\web\src\components\school\exams-manager\publishing-workspace.tsx`: line(s) 26

---

### POST `/admin-command/exams-manager/publishing/${examId}/publish`

- **Original path(s)**: `/admin-command/exams-manager/publishing/${examId}/publish`
- **Parameters**: `examId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 70

---

### POST `/admin-command/exams-manager/publishing/${examId}/unpublish`

- **Original path(s)**: `/admin-command/exams-manager/publishing/${examId}/unpublish`
- **Parameters**: `examId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 74

---

### GET `/admin-command/exams-manager/report-cards`

- **Original path(s)**: `/admin-command/exams-manager/report-cards`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\exams-manager\report-cards-workspace.tsx`: line(s) 27

---

### POST `/admin-command/exams-manager/report-cards/${examId}/generate`

- **Original path(s)**: `/admin-command/exams-manager/report-cards/${examId}/generate`
- **Parameters**: `examId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 66

---

### GET `/admin-command/exams-manager/reports`

- **Original path(s)**: `/admin-command/exams-manager/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 37
  - `apps\web\src\components\school\exams-manager\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/exams-manager/reports/generate`

- **Original path(s)**: `/admin-command/exams-manager/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager\api-client.ts`: line(s) 78

---

### GET `/admin-command/exams/academic-setup-approval`

- **Original path(s)**: `/admin-command/exams/academic-setup-approval`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-dashboard\academic-setup-approval-workspace.tsx`: line(s) 11

---

### POST `/admin-command/exams/cycles`

- **Original path(s)**: `/admin-command/exams/cycles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\exams-reports-workspace.tsx`: line(s) 38

---

### GET `/admin-command/exams/readiness`

- **Original path(s)**: `/admin-command/exams/readiness`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-dashboard\exam-readiness-workspace.tsx`: line(s) 11

---

### POST `/admin-command/frontoffice/appointments`

- **Original path(s)**: `/api/admin-command/frontoffice/appointments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 528

---

### POST `/admin-command/frontoffice/dispatch`

- **Original path(s)**: `/api/admin-command/frontoffice/dispatch`
- **Parameters**: None
- **Usages** (10):
  - `apps\web\src\components\school\security-command-center.tsx`: line(s) 251, 266, 546, 597, 650, 665, 721, 772, 826, 841

---

### POST `/admin-command/frontoffice/mail`

- **Original path(s)**: `/api/admin-command/frontoffice/mail`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 674

---

### POST `/admin-command/frontoffice/visitors`

- **Original path(s)**: `/api/admin-command/frontoffice/visitors`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 425

---

### GET `/admin-command/guidance-counselling/follow-ups`

- **Original path(s)**: `/admin-command/guidance-counselling/follow-ups`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\guidance-counselling\follow-ups-workspace.tsx`: line(s) 26

---

### POST `/admin-command/guidance-counselling/follow-ups`

- **Original path(s)**: `/admin-command/guidance-counselling/follow-ups`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 24

---

### POST `/admin-command/guidance-counselling/follow-ups/${id}/done`

- **Original path(s)**: `/admin-command/guidance-counselling/follow-ups/${id}/done`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 27

---

### GET `/admin-command/guidance-counselling/overview`

- **Original path(s)**: `/admin-command/guidance-counselling/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\guidance-counselling\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/guidance-counselling/parent-engagement`

- **Original path(s)**: `/admin-command/guidance-counselling/parent-engagement`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 43
  - `apps\web\src\components\school\guidance-counselling\parent-engagement-workspace.tsx`: line(s) 26

---

### POST `/admin-command/guidance-counselling/parent-engagement`

- **Original path(s)**: `/admin-command/guidance-counselling/parent-engagement`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 46

---

### POST `/admin-command/guidance-counselling/parent-engagement/${id}/notify`

- **Original path(s)**: `/admin-command/guidance-counselling/parent-engagement/${id}/notify`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 49

---

### GET `/admin-command/guidance-counselling/referrals`

- **Original path(s)**: `/admin-command/guidance-counselling/referrals`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 32
  - `apps\web\src\components\school\guidance-counselling\referrals-workspace.tsx`: line(s) 26

---

### POST `/admin-command/guidance-counselling/referrals`

- **Original path(s)**: `/admin-command/guidance-counselling/referrals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 35

---

### POST `/admin-command/guidance-counselling/referrals/${id}/status`

- **Original path(s)**: `/admin-command/guidance-counselling/referrals/${id}/status`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 38

---

### GET `/admin-command/guidance-counselling/reports`

- **Original path(s)**: `/admin-command/guidance-counselling/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 65
  - `apps\web\src\components\school\guidance-counselling\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/guidance-counselling/reports/generate`

- **Original path(s)**: `/admin-command/guidance-counselling/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 68

---

### GET `/admin-command/guidance-counselling/sessions`

- **Original path(s)**: `/admin-command/guidance-counselling/sessions`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 10
  - `apps\web\src\components\school\guidance-counselling\sessions-workspace.tsx`: line(s) 27

---

### POST `/admin-command/guidance-counselling/sessions`

- **Original path(s)**: `/admin-command/guidance-counselling/sessions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 13

---

### POST `/admin-command/guidance-counselling/sessions/${id}/complete`

- **Original path(s)**: `/admin-command/guidance-counselling/sessions/${id}/complete`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 16

---

### GET `/admin-command/guidance-counselling/welfare-notes`

- **Original path(s)**: `/admin-command/guidance-counselling/welfare-notes`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 54
  - `apps\web\src\components\school\guidance-counselling\welfare-notes-workspace.tsx`: line(s) 26

---

### POST `/admin-command/guidance-counselling/welfare-notes`

- **Original path(s)**: `/admin-command/guidance-counselling/welfare-notes`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 57

---

### POST `/admin-command/guidance-counselling/welfare-notes/${id}/flag`

- **Original path(s)**: `/admin-command/guidance-counselling/welfare-notes/${id}/flag`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\guidance-counselling\api-client.ts`: line(s) 60

---

### GET `/admin-command/hod/coverage-review`

- **Original path(s)**: `/admin-command/hod/coverage-review`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 4
  - `apps\web\src\components\school\hod\coverage-review-workspace.tsx`: line(s) 26

---

### GET `/admin-command/hod/department-overview`

- **Original path(s)**: `/admin-command/hod/department-overview`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\hod-dashboard\department-overview-workspace.tsx`: line(s) 11

---

### GET `/admin-command/hod/department-teachers`

- **Original path(s)**: `/admin-command/hod/department-teachers`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 8
  - `apps\web\src\components\school\hod\department-teachers-workspace.tsx`: line(s) 25

---

### GET `/admin-command/hod/lesson-plans`

- **Original path(s)**: `/admin-command/hod/lesson-plans`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 12
  - `apps\web\src\components\school\hod\lesson-plans-workspace.tsx`: line(s) 27

---

### GET `/admin-command/hod/marks-moderation`

- **Original path(s)**: `/admin-command/hod/marks-moderation`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 16
  - `apps\web\src\components\school\hod\marks-moderation-workspace.tsx`: line(s) 28

---

### GET `/admin-command/hod/overview`

- **Original path(s)**: `/admin-command/hod/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 20
  - `apps\web\src\components\school\hod\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/hod/reports`

- **Original path(s)**: `/admin-command/hod/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 24
  - `apps\web\src\components\school\hod\reports-workspace.tsx`: line(s) 22

---

### GET `/admin-command/hod/resource-requests`

- **Original path(s)**: `/admin-command/hod/resource-requests`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 28
  - `apps\web\src\components\school\hod\resource-requests-workspace.tsx`: line(s) 26

---

### GET `/admin-command/hod/review-queue`

- **Original path(s)**: `/admin-command/hod/review-queue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\hod-dashboard\review-queue-workspace.tsx`: line(s) 11

---

### GET `/admin-command/hod/subject-allocation`

- **Original path(s)**: `/admin-command/hod/subject-allocation`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\hod\api-client.ts`: line(s) 32
  - `apps\web\src\components\school\hod\subject-allocation-workspace.tsx`: line(s) 25

---

### GET `/admin-command/ict-manager/asset-assignment`

- **Original path(s)**: `/admin-command/ict-manager/asset-assignment`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\ict-manager\asset-assignment-workspace.tsx`: line(s) 26

---

### POST `/admin-command/ict-manager/asset-assignment`

- **Original path(s)**: `/admin-command/ict-manager/asset-assignment`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 38

---

### POST `/admin-command/ict-manager/asset-assignment/${id}/revoke`

- **Original path(s)**: `/admin-command/ict-manager/asset-assignment/${id}/revoke`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 42

---

### GET `/admin-command/ict-manager/assets`

- **Original path(s)**: `/admin-command/ict-manager/assets`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\ict-manager\assets-workspace.tsx`: line(s) 27

---

### POST `/admin-command/ict-manager/assets`

- **Original path(s)**: `/admin-command/ict-manager/assets`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 34

---

### GET `/admin-command/ict-manager/facilities-issues`

- **Original path(s)**: `/admin-command/ict-manager/facilities-issues`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\ict-manager\facilities-issues-workspace.tsx`: line(s) 26

---

### POST `/admin-command/ict-manager/facilities-issues`

- **Original path(s)**: `/admin-command/ict-manager/facilities-issues`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 62

---

### POST `/admin-command/ict-manager/facilities-issues/${id}/resolve`

- **Original path(s)**: `/admin-command/ict-manager/facilities-issues/${id}/resolve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 66

---

### GET `/admin-command/ict-manager/loans-returns`

- **Original path(s)**: `/admin-command/ict-manager/loans-returns`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\ict-manager\loans-returns-workspace.tsx`: line(s) 26

---

### POST `/admin-command/ict-manager/loans-returns`

- **Original path(s)**: `/admin-command/ict-manager/loans-returns`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 46

---

### POST `/admin-command/ict-manager/loans-returns/${id}/return`

- **Original path(s)**: `/admin-command/ict-manager/loans-returns/${id}/return`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 50

---

### GET `/admin-command/ict-manager/maintenance`

- **Original path(s)**: `/admin-command/ict-manager/maintenance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\ict-manager\maintenance-workspace.tsx`: line(s) 26

---

### POST `/admin-command/ict-manager/maintenance`

- **Original path(s)**: `/admin-command/ict-manager/maintenance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 54

---

### POST `/admin-command/ict-manager/maintenance/${id}/complete`

- **Original path(s)**: `/admin-command/ict-manager/maintenance/${id}/complete`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 58

---

### GET `/admin-command/ict-manager/overview`

- **Original path(s)**: `/admin-command/ict-manager/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\ict-manager\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/ict-manager/reports`

- **Original path(s)**: `/admin-command/ict-manager/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\ict-manager\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/ict-manager/reports/generate`

- **Original path(s)**: `/admin-command/ict-manager/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager\api-client.ts`: line(s) 70

---

### GET `/admin-command/laboratory-technician/apparatus-issue`

- **Original path(s)**: `/admin-command/laboratory-technician/apparatus-issue`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\laboratory-technician\apparatus-issue-workspace.tsx`: line(s) 27

---

### POST `/admin-command/laboratory-technician/apparatus-issue`

- **Original path(s)**: `/admin-command/laboratory-technician/apparatus-issue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 46

---

### POST `/admin-command/laboratory-technician/apparatus-issue/${id}/return`

- **Original path(s)**: `/admin-command/laboratory-technician/apparatus-issue/${id}/return`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 50

---

### GET `/admin-command/laboratory-technician/chemicals`

- **Original path(s)**: `/admin-command/laboratory-technician/chemicals`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\laboratory-technician\chemicals-workspace.tsx`: line(s) 27

---

### POST `/admin-command/laboratory-technician/chemicals`

- **Original path(s)**: `/admin-command/laboratory-technician/chemicals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 38

---

### POST `/admin-command/laboratory-technician/chemicals/${id}/dispose`

- **Original path(s)**: `/admin-command/laboratory-technician/chemicals/${id}/dispose`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 42

---

### GET `/admin-command/laboratory-technician/lab-inventory`

- **Original path(s)**: `/admin-command/laboratory-technician/lab-inventory`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\laboratory-technician\lab-inventory-workspace.tsx`: line(s) 27

---

### POST `/admin-command/laboratory-technician/lab-inventory`

- **Original path(s)**: `/admin-command/laboratory-technician/lab-inventory`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 34

---

### GET `/admin-command/laboratory-technician/lab-timetable`

- **Original path(s)**: `/admin-command/laboratory-technician/lab-timetable`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\laboratory-technician\lab-timetable-workspace.tsx`: line(s) 27

---

### POST `/admin-command/laboratory-technician/lab-timetable`

- **Original path(s)**: `/admin-command/laboratory-technician/lab-timetable`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 54

---

### GET `/admin-command/laboratory-technician/overview`

- **Original path(s)**: `/admin-command/laboratory-technician/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\laboratory-technician\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/laboratory-technician/reports`

- **Original path(s)**: `/admin-command/laboratory-technician/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\laboratory-technician\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/laboratory-technician/reports/generate`

- **Original path(s)**: `/admin-command/laboratory-technician/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 66

---

### GET `/admin-command/laboratory-technician/safety-incidents`

- **Original path(s)**: `/admin-command/laboratory-technician/safety-incidents`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\laboratory-technician\safety-incidents-workspace.tsx`: line(s) 26

---

### POST `/admin-command/laboratory-technician/safety-incidents`

- **Original path(s)**: `/admin-command/laboratory-technician/safety-incidents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 58

---

### POST `/admin-command/laboratory-technician/safety-incidents/${id}/resolve`

- **Original path(s)**: `/admin-command/laboratory-technician/safety-incidents/${id}/resolve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\laboratory-technician\api-client.ts`: line(s) 62

---

### GET `/admin-command/librarian/books`

- **Original path(s)**: `/admin-command/librarian/books`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\librarian\books-workspace.tsx`: line(s) 32

---

### POST `/admin-command/librarian/books`

- **Original path(s)**: `/admin-command/librarian/books`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 38

---

### DELETE `/admin-command/librarian/books/${bookId}`

- **Original path(s)**: `/admin-command/librarian/books/${bookId}`
- **Parameters**: `bookId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 42

---

### GET `/admin-command/librarian/borrowers`

- **Original path(s)**: `/admin-command/librarian/borrowers`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\librarian\borrowers-workspace.tsx`: line(s) 30

---

### GET `/admin-command/librarian/fines-lost-damaged`

- **Original path(s)**: `/admin-command/librarian/fines-lost-damaged`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\librarian\fines-lost-damaged-workspace.tsx`: line(s) 33

---

### POST `/admin-command/librarian/fines-lost-damaged`

- **Original path(s)**: `/admin-command/librarian/fines-lost-damaged`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 58

---

### POST `/admin-command/librarian/fines-lost-damaged/${fineId}/mark-paid`

- **Original path(s)**: `/admin-command/librarian/fines-lost-damaged/${fineId}/mark-paid`
- **Parameters**: `fineId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 66

---

### POST `/admin-command/librarian/fines-lost-damaged/${fineId}/waive`

- **Original path(s)**: `/admin-command/librarian/fines-lost-damaged/${fineId}/waive`
- **Parameters**: `fineId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 62

---

### GET `/admin-command/librarian/issue-book`

- **Original path(s)**: `/admin-command/librarian/issue-book`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\librarian\issue-book-workspace.tsx`: line(s) 31

---

### POST `/admin-command/librarian/issue-book`

- **Original path(s)**: `/admin-command/librarian/issue-book`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 46

---

### GET `/admin-command/librarian/overdue-books`

- **Original path(s)**: `/admin-command/librarian/overdue-books`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\librarian\overdue-books-workspace.tsx`: line(s) 34

---

### POST `/admin-command/librarian/overdue-books/${borrowerId}/remind`

- **Original path(s)**: `/admin-command/librarian/overdue-books/${borrowerId}/remind`
- **Parameters**: `borrowerId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 54

---

### GET `/admin-command/librarian/overview`

- **Original path(s)**: `/admin-command/librarian/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\librarian\overview-workspace.tsx`: line(s) 30

---

### GET `/admin-command/librarian/reports`

- **Original path(s)**: `/admin-command/librarian/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 33
  - `apps\web\src\components\school\librarian\reports-workspace.tsx`: line(s) 30

---

### POST `/admin-command/librarian/reports/generate`

- **Original path(s)**: `/admin-command/librarian/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 70

---

### GET `/admin-command/librarian/return-book`

- **Original path(s)**: `/admin-command/librarian/return-book`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\librarian\return-book-workspace.tsx`: line(s) 32

---

### POST `/admin-command/librarian/return-book`

- **Original path(s)**: `/admin-command/librarian/return-book`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian\api-client.ts`: line(s) 50

---

### POST `/admin-command/library/add`

- **Original path(s)**: `/api/admin-command/library/add`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian-command-center.tsx`: line(s) 481

---

### POST `/admin-command/library/issue`

- **Original path(s)**: `/api/admin-command/library/issue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian-command-center.tsx`: line(s) 330

---

### POST `/admin-command/library/return`

- **Original path(s)**: `/api/admin-command/library/return`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian-command-center.tsx`: line(s) 434

---

### GET `/admin-command/nurse/dispensing-log`

- **Original path(s)**: `/admin-command/nurse/dispensing-log`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\nurse\dispensing-log-workspace.tsx`: line(s) 28

---

### POST `/admin-command/nurse/dispensing-log`

- **Original path(s)**: `/admin-command/nurse/dispensing-log`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 62

---

### GET `/admin-command/nurse/health-reports`

- **Original path(s)**: `/admin-command/nurse/health-reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\nurse\health-reports-workspace.tsx`: line(s) 28

---

### POST `/admin-command/nurse/health-reports/generate`

- **Original path(s)**: `/admin-command/nurse/health-reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 74

---

### GET `/admin-command/nurse/medicine-inventory`

- **Original path(s)**: `/admin-command/nurse/medicine-inventory`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\nurse\medicine-inventory-workspace.tsx`: line(s) 28

---

### POST `/admin-command/nurse/medicine-inventory`

- **Original path(s)**: `/admin-command/nurse/medicine-inventory`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 54

---

### POST `/admin-command/nurse/medicine-inventory/${medicineId}/adjust`

- **Original path(s)**: `/admin-command/nurse/medicine-inventory/${medicineId}/adjust`
- **Parameters**: `medicineId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 58

---

### GET `/admin-command/nurse/overview`

- **Original path(s)**: `/admin-command/nurse/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\nurse\overview-workspace.tsx`: line(s) 28

---

### GET `/admin-command/nurse/parent-notifications`

- **Original path(s)**: `/admin-command/nurse/parent-notifications`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\nurse\parent-notifications-workspace.tsx`: line(s) 28

---

### POST `/admin-command/nurse/parent-notifications`

- **Original path(s)**: `/admin-command/nurse/parent-notifications`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 66

---

### POST `/admin-command/nurse/parent-notifications/${notificationId}/resend`

- **Original path(s)**: `/admin-command/nurse/parent-notifications/${notificationId}/resend`
- **Parameters**: `notificationId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 70

---

### GET `/admin-command/nurse/sick-bay-queue`

- **Original path(s)**: `/admin-command/nurse/sick-bay-queue`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\nurse\sick-bay-queue-workspace.tsx`: line(s) 27

---

### POST `/admin-command/nurse/sick-bay-queue`

- **Original path(s)**: `/admin-command/nurse/sick-bay-queue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 46

---

### POST `/admin-command/nurse/sick-bay-queue/${entryId}/discharge`

- **Original path(s)**: `/admin-command/nurse/sick-bay-queue/${entryId}/discharge`
- **Parameters**: `entryId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 50

---

### GET `/admin-command/nurse/visits`

- **Original path(s)**: `/admin-command/nurse/visits`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\nurse\visits-workspace.tsx`: line(s) 28

---

### POST `/admin-command/nurse/visits`

- **Original path(s)**: `/admin-command/nurse/visits`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 34

---

### POST `/admin-command/nurse/visits/${visitId}/close`

- **Original path(s)**: `/admin-command/nurse/visits/${visitId}/close`
- **Parameters**: `visitId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 38

---

### POST `/admin-command/nurse/visits/${visitId}/refer`

- **Original path(s)**: `/admin-command/nurse/visits/${visitId}/refer`
- **Parameters**: `visitId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\nurse\api-client.ts`: line(s) 42

---

### GET `/admin-command/parent/dashboard`

- **Original path(s)**: `/admin-command/parent/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\dashboard-workspace.tsx`: line(s) 11

---

### GET `/admin-command/parent/downloads`

- **Original path(s)**: `/admin-command/parent/downloads`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\downloads-workspace.tsx`: line(s) 11

---

### GET `/admin-command/parent/health`

- **Original path(s)**: `/admin-command/parent/health`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\health-workspace.tsx`: line(s) 11

---

### GET `/admin-command/parent/messages`

- **Original path(s)**: `/admin-command/parent/messages`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\messages-workspace.tsx`: line(s) 11

---

### GET `/admin-command/parent/notifications`

- **Original path(s)**: `/admin-command/parent/notifications`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\notifications-workspace.tsx`: line(s) 11

---

### GET `/admin-command/principal/academic-setup`

- **Original path(s)**: `/admin-command/principal/academic-setup`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\academic-setup-workspace.tsx`: line(s) 18
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx`: line(s) 24
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 21

---

### POST `/admin-command/principal/academic-setup/term`

- **Original path(s)**: `/admin-command/principal/academic-setup/term`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 80

---

### POST `/admin-command/principal/academic-setup/year`

- **Original path(s)**: `/admin-command/principal/academic-setup/year`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 77

---

### GET `/admin-command/principal/academics`

- **Original path(s)**: `/admin-command/principal/academics`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\academics-workspace.tsx`: line(s) 27
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\principal-dashboard\academics-workspace.tsx`: line(s) 17
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 45

---

### GET `/admin-command/principal/approvals`

- **Original path(s)**: `/admin-command/principal/approvals`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 53
  - `apps\web\src\components\school\principal\approvals-workspace.tsx`: line(s) 26
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 65
  - `apps\web\src\components\school\principal-dashboard\approvals-workspace.tsx`: line(s) 16

---

### POST `/admin-command/principal/approvals/${approvalId}/action`

- **Original path(s)**: `/admin-command/principal/approvals/${approvalId}/action`
- **Parameters**: `approvalId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 143

---

### GET `/admin-command/principal/attendance`

- **Original path(s)**: `/admin-command/principal/attendance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 41
  - `apps\web\src\components\school\principal-dashboard\attendance-workspace.tsx`: line(s) 24

---

### GET `/admin-command/principal/attendance-monitoring`

- **Original path(s)**: `/admin-command/principal/attendance-monitoring`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 37
  - `apps\web\src\components\school\principal\attendance-monitoring-workspace.tsx`: line(s) 32

---

### POST `/admin-command/principal/attendance-monitoring/${classId}/alert`

- **Original path(s)**: `/admin-command/principal/attendance-monitoring/${classId}/alert`
- **Parameters**: `classId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 117

---

### GET `/admin-command/principal/classes`

- **Original path(s)**: `/admin-command/principal/classes`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx`: line(s) 24

---

### GET `/admin-command/principal/classes-streams`

- **Original path(s)**: `/admin-command/principal/classes-streams`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\principal\classes-streams-workspace.tsx`: line(s) 26

---

### POST `/admin-command/principal/classes-streams`

- **Original path(s)**: `/admin-command/principal/classes-streams`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 85

---

### POST `/admin-command/principal/classes-streams/${classId}/streams`

- **Original path(s)**: `/admin-command/principal/classes-streams/${classId}/streams`
- **Parameters**: `classId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 88

---

### GET `/admin-command/principal/communication`

- **Original path(s)**: `/admin-command/principal/communication`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 57
  - `apps\web\src\components\school\principal\communication-workspace.tsx`: line(s) 31
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 61
  - `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx`: line(s) 24

---

### POST `/admin-command/principal/communication/announcement`

- **Original path(s)**: `/admin-command/principal/communication/announcement`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 148

---

### POST `/admin-command/principal/communication/message`

- **Original path(s)**: `/admin-command/principal/communication/message`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 151

---

### GET `/admin-command/principal/discipline`

- **Original path(s)**: `/admin-command/principal/discipline`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 41
  - `apps\web\src\components\school\principal\discipline-workspace.tsx`: line(s) 28
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 57
  - `apps\web\src\components\school\principal-dashboard\discipline-workspace.tsx`: line(s) 22

---

### POST `/admin-command/principal/discipline/${caseId}/escalate`

- **Original path(s)**: `/admin-command/principal/discipline/${caseId}/escalate`
- **Parameters**: `caseId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 122

---

### POST `/admin-command/principal/discipline/${caseId}/resolve`

- **Original path(s)**: `/admin-command/principal/discipline/${caseId}/resolve`
- **Parameters**: `caseId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 125

---

### GET `/admin-command/principal/exams`

- **Original path(s)**: `/admin-command/principal/exams`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 49
  - `apps\web\src\components\school\principal-dashboard\exams-reports-workspace.tsx`: line(s) 23

---

### GET `/admin-command/principal/exams-report-cards`

- **Original path(s)**: `/admin-command/principal/exams-report-cards`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 45
  - `apps\web\src\components\school\principal\exams-report-cards-workspace.tsx`: line(s) 27

---

### POST `/admin-command/principal/exams-report-cards/${examId}/approve`

- **Original path(s)**: `/admin-command/principal/exams-report-cards/${examId}/approve`
- **Parameters**: `examId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 133

---

### POST `/admin-command/principal/exams-report-cards/${examId}/publish`

- **Original path(s)**: `/admin-command/principal/exams-report-cards/${examId}/publish`
- **Parameters**: `examId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 130

---

### GET `/admin-command/principal/finance-overview`

- **Original path(s)**: `/admin-command/principal/finance-overview`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 49
  - `apps\web\src\components\school\principal\finance-overview-workspace.tsx`: line(s) 25
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 53
  - `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx`: line(s) 22

---

### POST `/admin-command/principal/finance-overview/${expenseId}/approve`

- **Original path(s)**: `/admin-command/principal/finance-overview/${expenseId}/approve`
- **Parameters**: `expenseId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 138

---

### GET `/admin-command/principal/overview`

- **Original path(s)**: `/admin-command/principal/overview`
- **Parameters**: None
- **Usages** (6):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\principal\overview-workspace.tsx`: line(s) 30
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\principal-dashboard\overview-workspace.tsx`: line(s) 23
  - `apps\web\src\lib\data\school-hooks.test.tsx`: line(s) 71, 75

---

### GET `/admin-command/principal/reports`

- **Original path(s)**: `/api/admin-command/principal/reports`, `/admin-command/principal/reports`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\admin\reports-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 61
  - `apps\web\src\components\school\principal\reports-workspace.tsx`: line(s) 22
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 69
  - `apps\web\src\components\school\principal-dashboard\reports-workspace.tsx`: line(s) 23

---

### POST `/admin-command/principal/reports/generate`

- **Original path(s)**: `/admin-command/principal/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 156

---

### GET `/admin-command/principal/school-profile`

- **Original path(s)**: `/admin-command/principal/school-profile`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\principal\school-profile-workspace.tsx`: line(s) 30
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\principal-dashboard\school-profile-workspace.tsx`: line(s) 25

---

### POST `/admin-command/principal/school-profile`

- **Original path(s)**: `/admin-command/principal/school-profile`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 72

---

### POST `/admin-command/principal/school-profile/logo`

- **Original path(s)**: `/admin-command/principal/school-profile/logo`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\school-profile-workspace.tsx`: line(s) 41

---

### GET `/admin-command/principal/settings`

- **Original path(s)**: `/admin-command/principal/settings`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 73
  - `apps\web\src\components\school\principal-dashboard\settings-workspace.tsx`: line(s) 26

---

### GET `/admin-command/principal/setup-checklist`

- **Original path(s)**: `/admin-command/principal/setup-checklist`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 65
  - `apps\web\src\components\school\principal\setup-checklist-workspace.tsx`: line(s) 25
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\principal-dashboard\setup-checklist-workspace.tsx`: line(s) 14

---

### POST `/admin-command/principal/setup-checklist/${itemId}/complete`

- **Original path(s)**: `/admin-command/principal/setup-checklist/${itemId}/complete`
- **Parameters**: `itemId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 161

---

### GET `/admin-command/principal/staff`

- **Original path(s)**: `/admin-command/principal/staff`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 33
  - `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx`: line(s) 25

---

### GET `/admin-command/principal/staff-roles`

- **Original path(s)**: `/admin-command/principal/staff-roles`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\principal\staff-roles-workspace.tsx`: line(s) 27

---

### POST `/admin-command/principal/staff-roles/${staffId}/role`

- **Original path(s)**: `/admin-command/principal/staff-roles/${staffId}/role`
- **Parameters**: `staffId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 104

---

### POST `/admin-command/principal/staff-roles/invite`

- **Original path(s)**: `/admin-command/principal/staff-roles/invite`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 101

---

### GET `/admin-command/principal/students`

- **Original path(s)**: `/admin-command/principal/students`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 33
  - `apps\web\src\components\school\principal\students-workspace.tsx`: line(s) 28
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 37
  - `apps\web\src\components\school\principal-dashboard\students-workspace.tsx`: line(s) 24

---

### POST `/admin-command/principal/students/${studentId}/transfer`

- **Original path(s)**: `/admin-command/principal/students/${studentId}/transfer`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 112

---

### POST `/admin-command/principal/students/admit`

- **Original path(s)**: `/admin-command/principal/students/admit`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 109

---

### GET `/admin-command/principal/subjects`

- **Original path(s)**: `/admin-command/principal/subjects`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx`: line(s) 24

---

### GET `/admin-command/principal/subjects-departments`

- **Original path(s)**: `/admin-command/principal/subjects-departments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\principal\subjects-departments-workspace.tsx`: line(s) 26

---

### POST `/admin-command/principal/subjects-departments/department`

- **Original path(s)**: `/admin-command/principal/subjects-departments/department`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 96

---

### POST `/admin-command/principal/subjects-departments/subject`

- **Original path(s)**: `/admin-command/principal/subjects-departments/subject`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal\api-client.ts`: line(s) 93

---

### GET `/admin-command/principal/teaching`

- **Original path(s)**: `/admin-command/principal/teaching`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\principal-dashboard\api-client.ts`: line(s) 77
  - `apps\web\src\components\school\principal-dashboard\teaching-workspace.tsx`: line(s) 16

---

### GET `/admin-command/procurement-officer/deliveries`

- **Original path(s)**: `/admin-command/procurement-officer/deliveries`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\procurement-officer\deliveries-workspace.tsx`: line(s) 26

---

### POST `/admin-command/procurement-officer/deliveries`

- **Original path(s)**: `/admin-command/procurement-officer/deliveries`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 70

---

### POST `/admin-command/procurement-officer/deliveries/${id}/confirm`

- **Original path(s)**: `/admin-command/procurement-officer/deliveries/${id}/confirm`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 74

---

### GET `/admin-command/procurement-officer/overview`

- **Original path(s)**: `/admin-command/procurement-officer/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\procurement-officer\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/procurement-officer/purchase-orders`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-orders`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\procurement-officer\purchase-orders-workspace.tsx`: line(s) 27

---

### POST `/admin-command/procurement-officer/purchase-orders`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-orders`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 62

---

### POST `/admin-command/procurement-officer/purchase-orders/${id}/approve`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-orders/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 66

---

### GET `/admin-command/procurement-officer/purchase-requests`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-requests`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\procurement-officer\purchase-requests-workspace.tsx`: line(s) 27

---

### POST `/admin-command/procurement-officer/purchase-requests`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 42

---

### POST `/admin-command/procurement-officer/purchase-requests/${id}/approve`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-requests/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 46

---

### POST `/admin-command/procurement-officer/purchase-requests/${id}/reject`

- **Original path(s)**: `/admin-command/procurement-officer/purchase-requests/${id}/reject`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 50

---

### GET `/admin-command/procurement-officer/quotations`

- **Original path(s)**: `/admin-command/procurement-officer/quotations`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\procurement-officer\quotations-workspace.tsx`: line(s) 26

---

### POST `/admin-command/procurement-officer/quotations`

- **Original path(s)**: `/admin-command/procurement-officer/quotations`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 54

---

### POST `/admin-command/procurement-officer/quotations/${id}/select`

- **Original path(s)**: `/admin-command/procurement-officer/quotations/${id}/select`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 58

---

### GET `/admin-command/procurement-officer/reports`

- **Original path(s)**: `/admin-command/procurement-officer/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\procurement-officer\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/procurement-officer/reports/generate`

- **Original path(s)**: `/admin-command/procurement-officer/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 78

---

### GET `/admin-command/procurement-officer/suppliers`

- **Original path(s)**: `/admin-command/procurement-officer/suppliers`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\procurement-officer\suppliers-workspace.tsx`: line(s) 26

---

### POST `/admin-command/procurement-officer/suppliers`

- **Original path(s)**: `/admin-command/procurement-officer/suppliers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 34

---

### PUT `/admin-command/procurement-officer/suppliers/${id}`

- **Original path(s)**: `/admin-command/procurement-officer/suppliers/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\procurement-officer\api-client.ts`: line(s) 38

---

### POST `/admin-command/reports/categories`

- **Original path(s)**: `/admin-command/reports/categories`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\reports-workspace.tsx`: line(s) 36

---

### POST `/admin-command/reports/schedule`

- **Original path(s)**: `/admin-command/reports/schedule`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\reports-workspace.tsx`: line(s) 54

---

### GET `/admin-command/school/operational-blueprint`

- **Original path(s)**: `/admin-command/school/operational-blueprint`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\operational-blueprint-workspace.tsx`: line(s) 11

---

### GET `/admin-command/secretary/appointments`

- **Original path(s)**: `/admin-command/secretary/appointments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 38
  - `apps\web\src\components\school\secretary\appointments-workspace.tsx`: line(s) 33

---

### POST `/admin-command/secretary/appointments`

- **Original path(s)**: `/admin-command/secretary/appointments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 41

---

### POST `/admin-command/secretary/appointments/${id}/cancel`

- **Original path(s)**: `/admin-command/secretary/appointments/${id}/cancel`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 44

---

### POST `/admin-command/secretary/appointments/${id}/confirm`

- **Original path(s)**: `/admin-command/secretary/appointments/${id}/confirm`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 50

---

### POST `/admin-command/secretary/appointments/${id}/reschedule`

- **Original path(s)**: `/admin-command/secretary/appointments/${id}/reschedule`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 47

---

### GET `/admin-command/secretary/calls-log`

- **Original path(s)**: `/admin-command/secretary/calls-log`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 55
  - `apps\web\src\components\school\secretary\calls-log-workspace.tsx`: line(s) 36

---

### POST `/admin-command/secretary/calls-log`

- **Original path(s)**: `/admin-command/secretary/calls-log`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 58

---

### POST `/admin-command/secretary/calls-log/${id}/follow-up`

- **Original path(s)**: `/admin-command/secretary/calls-log/${id}/follow-up`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 61

---

### GET `/admin-command/secretary/dashboard`

- **Original path(s)**: `/admin-command/secretary/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center.tsx`: line(s) 18

---

### GET `/admin-command/secretary/letters-documents`

- **Original path(s)**: `/admin-command/secretary/letters-documents`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 80
  - `apps\web\src\components\school\secretary\letters-documents-workspace.tsx`: line(s) 32

---

### POST `/admin-command/secretary/letters-documents`

- **Original path(s)**: `/admin-command/secretary/letters-documents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 83

---

### POST `/admin-command/secretary/letters-documents/${id}/download`

- **Original path(s)**: `/admin-command/secretary/letters-documents/${id}/download`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 86

---

### POST `/admin-command/secretary/letters-documents/${id}/print`

- **Original path(s)**: `/admin-command/secretary/letters-documents/${id}/print`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 89

---

### GET `/admin-command/secretary/overview`

- **Original path(s)**: `/admin-command/secretary/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\secretary\overview-workspace.tsx`: line(s) 29

---

### GET `/admin-command/secretary/parent-messages`

- **Original path(s)**: `/admin-command/secretary/parent-messages`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 66
  - `apps\web\src\components\school\secretary\parent-messages-workspace.tsx`: line(s) 34

---

### POST `/admin-command/secretary/parent-messages`

- **Original path(s)**: `/admin-command/secretary/parent-messages`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 69

---

### POST `/admin-command/secretary/parent-messages/${id}/read`

- **Original path(s)**: `/admin-command/secretary/parent-messages/${id}/read`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 72

---

### POST `/admin-command/secretary/parent-messages/${id}/reply`

- **Original path(s)**: `/admin-command/secretary/parent-messages/${id}/reply`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 75

---

### GET `/admin-command/secretary/reception-queue`

- **Original path(s)**: `/admin-command/secretary/reception-queue`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 10
  - `apps\web\src\components\school\secretary\reception-queue-workspace.tsx`: line(s) 31

---

### POST `/admin-command/secretary/reception-queue`

- **Original path(s)**: `/admin-command/secretary/reception-queue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 13

---

### POST `/admin-command/secretary/reception-queue/${id}/call`

- **Original path(s)**: `/admin-command/secretary/reception-queue/${id}/call`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 16

---

### POST `/admin-command/secretary/reception-queue/${id}/complete`

- **Original path(s)**: `/admin-command/secretary/reception-queue/${id}/complete`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 19

---

### GET `/admin-command/secretary/reports`

- **Original path(s)**: `/admin-command/secretary/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 111
  - `apps\web\src\components\school\secretary\reports-workspace.tsx`: line(s) 31

---

### POST `/admin-command/secretary/reports/${id}/download`

- **Original path(s)**: `/admin-command/secretary/reports/${id}/download`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 117

---

### POST `/admin-command/secretary/reports/generate`

- **Original path(s)**: `/admin-command/secretary/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 114

---

### GET `/admin-command/secretary/student-clearance`

- **Original path(s)**: `/admin-command/secretary/student-clearance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 94
  - `apps\web\src\components\school\secretary\student-clearance-workspace.tsx`: line(s) 34

---

### POST `/admin-command/secretary/student-clearance`

- **Original path(s)**: `/admin-command/secretary/student-clearance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 97

---

### POST `/admin-command/secretary/student-clearance/${id}/approve`

- **Original path(s)**: `/admin-command/secretary/student-clearance/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 100

---

### POST `/admin-command/secretary/student-clearance/${id}/complete`

- **Original path(s)**: `/admin-command/secretary/student-clearance/${id}/complete`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 103

---

### POST `/admin-command/secretary/student-clearance/${id}/print`

- **Original path(s)**: `/admin-command/secretary/student-clearance/${id}/print`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 106

---

### GET `/admin-command/secretary/visitors`

- **Original path(s)**: `/admin-command/secretary/visitors`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 24
  - `apps\web\src\components\school\secretary\visitors-workspace.tsx`: line(s) 34

---

### POST `/admin-command/secretary/visitors/${id}/check-out`

- **Original path(s)**: `/admin-command/secretary/visitors/${id}/check-out`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 30

---

### POST `/admin-command/secretary/visitors/${id}/print-slip`

- **Original path(s)**: `/admin-command/secretary/visitors/${id}/print-slip`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 33

---

### POST `/admin-command/secretary/visitors/check-in`

- **Original path(s)**: `/admin-command/secretary/visitors/check-in`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary\api-client.ts`: line(s) 27

---

### GET `/admin-command/security-officer/gate-register`

- **Original path(s)**: `/admin-command/security-officer/gate-register`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 10
  - `apps\web\src\components\school\security-officer\gate-register-workspace.tsx`: line(s) 26

---

### POST `/admin-command/security-officer/gate-register`

- **Original path(s)**: `/admin-command/security-officer/gate-register`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 13

---

### POST `/admin-command/security-officer/gate-register/${id}/exit`

- **Original path(s)**: `/admin-command/security-officer/gate-register/${id}/exit`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 16

---

### GET `/admin-command/security-officer/incidents`

- **Original path(s)**: `/admin-command/security-officer/incidents`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 38
  - `apps\web\src\components\school\security-officer\incidents-workspace.tsx`: line(s) 25

---

### POST `/admin-command/security-officer/incidents`

- **Original path(s)**: `/admin-command/security-officer/incidents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 41

---

### POST `/admin-command/security-officer/incidents/${id}/escalate`

- **Original path(s)**: `/admin-command/security-officer/incidents/${id}/escalate`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 44

---

### POST `/admin-command/security-officer/incidents/${id}/resolve`

- **Original path(s)**: `/admin-command/security-officer/incidents/${id}/resolve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 47

---

### GET `/admin-command/security-officer/overview`

- **Original path(s)**: `/admin-command/security-officer/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\security-officer\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/security-officer/reports`

- **Original path(s)**: `/admin-command/security-officer/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 80
  - `apps\web\src\components\school\security-officer\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/security-officer/reports/${id}/download`

- **Original path(s)**: `/admin-command/security-officer/reports/${id}/download`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 86

---

### POST `/admin-command/security-officer/reports/generate`

- **Original path(s)**: `/admin-command/security-officer/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 83

---

### GET `/admin-command/security-officer/staff-movement`

- **Original path(s)**: `/admin-command/security-officer/staff-movement`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 52
  - `apps\web\src\components\school\security-officer\staff-movement-workspace.tsx`: line(s) 25

---

### POST `/admin-command/security-officer/staff-movement/${id}/return`

- **Original path(s)**: `/admin-command/security-officer/staff-movement/${id}/return`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 58

---

### POST `/admin-command/security-officer/staff-movement/departure`

- **Original path(s)**: `/admin-command/security-officer/staff-movement/departure`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 55

---

### GET `/admin-command/security-officer/student-exit-passes`

- **Original path(s)**: `/admin-command/security-officer/student-exit-passes`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 63
  - `apps\web\src\components\school\security-officer\student-exit-passes-workspace.tsx`: line(s) 26

---

### POST `/admin-command/security-officer/student-exit-passes/${id}/exit`

- **Original path(s)**: `/admin-command/security-officer/student-exit-passes/${id}/exit`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 69

---

### POST `/admin-command/security-officer/student-exit-passes/${id}/return`

- **Original path(s)**: `/admin-command/security-officer/student-exit-passes/${id}/return`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 72

---

### POST `/admin-command/security-officer/student-exit-passes/${id}/verify`

- **Original path(s)**: `/admin-command/security-officer/student-exit-passes/${id}/verify`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 66

---

### POST `/admin-command/security-officer/student-exit-passes/flag-unauthorized`

- **Original path(s)**: `/admin-command/security-officer/student-exit-passes/flag-unauthorized`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 75

---

### GET `/admin-command/security-officer/visitors`

- **Original path(s)**: `/admin-command/security-officer/visitors`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\security-officer\visitors-workspace.tsx`: line(s) 27

---

### POST `/admin-command/security-officer/visitors/${id}/check-out`

- **Original path(s)**: `/admin-command/security-officer/visitors/${id}/check-out`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 27

---

### POST `/admin-command/security-officer/visitors/${id}/flag`

- **Original path(s)**: `/admin-command/security-officer/visitors/${id}/flag`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 30

---

### POST `/admin-command/security-officer/visitors/${id}/print-badge`

- **Original path(s)**: `/admin-command/security-officer/visitors/${id}/print-badge`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 33

---

### POST `/admin-command/security-officer/visitors/check-in`

- **Original path(s)**: `/admin-command/security-officer/visitors/check-in`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-officer\api-client.ts`: line(s) 24

---

### GET `/admin-command/storekeeper/damaged-missing`

- **Original path(s)**: `/admin-command/storekeeper/damaged-missing`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\storekeeper\damaged-missing-workspace.tsx`: line(s) 35

---

### POST `/admin-command/storekeeper/damaged-missing`

- **Original path(s)**: `/admin-command/storekeeper/damaged-missing`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 58

---

### POST `/admin-command/storekeeper/damaged-missing/${id}/write-off`

- **Original path(s)**: `/admin-command/storekeeper/damaged-missing/${id}/write-off`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 62

---

### GET `/admin-command/storekeeper/items`

- **Original path(s)**: `/admin-command/storekeeper/items`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\storekeeper\items-workspace.tsx`: line(s) 33

---

### POST `/admin-command/storekeeper/items`

- **Original path(s)**: `/admin-command/storekeeper/items`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 34

---

### DELETE `/admin-command/storekeeper/items/${id}`

- **Original path(s)**: `/admin-command/storekeeper/items/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 42

---

### PATCH `/admin-command/storekeeper/items/${id}`

- **Original path(s)**: `/admin-command/storekeeper/items/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 38

---

### POST `/admin-command/storekeeper/items/issue`

- **Original path(s)**: `/admin-command/storekeeper/items/issue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 50

---

### POST `/admin-command/storekeeper/items/receive`

- **Original path(s)**: `/admin-command/storekeeper/items/receive`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 46

---

### GET `/admin-command/storekeeper/low-stock`

- **Original path(s)**: `/admin-command/storekeeper/low-stock`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\storekeeper\low-stock-workspace.tsx`: line(s) 31

---

### POST `/admin-command/storekeeper/low-stock/${id}/reorder`

- **Original path(s)**: `/admin-command/storekeeper/low-stock/${id}/reorder`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 54

---

### GET `/admin-command/storekeeper/overview`

- **Original path(s)**: `/admin-command/storekeeper/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\storekeeper\overview-workspace.tsx`: line(s) 32

---

### GET `/admin-command/storekeeper/reports`

- **Original path(s)**: `/admin-command/storekeeper/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\storekeeper\reports-workspace.tsx`: line(s) 30

---

### GET `/admin-command/storekeeper/reports/${id}/download`

- **Original path(s)**: `/admin-command/storekeeper/reports/${id}/download`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 94

---

### POST `/admin-command/storekeeper/reports/generate`

- **Original path(s)**: `/admin-command/storekeeper/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 90

---

### GET `/admin-command/storekeeper/requests`

- **Original path(s)**: `/admin-command/storekeeper/requests`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\storekeeper\requests-workspace.tsx`: line(s) 35

---

### POST `/admin-command/storekeeper/requests/${id}/approve`

- **Original path(s)**: `/admin-command/storekeeper/requests/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 78

---

### POST `/admin-command/storekeeper/requests/${id}/fulfill`

- **Original path(s)**: `/admin-command/storekeeper/requests/${id}/fulfill`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 86

---

### POST `/admin-command/storekeeper/requests/${id}/reject`

- **Original path(s)**: `/admin-command/storekeeper/requests/${id}/reject`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 82

---

### GET `/admin-command/storekeeper/stock-in`

- **Original path(s)**: `/admin-command/storekeeper/stock-in`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\stock-in-workspace.tsx`: line(s) 11

---

### GET `/admin-command/storekeeper/stock-issue`

- **Original path(s)**: `/admin-command/storekeeper/stock-issue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\stock-issue-workspace.tsx`: line(s) 11

---

### GET `/admin-command/storekeeper/stocktake`

- **Original path(s)**: `/admin-command/storekeeper/stocktake`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\storekeeper\stocktake-workspace.tsx`: line(s) 34

---

### POST `/admin-command/storekeeper/stocktake`

- **Original path(s)**: `/admin-command/storekeeper/stocktake`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 66

---

### POST `/admin-command/storekeeper/stocktake/${id}/finalize`

- **Original path(s)**: `/admin-command/storekeeper/stocktake/${id}/finalize`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 74

---

### POST `/admin-command/storekeeper/stocktake/${id}/submit`

- **Original path(s)**: `/admin-command/storekeeper/stocktake/${id}/submit`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper\api-client.ts`: line(s) 70

---

### GET `/admin-command/student/dashboard`

- **Original path(s)**: `/admin-command/student/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\student\dashboard-workspace.tsx`: line(s) 11

---

### GET `/admin-command/student/downloads`

- **Original path(s)**: `/admin-command/student/downloads`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\student\downloads-workspace.tsx`: line(s) 11

---

### GET `/admin-command/student/messages`

- **Original path(s)**: `/admin-command/student/messages`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\student\messages-workspace.tsx`: line(s) 11

---

### GET `/admin-command/student/notifications`

- **Original path(s)**: `/admin-command/student/notifications`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\student\notifications-workspace.tsx`: line(s) 11

---

### GET `/admin-command/teacher/academic-setup`

- **Original path(s)**: `/admin-command/teacher/academic-setup`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\academic-setup-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/attendance`

- **Original path(s)**: `/admin-command/teacher/attendance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\teacher-attendance-workspace.tsx`: line(s) 11

---

### GET `/admin-command/teacher/cbc-assessments`

- **Original path(s)**: `/admin-command/teacher/cbc-assessments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\cbc-assessment-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/clubs`

- **Original path(s)**: `/admin-command/teacher/clubs`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\club-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/invigilation`

- **Original path(s)**: `/admin-command/teacher/invigilation`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\invigilation-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/learner-progress`

- **Original path(s)**: `/admin-command/teacher/learner-progress`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\learner-progress-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/lesson-plans`

- **Original path(s)**: `/admin-command/teacher/lesson-plans`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\lesson-plans-workspace.tsx`: line(s) 11

---

### GET `/admin-command/teacher/mark-entry`

- **Original path(s)**: `/admin-command/teacher/mark-entry`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\mark-entry-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/messages`

- **Original path(s)**: `/admin-command/teacher/messages`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\messages-workspace.tsx`: line(s) 11

---

### GET `/admin-command/teacher/notifications`

- **Original path(s)**: `/admin-command/teacher/notifications`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\notifications-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/profile`

- **Original path(s)**: `/admin-command/teacher/profile`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\my-profile-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/reports`

- **Original path(s)**: `/admin-command/teacher/reports`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\teacher\reports-workspace.tsx`: line(s) 11
  - `apps\web\src\components\school\teacher-dashboard\reports-downloads-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/resource-requests`

- **Original path(s)**: `/admin-command/teacher/resource-requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\resource-requests-workspace.tsx`: line(s) 11

---

### GET `/admin-command/teacher/resources`

- **Original path(s)**: `/admin-command/teacher/resources`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\teaching-resources-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/store-requests`

- **Original path(s)**: `/admin-command/teacher/store-requests`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\store-requests-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/student-notes`

- **Original path(s)**: `/admin-command/teacher/student-notes`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\student-notes-workspace.tsx`: line(s) 11

---

### GET `/admin-command/teacher/subject-allocations`

- **Original path(s)**: `/admin-command/teacher/subject-allocations`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\subject-allocations-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/syllabus-coverage`

- **Original path(s)**: `/admin-command/teacher/syllabus-coverage`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\teacher-dashboard\syllabus-coverage-workspace.tsx`: line(s) 12, 10

---

### GET `/admin-command/teacher/utilities`

- **Original path(s)**: `/admin-command/teacher/utilities`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\utilities-workspace.tsx`: line(s) 11

---

### GET `/admin-command/transport-manager/drivers`

- **Original path(s)**: `/admin-command/transport-manager/drivers`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 13
  - `apps\web\src\components\school\transport-manager\drivers-workspace.tsx`: line(s) 25

---

### POST `/admin-command/transport-manager/drivers`

- **Original path(s)**: `/admin-command/transport-manager/drivers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 50

---

### PATCH `/admin-command/transport-manager/drivers/${id}`

- **Original path(s)**: `/admin-command/transport-manager/drivers/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 54

---

### POST `/admin-command/transport-manager/drivers/${id}/suspend`

- **Original path(s)**: `/admin-command/transport-manager/drivers/${id}/suspend`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 58

---

### GET `/admin-command/transport-manager/fuel-maintenance`

- **Original path(s)**: `/admin-command/transport-manager/fuel-maintenance`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 25
  - `apps\web\src\components\school\transport-manager\fuel-maintenance-workspace.tsx`: line(s) 26

---

### POST `/admin-command/transport-manager/fuel-maintenance/fuel`

- **Original path(s)**: `/admin-command/transport-manager/fuel-maintenance/fuel`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 82

---

### POST `/admin-command/transport-manager/fuel-maintenance/maintenance`

- **Original path(s)**: `/admin-command/transport-manager/fuel-maintenance/maintenance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 86

---

### GET `/admin-command/transport-manager/overview`

- **Original path(s)**: `/admin-command/transport-manager/overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 5
  - `apps\web\src\components\school\transport-manager\overview-workspace.tsx`: line(s) 23

---

### GET `/admin-command/transport-manager/reports`

- **Original path(s)**: `/admin-command/transport-manager/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 33
  - `apps\web\src\components\school\transport-manager\reports-workspace.tsx`: line(s) 22

---

### POST `/admin-command/transport-manager/reports/generate`

- **Original path(s)**: `/admin-command/transport-manager/reports/generate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 98

---

### GET `/admin-command/transport-manager/routes`

- **Original path(s)**: `/admin-command/transport-manager/routes`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 17
  - `apps\web\src\components\school\transport-manager\routes-workspace.tsx`: line(s) 25

---

### POST `/admin-command/transport-manager/routes`

- **Original path(s)**: `/admin-command/transport-manager/routes`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 62

---

### PATCH `/admin-command/transport-manager/routes/${id}`

- **Original path(s)**: `/admin-command/transport-manager/routes/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 66

---

### POST `/admin-command/transport-manager/routes/${routeId}/assign-vehicle`

- **Original path(s)**: `/admin-command/transport-manager/routes/${routeId}/assign-vehicle`
- **Parameters**: `routeId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 70

---

### GET `/admin-command/transport-manager/student-transport-list`

- **Original path(s)**: `/admin-command/transport-manager/student-transport-list`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 29
  - `apps\web\src\components\school\transport-manager\student-transport-list-workspace.tsx`: line(s) 25

---

### POST `/admin-command/transport-manager/student-transport-list`

- **Original path(s)**: `/admin-command/transport-manager/student-transport-list`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 90

---

### DELETE `/admin-command/transport-manager/student-transport-list/${id}`

- **Original path(s)**: `/admin-command/transport-manager/student-transport-list/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 94

---

### GET `/admin-command/transport-manager/trips`

- **Original path(s)**: `/admin-command/transport-manager/trips`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 21
  - `apps\web\src\components\school\transport-manager\trips-workspace.tsx`: line(s) 27

---

### POST `/admin-command/transport-manager/trips`

- **Original path(s)**: `/admin-command/transport-manager/trips`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 74

---

### POST `/admin-command/transport-manager/trips/${id}/complete`

- **Original path(s)**: `/admin-command/transport-manager/trips/${id}/complete`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 78

---

### GET `/admin-command/transport-manager/vehicles`

- **Original path(s)**: `/admin-command/transport-manager/vehicles`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 9
  - `apps\web\src\components\school\transport-manager\vehicles-workspace.tsx`: line(s) 26

---

### POST `/admin-command/transport-manager/vehicles`

- **Original path(s)**: `/admin-command/transport-manager/vehicles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 38

---

### PATCH `/admin-command/transport-manager/vehicles/${id}`

- **Original path(s)**: `/admin-command/transport-manager/vehicles/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 42

---

### POST `/admin-command/transport-manager/vehicles/${id}/decommission`

- **Original path(s)**: `/admin-command/transport-manager/vehicles/${id}/decommission`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager\api-client.ts`: line(s) 46

---

### POST `/admin-command/transport/maintenance`

- **Original path(s)**: `/api/admin-command/transport/maintenance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager-command-center.tsx`: line(s) 814

---

### POST `/admin-command/transport/route`

- **Original path(s)**: `/api/admin-command/transport/route`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\transport-manager-command-center.tsx`: line(s) 692

---

### GET `/admissions`

- **Original path(s)**: `/api/admissions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 388

---

### GET `/admissions/applicants`

- **Original path(s)**: `/api/admissions/applicants`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4914

---

### POST `/admissions/applicants`

- **Original path(s)**: `/api/admissions/applicants`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4916

---

### GET `/admissions/applications`

- **Original path(s)**: `/api/admissions/applications`, `/admissions/applications`
- **Parameters**: `status`, `limit`
- **Usages** (3):
  - `apps\web\src\components\school\admissions-dashboard\enrolment-workspace.tsx`: line(s) 21
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 629
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 322

---

### PATCH `/admissions/applications/${encodeURIComponent(record.id)}`

- **Original path(s)**: `/admissions/applications/${encodeURIComponent(record.id)}`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 357

---

### POST `/admissions/applications/${id}/enrol`

- **Original path(s)**: `/api/admissions/applications/${id}/enrol`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\admissions-dashboard\enrolment-workspace.tsx`: line(s) 26

---

### POST `/admissions/applications/${selectedApplicantPreview.id}/approve`

- **Original path(s)**: `/api/admissions/applications/${selectedApplicantPreview.id}/approve`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\registrar-command-center.tsx`: line(s) 1099

---

### POST `/admissions/quick-actions`

- **Original path(s)**: `/api/admissions/quick-actions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\registrar-command-center.tsx`: line(s) 1167

---

### GET `/admissions/students`

- **Original path(s)**: `/api/admissions/students`
- **Parameters**: `${params.toString()}`
- **Usages** (1):
  - `apps\web\src\lib\students\student-lookup.ts`: line(s) 19

---

### GET `/admissions/students/${encodeURIComponent(studentId)}/profile`

- **Original path(s)**: `/api/admissions/students/${encodeURIComponent(studentId)}/profile`
- **Parameters**: `tenantSlug`
- **Usages** (1):
  - `apps\web\src\lib\discipline\discipline-live.ts`: line(s) 256

---

### GET `/ai-insights/dashboard`

- **Original path(s)**: `/api/ai-insights/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\data-quality-workspace.tsx`: line(s) 9

---

### GET `/api${path}`

- **Original path(s)**: `/api${path}`
- **Parameters**: `path (path)`
- **Usages** (1):
  - `apps\web\src\lib\dashboard\school-api-proxy-client.ts`: line(s) 47

---

### GET `/approvals`

- **Original path(s)**: `/approvals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 45

---

### POST `/approvals`

- **Original path(s)**: `/approvals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 46

---

### PATCH `/approvals/${id}/action`

- **Original path(s)**: `/api/approvals/${id}/action`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\lib\client\approvals-api.ts`: line(s) 33

---

### POST `/approvals/${id}/approve`

- **Original path(s)**: `/approvals/${id}/approve`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 48

---

### POST `/approvals/${id}/reject`

- **Original path(s)**: `/approvals/${id}/reject`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 50

---

### GET `/approvals/my-requests`

- **Original path(s)**: `/api/approvals/my-requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\approvals-api.ts`: line(s) 26

---

### PATCH `/approvals/my-requests`

- **Original path(s)**: `/api/approvals/my-requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\approvals-api.ts`: line(s) 20

---

### GET `/approvals/pending`

- **Original path(s)**: `/api/approvals/pending`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\approvals-api.ts`: line(s) 19

---

### GET `/assets`

- **Original path(s)**: `/api/assets`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager-command-center.tsx`: line(s) 231

---

### GET `/assets/dashboard`

- **Original path(s)**: `/api/assets/dashboard`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager-command-center.tsx`: line(s) 38, 134

---

### GET `/attendance${queryParams}`

- **Original path(s)**: `/api/attendance${queryParams}`
- **Parameters**: `queryParams (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useAttendance.ts`: line(s) 21

---

### POST `/attendance/mark`

- **Original path(s)**: `/api/attendance/mark`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useAttendance.ts`: line(s) 25

---

### GET `/auth/csrf`

- **Original path(s)**: `/api/auth/csrf`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\auth\csrf-client.ts`: line(s) 5

---

### GET `/auth/invitations`

- **Original path(s)**: `/api/auth/invitations`
- **Parameters**: `limit`, `offset`
- **Usages** (3):
  - `apps\web\src\components\school\user-management-panel.tsx`: line(s) 83
  - `apps\web\src\components\school\user-management-workspace.tsx`: line(s) 568, 573

---

### POST `/auth/invitations`

- **Original path(s)**: `/api/auth/invitations`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\user-management-panel.tsx`: line(s) 130
  - `apps\web\src\components\school\user-management-workspace.tsx`: line(s) 1013

---

### DELETE `/auth/invitations/${encodeURIComponent(invite.id)}`

- **Original path(s)**: `/api/auth/invitations/${encodeURIComponent(invite.id)}`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-workspace.tsx`: line(s) 834

---

### POST `/auth/invitations/${encodeURIComponent(invite.id)}/resend`

- **Original path(s)**: `/api/auth/invitations/${encodeURIComponent(invite.id)}/resend`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-workspace.tsx`: line(s) 767

---

### DELETE `/auth/invitations/${user.id}`

- **Original path(s)**: `/api/auth/invitations/${user.id}`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-panel.tsx`: line(s) 210

---

### POST `/auth/invitations/${user.id}/resend`

- **Original path(s)**: `/api/auth/invitations/${user.id}/resend`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-panel.tsx`: line(s) 179

---

### POST `/auth/invitations/accept`

- **Original path(s)**: `/api/auth/invitations/accept`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\auth\invitation-client.ts`: line(s) 18

---

### POST `/auth/login`

- **Original path(s)**: `/api/auth/login`, `/auth/login`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\auth\mfa-verification-view.tsx`: line(s) 103
  - `apps\web\src\lib\auth\use-experience-session.ts`: line(s) 119
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 299

---

### POST `/auth/logout`

- **Original path(s)**: `/api/auth/logout`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\platform\superadmin-pages.tsx`: line(s) 535
  - `apps\web\src\lib\auth\use-experience-session.ts`: line(s) 152

---

### GET `/auth/me`

- **Original path(s)**: `/api/auth/me`, `/auth/me`
- **Parameters**: `${query.toString()}`
- **Usages** (2):
  - `apps\web\src\lib\auth\use-experience-session.ts`: line(s) 72
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 317

---

### POST `/auth/parent/otp/request`

- **Original path(s)**: `/api/auth/parent/otp/request`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\auth\portal-login-view.tsx`: line(s) 114

---

### POST `/auth/parent/otp/verify`

- **Original path(s)**: `/api/auth/parent/otp/verify`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\auth\portal-login-view.tsx`: line(s) 136

---

### POST `/auth/refresh`

- **Original path(s)**: `/api/auth/refresh`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\auth\use-experience-session.ts`: line(s) 173

---

### GET `/auth/sessions`

- **Original path(s)**: `/api/auth/sessions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\session-management-panel.tsx`: line(s) 22

---

### POST `/auth/sessions/revoke`

- **Original path(s)**: `/api/auth/sessions/revoke`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\session-management-panel.tsx`: line(s) 24

---

### PATCH `/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role`

- **Original path(s)**: `/api/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-workspace.tsx`: line(s) 924

---

### PATCH `/auth/tenant-users/${encodeURIComponent(user.id)}/status`

- **Original path(s)**: `/api/auth/tenant-users/${encodeURIComponent(user.id)}/status`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-workspace.tsx`: line(s) 683

---

### PATCH `/auth/tenant-users/${user.id}/role`

- **Original path(s)**: `/api/auth/tenant-users/${user.id}/role`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-panel.tsx`: line(s) 274

---

### PATCH `/auth/tenant-users/${user.id}/status`

- **Original path(s)**: `/api/auth/tenant-users/${user.id}/status`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\user-management-panel.tsx`: line(s) 237

---

### GET `/billing/fee-structures`

- **Original path(s)**: `/api/billing/fee-structures`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 281
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 281
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 281
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 379
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1225

---

### POST `/billing/fee-structures`

- **Original path(s)**: `/api/billing/fee-structures`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 578
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 595
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 607
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 676
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1522

---

### POST `/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`

- **Original path(s)**: `/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 627
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 644
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 656
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 725
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1571

---

### GET `/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`

- **Original path(s)**: `/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 740
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 757
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 769
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 838
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1684

---

### POST `/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`

- **Original path(s)**: `/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 680
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 697
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 709
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 778
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1624

---

### GET `/billing/finance-activity`

- **Original path(s)**: `/api/billing/finance-activity`
- **Parameters**: `limit`, `offset`
- **Usages** (8):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 189
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 189
  - `apps\web\src\components\school\accountant\overview-workspace.tsx`: line(s) 37
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 189, 313
  - `apps\web\src\components\school\accountant\receipts-workspace.tsx`: line(s) 33
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 287
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1133

---

### POST `/billing/invoices`

- **Original path(s)**: `/api/billing/invoices`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 795
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 812
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 824
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 893
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1739

---

### GET `/billing/manual-fee-payments`

- **Original path(s)**: `/api/billing/manual-fee-payments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx`: line(s) 322

---

### POST `/billing/manual-fee-payments`

- **Original path(s)**: `/api/billing/manual-fee-payments`
- **Parameters**: None
- **Usages** (6):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 851
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 868
  - `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx`: line(s) 382
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 880
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 949
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1795

---

### POST `/billing/manual-fee-payments/${receipt.id}/${action}`

- **Original path(s)**: `/api/billing/manual-fee-payments/${receipt.id}/${action}`
- **Parameters**: `action (path)`
- **Usages** (1):
  - `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx`: line(s) 447

---

### GET `/billing/reconciliation`

- **Original path(s)**: `/api/billing/reconciliation`
- **Parameters**: `${params.toString()}`
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 250
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 250
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 250
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 348
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1194

---

### GET `/billing/reconciliation/export`

- **Original path(s)**: `/api/billing/reconciliation/export`
- **Parameters**: `${params.toString()}`
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 437
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 454
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 466
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 535
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1381

---

### GET `/billing/student-balances`

- **Original path(s)**: `/api/billing/student-balances`
- **Parameters**: None
- **Usages** (7):
  - `apps\web\src\components\school\accountant\arrears-workspace.tsx`: line(s) 31
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 213
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 213, 313
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 213
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 311
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1157

---

### GET `/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`

- **Original path(s)**: `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 356
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 373
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 385
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 454
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1300

---

### GET `/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`

- **Original path(s)**: `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 389
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 406
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 418
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 487
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1333

---

### GET `/billing/waivers`

- **Original path(s)**: `/api/billing/waivers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\accountant\waivers-discounts-workspace.tsx`: line(s) 37

---

### POST `/billing/waivers`

- **Original path(s)**: `/api/billing/waivers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\accountant\waivers-discounts-workspace.tsx`: line(s) 68

---

### GET `/boarding/dashboard`

- **Original path(s)**: `/api/boarding/dashboard`
- **Parameters**: None
- **Usages** (6):
  - `apps\web\src\components\school\boarding-master-command-center.tsx`: line(s) 231, 291, 316, 331, 383, 478

---

### GET `/boarding/exeats`

- **Original path(s)**: `/api/boarding/exeats`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4935

---

### POST `/boarding/exeats`

- **Original path(s)**: `/api/boarding/exeats`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4937

---

### GET `/boarding/roll-calls`

- **Original path(s)**: `/api/boarding/roll-calls`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4931

---

### POST `/boarding/roll-calls`

- **Original path(s)**: `/api/boarding/roll-calls`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4933

---

### GET `/clinic/analytics/principal${query}`

- **Original path(s)**: `/api/clinic/analytics/principal${query}`
- **Parameters**: `query (path)`
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3600

---

### GET `/clinic/medicines`

- **Original path(s)**: `/clinic/medicines`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 904

---

### GET `/clinic/medicines${query}`

- **Original path(s)**: `/api/clinic/medicines${query}`
- **Parameters**: `query (path)`
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3601

---

### GET `/clinic/medicines/stock`

- **Original path(s)**: `/api/clinic/medicines/stock`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4909

---

### POST `/clinic/medicines/stock`

- **Original path(s)**: `/api/clinic/medicines/stock`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4911

---

### GET `/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history`

- **Original path(s)**: `/api/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\portal\portal-pages.tsx`: line(s) 943

---

### GET `/clinic/parent/students/me/history`

- **Original path(s)**: `/api/clinic/parent/students/me/history`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\clinic-health-workspace.tsx`: line(s) 10

---

### GET `/clinic/visits`

- **Original path(s)**: `/api/clinic/visits`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4905

---

### POST `/clinic/visits`

- **Original path(s)**: `/api/clinic/visits`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4907

---

### GET `/communication/messages`

- **Original path(s)**: `/api/communication/messages`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 647

---

### GET `/communication/sms`

- **Original path(s)**: `/api/communication/sms`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\communication-workspace.tsx`: line(s) 22

---

### POST `/communication/sms`

- **Original path(s)**: `/api/communication/sms`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\deputy-principal\communication-workspace.tsx`: line(s) 30

---

### GET `/communication/summary`

- **Original path(s)**: `/api/communication/summary`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 370, 501, 611

---

### GET `/counselling/${path}${query}`

- **Original path(s)**: `/api/counselling/${path}${query}`
- **Parameters**: `path (path)`, `query (path)`
- **Usages** (1):
  - `apps\web\src\lib\discipline\discipline-live.ts`: line(s) 206

---

### GET `/counselling/dashboard`

- **Original path(s)**: `/api/counselling/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\counsellor-command-center.tsx`: line(s) 142

---

### GET `/counselling/referrals`

- **Original path(s)**: `/api/counselling/referrals`, `/counselling/referrals`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\counsellor-command-center.tsx`: line(s) 143
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 771

---

### POST `/counselling/referrals`

- **Original path(s)**: `/counselling/referrals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 756

---

### GET `/counselling/sessions`

- **Original path(s)**: `/api/counselling/sessions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\counsellor-command-center.tsx`: line(s) 144

---

### GET `/dashboard/feed`

- **Original path(s)**: `/dashboard/feed`
- **Parameters**: `role`, `limit`, `offset`
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 29

---

### GET `/dashboard/layout`

- **Original path(s)**: `/dashboard/layout`, `/api/dashboard/layout`
- **Parameters**: `role`
- **Usages** (3):
  - `apps\web\src\components\dashboard\dashboard-engine.tsx`: line(s) 32
  - `apps\web\src\components\school\admin\overview-workspace.tsx`: line(s) 9
  - `apps\web\src\components\school\teacher\overview-workspace.tsx`: line(s) 9

---

### GET `/dashboard/summary`

- **Original path(s)**: `/api/dashboard/summary`, `/dashboard/summary`
- **Parameters**: `role`
- **Usages** (3):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 791
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 32
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 341

---

### GET `/discipline${queryParams}`

- **Original path(s)**: `/api/discipline${queryParams}`
- **Parameters**: `queryParams (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useDiscipline.ts`: line(s) 21

---

### GET `/discipline/${path}${query}`

- **Original path(s)**: `/api/discipline/${path}${query}`
- **Parameters**: `path (path)`, `query (path)`
- **Usages** (1):
  - `apps\web\src\lib\discipline\discipline-live.ts`: line(s) 176

---

### GET `/discipline/actions-interventions`

- **Original path(s)**: `/discipline/actions-interventions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\actions-interventions-workspace.tsx`: line(s) 14

---

### GET `/discipline/actions-sanctions`

- **Original path(s)**: `/discipline/actions-sanctions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\actions-sanctions-workspace.tsx`: line(s) 14

---

### GET `/discipline/audit-trail`

- **Original path(s)**: `/discipline/audit-trail`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\audit-trail-workspace.tsx`: line(s) 14

---

### GET `/discipline/cases`

- **Original path(s)**: `/discipline/cases`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\cases-workspace.tsx`: line(s) 14

---

### POST `/discipline/cases`

- **Original path(s)**: `/api/discipline/cases`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useDiscipline.ts`: line(s) 25

---

### PATCH `/discipline/cases/${caseId}`

- **Original path(s)**: `/api/discipline/cases/${caseId}`
- **Parameters**: `caseId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useDiscipline.ts`: line(s) 31

---

### GET `/discipline/class-house-monitoring`

- **Original path(s)**: `/discipline/class-house-monitoring`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\class-house-monitoring-workspace.tsx`: line(s) 14

---

### GET `/discipline/counselling-referrals`

- **Original path(s)**: `/discipline/counselling-referrals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\counselling-referrals-workspace.tsx`: line(s) 14

---

### GET `/discipline/detention-programs`

- **Original path(s)**: `/discipline/detention-programs`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\detention-programs-workspace.tsx`: line(s) 14

---

### GET `/discipline/incident-log`

- **Original path(s)**: `/discipline/incident-log`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\incident-log-workspace.tsx`: line(s) 14

---

### GET `/discipline/incident-register`

- **Original path(s)**: `/discipline/incident-register`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\incident-register-workspace.tsx`: line(s) 14

---

### GET `/discipline/incidents`

- **Original path(s)**: `/discipline/incidents`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 662

---

### POST `/discipline/incidents/${encodeURIComponent(record.id)}/actions`

- **Original path(s)**: `/discipline/incidents/${encodeURIComponent(record.id)}/actions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 734

---

### GET `/discipline/investigations`

- **Original path(s)**: `/discipline/investigations`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\investigations-workspace.tsx`: line(s) 14

---

### GET `/discipline/log-incident`

- **Original path(s)**: `/discipline/log-incident`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\log-incident-workspace.tsx`: line(s) 14

---

### GET `/discipline/overview`

- **Original path(s)**: `/discipline/overview`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\overview-workspace.tsx`: line(s) 14

---

### GET `/discipline/parent-communication`

- **Original path(s)**: `/discipline/parent-communication`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\parent-communication-workspace.tsx`: line(s) 14

---

### GET `/discipline/parent-summons`

- **Original path(s)**: `/discipline/parent-summons`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\parent-summons-workspace.tsx`: line(s) 14

---

### GET `/discipline/parent/incidents`

- **Original path(s)**: `/api/discipline/parent/incidents`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\parent\behavior-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\student\behavior-workspace.tsx`: line(s) 10

---

### GET `/discipline/report-intake`

- **Original path(s)**: `/discipline/report-intake`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\report-intake-workspace.tsx`: line(s) 14

---

### GET `/discipline/reports`

- **Original path(s)**: `/discipline/reports`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\reports-workspace.tsx`: line(s) 14

---

### GET `/discipline/reports-downloads`

- **Original path(s)**: `/discipline/reports-downloads`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\reports-downloads-workspace.tsx`: line(s) 14

---

### GET `/discipline/serious-cases-approvals`

- **Original path(s)**: `/discipline/serious-cases-approvals`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\serious-cases-approvals-workspace.tsx`: line(s) 14

---

### GET `/discipline/settings`

- **Original path(s)**: `/discipline/settings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\settings-workspace.tsx`: line(s) 14

---

### GET `/discipline/student-conduct-profiles`

- **Original path(s)**: `/discipline/student-conduct-profiles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\student-conduct-profiles-workspace.tsx`: line(s) 14

---

### GET `/discipline/students/me/behavior-score`

- **Original path(s)**: `/api/discipline/students/me/behavior-score`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\parent\behavior-workspace.tsx`: line(s) 16
  - `apps\web\src\components\school\student\behavior-workspace.tsx`: line(s) 13

---

### GET `/discipline/templates-rules`

- **Original path(s)**: `/discipline/templates-rules`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\templates-rules-workspace.tsx`: line(s) 14

---

### GET `/discipline/triage-queue`

- **Original path(s)**: `/discipline/triage-queue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\discipline-master\triage-queue-workspace.tsx`: line(s) 14

---

### GET `/events/notifications`

- **Original path(s)**: `/api/events/notifications`
- **Parameters**: `limit`
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3987

---

### POST `/events/notifications/${encodeURIComponent(item.id)}/read`

- **Original path(s)**: `/api/events/notifications/${encodeURIComponent(item.id)}/read`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 4099

---

### POST `/exams/alignment`

- **Original path(s)**: `/api/exams/alignment`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1336

---

### GET `/exams/assessment-components`

- **Original path(s)**: `/exams/assessment-components`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\papers-components-workspace.tsx`: line(s) 13

---

### GET `/exams/assessments`

- **Original path(s)**: `/exams/assessments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx`: line(s) 101
  - `apps\web\src\components\modules\exams-manager\workspaces\imports-templates-workspace.tsx`: line(s) 13

---

### GET `/exams/attendance`

- **Original path(s)**: `/exams/attendance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-attendance-workspace.tsx`: line(s) 13

---

### GET `/exams/audit-logs`

- **Original path(s)**: `/exams/audit-logs`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\audit-logs-workspace.tsx`: line(s) 14

---

### POST `/exams/configuration`

- **Original path(s)**: `/api/exams/configuration`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1334

---

### GET `/exams/dashboard`

- **Original path(s)**: `/api/exams/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1298

---

### GET `/exams/dashboard-stats`

- **Original path(s)**: `/exams/dashboard-stats`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx`: line(s) 13

---

### POST `/exams/draft`

- **Original path(s)**: `/exams/draft`, `/api/exams/draft`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx`: line(s) 25
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1335

---

### GET `/exams/grading-policies`

- **Original path(s)**: `/exams/grading-policies`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-settings-workspace.tsx`: line(s) 13
  - `apps\web\src\components\modules\exams-manager\workspaces\grading-rubrics-workspace.tsx`: line(s) 13

---

### GET `/exams/invigilators`

- **Original path(s)**: `/exams/invigilators`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\invigilation-workspace.tsx`: line(s) 13

---

### POST `/exams/lifecycle`

- **Original path(s)**: `/api/exams/lifecycle`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1339

---

### GET `/exams/mark-entry-windows`

- **Original path(s)**: `/exams/mark-entry-windows`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\marks-monitor-workspace.tsx`: line(s) 13

---

### GET `/exams/mark-versions`

- **Original path(s)**: `/exams/mark-versions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\moderation-workspace.tsx`: line(s) 13

---

### GET `/exams/marks`

- **Original path(s)**: `/api/exams/marks`, `/exams/marks`
- **Parameters**: `exam_series_id`, `subject_id`, `class_section_id`, `exam`
- **Usages** (4):
  - `apps\web\src\components\modules\exams\MarksEntryTable.tsx`: line(s) 33
  - `apps\web\src\components\modules\exams-manager\workspaces\my-marks-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\parent\academics-workspace.tsx`: line(s) 12
  - `apps\web\src\components\school\teacher\marks-entry-workspace.tsx`: line(s) 18

---

### POST `/exams/marks`

- **Original path(s)**: `/api/exams/marks`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1337

---

### POST `/exams/marks/enter`

- **Original path(s)**: `/api/exams/marks/enter`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\modules\exams\MarksEntryTable.tsx`: line(s) 41, 39

---

### GET `/exams/marks/school`

- **Original path(s)**: `/api/exams/marks/school`, `/exams/marks/school`
- **Parameters**: `status`
- **Usages** (2):
  - `apps\web\src\components\school\dean-academics-command-center.tsx`: line(s) 445
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1353

---

### GET `/exams/report-card-batches`

- **Original path(s)**: `/exams/report-card-batches`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\results-processing-workspace.tsx`: line(s) 13

---

### GET `/exams/report-cards`

- **Original path(s)**: `/exams/report-cards`, `/api/exams/report-cards`
- **Parameters**: `status`
- **Usages** (5):
  - `apps\web\src\components\modules\exams-manager\workspaces\approvals-publishing-workspace.tsx`: line(s) 13
  - `apps\web\src\components\modules\exams-manager\workspaces\report-cards-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\parent\academics-workspace.tsx`: line(s) 11
  - `apps\web\src\components\school\student\academics-workspace.tsx`: line(s) 15
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 167

---

### GET `/exams/report-cards/${encodeURIComponent(record.id)}/parent-download`

- **Original path(s)**: `/exams/report-cards/${encodeURIComponent(record.id)}/parent-download`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 207

---

### POST `/exams/report-cards/publish`

- **Original path(s)**: `/exams/report-cards/publish`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 194

---

### POST `/exams/review`

- **Original path(s)**: `/api/exams/review`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\exams-manager-command-center.tsx`: line(s) 1338

---

### GET `/exams/series`

- **Original path(s)**: `/exams/series`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\modules\exams-manager\workspaces\communication-workspace.tsx`: line(s) 13
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-calendar-workspace.tsx`: line(s) 10
  - `apps\web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx`: line(s) 14
  - `apps\web\src\components\modules\exams-manager\workspaces\reports-workspace.tsx`: line(s) 10

---

### POST `/exams/series/${encodeURIComponent(record.id)}/publish`

- **Original path(s)**: `/exams/series/${encodeURIComponent(record.id)}/publish`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1383

---

### GET `/exams/series/${examSeriesId}/readiness${tenantId `

- **Original path(s)**: `/api/exams/series/${examSeriesId}/readiness${tenantId `
- **Parameters**: ` `, `examSeriesId (path)`
- **Usages** (1):
  - `apps\web\src\components\modules\exams\ReportCardGenerator.tsx`: line(s) 20

---

### POST `/exams/series/publish`

- **Original path(s)**: `/api/exams/series/publish`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\modules\exams\ReportCardGenerator.tsx`: line(s) 29, 26

---

### GET `/exams/student-cases`

- **Original path(s)**: `/exams/student-cases`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\student-cases-workspace.tsx`: line(s) 13

---

### GET `/exams/subject-weightings`

- **Original path(s)**: `/exams/subject-weightings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-classes-workspace.tsx`: line(s) 13

---

### GET `/exams/timetable-slots`

- **Original path(s)**: `/exams/timetable-slots`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\exams-manager\workspaces\exam-timetable-workspace.tsx`: line(s) 13

---

### GET `/fees${queryParams}`

- **Original path(s)**: `/api/fees${queryParams}`
- **Parameters**: `queryParams (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useFees.ts`: line(s) 21

---

### POST `/fees/payments`

- **Original path(s)**: `/api/fees/payments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useFees.ts`: line(s) 25

---

### GET `/fees/summary`

- **Original path(s)**: `/api/fees/summary`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useFees.ts`: line(s) 31

---

### GET `/finance/accounts-overview`

- **Original path(s)**: `/api/finance/accounts-overview`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\parent\fees-workspace.tsx`: line(s) 15
  - `apps\web\src\components\school\student\fees-workspace.tsx`: line(s) 10

---

### GET `/finance/balances`

- **Original path(s)**: `/api/finance/balances`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4963

---

### POST `/finance/balances`

- **Original path(s)**: `/api/finance/balances`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4965

---

### GET `/finance/collections`

- **Original path(s)**: `/api/finance/collections`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\fees-workspace.tsx`: line(s) 16

---

### GET `/finance/fee-categories`

- **Original path(s)**: `/finance/fee-categories`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx`: line(s) 23

---

### POST `/finance/fee-categories`

- **Original path(s)**: `/finance/fee-categories`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx`: line(s) 40

---

### DELETE `/finance/fee-categories/${id}`

- **Original path(s)**: `/finance/fee-categories/${id}`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx`: line(s) 86

---

### GET `/finance/invoices`

- **Original path(s)**: `/api/finance/invoices`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\fees-workspace.tsx`: line(s) 17

---

### GET `/finance/payments`

- **Original path(s)**: `/api/finance/payments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4967

---

### POST `/finance/payments`

- **Original path(s)**: `/api/finance/payments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4969

---

### GET `/finance/summary`

- **Original path(s)**: `/api/finance/summary`, `/finance/summary`
- **Parameters**: None
- **Usages** (6):
  - `apps\web\src\components\school\accountant\fee-structures-workspace.tsx`: line(s) 173
  - `apps\web\src\components\school\accountant\invoices-workspace.tsx`: line(s) 173
  - `apps\web\src\components\school\accountant\payments-workspace.tsx`: line(s) 173
  - `apps\web\src\components\school\school-finance-page.tsx`: line(s) 271
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 1117
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 348

---

### POST `/finance/waivers`

- **Original path(s)**: `/finance/waivers`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx`: line(s) 64

---

### GET `/grade-master/overview`

- **Original path(s)**: `/api/grade-master/overview`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\grade-master-command-center.tsx`: line(s) 288

---

### GET `/health`

- **Original path(s)**: `/api/health`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\ict-manager-command-center.tsx`: line(s) 230

---

### GET `/health${queryParams}`

- **Original path(s)**: `/api/health${queryParams}`
- **Parameters**: `queryParams (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useHealth.ts`: line(s) 21

---

### GET `/health/ready`

- **Original path(s)**: `/health/ready`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 327

---

### POST `/health/visits`

- **Original path(s)**: `/api/health/visits`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useHealth.ts`: line(s) 25

---

### GET `/hr/attendance`

- **Original path(s)**: `/api/hr/attendance`
- **Parameters**: `date`
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 21

---

### POST `/hr/attendance`

- **Original path(s)**: `/api/hr/attendance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 33

---

### GET `/hr/departments`

- **Original path(s)**: `/api/hr/departments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 19

---

### POST `/hr/departments`

- **Original path(s)**: `/api/hr/departments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 36

---

### GET `/hr/job-titles`

- **Original path(s)**: `/api/hr/job-titles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 20

---

### POST `/hr/job-titles`

- **Original path(s)**: `/api/hr/job-titles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 37

---

### GET `/hr/leave`

- **Original path(s)**: `/api/hr/leave`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 22

---

### POST `/hr/leave/${vars.id}/status`

- **Original path(s)**: `/api/hr/leave/${vars.id}/status`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 35

---

### POST `/hr/leave/request`

- **Original path(s)**: `/api/hr/leave/request`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 34

---

### GET `/hr/payroll/bands`

- **Original path(s)**: `/api/hr/payroll/bands`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 23

---

### POST `/hr/payroll/bands`

- **Original path(s)**: `/api/hr/payroll/bands`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 39

---

### GET `/hr/payroll/payslips`

- **Original path(s)**: `/api/hr/payroll/payslips`
- **Parameters**: `month`, `year`
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 24

---

### POST `/hr/payroll/payslips`

- **Original path(s)**: `/api/hr/payroll/payslips`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 41

---

### GET `/hr/performance/disciplinary`

- **Original path(s)**: `/api/hr/performance/disciplinary`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 26

---

### POST `/hr/performance/disciplinary`

- **Original path(s)**: `/api/hr/performance/disciplinary`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 43

---

### GET `/hr/performance/reviews`

- **Original path(s)**: `/api/hr/performance/reviews`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 25

---

### POST `/hr/performance/reviews`

- **Original path(s)**: `/api/hr/performance/reviews`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 42

---

### GET `/hr/staff`

- **Original path(s)**: `/api/hr/staff`
- **Parameters**: `department`
- **Usages** (4):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 18
  - `apps\web\src\components\school\admin\subjects-workspace.tsx`: line(s) 15
  - `apps\web\src\components\school\hod-command-center.tsx`: line(s) 239
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 755

---

### POST `/hr/staff/accept-invite`

- **Original path(s)**: `/api/hr/staff/accept-invite`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 31

---

### POST `/hr/staff/approve`

- **Original path(s)**: `/api/hr/staff/approve`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 29

---

### POST `/hr/staff/complete-profile`

- **Original path(s)**: `/api/hr/staff/complete-profile`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 32

---

### POST `/hr/staff/invite`

- **Original path(s)**: `/api/hr/staff/invite`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 28

---

### POST `/hr/staff/reactivate`

- **Original path(s)**: `/api/hr/staff/reactivate`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 30

---

### PATCH `/hr/staff/role`

- **Original path(s)**: `/api/hr/staff/role`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 38

---

### PATCH `/hr/staff/salary`

- **Original path(s)**: `/api/hr/staff/salary`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\staff-records-workspace.tsx`: line(s) 40

---

### GET `/integrations/daraja`

- **Original path(s)**: `/api/integrations/daraja`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3114

---

### PUT `/integrations/daraja`

- **Original path(s)**: `/api/integrations/daraja`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3154

---

### POST `/integrations/daraja/test`

- **Original path(s)**: `/api/integrations/daraja/test`
- **Parameters**: `environment`
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3193

---

### POST `/inventory/damaged-items`

- **Original path(s)**: `/inventory/damaged-items`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\inventory\damaged-items\route.ts`: line(s) 58

---

### GET `/inventory/heatmap`

- **Original path(s)**: `/api/inventory/heatmap`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1289

---

### GET `/inventory/incidents`

- **Original path(s)**: `/api/inventory/incidents`, `/inventory/incidents`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1387
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1062

---

### GET `/inventory/insights`

- **Original path(s)**: `/api/inventory/insights`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1457

---

### GET `/inventory/purchase-orders`

- **Original path(s)**: `/api/inventory/purchase-orders`
- **Parameters**: `limit`
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer-command-center.tsx`: line(s) 37, 89

---

### GET `/inventory/requests`

- **Original path(s)**: `/api/inventory/requests`, `/inventory/requests`
- **Parameters**: `status`
- **Usages** (4):
  - `apps\web\src\components\school\procurement-officer-command-center.tsx`: line(s) 38, 175
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1188
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 540

---

### PATCH `/inventory/requests/${encodeURIComponent(record.id)}/status`

- **Original path(s)**: `/inventory/requests/${encodeURIComponent(record.id)}/status`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 564

---

### POST `/inventory/requisitions`

- **Original path(s)**: `/api/inventory/requisitions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1193

---

### POST `/inventory/stock-issues`

- **Original path(s)**: `/inventory/stock-issues`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\inventory\stock-issues\route.ts`: line(s) 58

---

### GET `/inventory/stock-movements`

- **Original path(s)**: `/api/inventory/stock-movements`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1411

---

### POST `/inventory/stock-receipts`

- **Original path(s)**: `/inventory/stock-receipts`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\inventory\stock-receipts\route.ts`: line(s) 58

---

### POST `/inventory/stock-requests`

- **Original path(s)**: `/inventory/stock-requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\inventory\stock-requests\route.ts`: line(s) 58

---

### POST `/inventory/stock-returns`

- **Original path(s)**: `/inventory/stock-returns`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\inventory\stock-returns\route.ts`: line(s) 58

---

### POST `/inventory/stocktake-sessions`

- **Original path(s)**: `/inventory/stocktake-sessions`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\inventory\stocktake-sessions\route.ts`: line(s) 58

---

### GET `/inventory/summary`

- **Original path(s)**: `/api/inventory/summary`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer-command-center.tsx`: line(s) 39
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1595

---

### GET `/inventory/suppliers`

- **Original path(s)**: `/api/inventory/suppliers`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\procurement-officer-command-center.tsx`: line(s) 133
  - `apps\web\src\components\school\storekeeper-command-center.tsx`: line(s) 1336

---

### GET `/iot${path}`

- **Original path(s)**: `/api/iot${path}`
- **Parameters**: `path (path)`
- **Usages** (1):
  - `apps\web\src\components\modules\iot\iot-module-screen.tsx`: line(s) 440

---

### GET `/iot/dashboard`

- **Original path(s)**: `/api/iot/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\iot\iot-module-screen.tsx`: line(s) 410

---

### GET `/labs/dashboard`

- **Original path(s)**: `/api/labs/dashboard`, `/labs/dashboard`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\laboratory-technician-command-center.tsx`: line(s) 169
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1200

---

### GET `/labs/inventory`

- **Original path(s)**: `/api/labs/inventory`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4950

---

### POST `/labs/inventory`

- **Original path(s)**: `/api/labs/inventory`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4952

---

### GET `/labs/issues`

- **Original path(s)**: `/api/labs/issues`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4958

---

### POST `/labs/issues`

- **Original path(s)**: `/api/labs/issues`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4960

---

### GET `/labs/requests`

- **Original path(s)**: `/api/labs/requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4954

---

### POST `/labs/requests`

- **Original path(s)**: `/api/labs/requests`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4956

---

### GET `/library/books`

- **Original path(s)**: `/api/library/books`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4919

---

### POST `/library/books`

- **Original path(s)**: `/api/library/books`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4921

---

### GET `/library/catalog`

- **Original path(s)**: `/api/library/catalog`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian-command-center.tsx`: line(s) 535

---

### GET `/library/circulation`

- **Original path(s)**: `/api/library/circulation`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian-command-center.tsx`: line(s) 172

---

### POST `/library/circulation/issue`

- **Original path(s)**: `/library/circulation/issue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\library\scan-issue\route.ts`: line(s) 68

---

### POST `/library/circulation/return`

- **Original path(s)**: `/library/circulation/return`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\library\scan-return\route.ts`: line(s) 68

---

### POST `/library/issue`

- **Original path(s)**: `/api/library/issue`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useLibrary.ts`: line(s) 25

---

### POST `/library/issues`

- **Original path(s)**: `/library/issues`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\library\borrowings\route.ts`: line(s) 71

---

### GET `/library/loans`

- **Original path(s)**: `/api/library/loans`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4923

---

### POST `/library/loans`

- **Original path(s)**: `/api/library/loans`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4925

---

### GET `/library/loans${queryParams}`

- **Original path(s)**: `/api/library/loans${queryParams}`
- **Parameters**: `queryParams (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useLibrary.ts`: line(s) 21

---

### PATCH `/library/loans/${loanId}`

- **Original path(s)**: `/api/library/loans/${loanId}`
- **Parameters**: `loanId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useLibrary.ts`: line(s) 31

---

### POST `/library/returns`

- **Original path(s)**: `/library/returns`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\app\api\library\returns\route.ts`: line(s) 71

---

### GET `/library/summary`

- **Original path(s)**: `/api/library/summary`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\librarian-command-center.tsx`: line(s) 171

---

### GET `/notifications`

- **Original path(s)**: `/notifications`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 35

---

### PATCH `/notifications/${id}/read`

- **Original path(s)**: `/notifications/${id}/read`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 36

---

### GET `/observability/alerts`

- **Original path(s)**: `/api/observability/alerts`, `/observability/alerts`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\ict-manager-command-center.tsx`: line(s) 36, 186, 229
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 337

---

### GET `/observability/health`

- **Original path(s)**: `/api/observability/health`, `/observability/health`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\ict-manager-command-center.tsx`: line(s) 37
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 333

---

### POST `/operational-workflows/offline-sync`

- **Original path(s)**: `/api/operational-workflows/offline-sync`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\workflows\offline-sync-engine.ts`: line(s) 80

---

### GET `/operations/reports`

- **Original path(s)**: `/api/operations/reports`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 726, 773

---

### POST `/parent-portal/behavior/acknowledge`

- **Original path(s)**: `/api/parent-portal/behavior/acknowledge`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\behavior-workspace.tsx`: line(s) 30

---

### POST `/parent-portal/fees/pay`

- **Original path(s)**: `/api/parent-portal/fees/pay`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\parent\fees-workspace.tsx`: line(s) 22

---

### GET `/parent/academics`

- **Original path(s)**: `/api/parent/academics`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\parent\parent-command-center.tsx`: line(s) 48

---

### GET `/parent/communication`

- **Original path(s)**: `/api/parent/communication`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\parent\parent-command-center.tsx`: line(s) 88

---

### GET `/parent/dashboard`

- **Original path(s)**: `/api/parent/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\portal\parent-command-center.tsx`: line(s) 745

---

### GET `/parent/finance`

- **Original path(s)**: `/api/parent/finance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\parent\parent-command-center.tsx`: line(s) 68

---

### GET `/parent/overview`

- **Original path(s)**: `/api/parent/overview`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\parent\parent-command-center.tsx`: line(s) 28

---

### POST `/payments`

- **Original path(s)**: `/payments`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\dashboard\erp-pages.tsx`: line(s) 1331

---

### GET `/payments/mpesa/c2b/payments`

- **Original path(s)**: `/api/payments/mpesa/c2b/payments`, `/payments/mpesa/c2b/payments`
- **Parameters**: `status`
- **Usages** (3):
  - `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx`: line(s) 36, 112
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 576

---

### POST `/payments/mpesa/c2b/payments/${encodeURIComponent(record.id)}/reconcile`

- **Original path(s)**: `/payments/mpesa/c2b/payments/${encodeURIComponent(record.id)}/reconcile`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 619

---

### POST `/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`

- **Original path(s)**: `/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`
- **Parameters**: `selectedPaymentId (path)`
- **Usages** (1):
  - `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx`: line(s) 170

---

### GET `/permissions/me`

- **Original path(s)**: `/api/permissions/me`
- **Parameters**: `schoolId`
- **Usages** (2):
  - `apps\web\src\components\providers\permission-context.tsx`: line(s) 29, 25

---

### GET `/platform/audit-logs`

- **Original path(s)**: `/api/platform/audit-logs`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 491

---

### GET `/platform/backups`

- **Original path(s)**: `/api/platform/backups`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 497

---

### GET `/platform/broadcasts`

- **Original path(s)**: `/api/platform/broadcasts`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 485

---

### GET `/platform/gateways`

- **Original path(s)**: `/api/platform/gateways`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 591

---

### GET `/platform/modules`

- **Original path(s)**: `/api/platform/modules`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 233

---

### GET `/platform/reports`

- **Original path(s)**: `/api/platform/reports`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 509

---

### GET `/platform/schools`

- **Original path(s)**: `/api/platform/schools`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 208

---

### GET `/platform/schools/${encodeURIComponent(tenantId)}/modules`

- **Original path(s)**: `/api/platform/schools/${encodeURIComponent(tenantId)}/modules`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 247

---

### GET `/platform/schools/summary`

- **Original path(s)**: `/api/platform/schools/summary`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 219

---

### GET `/platform/security-policies`

- **Original path(s)**: `/api/platform/security-policies`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\platform\workspaces\SecurityPoliciesWorkspace.tsx`: line(s) 13, 10
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 503

---

### GET `/platform/settings`

- **Original path(s)**: `/api/platform/settings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 586

---

### GET `/platform/sms-settings`

- **Original path(s)**: `/api/platform/sms-settings`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\platform\workspaces\PlatformSmsSettingsWorkspace.tsx`: line(s) 14, 11

---

### GET `/platform/templates`

- **Original path(s)**: `/api/platform/templates`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 479

---

### GET `/platform/users`

- **Original path(s)**: `/api/platform/users`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\platform\school-onboarding-client.ts`: line(s) 515

---

### GET `/portals/fees/history${studentId `

- **Original path(s)**: `/api/portals/fees/history${studentId `
- **Parameters**: ` `
- **Usages** (1):
  - `apps\web\src\lib\experiences\portal-api.ts`: line(s) 56

---

### GET `/portals/parent/children`

- **Original path(s)**: `/api/portals/parent/children`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\experiences\portal-api.ts`: line(s) 45

---

### GET `/portals/reports${studentId `

- **Original path(s)**: `/api/portals/reports${studentId `
- **Parameters**: ` `
- **Usages** (1):
  - `apps\web\src\lib\experiences\portal-api.ts`: line(s) 49

---

### GET `/procurement${request.path}`

- **Original path(s)**: `/api/procurement${request.path}`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\modules\procurement\procurement-module-screen.tsx`: line(s) 576

---

### GET `/procurement/dashboard`

- **Original path(s)**: `/api/procurement/dashboard`, `/procurement/dashboard`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\modules\procurement\procurement-module-screen.tsx`: line(s) 462
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 371, 445, 479

---

### POST `/procurement/purchase-orders`

- **Original path(s)**: `/procurement/purchase-orders`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 523

---

### PATCH `/procurement/requests/${encodeURIComponent(record.id)}/approval`

- **Original path(s)**: `/procurement/requests/${encodeURIComponent(record.id)}/approval`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 395

---

### GET `/school/modules/me`

- **Original path(s)**: `/api/school/modules/me`, `/school/modules/me`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 3911
  - `apps\web\src\lib\module-access\server-school-module-access.ts`: line(s) 162

---

### GET `/school/settings`

- **Original path(s)**: `/api/school/settings`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 809

---

### GET `/school/sms/wallet`

- **Original path(s)**: `/api/school/sms/wallet`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 2858

---

### GET `/secretary/inquiries`

- **Original path(s)**: `/api/secretary/inquiries`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4977

---

### POST `/secretary/inquiries`

- **Original path(s)**: `/api/secretary/inquiries`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4979

---

### GET `/secretary/visitors`

- **Original path(s)**: `/api/secretary/visitors`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4973

---

### POST `/secretary/visitors`

- **Original path(s)**: `/api/secretary/visitors`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4975

---

### POST `/sms/send`

- **Original path(s)**: `/api/sms/send`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\school-pages.tsx`: line(s) 2913

---

### POST `/student-portal/assignments/mark-done`

- **Original path(s)**: `/api/student-portal/assignments/mark-done`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\student\academics-workspace.tsx`: line(s) 25

---

### GET `/student/academics`

- **Original path(s)**: `/api/student/academics`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\student\student-command-center.tsx`: line(s) 47

---

### GET `/student/attendance`

- **Original path(s)**: `/api/student/attendance`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\student\student-command-center.tsx`: line(s) 67

---

### GET `/student/dashboard`

- **Original path(s)**: `/api/student/dashboard`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\student-command-center.tsx`: line(s) 9

---

### GET `/student/overview`

- **Original path(s)**: `/api/student/overview`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\student\student-command-center.tsx`: line(s) 27

---

### GET `/students`

- **Original path(s)**: `/api/students`
- **Parameters**: `class`
- **Usages** (2):
  - `apps\web\src\components\school\admin\parents-workspace.tsx`: line(s) 13
  - `apps\web\src\components\school\teacher\marks-entry-workspace.tsx`: line(s) 17

---

### POST `/students`

- **Original path(s)**: `/students`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\students\student-data-service.ts`: line(s) 43

---

### GET `/students${queryParams}`

- **Original path(s)**: `/api/students${queryParams}`, `/students${queryParams}`
- **Parameters**: `queryParams (path)`
- **Usages** (2):
  - `apps\web\src\hooks\useStudents.ts`: line(s) 21
  - `apps\web\src\lib\students\student-data-service.ts`: line(s) 109

---

### GET `/students/${studentId}`

- **Original path(s)**: `/api/students/${studentId}`, `/students/${studentId}`
- **Parameters**: `studentId (path)`
- **Usages** (2):
  - `apps\web\src\hooks\useStudents.ts`: line(s) 25
  - `apps\web\src\lib\students\student-data-service.ts`: line(s) 113

---

### PATCH `/students/${studentId}`

- **Original path(s)**: `/api/students/${studentId}`, `/students/${studentId}`
- **Parameters**: `studentId (path)`
- **Usages** (2):
  - `apps\web\src\hooks\useStudents.ts`: line(s) 39
  - `apps\web\src\lib\students\student-data-service.ts`: line(s) 59

---

### GET `/students/${studentId}/attendance`

- **Original path(s)**: `/api/students/${studentId}/attendance`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useAttendance.ts`: line(s) 12

---

### GET `/students/${studentId}/discipline`

- **Original path(s)**: `/api/students/${studentId}/discipline`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useDiscipline.ts`: line(s) 12

---

### GET `/students/${studentId}/fees`

- **Original path(s)**: `/api/students/${studentId}/fees`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useFees.ts`: line(s) 12

---

### GET `/students/${studentId}/guardians`

- **Original path(s)**: `/api/students/${studentId}/guardians`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useStudents.ts`: line(s) 29

---

### GET `/students/${studentId}/health`

- **Original path(s)**: `/api/students/${studentId}/health`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useHealth.ts`: line(s) 12

---

### GET `/students/${studentId}/library`

- **Original path(s)**: `/api/students/${studentId}/library`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\hooks\useLibrary.ts`: line(s) 12

---

### POST `/students/admit`

- **Original path(s)**: `/api/students/admit`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\hooks\useStudents.ts`: line(s) 35

---

### POST `/students/guardians`

- **Original path(s)**: `/api/students/guardians`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\parents-workspace.tsx`: line(s) 15

---

### GET `/students/guardians/directory`

- **Original path(s)**: `/api/students/guardians/directory`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\admin\parents-workspace.tsx`: line(s) 12

---

### PATCH `/students/lifecycle/${studentId}/archive`

- **Original path(s)**: `/api/students/lifecycle/${studentId}/archive`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 77

---

### POST `/students/lifecycle/${studentId}/enroll`

- **Original path(s)**: `/students/lifecycle/${studentId}/enroll`, `/api/students/lifecycle/${studentId}/enroll`
- **Parameters**: `studentId (path)`
- **Usages** (2):
  - `apps\web\src\lib\students\student-data-service.ts`: line(s) 75
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 15

---

### POST `/students/lifecycle/${studentId}/exit`

- **Original path(s)**: `/api/students/lifecycle/${studentId}/exit`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 66

---

### POST `/students/lifecycle/${studentId}/initiate-clearance`

- **Original path(s)**: `/api/students/lifecycle/${studentId}/initiate-clearance`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 57

---

### POST `/students/lifecycle/${studentId}/place-in-class`

- **Original path(s)**: `/students/lifecycle/${studentId}/place-in-class`, `/api/students/lifecycle/${studentId}/place-in-class`
- **Parameters**: `studentId (path)`
- **Usages** (2):
  - `apps\web\src\lib\students\student-data-service.ts`: line(s) 90
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 24

---

### POST `/students/lifecycle/${studentId}/promote`

- **Original path(s)**: `/api/students/lifecycle/${studentId}/promote`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 35

---

### POST `/students/lifecycle/${studentId}/suspend`

- **Original path(s)**: `/api/students/lifecycle/${studentId}/suspend`
- **Parameters**: `studentId (path)`
- **Usages** (1):
  - `apps\web\src\lib\students\student-lifecycle.api.ts`: line(s) 46

---

### GET `/students/summary/dashboard`

- **Original path(s)**: `/api/students/summary/dashboard`, `/students/summary/dashboard`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\student-directory-workspace.tsx`: line(s) 43
  - `apps\web\src\lib\dashboard\api-client.ts`: line(s) 362

---

### GET `/support${path}`

- **Original path(s)**: `/api/support${path}`
- **Parameters**: `path (path)`
- **Usages** (1):
  - `apps\web\src\lib\support\support-live.ts`: line(s) 638

---

### GET `/support${path}${query `

- **Original path(s)**: `/api/support${path}${query `
- **Parameters**: ` `, `path (path)`
- **Usages** (1):
  - `apps\web\src\lib\support\support-live.ts`: line(s) 607

---

### GET `/support/admin/notifications/dead-letter`

- **Original path(s)**: `/support/admin/notifications/dead-letter`
- **Parameters**: `audience`, `channel`
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1247

---

### POST `/support/admin/notifications/dead-letter/${encodeURIComponent(record.id)}/retry`

- **Original path(s)**: `/support/admin/notifications/dead-letter/${encodeURIComponent(record.id)}/retry`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 1295

---

### GET `/support/counselling`

- **Original path(s)**: `/api/support/counselling`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4989

---

### POST `/support/counselling`

- **Original path(s)**: `/api/support/counselling`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4991

---

### GET `/support/discipline`

- **Original path(s)**: `/api/support/discipline`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4983

---

### POST `/support/discipline`

- **Original path(s)**: `/api/support/discipline`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4985

---

### GET `/support/tickets`

- **Original path(s)**: `/api/support/tickets`
- **Parameters**: `limit`
- **Usages** (3):
  - `apps\web\src\components\school\ict-manager-command-center.tsx`: line(s) 35, 90, 228

---

### POST `/sync/retry`

- **Original path(s)**: `/api/sync/retry`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\sync\SyncCenter.tsx`: line(s) 30

---

### GET `/tasks`

- **Original path(s)**: `/tasks`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 39

---

### POST `/tasks`

- **Original path(s)**: `/tasks`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 40

---

### PATCH `/tasks/${id}/assign`

- **Original path(s)**: `/tasks/${id}/assign`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 42

---

### PATCH `/tasks/${id}/complete`

- **Original path(s)**: `/tasks/${id}/complete`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 41

---

### POST `/test-mutation`

- **Original path(s)**: `/test-mutation`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\lib\data\school-hooks.test.tsx`: line(s) 83, 89

---

### GET `/test-route`

- **Original path(s)**: `/test-route`
- **Parameters**: None
- **Usages** (5):
  - `apps\web\src\lib\data\school-hooks.test.tsx`: line(s) 33, 45, 56, 37, 62

---

### GET `/timetable/my-schedule`

- **Original path(s)**: `/api/timetable/my-schedule`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\teacher\my-timetable-workspace.tsx`: line(s) 23

---

### GET `/transport${path}`

- **Original path(s)**: `/api/transport${path}`
- **Parameters**: `path (path)`
- **Usages** (1):
  - `apps\web\src\components\modules\transport\transport-module-screen.tsx`: line(s) 660

---

### GET `/transport/dashboard`

- **Original path(s)**: `/api/transport/dashboard`, `/transport/dashboard`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\modules\transport\transport-module-screen.tsx`: line(s) 630
  - `apps\web\src\components\school\transport-manager-command-center.tsx`: line(s) 481, 604
  - `apps\web\src\components\workflows\approval-command-panel.tsx`: line(s) 933

---

### GET `/transport/trips`

- **Original path(s)**: `/api/transport/trips`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4945

---

### POST `/transport/trips`

- **Original path(s)**: `/api/transport/trips`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4947

---

### GET `/transport/vehicles`

- **Original path(s)**: `/api/transport/vehicles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4941

---

### POST `/transport/vehicles`

- **Original path(s)**: `/api/transport/vehicles`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\role-operational-command-center.tsx`: line(s) 4943

---

### GET `/v1/notifications`

- **Original path(s)**: `/api/v1/notifications`
- **Parameters**: `status`
- **Usages** (1):
  - `apps\web\src\components\common\notifications\notification-drawer.tsx`: line(s) 38

---

### PATCH `/v1/notifications/${id}/read`

- **Original path(s)**: `/api/v1/notifications/${id}/read`
- **Parameters**: `id (path)`
- **Usages** (1):
  - `apps\web\src\components\common\notifications\notification-drawer.tsx`: line(s) 60

---

### GET `/v1/notifications/badges`

- **Original path(s)**: `/api/v1/notifications/badges`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\layouts\school-shell.tsx`: line(s) 90

---

### PATCH `/v1/notifications/read-all`

- **Original path(s)**: `/api/v1/notifications/read-all`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\common\notifications\notification-drawer.tsx`: line(s) 74

---

### GET `/visitors/appointments`

- **Original path(s)**: `/api/visitors/appointments`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 582
  - `apps\web\src\components\school\security-command-center.tsx`: line(s) 455

---

### GET `/visitors/dashboard`

- **Original path(s)**: `/api/visitors/dashboard`
- **Parameters**: None
- **Usages** (4):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 288
  - `apps\web\src\components\school\security-command-center.tsx`: line(s) 157, 309, 395

---

### GET `/visitors/logs`

- **Original path(s)**: `/api/visitors/logs`
- **Parameters**: None
- **Usages** (2):
  - `apps\web\src\components\school\secretary-command-center-full.tsx`: line(s) 352, 472

---

### POST `/visitors/logs`

- **Original path(s)**: `/api/visitors/logs`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-command-center.tsx`: line(s) 308

---

### PATCH `/visitors/logs/${recordId}/checkout`

- **Original path(s)**: `/api/visitors/logs/${recordId}/checkout`
- **Parameters**: `recordId (path)`
- **Usages** (3):
  - `apps\web\src\components\school\security-command-center.tsx`: line(s) 327, 327, 328

---

### GET `/visitors/student-exits`

- **Original path(s)**: `/api/visitors/student-exits`
- **Parameters**: None
- **Usages** (1):
  - `apps\web\src\components\school\security-command-center.tsx`: line(s) 498

---

### POST `/workflow/events`

- **Original path(s)**: `/api/workflow/events`, `/workflow/events`
- **Parameters**: None
- **Usages** (3):
  - `apps\web\src\components\school\docx-operational-workspace.tsx`: line(s) 43, 135
  - `apps\web\src\lib\client\dashboard-api.ts`: line(s) 53

---

