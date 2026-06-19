# Frontend API Endpoints Extraction Report

This report lists all backend API endpoints referenced in the frontend React codebase (`apps/web/src`), extracted programmatically via static analysis.

Total endpoints/references found: **799**

## Unique Endpoints Summary

| Endpoint | Method | Hook/Function | Parameter Info | Files & Lines |
| --- | --- | --- | --- | --- |
| `/(id: string) => `/api/admissions/applications/:param/enrol` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admissions-dashboard\enrolment-workspace.tsx:26 |
| `/(vars: { id: string; status: string; reason?: string }) => `/api/hr/leave/:param/status` | **POST** | `useSchoolMutation` | Query: : string }) =>  | apps\web\src\components\school\admin\staff-records-workspace.tsx:35 |
| `/({ id }) => `/admin-command/deputy/academics/:param/message-hod` | **POST** | `useSchoolMutation` | Body: { id: string } | apps\web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx:35 |
| `/({ id }) => `/admin-command/deputy/staff-duty/:param/request-report` | **POST** | `useSchoolMutation` | Body: { id: string } | apps\web\src\components\school\deputy-principal\staff-duty-workspace.tsx:34 |
| `/({ id }) => `/admin-command/deputy/timetable/:param/assign` | **POST** | `useSchoolMutation` | Body: { id: string; teacherName: string } | apps\web\src\components\school\deputy-principal\timetable-relief-workspace.tsx:32 |
| `/:param` | **GET** | `fetch` | Body: requestBody | apps\web\src\lib\dashboard\school-api-proxy-client.ts:47 |
| `/:param/dashboard` | **GET** | `fetch` | N/A | apps\web\src\components\modules\shared\implementation100-live-module.tsx:140 |
| `/:param/records` | **POST** | `fetch` | Body: JSON.stringify({
          title: value(formData | apps\web\src\components\modules\shared\implementation100-live-module.tsx:181 |
| `/:param/records/:param/status` | **PATCH** | `fetch` | Body: JSON.stringify({ status: "completed" | apps\web\src\components\modules\shared\implementation100-live-module.tsx:219 |
| `/academic/communications` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          message: formData.get("message"); Body: JSON.stringify({ type: "bulk_notice"; Body: JSON.stringify({ type: "teacher_message" | apps\web\src\components\school\class-teacher\workspaces\communication.tsx:18<br>apps\web\src\components\school\grade-master-command-center.tsx:383<br>apps\web\src\components\school\grade-master-command-center.tsx:529 |
| `/academic/dean/action` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          action: selectedAction | apps\web\src\components\school\dean-academics-command-center.tsx:880 |
| `/academic/dean/lock-batch` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          schoolId | apps\web\src\components\school\dean-academics-command-center.tsx:458 |
| `/academic/exams-manager/export-marks` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ type: "csv_export" | apps\web\src\components\school\exams-manager-command-center.tsx:950 |
| `/academic/exams-manager/import-marks` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ type: "csv_import" | apps\web\src\components\school\exams-manager-command-center.tsx:933 |
| `/academic/exams-manager/zeraki-sync` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ sync: true | apps\web\src\components\school\exams-manager-command-center.tsx:970 |
| `/academic/grade-master/comment` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ action: "add_comment" | apps\web\src\components\school\grade-master-command-center.tsx:599 |
| `/academic/grade-master/compile` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ action | apps\web\src\components\school\grade-master-command-center.tsx:458 |
| `/academic/hod/department-meetings` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ action: "log_meeting" | apps\web\src\components\school\hod-command-center.tsx:417 |
| `/academic/hod/requests` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ action: "add_teacher"; Body: JSON.stringify({ action: "new_report"; Body: JSON.stringify({ action: "weekly_update" | apps\web\src\components\school\hod-command-center.tsx:246<br>apps\web\src\components\school\hod-command-center.tsx:480<br>apps\web\src\components\school\hod-command-center.tsx:497 |
| `/academic/hod/subject-allocation` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ action: "allocate_subject" | apps\web\src\components\school\hod-command-center.tsx:319 |
| `/academic/marks/enter` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          exam: selectedExam | apps\web\src\components\school\teacher\marks-entry-workspace.tsx:50 |
| `/academics/academic-terms` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\classes-streams-workspace.tsx:13<br>apps\web\src\components\school\admin\subjects-workspace.tsx:17<br>apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:26 |
| `/academics/academic-years` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\classes-streams-workspace.tsx:12<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:26<br>apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:25<br>apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:27<br>apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:25 |
| `/academics/attendance-settings` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\data-setup-workspace.tsx:13<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:96 |
| `/academics/attendance-settings` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: {
          name: formData.get("name") | apps\web\src\components\school\admin\data-setup-workspace.tsx:16<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:139 |
| `/academics/attendance-settings/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:194 |
| `/academics/class-sections` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\classes-streams-workspace.tsx:14<br>apps\web\src\components\school\admin\subjects-workspace.tsx:16<br>apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:26<br>apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:28 |
| `/academics/class-sections` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: {
          academic_year_id: formData.get("academic_year_id") | apps\web\src\components\school\admin\classes-streams-workspace.tsx:18<br>apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:43 |
| `/academics/class-sections/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:87 |
| `/academics/class-streams` | **POST** | `requestDashboardApi` | Body: {
          class_section_id: formData.get("class_section_id") | apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:67 |
| `/academics/class-teachers` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:30 |
| `/academics/class-teachers` | **POST** | `requestDashboardApi` | Body: {
          academic_year_id: formData.get("academic_year_id") | apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:80 |
| `/academics/class-teachers/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:100 |
| `/academics/departments` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:27 |
| `/academics/departments` | **POST** | `requestDashboardApi` | Body: {
          name: formData.get("name") | apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:99 |
| `/academics/departments/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:118 |
| `/academics/grading-systems` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\data-setup-workspace.tsx:12<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:95 |
| `/academics/grading-systems` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: {
          name: formData.get("name") | apps\web\src\components\school\admin\data-setup-workspace.tsx:15<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:117 |
| `/academics/grading-systems/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:183 |
| `/academics/lesson-logs` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\teacher\lesson-logs-workspace.tsx:13 |
| `/academics/my-assignments` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\hod-command-center.tsx:182<br>apps\web\src\components\school\parent\academics-workspace.tsx:10<br>apps\web\src\components\school\student\academics-workspace.tsx:14<br>apps\web\src\components\school\teacher\assignments-homework-workspace.tsx:17 |
| `/academics/my-lesson-logs` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\hod-command-center.tsx:183 |
| `/academics/my-lesson-logs?date=:param` | **GET** | `useSchoolQuery` | Returns: any[] | Query: date=${activeDate} | apps\web\src\components\school\teacher\lesson-logs-workspace.tsx:12 |
| `/academics/report-card-settings` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:97 |
| `/academics/report-card-settings` | **POST** | `requestDashboardApi` | Body: {
          name: formData.get("name") | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:161 |
| `/academics/report-card-settings/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:205 |
| `/academics/subjects` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\subjects-workspace.tsx:12<br>apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:29<br>apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:26 |
| `/academics/subjects` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: data; Body: {
          code: formData.get("code") | apps\web\src\components\modules\academics\AcademicSetup.tsx:55<br>apps\web\src\components\school\admin\subjects-workspace.tsx:19<br>apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:45 |
| `/academics/subjects/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:64 |
| `/academics/subjects:param` : ""}` | **GET** | `fetch` | Query:   | apps\web\src\components\modules\academics\AcademicSetup.tsx:30 |
| `/academics/summary` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\hod-command-center.tsx:472 |
| `/academics/teacher-assignments` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\subjects-workspace.tsx:13<br>apps\web\src\components\school\hod-command-center.tsx:309<br>apps\web\src\components\school\school-pages.tsx:4055<br>apps\web\src\components\school\teacher\subjects-classes-workspace.tsx:9 |
| `/academics/teacher-assignments` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: {
          academic_term_id: formData.get("academic_term_id") | apps\web\src\components\school\admin\subjects-workspace.tsx:20<br>apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:56 |
| `/academics/terms` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: data; Body: {
          academic_year_id: formData.get("academic_year_id") | apps\web\src\components\modules\academics\AcademicSetup.tsx:38<br>apps\web\src\components\school\admin\classes-streams-workspace.tsx:17<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:66 |
| `/academics/terms:param` : ""}` | **GET** | `fetch` | Query:   | apps\web\src\components\modules\academics\AcademicSetup.tsx:21 |
| `/academics/years` | **POST** | `requestDashboardApi, useSchoolMutation` | Body: {
          name: formData.get("name") | apps\web\src\components\school\admin\classes-streams-workspace.tsx:16<br>apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:43 |
| `/academics/years/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:88 |
| `/admin-command/accountant/expenses` | **GET** | `useSchoolQuery` | Returns: ExpensesData | apps\web\src\components\school\accountant\expenses-workspace.tsx:11 |
| `/admin-command/admin/imports` | **GET** | `useSchoolQuery` | Returns: ImportsData | apps\web\src\components\school\admin\imports-workspace.tsx:11 |
| `/admin-command/admin/students` | **GET** | `useSchoolQuery` | Returns: StudentsData | apps\web\src\components\school\admin\students-workspace.tsx:11 |
| `/admin-command/admissions/admissions` | **GET** | `useSchoolQuery` | Returns: AdmissionsData | apps\web\src\components\school\admissions\admissions-workspace.tsx:27 |
| `/admin-command/admissions/applicant-profiles` | **GET** | `useSchoolQuery` | Returns: ApplicantProfilesData | apps\web\src\components\school\admissions-dashboard\applicant-profiles-workspace.tsx:11 |
| `/admin-command/admissions/applications` | **GET** | `useSchoolQuery` | Returns: ApplicationsData | apps\web\src\components\school\admissions-dashboard\applications-workspace.tsx:11<br>apps\web\src\components\school\admissions\applications-workspace.tsx:26 |
| `/admin-command/admissions/appointments` | **GET** | `useSchoolQuery` | Returns: AppointmentsData | apps\web\src\components\school\admissions-dashboard\appointments-workspace.tsx:11 |
| `/admin-command/admissions/class-placement` | **GET** | `useSchoolQuery` | Returns: ClassPlacementData | apps\web\src\components\school\admissions\class-placement-workspace.tsx:24 |
| `/admin-command/admissions/communication` | **GET** | `useSchoolQuery` | Returns: CommunicationData | apps\web\src\components\school\admissions-dashboard\communication-workspace.tsx:11 |
| `/admin-command/admissions/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\registrar-command-center.tsx:1004 |
| `/admin-command/admissions/documents` | **GET** | `useSchoolQuery` | Returns: DocumentsData | apps\web\src\components\school\admissions-dashboard\documents-workspace.tsx:11<br>apps\web\src\components\school\admissions\documents-workspace.tsx:25 |
| `/admin-command/admissions/enquiries` | **GET** | `useSchoolQuery` | Returns: EnquiriesData | apps\web\src\components\school\admissions-dashboard\enquiries-workspace.tsx:11 |
| `/admin-command/admissions/fee-clearance` | **GET** | `useSchoolQuery` | Returns: FeeClearanceData | apps\web\src\components\school\admissions-dashboard\fee-clearance-workspace.tsx:11 |
| `/admin-command/admissions/imports` | **GET** | `useSchoolQuery` | Returns: ImportsData | apps\web\src\components\school\admissions-dashboard\imports-workspace.tsx:11 |
| `/admin-command/admissions/interviews` | **GET** | `useSchoolQuery` | Returns: InterviewsData | apps\web\src\components\school\admissions-dashboard\interviews-workspace.tsx:11<br>apps\web\src\components\school\admissions\interviews-workspace.tsx:26 |
| `/admin-command/admissions/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData; Returns: any | apps\web\src\components\school\admissions-dashboard\overview-workspace.tsx:8<br>apps\web\src\components\school\admissions\overview-workspace.tsx:25 |
| `/admin-command/admissions/parent-linking` | **GET** | `useSchoolQuery` | Returns: ParentLinkingData | apps\web\src\components\school\admissions\parent-linking-workspace.tsx:27 |
| `/admin-command/admissions/parents` | **GET** | `useSchoolQuery` | Returns: ParentsData | apps\web\src\components\school\admissions-dashboard\parents-workspace.tsx:11 |
| `/admin-command/admissions/placement` | **GET** | `useSchoolQuery` | Returns: PlacementData | apps\web\src\components\school\admissions-dashboard\placement-workspace.tsx:11 |
| `/admin-command/admissions/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\admissions-dashboard\reports-workspace.tsx:11<br>apps\web\src\components\school\admissions\reports-workspace.tsx:22 |
| `/admin-command/admissions/selection` | **GET** | `useSchoolQuery` | Returns: SelectionData | apps\web\src\components\school\admissions-dashboard\selection-workspace.tsx:11 |
| `/admin-command/admissions/tasks` | **GET** | `useSchoolQuery` | Returns: TasksData | apps\web\src\components\school\admissions-dashboard\tasks-workspace.tsx:11 |
| `/admin-command/admissions/templates` | **GET** | `useSchoolQuery` | Returns: TemplatesData | apps\web\src\components\school\admissions-dashboard\templates-workspace.tsx:11 |
| `/admin-command/admissions/transfers` | **GET** | `useSchoolQuery` | Returns: TransfersData | apps\web\src\components\school\admissions-dashboard\transfers-workspace.tsx:11 |
| `/admin-command/attendance/absences` | **POST** | `requestDashboardApi` | Body: {
          studentId: formData.get("studentId") | apps\web\src\components\school\principal-dashboard\attendance-workspace.tsx:39 |
| `/admin-command/boarding-master/allocation` | **GET** | `useSchoolQuery` | Returns: AllocationData | apps\web\src\components\school\boarding-master\allocation-workspace.tsx:26 |
| `/admin-command/boarding-master/boarding-attendance` | **GET** | `useSchoolQuery` | Returns: BoardingAttendanceData | apps\web\src\components\school\boarding-master\boarding-attendance-workspace.tsx:25 |
| `/admin-command/boarding-master/hostels` | **GET** | `useSchoolQuery` | Returns: HostelsData | apps\web\src\components\school\boarding-master\hostels-workspace.tsx:26 |
| `/admin-command/boarding-master/incidents` | **GET** | `useSchoolQuery` | Returns: IncidentsData | apps\web\src\components\school\boarding-master\incidents-workspace.tsx:25 |
| `/admin-command/boarding-master/leave-exit` | **GET** | `useSchoolQuery` | Returns: LeaveExitData | apps\web\src\components\school\boarding-master\leave-exit-workspace.tsx:27 |
| `/admin-command/boarding-master/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\boarding-master\overview-workspace.tsx:23 |
| `/admin-command/boarding-master/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\boarding-master\reports-workspace.tsx:22 |
| `/admin-command/boarding-master/rooms-beds` | **GET** | `useSchoolQuery` | Returns: RoomsBedsData | apps\web\src\components\school\boarding-master\rooms-beds-workspace.tsx:25 |
| `/admin-command/boarding/assign-bed` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ student_id: studentId || "auto" | apps\web\src\components\school\boarding-master-command-center.tsx:337 |
| `/admin-command/boarding/incidents` | **POST** | `requestDashboardApi` | Body: JSON.stringify(incidentId ? { action: "escalate" | apps\web\src\components\school\boarding-master-command-center.tsx:484 |
| `/admin-command/boarding/roll-call` | **POST** | `requestDashboardApi` | Body: JSON.stringify(studentId ? { student_id: studentId | apps\web\src\components\school\boarding-master-command-center.tsx:389 |
| `/admin-command/class-teacher/attendance-follow-up` | **GET** | `useSchoolQuery` | Returns: AttendanceFollowUpData | apps\web\src\components\school\class-teacher\attendance-follow-up-workspace.tsx:32 |
| `/admin-command/class-teacher/class-academics` | **GET** | `useSchoolQuery` | Returns: ClassAcademicsData | apps\web\src\components\school\class-teacher\class-academics-workspace.tsx:30 |
| `/admin-command/class-teacher/discipline-follow-up` | **GET** | `useSchoolQuery` | Returns: DisciplineFollowUpData | apps\web\src\components\school\class-teacher\discipline-follow-up-workspace.tsx:33 |
| `/admin-command/class-teacher/learner-profiles` | **GET** | `useSchoolQuery` | Returns: LearnerProfilesData | apps\web\src\components\school\class-teacher\learner-profiles-workspace.tsx:35 |
| `/admin-command/class-teacher/my-class` | **GET** | `useSchoolQuery` | Returns: MyClassData | apps\web\src\components\school\class-teacher\my-class-workspace.tsx:32 |
| `/admin-command/class-teacher/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\class-teacher\overview-workspace.tsx:30 |
| `/admin-command/class-teacher/parent-contacts` | **GET** | `useSchoolQuery` | Returns: ParentContactsData | apps\web\src\components\school\class-teacher\parent-contacts-workspace.tsx:32 |
| `/admin-command/class-teacher/report-comments` | **GET** | `useSchoolQuery` | Returns: ReportCommentsData | apps\web\src\components\school\class-teacher\report-comments-workspace.tsx:32 |
| `/admin-command/class-teacher/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\class-teacher\reports-workspace.tsx:30 |
| `/admin-command/class-teacher/welfare-notes` | **GET** | `useSchoolQuery` | Returns: WelfareNotesData | apps\web\src\components\school\class-teacher\welfare-notes-workspace.tsx:32 |
| `/admin-command/clinic/visit` | **POST** | `requestDashboardApi` | Body: JSON.stringify(data) | apps\web\src\components\school\nurse-command-center.tsx:23 |
| `/admin-command/communication-broadcasts` | **POST** | `requestDashboardApi` | Body: {
          audience: formData.get("audience") | apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:76 |
| `/admin-command/communication-templates` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:25 |
| `/admin-command/communication-templates` | **POST** | `requestDashboardApi` | Body: {
          name: formData.get("name") | apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:43 |
| `/admin-command/communication-templates/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:97 |
| `/admin-command/dean-academics/academic-interventions` | **GET** | `useSchoolQuery` | Returns: AcademicInterventionsData | apps\web\src\components\school\dean-academics\academic-interventions-workspace.tsx:27 |
| `/admin-command/dean-academics/assessments` | **GET** | `useSchoolQuery` | Returns: AssessmentsData | apps\web\src\components\school\dean-academics\assessments-workspace.tsx:27 |
| `/admin-command/dean-academics/curriculum-coverage` | **GET** | `useSchoolQuery` | Returns: CurriculumCoverageData | apps\web\src\components\school\dean-academics\curriculum-coverage-workspace.tsx:27 |
| `/admin-command/dean-academics/department-performance` | **GET** | `useSchoolQuery` | Returns: DepartmentPerformanceData | apps\web\src\components\school\dean-academics\department-performance-workspace.tsx:26 |
| `/admin-command/dean-academics/lesson-logs` | **GET** | `useSchoolQuery` | Returns: LessonLogsData | apps\web\src\components\school\dean-academics\lesson-logs-workspace.tsx:27 |
| `/admin-command/dean-academics/lesson-plans` | **GET** | `useSchoolQuery` | Returns: LessonPlansData | apps\web\src\components\school\dean-academics\lesson-plans-workspace.tsx:27 |
| `/admin-command/dean-academics/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\dean-academics\overview-workspace.tsx:23 |
| `/admin-command/dean-academics/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\dean-academics\reports-workspace.tsx:22 |
| `/admin-command/dean-academics/teacher-workload` | **GET** | `useSchoolQuery` | Returns: TeacherWorkloadData | apps\web\src\components\school\dean-academics\teacher-workload-workspace.tsx:26 |
| `/admin-command/deputy/academics` | **GET** | `useSchoolQuery` | Returns: AcademicsData | apps\web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx:30 |
| `/admin-command/deputy/approvals` | **GET** | `useSchoolQuery` | Returns: ApprovalsData | apps\web\src\components\school\deputy-principal\approvals-workspace.tsx:25 |
| `/admin-command/deputy/attendance` | **GET** | `useSchoolQuery` | Returns: AttendanceData | apps\web\src\components\school\deputy-principal\attendance-workspace.tsx:28 |
| `/admin-command/deputy/classes` | **GET** | `useSchoolQuery` | Returns: ClassesData | apps\web\src\components\school\deputy-principal\classes-streams-workspace.tsx:28 |
| `/admin-command/deputy/daily-operations` | **GET** | `useSchoolQuery` | Returns: DailyOperationsData | apps\web\src\components\school\deputy-principal\daily-operations-workspace.tsx:34 |
| `/admin-command/deputy/discipline` | **GET** | `useSchoolQuery` | Returns: DisciplineIncident[] | apps\web\src\components\school\deputy-principal\discipline-workspace.tsx:32 |
| `/admin-command/deputy/exams` | **GET** | `useSchoolQuery` | Returns: ExamsData | apps\web\src\components\school\deputy-principal\exams-marks-workspace.tsx:26 |
| `/admin-command/deputy/overview` | **GET** | `useSchoolQuery` | Returns: DeputyOverviewData | apps\web\src\components\school\deputy-principal\overview-workspace.tsx:31 |
| `/admin-command/deputy/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\deputy-principal\reports-workspace.tsx:25 |
| `/admin-command/deputy/staff` | **GET** | `useSchoolQuery` | Returns: StaffData | apps\web\src\components\school\deputy-principal\staff-roles-workspace.tsx:25 |
| `/admin-command/deputy/staff-duty` | **GET** | `useSchoolQuery` | Returns: StaffDutyData | apps\web\src\components\school\deputy-principal\staff-duty-workspace.tsx:28 |
| `/admin-command/deputy/teaching` | **GET** | `useSchoolQuery` | Returns: TeachingData | apps\web\src\components\school\deputy-principal\teaching-workspace.tsx:26 |
| `/admin-command/deputy/timetable` | **GET** | `useSchoolQuery` | Returns: TimetableData | apps\web\src\components\school\deputy-principal\timetable-relief-workspace.tsx:29 |
| `/admin-command/deputy/welfare` | **GET** | `useSchoolQuery` | Returns: WelfareData | apps\web\src\components\school\deputy-principal\welfare-workspace.tsx:31 |
| `/admin-command/deputy/welfare` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\deputy-principal\welfare-workspace.tsx:33 |
| `/admin-command/discipline/incidents` | **POST** | `requestDashboardApi` | Body: {
      //     studentId: formData.get("studentId") | apps\web\src\components\school\principal-dashboard\discipline-workspace.tsx:37 |
| `/admin-command/exams-manager/analysis` | **GET** | `useSchoolQuery` | Returns: AnalysisData | apps\web\src\components\school\exams-manager\analysis-workspace.tsx:28 |
| `/admin-command/exams-manager/exam-setup` | **GET** | `useSchoolQuery` | Returns: ExamSetupData | apps\web\src\components\school\exams-manager\exam-setup-workspace.tsx:34 |
| `/admin-command/exams-manager/exam-timetable` | **GET** | `useSchoolQuery` | Returns: TimetableData | apps\web\src\components\school\exams-manager\exam-timetable-workspace.tsx:33 |
| `/admin-command/exams-manager/marks-entry` | **GET** | `useSchoolQuery` | Returns: MarksEntryData | apps\web\src\components\school\exams-manager\marks-entry-workspace.tsx:34 |
| `/admin-command/exams-manager/moderation` | **GET** | `useSchoolQuery` | Returns: ModerationData | apps\web\src\components\school\exams-manager\moderation-workspace.tsx:34 |
| `/admin-command/exams-manager/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\exams-manager\overview-workspace.tsx:31 |
| `/admin-command/exams-manager/publishing` | **GET** | `useSchoolQuery` | Returns: PublishingData | apps\web\src\components\school\exams-manager\publishing-workspace.tsx:26 |
| `/admin-command/exams-manager/report-cards` | **GET** | `useSchoolQuery` | Returns: ReportCardsData | apps\web\src\components\school\exams-manager\report-cards-workspace.tsx:27 |
| `/admin-command/exams-manager/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\exams-manager\reports-workspace.tsx:22 |
| `/admin-command/exams/academic-setup-approval` | **GET** | `useSchoolQuery` | Returns: AcademicSetupApprovalData | apps\web\src\components\school\exams-dashboard\academic-setup-approval-workspace.tsx:11 |
| `/admin-command/exams/cycles` | **POST** | `requestDashboardApi` | Body: {
      //     name: formData.get("name") | apps\web\src\components\school\principal-dashboard\exams-reports-workspace.tsx:38 |
| `/admin-command/exams/readiness` | **GET** | `useSchoolQuery` | Returns: ExamReadinessData | apps\web\src\components\school\exams-dashboard\exam-readiness-workspace.tsx:11 |
| `/admin-command/frontoffice/appointments` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          visitorName: formData.get("visitorName") | apps\web\src\components\school\secretary-command-center-full.tsx:528 |
| `/admin-command/frontoffice/dispatch` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ action: "end_shift"; Body: JSON.stringify({ action: "record_delivery"; Body: JSON.stringify({ action: "record_early_departure"; Body: JSON.stringify({ action: "record_late_arrival"; Body: JSON.stringify({ action: "record_staff_entry"; Body: JSON.stringify({ action: "record_staff_exit"; Body: JSON.stringify({ action: "record_vehicle_entry"; Body: JSON.stringify({ action: "report_incident"; Body: JSON.stringify({ action: "send_emergency_alert"; Body: JSON.stringify({ action: "start_shift" | apps\web\src\components\school\security-command-center.tsx:251<br>apps\web\src\components\school\security-command-center.tsx:266<br>apps\web\src\components\school\security-command-center.tsx:546<br>apps\web\src\components\school\security-command-center.tsx:597<br>apps\web\src\components\school\security-command-center.tsx:650<br>and 5 more... |
| `/admin-command/frontoffice/mail` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          sender: formData.get("sender") | apps\web\src\components\school\secretary-command-center-full.tsx:674 |
| `/admin-command/frontoffice/visitors` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          name: formData.get("name") | apps\web\src\components\school\secretary-command-center-full.tsx:425 |
| `/admin-command/guidance-counselling/follow-ups` | **GET** | `useSchoolQuery` | Returns: FollowUpsData | apps\web\src\components\school\guidance-counselling\follow-ups-workspace.tsx:26 |
| `/admin-command/guidance-counselling/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\guidance-counselling\overview-workspace.tsx:23 |
| `/admin-command/guidance-counselling/parent-engagement` | **GET** | `useSchoolQuery` | Returns: ParentEngagementData | apps\web\src\components\school\guidance-counselling\parent-engagement-workspace.tsx:26 |
| `/admin-command/guidance-counselling/referrals` | **GET** | `useSchoolQuery` | Returns: ReferralsData | apps\web\src\components\school\guidance-counselling\referrals-workspace.tsx:26 |
| `/admin-command/guidance-counselling/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\guidance-counselling\reports-workspace.tsx:22 |
| `/admin-command/guidance-counselling/sessions` | **GET** | `useSchoolQuery` | Returns: SessionsData | apps\web\src\components\school\guidance-counselling\sessions-workspace.tsx:27 |
| `/admin-command/guidance-counselling/welfare-notes` | **GET** | `useSchoolQuery` | Returns: WelfareNotesData | apps\web\src\components\school\guidance-counselling\welfare-notes-workspace.tsx:26 |
| `/admin-command/hod/coverage-review` | **GET** | `useSchoolQuery` | Returns: CoverageReviewData | apps\web\src\components\school\hod\coverage-review-workspace.tsx:26 |
| `/admin-command/hod/department-overview` | **GET** | `useSchoolQuery` | Returns: DepartmentOverviewData | apps\web\src\components\school\hod-dashboard\department-overview-workspace.tsx:11 |
| `/admin-command/hod/department-teachers` | **GET** | `useSchoolQuery` | Returns: DepartmentTeachersData | apps\web\src\components\school\hod\department-teachers-workspace.tsx:25 |
| `/admin-command/hod/lesson-plans` | **GET** | `useSchoolQuery` | Returns: LessonPlansData | apps\web\src\components\school\hod\lesson-plans-workspace.tsx:27 |
| `/admin-command/hod/marks-moderation` | **GET** | `useSchoolQuery` | Returns: MarksModerationData | apps\web\src\components\school\hod\marks-moderation-workspace.tsx:28 |
| `/admin-command/hod/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\hod\overview-workspace.tsx:23 |
| `/admin-command/hod/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\hod\reports-workspace.tsx:22 |
| `/admin-command/hod/resource-requests` | **GET** | `useSchoolQuery` | Returns: ResourceRequestsData | apps\web\src\components\school\hod\resource-requests-workspace.tsx:26 |
| `/admin-command/hod/review-queue` | **GET** | `useSchoolQuery` | Returns: ReviewQueueData | apps\web\src\components\school\hod-dashboard\review-queue-workspace.tsx:11 |
| `/admin-command/hod/subject-allocation` | **GET** | `useSchoolQuery` | Returns: SubjectAllocationData | apps\web\src\components\school\hod\subject-allocation-workspace.tsx:25 |
| `/admin-command/ict-manager/asset-assignment` | **GET** | `useSchoolQuery` | Returns: AssetAssignmentData | apps\web\src\components\school\ict-manager\asset-assignment-workspace.tsx:26 |
| `/admin-command/ict-manager/assets` | **GET** | `useSchoolQuery` | Returns: AssetsData | apps\web\src\components\school\ict-manager\assets-workspace.tsx:27 |
| `/admin-command/ict-manager/facilities-issues` | **GET** | `useSchoolQuery` | Returns: FacilitiesIssuesData | apps\web\src\components\school\ict-manager\facilities-issues-workspace.tsx:26 |
| `/admin-command/ict-manager/loans-returns` | **GET** | `useSchoolQuery` | Returns: LoansReturnsData | apps\web\src\components\school\ict-manager\loans-returns-workspace.tsx:26 |
| `/admin-command/ict-manager/maintenance` | **GET** | `useSchoolQuery` | Returns: MaintenanceData | apps\web\src\components\school\ict-manager\maintenance-workspace.tsx:26 |
| `/admin-command/ict-manager/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\ict-manager\overview-workspace.tsx:23 |
| `/admin-command/ict-manager/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\ict-manager\reports-workspace.tsx:22 |
| `/admin-command/laboratory-technician/apparatus-issue` | **GET** | `useSchoolQuery` | Returns: ApparatusIssueData | apps\web\src\components\school\laboratory-technician\apparatus-issue-workspace.tsx:27 |
| `/admin-command/laboratory-technician/chemicals` | **GET** | `useSchoolQuery` | Returns: ChemicalsData | apps\web\src\components\school\laboratory-technician\chemicals-workspace.tsx:27 |
| `/admin-command/laboratory-technician/lab-inventory` | **GET** | `useSchoolQuery` | Returns: LabInventoryData | apps\web\src\components\school\laboratory-technician\lab-inventory-workspace.tsx:27 |
| `/admin-command/laboratory-technician/lab-timetable` | **GET** | `useSchoolQuery` | Returns: LabTimetableData | apps\web\src\components\school\laboratory-technician\lab-timetable-workspace.tsx:27 |
| `/admin-command/laboratory-technician/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\laboratory-technician\overview-workspace.tsx:23 |
| `/admin-command/laboratory-technician/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\laboratory-technician\reports-workspace.tsx:22 |
| `/admin-command/laboratory-technician/safety-incidents` | **GET** | `useSchoolQuery` | Returns: SafetyIncidentsData | apps\web\src\components\school\laboratory-technician\safety-incidents-workspace.tsx:26 |
| `/admin-command/librarian/books` | **GET** | `useSchoolQuery` | Returns: BooksData | apps\web\src\components\school\librarian\books-workspace.tsx:32 |
| `/admin-command/librarian/borrowers` | **GET** | `useSchoolQuery` | Returns: BorrowersData | apps\web\src\components\school\librarian\borrowers-workspace.tsx:30 |
| `/admin-command/librarian/fines-lost-damaged` | **GET** | `useSchoolQuery` | Returns: FinesData | apps\web\src\components\school\librarian\fines-lost-damaged-workspace.tsx:33 |
| `/admin-command/librarian/issue-book` | **GET** | `useSchoolQuery` | Returns: IssueBookData | apps\web\src\components\school\librarian\issue-book-workspace.tsx:31 |
| `/admin-command/librarian/overdue-books` | **GET** | `useSchoolQuery` | Returns: OverdueBooksData | apps\web\src\components\school\librarian\overdue-books-workspace.tsx:34 |
| `/admin-command/librarian/overview` | **GET** | `useSchoolQuery` | Returns: LibrarianOverviewData | apps\web\src\components\school\librarian\overview-workspace.tsx:30 |
| `/admin-command/librarian/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\librarian\reports-workspace.tsx:30 |
| `/admin-command/librarian/return-book` | **GET** | `useSchoolQuery` | Returns: ReturnBookData | apps\web\src\components\school\librarian\return-book-workspace.tsx:32 |
| `/admin-command/library/add` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ title: "New Book" | apps\web\src\components\school\librarian-command-center.tsx:481 |
| `/admin-command/library/issue` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ borrowerId: selectedBorrower?.adm | apps\web\src\components\school\librarian-command-center.tsx:330 |
| `/admin-command/library/return` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ barcode: barcodeInput | apps\web\src\components\school\librarian-command-center.tsx:434 |
| `/admin-command/nurse/dispensing-log` | **GET** | `useSchoolQuery` | Returns: DispensingData | apps\web\src\components\school\nurse\dispensing-log-workspace.tsx:28 |
| `/admin-command/nurse/health-reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\nurse\health-reports-workspace.tsx:28 |
| `/admin-command/nurse/medicine-inventory` | **GET** | `useSchoolQuery` | Returns: MedicineData | apps\web\src\components\school\nurse\medicine-inventory-workspace.tsx:28 |
| `/admin-command/nurse/overview` | **GET** | `useSchoolQuery` | Returns: NurseOverviewData | apps\web\src\components\school\nurse\overview-workspace.tsx:28 |
| `/admin-command/nurse/parent-notifications` | **GET** | `useSchoolQuery` | Returns: NotificationsData | apps\web\src\components\school\nurse\parent-notifications-workspace.tsx:28 |
| `/admin-command/nurse/sick-bay-queue` | **GET** | `useSchoolQuery` | Returns: SickBayData | apps\web\src\components\school\nurse\sick-bay-queue-workspace.tsx:27 |
| `/admin-command/nurse/visits` | **GET** | `useSchoolQuery` | Returns: VisitsData | apps\web\src\components\school\nurse\visits-workspace.tsx:28 |
| `/admin-command/parent/dashboard` | **GET** | `useSchoolQuery` | Returns: DashboardData | apps\web\src\components\school\parent\dashboard-workspace.tsx:11 |
| `/admin-command/parent/downloads` | **GET** | `useSchoolQuery` | Returns: DownloadsData | apps\web\src\components\school\parent\downloads-workspace.tsx:11 |
| `/admin-command/parent/health` | **GET** | `useSchoolQuery` | Returns: HealthData | apps\web\src\components\school\parent\health-workspace.tsx:11 |
| `/admin-command/parent/messages` | **GET** | `useSchoolQuery` | Returns: MessagesData | apps\web\src\components\school\parent\messages-workspace.tsx:11 |
| `/admin-command/parent/notifications` | **GET** | `useSchoolQuery` | Returns: NotificationsData | apps\web\src\components\school\parent\notifications-workspace.tsx:11 |
| `/admin-command/principal/academic-setup` | **GET** | `useSchoolQuery` | Returns: AcademicSetupData | apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:24<br>apps\web\src\components\school\principal\academic-setup-workspace.tsx:18 |
| `/admin-command/principal/academics` | **GET** | `useSchoolQuery` | Returns: AcademicsData; Returns: PrincipalAcademicsData | apps\web\src\components\school\principal-dashboard\academics-workspace.tsx:17<br>apps\web\src\components\school\principal\academics-workspace.tsx:27 |
| `/admin-command/principal/approvals` | **GET** | `useSchoolQuery` | Returns: ApprovalsData; Returns: ApprovalsOverviewData | apps\web\src\components\school\principal-dashboard\approvals-workspace.tsx:16<br>apps\web\src\components\school\principal\approvals-workspace.tsx:26 |
| `/admin-command/principal/attendance` | **GET** | `useSchoolQuery` | Returns: PrincipalAttendanceData | apps\web\src\components\school\principal-dashboard\attendance-workspace.tsx:24 |
| `/admin-command/principal/attendance-monitoring` | **GET** | `useSchoolQuery` | Returns: AttendanceData | apps\web\src\components\school\principal\attendance-monitoring-workspace.tsx:32 |
| `/admin-command/principal/classes` | **GET** | `useSchoolQuery` | Returns: PrincipalClassesData | apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:24 |
| `/admin-command/principal/classes-streams` | **GET** | `useSchoolQuery` | Returns: ClassesStreamsData | apps\web\src\components\school\principal\classes-streams-workspace.tsx:26 |
| `/admin-command/principal/communication` | **GET** | `useSchoolQuery` | Returns: CommunicationData; Returns: PrincipalCommunicationData | apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:24<br>apps\web\src\components\school\principal\communication-workspace.tsx:31 |
| `/admin-command/principal/discipline` | **GET** | `useSchoolQuery` | Returns: DisciplineData; Returns: PrincipalDisciplineData | apps\web\src\components\school\principal-dashboard\discipline-workspace.tsx:22<br>apps\web\src\components\school\principal\discipline-workspace.tsx:28 |
| `/admin-command/principal/exams` | **GET** | `useSchoolQuery` | Returns: PrincipalExamsData | apps\web\src\components\school\principal-dashboard\exams-reports-workspace.tsx:23 |
| `/admin-command/principal/exams-report-cards` | **GET** | `useSchoolQuery` | Returns: ExamsReportCardsData | apps\web\src\components\school\principal\exams-report-cards-workspace.tsx:27 |
| `/admin-command/principal/finance-overview` | **GET** | `useSchoolQuery` | Returns: FinanceOverviewData; Returns: PrincipalWorkspaceData | apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:22<br>apps\web\src\components\school\principal\finance-overview-workspace.tsx:25 |
| `/admin-command/principal/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData; Returns: PrincipalOverviewData | apps\web\src\components\school\principal-dashboard\overview-workspace.tsx:23<br>apps\web\src\components\school\principal\overview-workspace.tsx:30<br>apps\web\src\lib\data\school-hooks.test.tsx:71 |
| `/admin-command/principal/reports` | **GET** | `useSchoolQuery` | Returns: PrincipalReportsData; Returns: ReportsData; Returns: any[] | apps\web\src\components\school\admin\reports-workspace.tsx:13<br>apps\web\src\components\school\principal-dashboard\reports-workspace.tsx:23<br>apps\web\src\components\school\principal\reports-workspace.tsx:22 |
| `/admin-command/principal/school-profile` | **GET** | `useSchoolQuery` | Returns: SchoolProfileData | apps\web\src\components\school\principal-dashboard\school-profile-workspace.tsx:25<br>apps\web\src\components\school\principal\school-profile-workspace.tsx:30 |
| `/admin-command/principal/school-profile/logo` | **POST** | `requestDashboardApi` | Body: formData | apps\web\src\components\school\principal-dashboard\school-profile-workspace.tsx:41 |
| `/admin-command/principal/settings` | **GET** | `useSchoolQuery` | Returns: PrincipalSettingsData | apps\web\src\components\school\principal-dashboard\settings-workspace.tsx:26 |
| `/admin-command/principal/setup-checklist` | **GET** | `useSchoolQuery` | Returns: SetupChecklistData | apps\web\src\components\school\principal-dashboard\setup-checklist-workspace.tsx:14<br>apps\web\src\components\school\principal\setup-checklist-workspace.tsx:25 |
| `/admin-command/principal/staff` | **GET** | `useSchoolQuery` | Returns: PrincipalStaffData | apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:25 |
| `/admin-command/principal/staff-roles` | **GET** | `useSchoolQuery` | Returns: StaffRolesData | apps\web\src\components\school\principal\staff-roles-workspace.tsx:27 |
| `/admin-command/principal/students` | **GET** | `useSchoolQuery` | Returns: PrincipalStudentsData; Returns: StudentsData | apps\web\src\components\school\principal-dashboard\students-workspace.tsx:24<br>apps\web\src\components\school\principal\students-workspace.tsx:28 |
| `/admin-command/principal/subjects` | **GET** | `useSchoolQuery` | Returns: PrincipalSubjectsData | apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:24 |
| `/admin-command/principal/subjects-departments` | **GET** | `useSchoolQuery` | Returns: SubjectsDepartmentsData | apps\web\src\components\school\principal\subjects-departments-workspace.tsx:26 |
| `/admin-command/principal/teaching` | **GET** | `useSchoolQuery` | Returns: PrincipalTeachingData | apps\web\src\components\school\principal-dashboard\teaching-workspace.tsx:16 |
| `/admin-command/procurement-officer/deliveries` | **GET** | `useSchoolQuery` | Returns: DeliveriesData | apps\web\src\components\school\procurement-officer\deliveries-workspace.tsx:26 |
| `/admin-command/procurement-officer/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\procurement-officer\overview-workspace.tsx:23 |
| `/admin-command/procurement-officer/purchase-orders` | **GET** | `useSchoolQuery` | Returns: PurchaseOrdersData | apps\web\src\components\school\procurement-officer\purchase-orders-workspace.tsx:27 |
| `/admin-command/procurement-officer/purchase-requests` | **GET** | `useSchoolQuery` | Returns: PurchaseRequestsData | apps\web\src\components\school\procurement-officer\purchase-requests-workspace.tsx:27 |
| `/admin-command/procurement-officer/quotations` | **GET** | `useSchoolQuery` | Returns: QuotationsData | apps\web\src\components\school\procurement-officer\quotations-workspace.tsx:26 |
| `/admin-command/procurement-officer/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\procurement-officer\reports-workspace.tsx:22 |
| `/admin-command/procurement-officer/suppliers` | **GET** | `useSchoolQuery` | Returns: SuppliersData | apps\web\src\components\school\procurement-officer\suppliers-workspace.tsx:26 |
| `/admin-command/reports/categories` | **POST** | `requestDashboardApi` | Body: { name: formData.get("name") | apps\web\src\components\school\principal-dashboard\reports-workspace.tsx:36 |
| `/admin-command/reports/schedule` | **POST** | `requestDashboardApi` | Body: { title: formData.get("title") | apps\web\src\components\school\principal-dashboard\reports-workspace.tsx:54 |
| `/admin-command/school/operational-blueprint` | **GET** | `useSchoolQuery` | Returns: OperationalBlueprintData | apps\web\src\components\school\operational-blueprint-workspace.tsx:11 |
| `/admin-command/secretary/appointments` | **GET** | `useSchoolQuery` | Returns: AppointmentsData | apps\web\src\components\school\secretary\appointments-workspace.tsx:33 |
| `/admin-command/secretary/calls-log` | **GET** | `useSchoolQuery` | Returns: CallsData | apps\web\src\components\school\secretary\calls-log-workspace.tsx:36 |
| `/admin-command/secretary/dashboard` | **GET** | `useSchoolQuery` | Returns: SecretaryDashboardData | apps\web\src\components\school\secretary-command-center.tsx:18 |
| `/admin-command/secretary/letters-documents` | **GET** | `useSchoolQuery` | Returns: DocumentsData | apps\web\src\components\school\secretary\letters-documents-workspace.tsx:32 |
| `/admin-command/secretary/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\secretary\overview-workspace.tsx:29 |
| `/admin-command/secretary/parent-messages` | **GET** | `useSchoolQuery` | Returns: MessagesData | apps\web\src\components\school\secretary\parent-messages-workspace.tsx:34 |
| `/admin-command/secretary/reception-queue` | **GET** | `useSchoolQuery` | Returns: QueueData | apps\web\src\components\school\secretary\reception-queue-workspace.tsx:31 |
| `/admin-command/secretary/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\secretary\reports-workspace.tsx:31 |
| `/admin-command/secretary/student-clearance` | **GET** | `useSchoolQuery` | Returns: ClearanceData | apps\web\src\components\school\secretary\student-clearance-workspace.tsx:34 |
| `/admin-command/secretary/visitors` | **GET** | `useSchoolQuery` | Returns: VisitorsData | apps\web\src\components\school\secretary\visitors-workspace.tsx:34 |
| `/admin-command/security-officer/gate-register` | **GET** | `useSchoolQuery` | Returns: GateRegisterData | apps\web\src\components\school\security-officer\gate-register-workspace.tsx:26 |
| `/admin-command/security-officer/incidents` | **GET** | `useSchoolQuery` | Returns: IncidentsData | apps\web\src\components\school\security-officer\incidents-workspace.tsx:25 |
| `/admin-command/security-officer/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\security-officer\overview-workspace.tsx:23 |
| `/admin-command/security-officer/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\security-officer\reports-workspace.tsx:22 |
| `/admin-command/security-officer/staff-movement` | **GET** | `useSchoolQuery` | Returns: StaffMovementData | apps\web\src\components\school\security-officer\staff-movement-workspace.tsx:25 |
| `/admin-command/security-officer/student-exit-passes` | **GET** | `useSchoolQuery` | Returns: StudentExitPassesData | apps\web\src\components\school\security-officer\student-exit-passes-workspace.tsx:26 |
| `/admin-command/security-officer/visitors` | **GET** | `useSchoolQuery` | Returns: VisitorsData | apps\web\src\components\school\security-officer\visitors-workspace.tsx:27 |
| `/admin-command/storekeeper/damaged-missing` | **GET** | `useSchoolQuery` | Returns: DamagedMissingData | apps\web\src\components\school\storekeeper\damaged-missing-workspace.tsx:35 |
| `/admin-command/storekeeper/items` | **GET** | `useSchoolQuery` | Returns: ItemsData | apps\web\src\components\school\storekeeper\items-workspace.tsx:33 |
| `/admin-command/storekeeper/low-stock` | **GET** | `useSchoolQuery` | Returns: LowStockData | apps\web\src\components\school\storekeeper\low-stock-workspace.tsx:31 |
| `/admin-command/storekeeper/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\storekeeper\overview-workspace.tsx:32 |
| `/admin-command/storekeeper/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\storekeeper\reports-workspace.tsx:30 |
| `/admin-command/storekeeper/requests` | **GET** | `useSchoolQuery` | Returns: RequestsData | apps\web\src\components\school\storekeeper\requests-workspace.tsx:35 |
| `/admin-command/storekeeper/stock-in` | **GET** | `useSchoolQuery` | Returns: StockInData | apps\web\src\components\school\storekeeper\stock-in-workspace.tsx:11 |
| `/admin-command/storekeeper/stock-issue` | **GET** | `useSchoolQuery` | Returns: StockIssueData | apps\web\src\components\school\storekeeper\stock-issue-workspace.tsx:11 |
| `/admin-command/storekeeper/stocktake` | **GET** | `useSchoolQuery` | Returns: StocktakeData | apps\web\src\components\school\storekeeper\stocktake-workspace.tsx:34 |
| `/admin-command/student/dashboard` | **GET** | `useSchoolQuery` | Returns: DashboardData | apps\web\src\components\school\student\dashboard-workspace.tsx:11 |
| `/admin-command/student/downloads` | **GET** | `useSchoolQuery` | Returns: DownloadsData | apps\web\src\components\school\student\downloads-workspace.tsx:11 |
| `/admin-command/student/messages` | **GET** | `useSchoolQuery` | Returns: MessagesData | apps\web\src\components\school\student\messages-workspace.tsx:11 |
| `/admin-command/student/notifications` | **GET** | `useSchoolQuery` | Returns: NotificationsData | apps\web\src\components\school\student\notifications-workspace.tsx:11 |
| `/admin-command/teacher/academic-setup` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\academic-setup-workspace.tsx:12 |
| `/admin-command/teacher/attendance` | **GET** | `useSchoolQuery` | Returns: TeacherAttendanceData | apps\web\src\components\school\teacher\teacher-attendance-workspace.tsx:11 |
| `/admin-command/teacher/cbc-assessments` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\cbc-assessment-workspace.tsx:12 |
| `/admin-command/teacher/clubs` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\club-workspace.tsx:12 |
| `/admin-command/teacher/invigilation` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\invigilation-workspace.tsx:12 |
| `/admin-command/teacher/learner-progress` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\learner-progress-workspace.tsx:12 |
| `/admin-command/teacher/lesson-plans` | **GET** | `useSchoolQuery` | Returns: LessonPlansData | apps\web\src\components\school\teacher\lesson-plans-workspace.tsx:11 |
| `/admin-command/teacher/mark-entry` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\mark-entry-workspace.tsx:12 |
| `/admin-command/teacher/messages` | **GET** | `useSchoolQuery` | Returns: MessagesData | apps\web\src\components\school\teacher\messages-workspace.tsx:11 |
| `/admin-command/teacher/notifications` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\notifications-workspace.tsx:12 |
| `/admin-command/teacher/profile` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\my-profile-workspace.tsx:12 |
| `/admin-command/teacher/reports` | **GET** | `requestDashboardApi, useSchoolQuery` | Returns: ReportsData; Types: any | apps\web\src\components\school\teacher-dashboard\reports-downloads-workspace.tsx:12<br>apps\web\src\components\school\teacher\reports-workspace.tsx:11 |
| `/admin-command/teacher/resource-requests` | **GET** | `useSchoolQuery` | Returns: ResourceRequestsData | apps\web\src\components\school\teacher\resource-requests-workspace.tsx:11 |
| `/admin-command/teacher/resources` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\teaching-resources-workspace.tsx:12 |
| `/admin-command/teacher/store-requests` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\store-requests-workspace.tsx:12 |
| `/admin-command/teacher/student-notes` | **GET** | `useSchoolQuery` | Returns: StudentNotesData | apps\web\src\components\school\teacher\student-notes-workspace.tsx:11 |
| `/admin-command/teacher/subject-allocations` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\subject-allocations-workspace.tsx:12 |
| `/admin-command/teacher/syllabus-coverage` | **GET** | `requestDashboardApi` | Types: any | apps\web\src\components\school\teacher-dashboard\syllabus-coverage-workspace.tsx:12 |
| `/admin-command/teacher/utilities` | **GET** | `useSchoolQuery` | Returns: UtilitiesData | apps\web\src\components\school\teacher\utilities-workspace.tsx:11 |
| `/admin-command/transport-manager/drivers` | **GET** | `useSchoolQuery` | Returns: DriversData | apps\web\src\components\school\transport-manager\drivers-workspace.tsx:25 |
| `/admin-command/transport-manager/fuel-maintenance` | **GET** | `useSchoolQuery` | Returns: FuelMaintenanceData | apps\web\src\components\school\transport-manager\fuel-maintenance-workspace.tsx:26 |
| `/admin-command/transport-manager/overview` | **GET** | `useSchoolQuery` | Returns: OverviewData | apps\web\src\components\school\transport-manager\overview-workspace.tsx:23 |
| `/admin-command/transport-manager/reports` | **GET** | `useSchoolQuery` | Returns: ReportsData | apps\web\src\components\school\transport-manager\reports-workspace.tsx:22 |
| `/admin-command/transport-manager/routes` | **GET** | `useSchoolQuery` | Returns: RoutesData | apps\web\src\components\school\transport-manager\routes-workspace.tsx:25 |
| `/admin-command/transport-manager/student-transport-list` | **GET** | `useSchoolQuery` | Returns: StudentTransportListData | apps\web\src\components\school\transport-manager\student-transport-list-workspace.tsx:25 |
| `/admin-command/transport-manager/trips` | **GET** | `useSchoolQuery` | Returns: TripsData | apps\web\src\components\school\transport-manager\trips-workspace.tsx:27 |
| `/admin-command/transport-manager/vehicles` | **GET** | `useSchoolQuery` | Returns: VehiclesData | apps\web\src\components\school\transport-manager\vehicles-workspace.tsx:26 |
| `/admin-command/transport/maintenance` | **POST** | `requestDashboardApi` | Body: JSON.stringify(data) | apps\web\src\components\school\transport-manager-command-center.tsx:814 |
| `/admin-command/transport/route` | **POST** | `requestDashboardApi` | Body: JSON.stringify(data) | apps\web\src\components\school\transport-manager-command-center.tsx:692 |
| `/admissions` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:388 |
| `/admissions/applicants` | **GET** | `useSchoolQuery` | Returns: AdmissionApplicantRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4914 |
| `/admissions/applicants` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4916 |
| `/admissions/applications` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:629 |
| `/admissions/applications/:param/approve` | **POST** | `requestDashboardApi` | Body: { applicantId: selectedApplicantPreview.id | apps\web\src\components\school\registrar-command-center.tsx:1099 |
| `/admissions/applications?status=pending_enrolment` | **GET** | `useSchoolQuery` | Returns: PendingEnrolment[] | Query: status=pending_enrolment | apps\web\src\components\school\admissions-dashboard\enrolment-workspace.tsx:21 |
| `/admissions/quick-actions` | **POST** | `requestDashboardApi` | Body: { action: "quick_admission_action" | apps\web\src\components\school\registrar-command-center.tsx:1167 |
| `/admissions/students/:param/profile?tenantSlug=:param` | **GET** | `fetch` | Query: tenantSlug=${encodeURIComponent(tenantSlug)} | apps\web\src\lib\discipline\discipline-live.ts:256 |
| `/admissions/students?:param` | **GET** | `fetch` | Query: ${params.toString()} | apps\web\src\lib\students\student-lookup.ts:19 |
| `/ai-insights/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\admin\data-quality-workspace.tsx:9 |
| `/approvals/:param/action` | **PATCH** | `fetch` | Body: JSON.stringify({ action | apps\web\src\lib\client\approvals-api.ts:33 |
| `/approvals/my-requests` | **GET** | `fetch` | N/A | apps\web\src\lib\client\approvals-api.ts:26 |
| `/approvals/pending` | **GET** | `fetch` | N/A | apps\web\src\lib\client\approvals-api.ts:19 |
| `/assets` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\ict-manager-command-center.tsx:231 |
| `/assets/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\ict-manager-command-center.tsx:134<br>apps\web\src\components\school\ict-manager-command-center.tsx:38 |
| `/attendance/mark` | **POST** | `useSchoolMutation` | Body: { records: Omit<AttendanceRecord | apps\web\src\hooks\useAttendance.ts:25 |
| `/attendance:param` | **GET** | `useSchoolQuery` | Returns: AttendanceRecord[] | apps\web\src\hooks\useAttendance.ts:21 |
| `/auth/csrf` | **GET** | `fetch` | N/A | apps\web\src\lib\auth\csrf-client.ts:5 |
| `/auth/invitations` | **POST** | `fetch` | Body: JSON.stringify({
          display_name: displayName; Body: JSON.stringify({
          display_name: invitedName | apps\web\src\components\school\user-management-panel.tsx:130<br>apps\web\src\components\school\user-management-workspace.tsx:1013 |
| `/auth/invitations/:param` | **DELETE** | `fetch` | N/A | apps\web\src\components\school\user-management-panel.tsx:210<br>apps\web\src\components\school\user-management-workspace.tsx:834 |
| `/auth/invitations/:param/resend` | **POST** | `fetch` | N/A | apps\web\src\components\school\user-management-panel.tsx:179<br>apps\web\src\components\school\user-management-workspace.tsx:767 |
| `/auth/invitations/accept` | **POST** | `fetch` | Body: JSON.stringify(input) | apps\web\src\lib\auth\invitation-client.ts:18 |
| `/auth/invitations?limit=50&offset=0` | **GET** | `fetch` | Query: limit=50&offset=0 | apps\web\src\components\school\user-management-panel.tsx:83<br>apps\web\src\components\school\user-management-workspace.tsx:573 |
| `/auth/login` | **POST** | `fetch` | Body: JSON.stringify({
          audience; Body: JSON.stringify({
          audience: activeChallenge.audience | apps\web\src\components\auth\mfa-verification-view.tsx:103<br>apps\web\src\lib\auth\use-experience-session.ts:119 |
| `/auth/logout` | **POST** | `fetch` | Body: JSON.stringify({ audience; Body: JSON.stringify({ audience: "superadmin" | apps\web\src\components\platform\superadmin-pages.tsx:535<br>apps\web\src\lib\auth\use-experience-session.ts:152 |
| `/auth/me?:param` | **GET** | `fetch` | Query: ${query.toString()} | apps\web\src\lib\auth\use-experience-session.ts:72 |
| `/auth/parent/otp/request` | **POST** | `fetch` | Body: JSON.stringify({ identifier: values.identifier.trim() | apps\web\src\components\auth\portal-login-view.tsx:114 |
| `/auth/parent/otp/verify` | **POST** | `fetch` | Body: JSON.stringify({
            challenge_id: challengeId | apps\web\src\components\auth\portal-login-view.tsx:136 |
| `/auth/refresh` | **POST** | `fetch` | Body: JSON.stringify({
          audience | apps\web\src\lib\auth\use-experience-session.ts:173 |
| `/auth/sessions` | **GET** | `useSchoolQuery` | Returns: SessionRow[] | apps\web\src\components\school\session-management-panel.tsx:22 |
| `/auth/sessions/revoke` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\session-management-panel.tsx:24 |
| `/auth/tenant-users/:param/role` | **PATCH** | `fetch` | Body: JSON.stringify({ role_code: nextRoleCode; Body: JSON.stringify({ role_code: roleCodeForLabel(updates.role) | apps\web\src\components\school\user-management-panel.tsx:274<br>apps\web\src\components\school\user-management-workspace.tsx:924 |
| `/auth/tenant-users/:param/status` | **PATCH** | `fetch` | Body: JSON.stringify({ status; Body: JSON.stringify({ status: status === "Active" ? "active" : "suspended" | apps\web\src\components\school\user-management-panel.tsx:237<br>apps\web\src\components\school\user-management-workspace.tsx:683 |
| `/boarding/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\boarding-master-command-center.tsx:231<br>apps\web\src\components\school\boarding-master-command-center.tsx:291<br>apps\web\src\components\school\boarding-master-command-center.tsx:316<br>apps\web\src\components\school\boarding-master-command-center.tsx:331<br>apps\web\src\components\school\boarding-master-command-center.tsx:383<br>and 1 more... |
| `/boarding/exeats` | **GET** | `useSchoolQuery` | Returns: ExeatRequestRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4935 |
| `/boarding/exeats` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4937 |
| `/boarding/roll-calls` | **GET** | `useSchoolQuery` | Returns: BoardingRollCallRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4931 |
| `/boarding/roll-calls` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4933 |
| `/buildBillingApiPath(
          `/api/billing/student-balances/:param/statement/export`,
          tenantSlug,
        )` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:389<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:406<br>apps\web\src\components\school\accountant\payments-workspace.tsx:418<br>apps\web\src\components\school\school-finance-page.tsx:487<br>apps\web\src\components\school\school-pages.tsx:1333 |
| `/buildBillingApiPath(
          `/api/billing/student-balances/:param/statement`,
          tenantSlug,
        )` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:356<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:373<br>apps\web\src\components\school\accountant\payments-workspace.tsx:385<br>apps\web\src\components\school\school-finance-page.tsx:454<br>apps\web\src\components\school\school-pages.tsx:1300 |
| `/buildBillingApiPath("/api/academics/summary", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\academics-workspace-admin.tsx:35 |
| `/buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:281<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:281<br>apps\web\src\components\school\accountant\payments-workspace.tsx:281<br>apps\web\src\components\school\school-finance-page.tsx:379<br>apps\web\src\components\school\school-pages.tsx:1225 |
| `/buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | **POST** | `fetch` | Body: JSON.stringify({
          name: feeStructureDraft.name.trim() | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:578<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:595<br>apps\web\src\components\school\accountant\payments-workspace.tsx:607<br>apps\web\src\components\school\school-finance-page.tsx:676<br>apps\web\src\components\school\school-pages.tsx:1522 |
| `/buildBillingApiPath("/api/billing/finance-activity", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\payments-workspace.tsx:313 |
| `/buildBillingApiPath("/api/billing/finance-activity?limit=10&offset=0", tenantSlug || "demo")` | **GET** | `fetch` | Query: limit=10&offset=0 | apps\web\src\components\school\accountant\overview-workspace.tsx:37 |
| `/buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug || "demo")` | **GET** | `fetch` | Query: limit=100&offset=0 | apps\web\src\components\school\accountant\receipts-workspace.tsx:33 |
| `/buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | **GET** | `fetch` | Query: limit=25&offset=0 | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:189<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:189<br>apps\web\src\components\school\accountant\payments-workspace.tsx:189<br>apps\web\src\components\school\school-finance-page.tsx:287<br>apps\web\src\components\school\school-pages.tsx:1133 |
| `/buildBillingApiPath("/api/billing/invoices", tenantSlug)` | **POST** | `fetch` | Body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim() | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:795<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:812<br>apps\web\src\components\school\accountant\payments-workspace.tsx:824<br>apps\web\src\components\school\school-finance-page.tsx:893<br>apps\web\src\components\school\school-pages.tsx:1739 |
| `/buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:322 |
| `/buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | **POST** | `fetch` | Body: JSON.stringify({
          idempotency_key: `finance-quick-${Date.now(); Body: JSON.stringify({
          idempotency_key: `manual-${Date.now() | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:851<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:868<br>apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:382<br>apps\web\src\components\school\accountant\payments-workspace.tsx:880<br>apps\web\src\components\school\school-finance-page.tsx:949<br>and 1 more... |
| `/buildBillingApiPath("/api/billing/student-balances", tenantSlug || "demo")` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\arrears-workspace.tsx:31 |
| `/buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:213<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:213<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:313<br>apps\web\src\components\school\accountant\payments-workspace.tsx:213<br>apps\web\src\components\school\school-finance-page.tsx:311<br>and 1 more... |
| `/buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\waivers-discounts-workspace.tsx:37 |
| `/buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | **POST** | `fetch` | Body: JSON.stringify(formDraft) | apps\web\src\components\school\accountant\waivers-discounts-workspace.tsx:68 |
| `/buildBillingApiPath("/api/finance/summary", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:173<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:173<br>apps\web\src\components\school\accountant\payments-workspace.tsx:173<br>apps\web\src\components\school\school-finance-page.tsx:271<br>apps\web\src\components\school\school-pages.tsx:1117 |
| `/buildBillingApiPath("/api/students/summary/dashboard", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\student-directory-workspace.tsx:43 |
| `/buildBillingApiPath(`/api/billing/fee-structures/:param/archive`, tenantSlug)` | **POST** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:627<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:644<br>apps\web\src\components\school\accountant\payments-workspace.tsx:656<br>apps\web\src\components\school\school-finance-page.tsx:725<br>apps\web\src\components\school\school-pages.tsx:1571 |
| `/buildBillingApiPath(`/api/billing/fee-structures/:param/billable-students`, tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:740<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:757<br>apps\web\src\components\school\accountant\payments-workspace.tsx:769<br>apps\web\src\components\school\school-finance-page.tsx:838<br>apps\web\src\components\school\school-pages.tsx:1684 |
| `/buildBillingApiPath(`/api/billing/fee-structures/:param/generate-invoices`, tenantSlug)` | **POST** | `fetch` | Body: JSON.stringify({
            idempotency_key: idempotencyKey | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:680<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:697<br>apps\web\src\components\school\accountant\payments-workspace.tsx:709<br>apps\web\src\components\school\school-finance-page.tsx:778<br>apps\web\src\components\school\school-pages.tsx:1624 |
| `/buildBillingApiPath(`/api/billing/manual-fee-payments/:param/:param`, tenantSlug)` | **POST** | `fetch` | Body: JSON.stringify({
            occurred_at: new Date().toISOString() | apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:447 |
| `/buildBillingApiPath(`/api/billing/reconciliation/export?:param`, tenantSlug)` | **GET** | `fetch` | Query: ${params.toString()} | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:437<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:454<br>apps\web\src\components\school\accountant\payments-workspace.tsx:466<br>apps\web\src\components\school\school-finance-page.tsx:535<br>apps\web\src\components\school\school-pages.tsx:1381 |
| `/buildBillingApiPath(`/api/billing/reconciliation?:param`, tenantSlug)` | **GET** | `fetch` | Query: ${params.toString()} | apps\web\src\components\school\accountant\fee-structures-workspace.tsx:250<br>apps\web\src\components\school\accountant\invoices-workspace.tsx:250<br>apps\web\src\components\school\accountant\payments-workspace.tsx:250<br>apps\web\src\components\school\school-finance-page.tsx:348<br>apps\web\src\components\school\school-pages.tsx:1194 |
| `/buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug)` | **GET** | `fetch` | N/A | apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:36 |
| `/buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?status=pending_review", tenantSlug)` | **GET** | `fetch` | Query: status=pending_review | apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:112 |
| `/buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments/:param/reconcile`, tenantSlug)` | **POST** | `fetch` | Body: JSON.stringify({
            invoice_id: invoiceId.trim() || undefined | apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:170 |
| `/clinic/analytics/principal:param` | **GET** | `fetch` | N/A | apps\web\src\components\school\school-pages.tsx:3600 |
| `/clinic/medicines/stock` | **GET** | `useSchoolQuery` | Returns: MedicineStockRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4909 |
| `/clinic/medicines/stock` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4911 |
| `/clinic/medicines:param` | **GET** | `fetch` | N/A | apps\web\src\components\school\school-pages.tsx:3601 |
| `/clinic/parent/students/:param/history` | **GET** | `fetch` | N/A | apps\web\src\components\portal\portal-pages.tsx:943 |
| `/clinic/parent/students/me/history` | **GET** | `useSchoolQuery` | Returns: { visits?: any[]; allergies?: string[]; medications?: any[] } | apps\web\src\components\school\parent\clinic-health-workspace.tsx:10 |
| `/clinic/visits` | **GET** | `useSchoolQuery` | Returns: ClinicVisitRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4905 |
| `/clinic/visits` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4907 |
| `/communication/messages` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:647 |
| `/communication/sms` | **GET** | `useSchoolQuery` | Returns: { data: CommMessage[] } | apps\web\src\components\school\deputy-principal\communication-workspace.tsx:22 |
| `/communication/sms` | **POST** | `requestDashboardApi` | Body: {
          recipientPhone: formData.recipient | apps\web\src\components\school\deputy-principal\communication-workspace.tsx:30 |
| `/communication/summary` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:370<br>apps\web\src\components\school\secretary-command-center-full.tsx:501<br>apps\web\src\components\school\secretary-command-center-full.tsx:611 |
| `/counselling/:param:param` | **GET** | `fetch` | Body: options?.body ? JSON.stringify(options.body) : undefined | apps\web\src\lib\discipline\discipline-live.ts:206 |
| `/counselling/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\counsellor-command-center.tsx:142 |
| `/counselling/referrals` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\counsellor-command-center.tsx:143 |
| `/counselling/sessions` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\counsellor-command-center.tsx:144 |
| `/dashboard/layout` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\admin\overview-workspace.tsx:9 |
| `/dashboard/layout?role=:param` | **GET** | `useSchoolQuery` | Returns: DashboardLayoutDto | Query: role=${role} | apps\web\src\components\dashboard\dashboard-engine.tsx:32 |
| `/dashboard/layout?role=teacher` | **GET** | `useSchoolQuery` | Returns: any | Query: role=teacher | apps\web\src\components\school\teacher\overview-workspace.tsx:9 |
| `/dashboard/summary?role=secretary` | **GET** | `useSchoolQuery` | Returns: any[] | Query: role=secretary | apps\web\src\components\school\secretary-command-center-full.tsx:791 |
| `/discipline/:param:param` | **GET** | `fetch` | Body: requestBody | apps\web\src\lib\discipline\discipline-live.ts:176 |
| `/discipline/actions-interventions` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\actions-interventions-workspace.tsx:14 |
| `/discipline/actions-sanctions` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\actions-sanctions-workspace.tsx:14 |
| `/discipline/audit-trail` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\audit-trail-workspace.tsx:14 |
| `/discipline/cases` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\cases-workspace.tsx:14 |
| `/discipline/cases` | **POST** | `useSchoolMutation` | Body: Omit<DisciplineCase | apps\web\src\hooks\useDiscipline.ts:25 |
| `/discipline/cases/:param` | **PATCH** | `useSchoolMutation` | Body: Partial<DisciplineCase | apps\web\src\hooks\useDiscipline.ts:31 |
| `/discipline/class-house-monitoring` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\class-house-monitoring-workspace.tsx:14 |
| `/discipline/counselling-referrals` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\counselling-referrals-workspace.tsx:14 |
| `/discipline/detention-programs` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\detention-programs-workspace.tsx:14 |
| `/discipline/incident-log` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\incident-log-workspace.tsx:14 |
| `/discipline/incident-register` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\incident-register-workspace.tsx:14 |
| `/discipline/investigations` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\investigations-workspace.tsx:14 |
| `/discipline/log-incident` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\log-incident-workspace.tsx:14 |
| `/discipline/overview` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\overview-workspace.tsx:14 |
| `/discipline/parent-communication` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\parent-communication-workspace.tsx:14 |
| `/discipline/parent-summons` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\parent-summons-workspace.tsx:14 |
| `/discipline/parent/incidents` | **GET** | `useSchoolQuery` | Returns: { data?: any[] } | apps\web\src\components\school\parent\behavior-workspace.tsx:13<br>apps\web\src\components\school\student\behavior-workspace.tsx:10 |
| `/discipline/report-intake` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\report-intake-workspace.tsx:14 |
| `/discipline/reports` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\reports-workspace.tsx:14 |
| `/discipline/reports-downloads` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\reports-downloads-workspace.tsx:14 |
| `/discipline/serious-cases-approvals` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\serious-cases-approvals-workspace.tsx:14 |
| `/discipline/settings` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\settings-workspace.tsx:14 |
| `/discipline/student-conduct-profiles` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\student-conduct-profiles-workspace.tsx:14 |
| `/discipline/students/me/behavior-score` | **GET** | `useSchoolQuery` | Returns: { score?: number } | apps\web\src\components\school\parent\behavior-workspace.tsx:16<br>apps\web\src\components\school\student\behavior-workspace.tsx:13 |
| `/discipline/templates-rules` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\templates-rules-workspace.tsx:14 |
| `/discipline/triage-queue` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\discipline-master\triage-queue-workspace.tsx:14 |
| `/discipline:param` | **GET** | `useSchoolQuery` | Returns: DisciplineCase[] | apps\web\src\hooks\useDiscipline.ts:21 |
| `/endpoint` | **GET** | `requestDashboardApi` | Body: options?.body ? JSON.parse(options.body as string) : undefined | apps\web\src\lib\data\class-teacher-hooks.ts:10 |
| `/endpoint` | **POST** | `fetch` | Body: JSON.stringify(body); Body: JSON.stringify(payload) | apps\web\src\components\library\library-workspace.tsx:385<br>apps\web\src\lib\school\school-operational-store.ts:528 |
| `/events/notifications/:param/read` | **POST** | `fetch` | N/A | apps\web\src\components\school\school-pages.tsx:4099 |
| `/events/notifications?limit=8` | **GET** | `fetch` | Query: limit=8 | apps\web\src\components\school\school-pages.tsx:3987 |
| `/exams/alignment` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\exams-manager-command-center.tsx:1336 |
| `/exams/assessment-components` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\papers-components-workspace.tsx:13 |
| `/exams/assessments` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx:101<br>apps\web\src\components\modules\exams-manager\workspaces\imports-templates-workspace.tsx:13 |
| `/exams/attendance` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\exam-attendance-workspace.tsx:13 |
| `/exams/audit-logs` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\audit-logs-workspace.tsx:14 |
| `/exams/configuration` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\exams-manager-command-center.tsx:1334 |
| `/exams/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\exams-manager-command-center.tsx:1298 |
| `/exams/dashboard-stats` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx:13 |
| `/exams/draft` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx:25<br>apps\web\src\components\school\exams-manager-command-center.tsx:1335 |
| `/exams/grading-policies` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\exam-settings-workspace.tsx:13<br>apps\web\src\components\modules\exams-manager\workspaces\grading-rubrics-workspace.tsx:13 |
| `/exams/invigilators` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\invigilation-workspace.tsx:13 |
| `/exams/lifecycle` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\exams-manager-command-center.tsx:1339 |
| `/exams/mark-entry-windows` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\marks-monitor-workspace.tsx:13 |
| `/exams/mark-versions` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\moderation-workspace.tsx:13 |
| `/exams/marks` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\my-marks-workspace.tsx:13<br>apps\web\src\components\school\parent\academics-workspace.tsx:12 |
| `/exams/marks` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\exams-manager-command-center.tsx:1337 |
| `/exams/marks/enter` | **POST** | `fetch` | Body: JSON.stringify({
          exam_series_id: examSeriesId | apps\web\src\components\modules\exams\MarksEntryTable.tsx:41 |
| `/exams/marks/school` | **GET** | `useSchoolQuery` | N/A | apps\web\src\components\school\dean-academics-command-center.tsx:445 |
| `/exams/marks?exam=' + encodeURIComponent(selectedExam)` | **GET** | `useSchoolQuery` | Query: exam= | apps\web\src\components\school\teacher\marks-entry-workspace.tsx:18 |
| `/exams/marks?exam_series_id=:param&subject_id=:param&class_section_id=:param:param` : ""}` | **GET** | `fetch` | Query: exam_series_id=${examSeriesId}&subject_id=${subjectId}&class_section_id=${classSectionId}${tenantId ?  | apps\web\src\components\modules\exams\MarksEntryTable.tsx:33 |
| `/exams/report-card-batches` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\results-processing-workspace.tsx:13 |
| `/exams/report-cards` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\report-cards-workspace.tsx:13<br>apps\web\src\components\school\parent\academics-workspace.tsx:11<br>apps\web\src\components\school\student\academics-workspace.tsx:15 |
| `/exams/report-cards?status=under_review,approved,published` | **GET** | `useSchoolQuery` | Returns: any | Query: status=under_review,approved,published | apps\web\src\components\modules\exams-manager\workspaces\approvals-publishing-workspace.tsx:13 |
| `/exams/review` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\exams-manager-command-center.tsx:1338 |
| `/exams/series` | **GET** | `useSchoolQuery` | Returns: any; Returns: any[] | apps\web\src\components\modules\exams-manager\workspaces\communication-workspace.tsx:13<br>apps\web\src\components\modules\exams-manager\workspaces\exam-calendar-workspace.tsx:10<br>apps\web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx:14<br>apps\web\src\components\modules\exams-manager\workspaces\reports-workspace.tsx:10 |
| `/exams/series/:param/readiness:param` : ""}` | **GET** | `fetch` | Query:   | apps\web\src\components\modules\exams\ReportCardGenerator.tsx:20 |
| `/exams/series/publish` | **POST** | `fetch` | Body: JSON.stringify({
          exam_series_id: examSeriesId | apps\web\src\components\modules\exams\ReportCardGenerator.tsx:29 |
| `/exams/student-cases` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\student-cases-workspace.tsx:13 |
| `/exams/subject-weightings` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\exam-classes-workspace.tsx:13 |
| `/exams/timetable-slots` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\modules\exams-manager\workspaces\exam-timetable-workspace.tsx:13 |
| `/fees/payments` | **POST** | `useSchoolMutation` | Body: { student_id: string; amount: number; payment_method: string; ref_number: string } | apps\web\src\hooks\useFees.ts:25 |
| `/fees/summary` | **GET** | `useSchoolQuery` | Returns: { total_expected: number; total_collected: number; total_arrears: number } | apps\web\src\hooks\useFees.ts:31 |
| `/fees:param` | **GET** | `useSchoolQuery` | Returns: FeeAccount[] | apps\web\src\hooks\useFees.ts:21 |
| `/finance/accounts-overview` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\parent\fees-workspace.tsx:15<br>apps\web\src\components\school\student\fees-workspace.tsx:10 |
| `/finance/balances` | **GET** | `useSchoolQuery` | Returns: FeeBalanceRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4963 |
| `/finance/balances` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4965 |
| `/finance/collections` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\parent\fees-workspace.tsx:16 |
| `/finance/fee-categories` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:23 |
| `/finance/fee-categories` | **POST** | `requestDashboardApi` | Body: {
          name: formData.get("name") | apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:40 |
| `/finance/fee-categories/:param` | **DELETE** | `requestDashboardApi` | N/A | apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:86 |
| `/finance/invoices` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\parent\fees-workspace.tsx:17 |
| `/finance/payments` | **GET** | `useSchoolQuery` | Returns: FeePaymentRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4967 |
| `/finance/payments` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4969 |
| `/finance/waivers` | **POST** | `requestDashboardApi` | Body: {
          student_id: formData.get("student_id") | apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:64 |
| `/grade-master/overview` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\grade-master-command-center.tsx:288 |
| `/health` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\ict-manager-command-center.tsx:230 |
| `/health/visits` | **POST** | `useSchoolMutation` | Body: Omit<HealthVisit | apps\web\src\hooks\useHealth.ts:25 |
| `/health:param` | **GET** | `useSchoolQuery` | Returns: HealthVisit[] | apps\web\src\hooks\useHealth.ts:21 |
| `/hr/attendance` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:33 |
| `/hr/attendance?date=:param` | **GET** | `useSchoolQuery` | Returns: any[] | Query: date=${attendanceDate} | apps\web\src\components\school\admin\staff-records-workspace.tsx:21 |
| `/hr/departments` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:19 |
| `/hr/departments` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:36 |
| `/hr/job-titles` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:20 |
| `/hr/job-titles` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:37 |
| `/hr/leave` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:22 |
| `/hr/leave/request` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:34 |
| `/hr/payroll/bands` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:23 |
| `/hr/payroll/bands` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:39 |
| `/hr/payroll/payslips` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:41 |
| `/hr/payroll/payslips?month=:param&year=:param` | **GET** | `useSchoolQuery` | Returns: any[] | Query: month=${payslipMonth}&year=${payslipYear} | apps\web\src\components\school\admin\staff-records-workspace.tsx:24 |
| `/hr/performance/disciplinary` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:26 |
| `/hr/performance/disciplinary` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:43 |
| `/hr/performance/reviews` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:25 |
| `/hr/performance/reviews` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:42 |
| `/hr/staff` | **GET** | `useSchoolQuery` | Returns: any; Returns: any[] | apps\web\src\components\school\admin\staff-records-workspace.tsx:18<br>apps\web\src\components\school\admin\subjects-workspace.tsx:15<br>apps\web\src\components\school\secretary-command-center-full.tsx:755 |
| `/hr/staff/accept-invite` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:31 |
| `/hr/staff/approve` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:29 |
| `/hr/staff/complete-profile` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:32 |
| `/hr/staff/invite` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:28 |
| `/hr/staff/reactivate` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:30 |
| `/hr/staff/role` | **PATCH** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:38 |
| `/hr/staff/salary` | **PATCH** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\staff-records-workspace.tsx:40 |
| `/hr/staff?department=academics` | **GET** | `useSchoolQuery` | Returns: any | Query: department=academics | apps\web\src\components\school\hod-command-center.tsx:239 |
| `/integrations/daraja` | **GET** | `fetch` | N/A | apps\web\src\components\school\school-pages.tsx:3114 |
| `/integrations/daraja` | **PUT** | `fetch` | Body: JSON.stringify({
          ...form | apps\web\src\components\school\school-pages.tsx:3154 |
| `/integrations/daraja/test?environment=:param` | **POST** | `fetch` | Query: environment=${encodeURIComponent(form.environment)} | apps\web\src\components\school\school-pages.tsx:3193 |
| `/inventory/damaged-items` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\inventory\damaged-items\route.ts:58 |
| `/inventory/heatmap` | **GET** | `useSchoolQuery` | Returns: InventoryHeatmap[] | apps\web\src\components\school\storekeeper-command-center.tsx:1289 |
| `/inventory/incidents` | **GET** | `useSchoolQuery` | Returns: InventoryWaste[] | apps\web\src\components\school\storekeeper-command-center.tsx:1387 |
| `/inventory/insights` | **GET** | `useSchoolQuery` | Returns: AiInsight[] | apps\web\src\components\school\storekeeper-command-center.tsx:1457 |
| `/inventory/purchase-orders` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\procurement-officer-command-center.tsx:89 |
| `/inventory/purchase-orders?limit=5` | **GET** | `useSchoolQuery` | Returns: any | Query: limit=5 | apps\web\src\components\school\procurement-officer-command-center.tsx:37 |
| `/inventory/requests` | **GET** | `useSchoolQuery` | Returns: InventoryRequisition[]; Returns: any | apps\web\src\components\school\procurement-officer-command-center.tsx:175<br>apps\web\src\components\school\storekeeper-command-center.tsx:1188 |
| `/inventory/requests?status=pending` | **GET** | `useSchoolQuery` | Returns: any | Query: status=pending | apps\web\src\components\school\procurement-officer-command-center.tsx:38 |
| `/inventory/requisitions` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\storekeeper-command-center.tsx:1193 |
| `/inventory/stock-issues` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\inventory\stock-issues\route.ts:58 |
| `/inventory/stock-movements` | **GET** | `useSchoolQuery` | Returns: InventoryAuditTrail[] | apps\web\src\components\school\storekeeper-command-center.tsx:1411 |
| `/inventory/stock-receipts` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\inventory\stock-receipts\route.ts:58 |
| `/inventory/stock-requests` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\inventory\stock-requests\route.ts:58 |
| `/inventory/stock-returns` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\inventory\stock-returns\route.ts:58 |
| `/inventory/stocktake-sessions` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\inventory\stocktake-sessions\route.ts:58 |
| `/inventory/summary` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\procurement-officer-command-center.tsx:39<br>apps\web\src\components\school\storekeeper-command-center.tsx:1595 |
| `/inventory/suppliers` | **GET** | `useSchoolQuery` | Returns: InventorySupplier[]; Returns: any | apps\web\src\components\school\procurement-officer-command-center.tsx:133<br>apps\web\src\components\school\storekeeper-command-center.tsx:1336 |
| `/iot/dashboard` | **GET** | `fetch` | N/A | apps\web\src\components\modules\iot\iot-module-screen.tsx:410 |
| `/iot:param` | **GET** | `fetch` | Body: JSON.stringify(body) | apps\web\src\components\modules\iot\iot-module-screen.tsx:440 |
| `/labs/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\laboratory-technician-command-center.tsx:169 |
| `/labs/inventory` | **GET** | `useSchoolQuery` | Returns: LabInventoryRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4950 |
| `/labs/inventory` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4952 |
| `/labs/issues` | **GET** | `useSchoolQuery` | Returns: LabIssueRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4958 |
| `/labs/issues` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4960 |
| `/labs/requests` | **GET** | `useSchoolQuery` | Returns: LabPracticalRequestRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4954 |
| `/labs/requests` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4956 |
| `/library/books` | **GET** | `useSchoolQuery` | Returns: LibraryBookRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4919 |
| `/library/books` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4921 |
| `/library/catalog` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\librarian-command-center.tsx:535 |
| `/library/circulation` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\librarian-command-center.tsx:172 |
| `/library/circulation/issue` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\library\scan-issue\route.ts:68 |
| `/library/circulation/return` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\library\scan-return\route.ts:68 |
| `/library/issue` | **POST** | `useSchoolMutation` | Body: Omit<LibraryLoan | apps\web\src\hooks\useLibrary.ts:25 |
| `/library/issues` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\library\borrowings\route.ts:71 |
| `/library/loans` | **GET** | `useSchoolQuery` | Returns: LibraryLoanRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4923 |
| `/library/loans` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4925 |
| `/library/loans/:param` | **PATCH** | `useSchoolMutation` | Body: { return_date: string; status: "RETURNED" } | apps\web\src\hooks\useLibrary.ts:31 |
| `/library/loans:param` | **GET** | `useSchoolQuery` | Returns: LibraryLoan[] | apps\web\src\hooks\useLibrary.ts:21 |
| `/library/returns` | **POST** | `requestDashboardApi` | Body: await request.json() | apps\web\src\app\api\library\returns\route.ts:71 |
| `/library/summary` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\librarian-command-center.tsx:171 |
| `/observability/alerts` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\ict-manager-command-center.tsx:186<br>apps\web\src\components\school\ict-manager-command-center.tsx:229<br>apps\web\src\components\school\ict-manager-command-center.tsx:36 |
| `/observability/health` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\ict-manager-command-center.tsx:37 |
| `/operational-workflows/offline-sync` | **POST** | `fetch` | Body: JSON.stringify({
              action_id: item.actionId | apps\web\src\lib\workflows\offline-sync-engine.ts:80 |
| `/operations/reports` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:726<br>apps\web\src\components\school\secretary-command-center-full.tsx:773 |
| `/parent-portal/behavior/acknowledge` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ incidentId: id | apps\web\src\components\school\parent\behavior-workspace.tsx:30 |
| `/parent-portal/fees/pay` | **POST** | `requestDashboardApi` | Body: JSON.stringify({
          id: `PAY-${Date.now() | apps\web\src\components\school\parent\fees-workspace.tsx:22 |
| `/parent/academics` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\parent\parent-command-center.tsx:48 |
| `/parent/communication` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\parent\parent-command-center.tsx:88 |
| `/parent/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\portal\parent-command-center.tsx:745 |
| `/parent/finance` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\parent\parent-command-center.tsx:68 |
| `/parent/overview` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\parent\parent-command-center.tsx:28 |
| `/payments` | **POST** | `requestDashboardApi` | Types: CreatedPaymentResponse | Body: {
           student_id: paymentForm.student.trim() | apps\web\src\components\dashboard\erp-pages.tsx:1331 |
| `/permissions/me?schoolId=:param` | **GET** | `fetch` | Query: schoolId=${schoolId} | apps\web\src\components\providers\permission-context.tsx:29 |
| `/platform/audit-logs` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:491 |
| `/platform/backups` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:497 |
| `/platform/broadcasts` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:485 |
| `/platform/gateways` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:591 |
| `/platform/modules` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:233 |
| `/platform/reports` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:509 |
| `/platform/schools` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:208 |
| `/platform/schools/:param/modules` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:247 |
| `/platform/schools/summary` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:219 |
| `/platform/security-policies` | **GET** | `fetch` | N/A | apps\web\src\components\platform\workspaces\SecurityPoliciesWorkspace.tsx:13<br>apps\web\src\lib\platform\school-onboarding-client.ts:503 |
| `/platform/settings` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:586 |
| `/platform/sms-settings` | **GET** | `fetch` | N/A | apps\web\src\components\platform\workspaces\PlatformSmsSettingsWorkspace.tsx:14 |
| `/platform/templates` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:479 |
| `/platform/users` | **GET** | `fetch` | N/A | apps\web\src\lib\platform\school-onboarding-client.ts:515 |
| `/portals/fees/history:param` : ""}` | **GET** | `useSchoolQuery` | Returns: FeeRecord[] | Query:   | apps\web\src\lib\experiences\portal-api.ts:56 |
| `/portals/parent/children` | **GET** | `useSchoolQuery` | Returns: LinkedChild[] | apps\web\src\lib\experiences\portal-api.ts:45 |
| `/portals/reports:param` : ""}` | **GET** | `useSchoolQuery` | Returns: ReportCard[] | Query:   | apps\web\src\lib\experiences\portal-api.ts:49 |
| `/procurement/dashboard` | **GET** | `fetch` | N/A | apps\web\src\components\modules\procurement\procurement-module-screen.tsx:462 |
| `/procurement:param` | **GET** | `fetch` | Body: JSON.stringify(request.body) | apps\web\src\components\modules\procurement\procurement-module-screen.tsx:576 |
| `/school/modules/me` | **GET** | `fetch, requestDashboardApi` | Types: unknown | apps\web\src\components\school\school-pages.tsx:3911<br>apps\web\src\lib\module-access\server-school-module-access.ts:162 |
| `/school/settings` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:809 |
| `/school/sms/wallet` | **GET** | `fetch` | N/A | apps\web\src\components\school\school-pages.tsx:2858 |
| `/secretary/inquiries` | **GET** | `useSchoolQuery` | Returns: SecretaryInquiryRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4977 |
| `/secretary/inquiries` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4979 |
| `/secretary/visitors` | **GET** | `useSchoolQuery` | Returns: SecretaryVisitorRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4973 |
| `/secretary/visitors` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4975 |
| `/sms/send` | **POST** | `fetch` | Body: JSON.stringify({
          recipient: trimmedRecipient | apps\web\src\components\school\school-pages.tsx:2913 |
| `/student-portal/assignments/mark-done` | **POST** | `requestDashboardApi` | Body: JSON.stringify({ id | apps\web\src\components\school\student\academics-workspace.tsx:25 |
| `/student/academics` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\student\student-command-center.tsx:47 |
| `/student/attendance` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\student\student-command-center.tsx:67 |
| `/student/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\student-command-center.tsx:9 |
| `/student/overview` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\student\student-command-center.tsx:27 |
| `/studentId ? `/api/students/:param/attendance` : null` | **GET** | `useSchoolQuery` | Returns: AttendanceRecord[] | Query:   | apps\web\src\hooks\useAttendance.ts:12 |
| `/studentId ? `/api/students/:param/discipline` : null` | **GET** | `useSchoolQuery` | Returns: DisciplineCase[] | Query:   | apps\web\src\hooks\useDiscipline.ts:12 |
| `/studentId ? `/api/students/:param/fees` : null` | **GET** | `useSchoolQuery` | Returns: FeeAccount | Query:   | apps\web\src\hooks\useFees.ts:12 |
| `/studentId ? `/api/students/:param/guardians` : null` | **GET** | `useSchoolQuery` | Returns: StudentGuardian[] | Query:   | apps\web\src\hooks\useStudents.ts:29 |
| `/studentId ? `/api/students/:param/health` : null` | **GET** | `useSchoolQuery` | Returns: HealthVisit[] | Query:   | apps\web\src\hooks\useHealth.ts:12 |
| `/studentId ? `/api/students/:param/library` : null` | **GET** | `useSchoolQuery` | Returns: LibraryLoan[] | Query:   | apps\web\src\hooks\useLibrary.ts:12 |
| `/studentId ? `/api/students/:param` : null` | **GET** | `useSchoolQuery` | Returns: Student | Query:   | apps\web\src\hooks\useStudents.ts:25 |
| `/students` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\parents-workspace.tsx:13 |
| `/students` | **POST** | `requestDashboardApi` | Types: Student | Body: data | apps\web\src\lib\students\student-data-service.ts:43 |
| `/students/:param` | **GET** | `requestDashboardApi` | Types: Student | apps\web\src\lib\students\student-data-service.ts:113 |
| `/students/:param` | **PATCH** | `requestDashboardApi, useSchoolMutation` | Body: Partial<Student; Types: Student | Body: data | apps\web\src\hooks\useStudents.ts:39<br>apps\web\src\lib\students\student-data-service.ts:59 |
| `/students/admit` | **POST** | `useSchoolMutation` | Body: Omit<Student | apps\web\src\hooks\useStudents.ts:35 |
| `/students/guardians` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\admin\parents-workspace.tsx:15 |
| `/students/guardians/directory` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\admin\parents-workspace.tsx:12 |
| `/students/lifecycle/:param/archive` | **PATCH** | `fetch` | N/A | apps\web\src\lib\students\student-lifecycle.api.ts:77 |
| `/students/lifecycle/:param/enroll` | **POST** | `fetch, requestDashboardApi` | Types: Student | apps\web\src\lib\students\student-data-service.ts:75<br>apps\web\src\lib\students\student-lifecycle.api.ts:15 |
| `/students/lifecycle/:param/exit` | **POST** | `fetch` | Body: JSON.stringify(payload) | apps\web\src\lib\students\student-lifecycle.api.ts:66 |
| `/students/lifecycle/:param/initiate-clearance` | **POST** | `fetch` | N/A | apps\web\src\lib\students\student-lifecycle.api.ts:57 |
| `/students/lifecycle/:param/place-in-class` | **POST** | `fetch, requestDashboardApi` | Body: JSON.stringify(payload); Types: Student | Body: { classId | apps\web\src\lib\students\student-data-service.ts:90<br>apps\web\src\lib\students\student-lifecycle.api.ts:24 |
| `/students/lifecycle/:param/promote` | **POST** | `fetch` | Body: JSON.stringify(payload) | apps\web\src\lib\students\student-lifecycle.api.ts:35 |
| `/students/lifecycle/:param/suspend` | **POST** | `fetch` | Body: JSON.stringify({ reason | apps\web\src\lib\students\student-lifecycle.api.ts:46 |
| `/students:param` | **GET** | `requestDashboardApi, useSchoolQuery` | Returns: Student[]; Types: Student[] | apps\web\src\hooks\useStudents.ts:21<br>apps\web\src\lib\students\student-data-service.ts:109 |
| `/students?class=' + encodeURIComponent(selectedClass)` | **GET** | `useSchoolQuery` | Query: class= | apps\web\src\components\school\teacher\marks-entry-workspace.tsx:17 |
| `/support/counselling` | **GET** | `useSchoolQuery` | Returns: CounsellingSessionRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4989 |
| `/support/counselling` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4991 |
| `/support/discipline` | **GET** | `useSchoolQuery` | Returns: DisciplineCaseRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4983 |
| `/support/discipline` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4985 |
| `/support/tickets` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\ict-manager-command-center.tsx:228<br>apps\web\src\components\school\ict-manager-command-center.tsx:90 |
| `/support/tickets?limit=5` | **GET** | `useSchoolQuery` | Returns: any | Query: limit=5 | apps\web\src\components\school\ict-manager-command-center.tsx:35 |
| `/support:param` | **GET** | `fetch` | N/A | apps\web\src\lib\support\support-live.ts:638 |
| `/support:param:param:param` : ""}` | **GET** | `fetch` | Body: options?.formData ?? (options?.body ? JSON.stringify(options.body) : undefined) | Query:   | apps\web\src\lib\support\support-live.ts:607 |
| `/sync/retry` | **POST** | `fetch` | Body: JSON.stringify({ operations: [record] | apps\web\src\components\sync\SyncCenter.tsx:30 |
| `/test-mutation` | **POST** | `useSchoolMutation` | N/A | apps\web\src\lib\data\school-hooks.test.tsx:83 |
| `/test-route` | **GET** | `useSchoolQuery` | N/A | apps\web\src\lib\data\school-hooks.test.tsx:33<br>apps\web\src\lib\data\school-hooks.test.tsx:45<br>apps\web\src\lib\data\school-hooks.test.tsx:56 |
| `/timetable/my-schedule` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\teacher\my-timetable-workspace.tsx:23 |
| `/transport/dashboard` | **GET** | `fetch, useSchoolQuery` | Returns: any | apps\web\src\components\modules\transport\transport-module-screen.tsx:630<br>apps\web\src\components\school\transport-manager-command-center.tsx:481<br>apps\web\src\components\school\transport-manager-command-center.tsx:604 |
| `/transport/trips` | **GET** | `useSchoolQuery` | Returns: TransportTripRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4945 |
| `/transport/trips` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4947 |
| `/transport/vehicles` | **GET** | `useSchoolQuery` | Returns: TransportVehicleRecord[] | apps\web\src\components\school\role-operational-command-center.tsx:4941 |
| `/transport/vehicles` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\role-operational-command-center.tsx:4943 |
| `/transport:param` | **GET** | `fetch` | Body: JSON.stringify(body) | apps\web\src\components\modules\transport\transport-module-screen.tsx:660 |
| `/v1/notifications/:param/read` | **PATCH** | `fetch` | N/A | apps\web\src\components\common\notifications\notification-drawer.tsx:60 |
| `/v1/notifications/badges` | **GET** | `fetch` | N/A | apps\web\src\components\layouts\school-shell.tsx:90 |
| `/v1/notifications/read-all` | **PATCH** | `fetch` | N/A | apps\web\src\components\common\notifications\notification-drawer.tsx:74 |
| `/v1/notifications?status=:param` | **GET** | `fetch` | Query: status=${statusQuery} | apps\web\src\components\common\notifications\notification-drawer.tsx:38 |
| `/visitors/appointments` | **GET** | `useSchoolQuery` | Returns: any; Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:582<br>apps\web\src\components\school\security-command-center.tsx:455 |
| `/visitors/dashboard` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\secretary-command-center-full.tsx:288<br>apps\web\src\components\school\security-command-center.tsx:157<br>apps\web\src\components\school\security-command-center.tsx:309<br>apps\web\src\components\school\security-command-center.tsx:395 |
| `/visitors/logs` | **GET** | `useSchoolQuery` | Returns: any[] | apps\web\src\components\school\secretary-command-center-full.tsx:352<br>apps\web\src\components\school\secretary-command-center-full.tsx:472 |
| `/visitors/logs` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\security-command-center.tsx:308 |
| `/visitors/logs/:param/checkout` | **PATCH** | `fetch` | N/A | apps\web\src\components\school\security-command-center.tsx:328 |
| `/visitors/student-exits` | **GET** | `useSchoolQuery` | Returns: any | apps\web\src\components\school\security-command-center.tsx:498 |
| `/workflow/events` | **POST** | `fetch` | Body: JSON.stringify({
                        eventType: `FORM_SUBMISSION`; Body: JSON.stringify({
          eventType: `UI_ACTION_TRIGGERED` | apps\web\src\components\school\docx-operational-workspace.tsx:135<br>apps\web\src\components\school\docx-operational-workspace.tsx:43 |
| `/{
    endpoint: '/api/academics/assignments',
    method: 'POST',
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
    }
  }` | **POST** | `useSchoolMutation` | N/A | apps\web\src\components\school\teacher\assignments-homework-workspace.tsx:19 |

## All API References Details

| File & Line | Method | Endpoint Path | Source Hook | Parameters | Code Snippet |
| --- | --- | --- | --- | --- | --- |
| `apps\web\src\app\api\inventory\damaged-items\route.ts:58` | **POST** | `"/inventory/damaged-items"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/inventory/damaged-items", {       method: "POST",      ...` |
| `apps\web\src\app\api\inventory\stock-issues\route.ts:58` | **POST** | `"/inventory/stock-issues"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/inventory/stock-issues", {       method: "POST",       ...` |
| `apps\web\src\app\api\inventory\stock-receipts\route.ts:58` | **POST** | `"/inventory/stock-receipts"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/inventory/stock-receipts", {       method: "POST",     ...` |
| `apps\web\src\app\api\inventory\stock-requests\route.ts:58` | **POST** | `"/inventory/stock-requests"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/inventory/stock-requests", {       method: "POST",     ...` |
| `apps\web\src\app\api\inventory\stock-returns\route.ts:58` | **POST** | `"/inventory/stock-returns"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/inventory/stock-returns", {       method: "POST",      ...` |
| `apps\web\src\app\api\inventory\stocktake-sessions\route.ts:58` | **POST** | `"/inventory/stocktake-sessions"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/inventory/stocktake-sessions", {       method: "POST", ...` |
| `apps\web\src\app\api\library\borrowings\route.ts:71` | **POST** | `"/library/issues"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/library/issues", {       method: "POST",       tenantId...` |
| `apps\web\src\app\api\library\returns\route.ts:71` | **POST** | `"/library/returns"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/library/returns", {       method: "POST",       tenantI...` |
| `apps\web\src\app\api\library\scan-issue\route.ts:68` | **POST** | `"/library/circulation/issue"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/library/circulation/issue", {       method: "POST",    ...` |
| `apps\web\src\app\api\library\scan-return\route.ts:68` | **POST** | `"/library/circulation/return"` | `requestDashboardApi` | `Body: await request.json()` | `requestDashboardApi("/library/circulation/return", {       method: "POST",   ...` |
| `apps\web\src\components\auth\mfa-verification-view.tsx:103` | **POST** | `"/api/auth/login"` | `fetch` | `Body: JSON.stringify({
          audience: activeChallenge.audience` | `fetch("/api/auth/login", {         method: "POST",         headers: {        ...` |
| `apps\web\src\components\auth\portal-login-view.tsx:114` | **POST** | `"/api/auth/parent/otp/request"` | `fetch` | `Body: JSON.stringify({ identifier: values.identifier.trim()` | `fetch("/api/auth/parent/otp/request", {             method: "POST",          ...` |
| `apps\web\src\components\auth\portal-login-view.tsx:136` | **POST** | `"/api/auth/parent/otp/verify"` | `fetch` | `Body: JSON.stringify({
            challenge_id: challengeId` | `fetch("/api/auth/parent/otp/verify", {           method: "POST",           he...` |
| `apps\web\src\components\common\notifications\notification-drawer.tsx:38` | **GET** | ``/api/v1/notifications?status=${statusQuery}`` | `fetch` | `Query: status=${statusQuery}` | `fetch(\`/api/v1/notifications?status=${statusQuery}\`, {         headers: { Aut...` |
| `apps\web\src\components\common\notifications\notification-drawer.tsx:60` | **PATCH** | ``/api/v1/notifications/${id}/read`` | `fetch` | `N/A` | `fetch(\`/api/v1/notifications/${id}/read\`, {         method: "PATCH",         ...` |
| `apps\web\src\components\common\notifications\notification-drawer.tsx:74` | **PATCH** | ``/api/v1/notifications/read-all`` | `fetch` | `N/A` | `fetch(\`/api/v1/notifications/read-all\`, {         method: "PATCH",         he...` |
| `apps\web\src\components\dashboard\dashboard-engine.tsx:32` | **GET** | ``/dashboard/layout?role=${role}`` | `useSchoolQuery` | `Returns: DashboardLayoutDto | Query: role=${role}` | `useSchoolQuery<DashboardLayoutDto>(\`/dashboard/layout?role=${role}\`)` |
| `apps\web\src\components\dashboard\erp-pages.tsx:1331` | **POST** | `"/payments"` | `requestDashboardApi` | `Types: CreatedPaymentResponse | Body: {
           student_id: paymentForm.student.trim()` | `requestDashboardApi<CreatedPaymentResponse>("/payments", {          method: "...` |
| `apps\web\src\components\layouts\school-shell.tsx:90` | **GET** | `"/api/v1/notifications/badges"` | `fetch` | `N/A` | `fetch("/api/v1/notifications/badges", {           headers: { Authorization: \`...` |
| `apps\web\src\components\library\library-workspace.tsx:385` | **POST** | `endpoint` | `fetch` | `Body: JSON.stringify(body)` | `fetch(endpoint, {     method: "POST",     credentials: "same-origin",     hea...` |
| `apps\web\src\components\modules\academics\AcademicSetup.tsx:21` | **GET** | ``/api/academics/terms${tenantId ? `?tenant_id=${tenantId}` : ""}`` | `fetch` | `Query:  ` | `fetch(\`/api/academics/terms${tenantId ? \`?tenant_id=${tenantId}\` : ""}\`)` |
| `apps\web\src\components\modules\academics\AcademicSetup.tsx:30` | **GET** | ``/api/academics/subjects${tenantId ? `?tenant_id=${tenantId}` : ""}`` | `fetch` | `Query:  ` | `fetch(\`/api/academics/subjects${tenantId ? \`?tenant_id=${tenantId}\` : ""}\`)` |
| `apps\web\src\components\modules\academics\AcademicSetup.tsx:38` | **POST** | `'/academics/terms'` | `requestDashboardApi` | `Body: data` | `requestDashboardApi('/academics/terms', {         method: 'POST',         bod...` |
| `apps\web\src\components\modules\academics\AcademicSetup.tsx:55` | **POST** | `'/academics/subjects'` | `requestDashboardApi` | `Body: data` | `requestDashboardApi('/academics/subjects', {         method: 'POST',         ...` |
| `apps\web\src\components\modules\exams-manager\workspaces\approvals-publishing-workspace.tsx:13` | **GET** | `"/exams/report-cards?status=under_review,approved,published"` | `useSchoolQuery` | `Returns: any | Query: status=under_review,approved,published` | `useSchoolQuery<any>("/exams/report-cards?status=under_review,approved,publish...` |
| `apps\web\src\components\modules\exams-manager\workspaces\audit-logs-workspace.tsx:14` | **GET** | `"/exams/audit-logs"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/audit-logs")` |
| `apps\web\src\components\modules\exams-manager\workspaces\communication-workspace.tsx:13` | **GET** | `"/exams/series"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/series")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-attendance-workspace.tsx:13` | **GET** | `"/exams/attendance"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/attendance")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-calendar-workspace.tsx:10` | **GET** | `"/exams/series"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/exams/series")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-classes-workspace.tsx:13` | **GET** | `"/exams/subject-weightings"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/subject-weightings")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-settings-workspace.tsx:13` | **GET** | `"/exams/grading-policies"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/grading-policies")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx:25` | **POST** | `"/exams/draft"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/exams/draft", "POST")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx:101` | **GET** | `"/exams/assessments"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/assessments")` |
| `apps\web\src\components\modules\exams-manager\workspaces\exam-timetable-workspace.tsx:13` | **GET** | `"/exams/timetable-slots"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/timetable-slots")` |
| `apps\web\src\components\modules\exams-manager\workspaces\grading-rubrics-workspace.tsx:13` | **GET** | `"/exams/grading-policies"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/grading-policies")` |
| `apps\web\src\components\modules\exams-manager\workspaces\imports-templates-workspace.tsx:13` | **GET** | `"/exams/assessments"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/assessments")` |
| `apps\web\src\components\modules\exams-manager\workspaces\invigilation-workspace.tsx:13` | **GET** | `"/exams/invigilators"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/invigilators")` |
| `apps\web\src\components\modules\exams-manager\workspaces\marks-monitor-workspace.tsx:13` | **GET** | `"/exams/mark-entry-windows"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/mark-entry-windows")` |
| `apps\web\src\components\modules\exams-manager\workspaces\moderation-workspace.tsx:13` | **GET** | `"/exams/mark-versions"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/mark-versions")` |
| `apps\web\src\components\modules\exams-manager\workspaces\my-marks-workspace.tsx:13` | **GET** | `"/exams/marks"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/marks")` |
| `apps\web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx:13` | **GET** | `"/exams/dashboard-stats"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/dashboard-stats")` |
| `apps\web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx:14` | **GET** | `"/exams/series"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/series")` |
| `apps\web\src\components\modules\exams-manager\workspaces\papers-components-workspace.tsx:13` | **GET** | `"/exams/assessment-components"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/assessment-components")` |
| `apps\web\src\components\modules\exams-manager\workspaces\report-cards-workspace.tsx:13` | **GET** | `"/exams/report-cards"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/report-cards")` |
| `apps\web\src\components\modules\exams-manager\workspaces\reports-workspace.tsx:10` | **GET** | `"/exams/series"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/series")` |
| `apps\web\src\components\modules\exams-manager\workspaces\results-processing-workspace.tsx:13` | **GET** | `"/exams/report-card-batches"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/report-card-batches")` |
| `apps\web\src\components\modules\exams-manager\workspaces\student-cases-workspace.tsx:13` | **GET** | `"/exams/student-cases"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/exams/student-cases")` |
| `apps\web\src\components\modules\exams\MarksEntryTable.tsx:33` | **GET** | ``/api/exams/marks?exam_series_id=${examSeriesId}&subject_id=${subjectId}&class_section_id=${classSectionId}${tenantId ? `&tenant_id=${tenantId}` : ""}`` | `fetch` | `Query: exam_series_id=${examSeriesId}&subject_id=${subjectId}&class_section_id=${classSectionId}${tenantId ? ` | `fetch(\`/api/exams/marks?exam_series_id=${examSeriesId}&subject_id=${subjectId...` |
| `apps\web\src\components\modules\exams\MarksEntryTable.tsx:41` | **POST** | ``/api/exams/marks/enter`` | `fetch` | `Body: JSON.stringify({
          exam_series_id: examSeriesId` | `fetch(\`/api/exams/marks/enter\`, {         method: "POST",         headers: { ...` |
| `apps\web\src\components\modules\exams\ReportCardGenerator.tsx:20` | **GET** | ``/api/exams/series/${examSeriesId}/readiness${tenantId ? `?tenant_id=${tenantId}` : ""}`` | `fetch` | `Query:  ` | `fetch(\`/api/exams/series/${examSeriesId}/readiness${tenantId ? \`?tenant_id=${...` |
| `apps\web\src\components\modules\exams\ReportCardGenerator.tsx:29` | **POST** | ``/api/exams/series/publish`` | `fetch` | `Body: JSON.stringify({
          exam_series_id: examSeriesId` | `fetch(\`/api/exams/series/publish\`, {         method: "POST",         headers:...` |
| `apps\web\src\components\modules\iot\iot-module-screen.tsx:410` | **GET** | `"/api/iot/dashboard"` | `fetch` | `N/A` | `fetch("/api/iot/dashboard", {         method: "GET",         credentials: "sa...` |
| `apps\web\src\components\modules\iot\iot-module-screen.tsx:440` | **GET** | ``/api/iot${path}`` | `fetch` | `Body: JSON.stringify(body)` | `fetch(\`/api/iot${path}\`, {       method,       credentials: "same-origin",   ...` |
| `apps\web\src\components\modules\procurement\procurement-module-screen.tsx:462` | **GET** | `"/api/procurement/dashboard"` | `fetch` | `N/A` | `fetch("/api/procurement/dashboard", {         method: "GET",         credenti...` |
| `apps\web\src\components\modules\procurement\procurement-module-screen.tsx:576` | **GET** | ``/api/procurement${request.path}`` | `fetch` | `Body: JSON.stringify(request.body)` | `fetch(\`/api/procurement${request.path}\`, {         method: request.method,   ...` |
| `apps\web\src\components\modules\shared\implementation100-live-module.tsx:140` | **GET** | ``${apiBase}/dashboard`` | `fetch` | `N/A` | `fetch(\`${apiBase}/dashboard\`, {         method: "GET",         credentials: "...` |
| `apps\web\src\components\modules\shared\implementation100-live-module.tsx:181` | **POST** | ``${apiBase}/records`` | `fetch` | `Body: JSON.stringify({
          title: value(formData` | `fetch(\`${apiBase}/records\`, {         method: "POST",         credentials: "s...` |
| `apps\web\src\components\modules\shared\implementation100-live-module.tsx:219` | **PATCH** | ``${apiBase}/records/${record.id}/status`` | `fetch` | `Body: JSON.stringify({ status: "completed"` | `fetch(\`${apiBase}/records/${record.id}/status\`, {         method: "PATCH",   ...` |
| `apps\web\src\components\modules\transport\transport-module-screen.tsx:630` | **GET** | `"/api/transport/dashboard"` | `fetch` | `N/A` | `fetch("/api/transport/dashboard", {         method: "GET",         credential...` |
| `apps\web\src\components\modules\transport\transport-module-screen.tsx:660` | **GET** | ``/api/transport${path}`` | `fetch` | `Body: JSON.stringify(body)` | `fetch(\`/api/transport${path}\`, {       method,       credentials: "same-origi...` |
| `apps\web\src\components\parent\parent-command-center.tsx:28` | **GET** | `"/api/parent/overview"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/parent/overview")` |
| `apps\web\src\components\parent\parent-command-center.tsx:48` | **GET** | `"/api/parent/academics"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/parent/academics")` |
| `apps\web\src\components\parent\parent-command-center.tsx:68` | **GET** | `"/api/parent/finance"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/parent/finance")` |
| `apps\web\src\components\parent\parent-command-center.tsx:88` | **GET** | `"/api/parent/communication"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/parent/communication")` |
| `apps\web\src\components\platform\superadmin-pages.tsx:535` | **POST** | `"/api/auth/logout"` | `fetch` | `Body: JSON.stringify({ audience: "superadmin"` | `fetch("/api/auth/logout", {         method: "POST",         headers: {       ...` |
| `apps\web\src\components\platform\workspaces\PlatformSmsSettingsWorkspace.tsx:14` | **GET** | `"/api/platform/sms-settings"` | `fetch` | `N/A` | `fetch("/api/platform/sms-settings")` |
| `apps\web\src\components\platform\workspaces\SecurityPoliciesWorkspace.tsx:13` | **GET** | `"/api/platform/security-policies"` | `fetch` | `N/A` | `fetch("/api/platform/security-policies")` |
| `apps\web\src\components\portal\parent-command-center.tsx:745` | **GET** | `"/api/parent/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/parent/dashboard")` |
| `apps\web\src\components\portal\portal-pages.tsx:943` | **GET** | ``/api/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history`` | `fetch` | `N/A` | `fetch(\`/api/clinic/parent/students/${encodeURIComponent(studentId.trim())}/hi...` |
| `apps\web\src\components\providers\permission-context.tsx:29` | **GET** | ``/api/permissions/me?schoolId=${schoolId}`` | `fetch` | `Query: schoolId=${schoolId}` | `fetch(\`/api/permissions/me?schoolId=${schoolId}\`)` |
| `apps\web\src\components\school\academics-workspace-admin.tsx:35` | **GET** | `buildBillingApiPath("/api/academics/summary", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/academics/summary", tenantSlug), {           ...` |
| `apps\web\src\components\school\accountant\arrears-workspace.tsx:31` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug || "demo")` | `fetch` | `N/A` | `fetch(           buildBillingApiPath("/api/billing/student-balances", tenantS...` |
| `apps\web\src\components\school\accountant\expenses-workspace.tsx:11` | **GET** | `"/admin-command/accountant/expenses"` | `useSchoolQuery` | `Returns: ExpensesData` | `useSchoolQuery<ExpensesData>("/admin-command/accountant/expenses")` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:173` | **GET** | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {         cach...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:189` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `fetch` | `Query: limit=25&offset=0` | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", ...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:213` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {    ...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:250` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation?${params.toSt...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:281` | **GET** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:356` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:389` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:437` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation/export?${para...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:578` | **POST** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          name: feeStructureDraft.name.trim()` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:627` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:680` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            idempotency_key: idempotencyKey` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:740` | **GET** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:795` | **POST** | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()` | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {         met...` |
| `apps\web\src\components\school\accountant\fee-structures-workspace.tsx:851` | **POST** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          idempotency_key: `finance-quick-${Date.now()` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:173` | **GET** | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {         cach...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:189` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `fetch` | `Query: limit=25&offset=0` | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", ...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:213` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {    ...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:250` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation?${params.toSt...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:281` | **GET** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:313` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), { cac...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:373` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:406` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:454` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation/export?${para...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:595` | **POST** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          name: feeStructureDraft.name.trim()` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:644` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:697` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            idempotency_key: idempotencyKey` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:757` | **GET** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:812` | **POST** | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()` | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {         met...` |
| `apps\web\src\components\school\accountant\invoices-workspace.tsx:868` | **POST** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          idempotency_key: `finance-quick-${Date.now()` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:36` | **GET** | `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug)` | `fetch` | `N/A` | `fetch(           buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", ten...` |
| `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:112` | **GET** | `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?status=pending_review", tenantSlug)` | `fetch` | `Query: status=pending_review` | `fetch(           buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?statu...` |
| `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:170` | **POST** | `buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            invoice_id: invoiceId.trim() || undefined` | `fetch(         buildPaymentsApiPath(\`/api/payments/mpesa/c2b/payments/${selec...` |
| `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:322` | **GET** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:382` | **POST** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          idempotency_key: `manual-${Date.now()` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:447` | **POST** | `buildBillingApiPath(`/api/billing/manual-fee-payments/${receipt.id}/${action}`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            occurred_at: new Date().toISOString()` | `fetch(         buildBillingApiPath(\`/api/billing/manual-fee-payments/${receip...` |
| `apps\web\src\components\school\accountant\overview-workspace.tsx:37` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=10&offset=0", tenantSlug || "demo")` | `fetch` | `Query: limit=10&offset=0` | `fetch(           buildBillingApiPath("/api/billing/finance-activity?limit=10&...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:173` | **GET** | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {         cach...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:189` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `fetch` | `Query: limit=25&offset=0` | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", ...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:213` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {    ...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:250` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation?${params.toSt...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:281` | **GET** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:313` | **GET** | `buildBillingApiPath("/api/billing/finance-activity", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/finance-activity", tenantSlug), { cac...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:385` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:418` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:466` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation/export?${para...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:607` | **POST** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          name: feeStructureDraft.name.trim()` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:656` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:709` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            idempotency_key: idempotencyKey` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:769` | **GET** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:824` | **POST** | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()` | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {         met...` |
| `apps\web\src\components\school\accountant\payments-workspace.tsx:880` | **POST** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          idempotency_key: `finance-quick-${Date.now()` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\accountant\receipts-workspace.tsx:33` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug || "demo")` | `fetch` | `Query: limit=100&offset=0` | `fetch(           buildBillingApiPath("/api/billing/finance-activity?limit=100...` |
| `apps\web\src\components\school\accountant\waivers-discounts-workspace.tsx:37` | **GET** | `buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | `fetch` | `N/A` | `fetch(           buildBillingApiPath("/api/billing/waivers", tenantSlug \|\| "d...` |
| `apps\web\src\components\school\accountant\waivers-discounts-workspace.tsx:68` | **POST** | `buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | `fetch` | `Body: JSON.stringify(formDraft)` | `fetch(buildBillingApiPath("/api/billing/waivers", tenantSlug \|\| "demo"), {   ...` |
| `apps\web\src\components\school\admin\classes-streams-workspace.tsx:12` | **GET** | `"/api/academics/academic-years"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/academic-years", { enabled: activeTab =...` |
| `apps\web\src\components\school\admin\classes-streams-workspace.tsx:13` | **GET** | `"/api/academics/academic-terms"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/academic-terms", { enabled: activeTab =...` |
| `apps\web\src\components\school\admin\classes-streams-workspace.tsx:14` | **GET** | `"/api/academics/class-sections"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/class-sections", { enabled: activeTab =...` |
| `apps\web\src\components\school\admin\classes-streams-workspace.tsx:16` | **POST** | `"/api/academics/years"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/years")` |
| `apps\web\src\components\school\admin\classes-streams-workspace.tsx:17` | **POST** | `"/api/academics/terms"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/terms")` |
| `apps\web\src\components\school\admin\classes-streams-workspace.tsx:18` | **POST** | `"/api/academics/class-sections"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/class-sections")` |
| `apps\web\src\components\school\admin\data-quality-workspace.tsx:9` | **GET** | `"/api/ai-insights/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/ai-insights/dashboard")` |
| `apps\web\src\components\school\admin\data-setup-workspace.tsx:12` | **GET** | `"/api/academics/grading-systems"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/grading-systems", { enabled: activeTab ...` |
| `apps\web\src\components\school\admin\data-setup-workspace.tsx:13` | **GET** | `"/api/academics/attendance-settings"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/attendance-settings", { enabled: active...` |
| `apps\web\src\components\school\admin\data-setup-workspace.tsx:15` | **POST** | `"/api/academics/grading-systems"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/grading-systems")` |
| `apps\web\src\components\school\admin\data-setup-workspace.tsx:16` | **POST** | `"/api/academics/attendance-settings"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/attendance-settings")` |
| `apps\web\src\components\school\admin\imports-workspace.tsx:11` | **GET** | `"/admin-command/admin/imports"` | `useSchoolQuery` | `Returns: ImportsData` | `useSchoolQuery<ImportsData>("/admin-command/admin/imports")` |
| `apps\web\src\components\school\admin\overview-workspace.tsx:9` | **GET** | `"/api/dashboard/layout"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/dashboard/layout")` |
| `apps\web\src\components\school\admin\parents-workspace.tsx:12` | **GET** | `"/api/students/guardians/directory"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/students/guardians/directory", { enabled: activeT...` |
| `apps\web\src\components\school\admin\parents-workspace.tsx:13` | **GET** | `"/api/students"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/students", { enabled: activeTab === "add" })` |
| `apps\web\src\components\school\admin\parents-workspace.tsx:15` | **POST** | `"/api/students/guardians"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/students/guardians")` |
| `apps\web\src\components\school\admin\reports-workspace.tsx:13` | **GET** | `"/api/admin-command/principal/reports"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/admin-command/principal/reports")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:18` | **GET** | `"/api/hr/staff"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/staff", { enabled: activeTab === "directory" \|...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:19` | **GET** | `"/api/hr/departments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/departments")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:20` | **GET** | `"/api/hr/job-titles"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/job-titles")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:21` | **GET** | ``/api/hr/attendance?date=${attendanceDate}`` | `useSchoolQuery` | `Returns: any[] | Query: date=${attendanceDate}` | `useSchoolQuery<any[]>(\`/api/hr/attendance?date=${attendanceDate}\`, { enabled:...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:22` | **GET** | `"/api/hr/leave"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/leave", { enabled: activeTab === "leave" })` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:23` | **GET** | `"/api/hr/payroll/bands"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/payroll/bands", { enabled: activeTab === "payr...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:24` | **GET** | ``/api/hr/payroll/payslips?month=${payslipMonth}&year=${payslipYear}`` | `useSchoolQuery` | `Returns: any[] | Query: month=${payslipMonth}&year=${payslipYear}` | `useSchoolQuery<any[]>(\`/api/hr/payroll/payslips?month=${payslipMonth}&year=${...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:25` | **GET** | `"/api/hr/performance/reviews"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/performance/reviews", { enabled: activeTab ===...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:26` | **GET** | `"/api/hr/performance/disciplinary"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/performance/disciplinary", { enabled: activeTa...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:28` | **POST** | `"/api/hr/staff/invite"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/invite")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:29` | **POST** | `"/api/hr/staff/approve"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/approve")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:30` | **POST** | `"/api/hr/staff/reactivate"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/reactivate")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:31` | **POST** | `"/api/hr/staff/accept-invite"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/accept-invite")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:32` | **POST** | `"/api/hr/staff/complete-profile"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/complete-profile")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:33` | **POST** | `"/api/hr/attendance"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/attendance")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:34` | **POST** | `"/api/hr/leave/request"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/leave/request")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:35` | **POST** | `(vars: { id: string; status: string; reason?: string }) => `/api/hr/leave/${vars.id}/status`` | `useSchoolMutation` | `Query: : string }) => ` | `useSchoolMutation((vars: { id: string; status: string; reason?: string }) => ...` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:36` | **POST** | `"/api/hr/departments"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/departments")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:37` | **POST** | `"/api/hr/job-titles"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/job-titles")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:38` | **PATCH** | `"/api/hr/staff/role"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/role", "PATCH")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:39` | **POST** | `"/api/hr/payroll/bands"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/payroll/bands")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:40` | **PATCH** | `"/api/hr/staff/salary"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/staff/salary", "PATCH")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:41` | **POST** | `"/api/hr/payroll/payslips"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/payroll/payslips")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:42` | **POST** | `"/api/hr/performance/reviews"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/performance/reviews")` |
| `apps\web\src\components\school\admin\staff-records-workspace.tsx:43` | **POST** | `"/api/hr/performance/disciplinary"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/hr/performance/disciplinary")` |
| `apps\web\src\components\school\admin\students-workspace.tsx:11` | **GET** | `"/admin-command/admin/students"` | `useSchoolQuery` | `Returns: StudentsData` | `useSchoolQuery<StudentsData>("/admin-command/admin/students")` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:12` | **GET** | `"/api/academics/subjects"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/subjects", { enabled: activeTab === "su...` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:13` | **GET** | `"/api/academics/teacher-assignments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/teacher-assignments", { enabled: active...` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:15` | **GET** | `"/api/hr/staff"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/hr/staff", { enabled: activeTab === "teachers" })` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:16` | **GET** | `"/api/academics/class-sections"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/class-sections", { enabled: activeTab =...` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:17` | **GET** | `"/api/academics/academic-terms"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/academic-terms", { enabled: activeTab =...` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:19` | **POST** | `"/api/academics/subjects"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/subjects")` |
| `apps\web\src\components\school\admin\subjects-workspace.tsx:20` | **POST** | `"/api/academics/teacher-assignments"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/teacher-assignments")` |
| `apps\web\src\components\school\admissions-dashboard\applicant-profiles-workspace.tsx:11` | **GET** | `"/admin-command/admissions/applicant-profiles"` | `useSchoolQuery` | `Returns: ApplicantProfilesData` | `useSchoolQuery<ApplicantProfilesData>("/admin-command/admissions/applicant-pr...` |
| `apps\web\src\components\school\admissions-dashboard\applications-workspace.tsx:11` | **GET** | `"/admin-command/admissions/applications"` | `useSchoolQuery` | `Returns: ApplicationsData` | `useSchoolQuery<ApplicationsData>("/admin-command/admissions/applications")` |
| `apps\web\src\components\school\admissions-dashboard\appointments-workspace.tsx:11` | **GET** | `"/admin-command/admissions/appointments"` | `useSchoolQuery` | `Returns: AppointmentsData` | `useSchoolQuery<AppointmentsData>("/admin-command/admissions/appointments")` |
| `apps\web\src\components\school\admissions-dashboard\communication-workspace.tsx:11` | **GET** | `"/admin-command/admissions/communication"` | `useSchoolQuery` | `Returns: CommunicationData` | `useSchoolQuery<CommunicationData>("/admin-command/admissions/communication")` |
| `apps\web\src\components\school\admissions-dashboard\documents-workspace.tsx:11` | **GET** | `"/admin-command/admissions/documents"` | `useSchoolQuery` | `Returns: DocumentsData` | `useSchoolQuery<DocumentsData>("/admin-command/admissions/documents")` |
| `apps\web\src\components\school\admissions-dashboard\enquiries-workspace.tsx:11` | **GET** | `"/admin-command/admissions/enquiries"` | `useSchoolQuery` | `Returns: EnquiriesData` | `useSchoolQuery<EnquiriesData>("/admin-command/admissions/enquiries")` |
| `apps\web\src\components\school\admissions-dashboard\enrolment-workspace.tsx:21` | **GET** | `"/api/admissions/applications?status=pending_enrolment"` | `useSchoolQuery` | `Returns: PendingEnrolment[] | Query: status=pending_enrolment` | `useSchoolQuery<PendingEnrolment[]>("/api/admissions/applications?status=pendi...` |
| `apps\web\src\components\school\admissions-dashboard\enrolment-workspace.tsx:26` | **POST** | `(id: string) => `/api/admissions/applications/${id}/enrol`` | `useSchoolMutation` | `N/A` | `useSchoolMutation((id: string) => \`/api/admissions/applications/${id}/enrol\`,...` |
| `apps\web\src\components\school\admissions-dashboard\fee-clearance-workspace.tsx:11` | **GET** | `"/admin-command/admissions/fee-clearance"` | `useSchoolQuery` | `Returns: FeeClearanceData` | `useSchoolQuery<FeeClearanceData>("/admin-command/admissions/fee-clearance")` |
| `apps\web\src\components\school\admissions-dashboard\imports-workspace.tsx:11` | **GET** | `"/admin-command/admissions/imports"` | `useSchoolQuery` | `Returns: ImportsData` | `useSchoolQuery<ImportsData>("/admin-command/admissions/imports")` |
| `apps\web\src\components\school\admissions-dashboard\interviews-workspace.tsx:11` | **GET** | `"/admin-command/admissions/interviews"` | `useSchoolQuery` | `Returns: InterviewsData` | `useSchoolQuery<InterviewsData>("/admin-command/admissions/interviews")` |
| `apps\web\src\components\school\admissions-dashboard\overview-workspace.tsx:8` | **GET** | `'/admin-command/admissions/overview'` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>('/admin-command/admissions/overview')` |
| `apps\web\src\components\school\admissions-dashboard\parents-workspace.tsx:11` | **GET** | `"/admin-command/admissions/parents"` | `useSchoolQuery` | `Returns: ParentsData` | `useSchoolQuery<ParentsData>("/admin-command/admissions/parents")` |
| `apps\web\src\components\school\admissions-dashboard\placement-workspace.tsx:11` | **GET** | `"/admin-command/admissions/placement"` | `useSchoolQuery` | `Returns: PlacementData` | `useSchoolQuery<PlacementData>("/admin-command/admissions/placement")` |
| `apps\web\src\components\school\admissions-dashboard\reports-workspace.tsx:11` | **GET** | `"/admin-command/admissions/reports"` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>("/admin-command/admissions/reports")` |
| `apps\web\src\components\school\admissions-dashboard\selection-workspace.tsx:11` | **GET** | `"/admin-command/admissions/selection"` | `useSchoolQuery` | `Returns: SelectionData` | `useSchoolQuery<SelectionData>("/admin-command/admissions/selection")` |
| `apps\web\src\components\school\admissions-dashboard\tasks-workspace.tsx:11` | **GET** | `"/admin-command/admissions/tasks"` | `useSchoolQuery` | `Returns: TasksData` | `useSchoolQuery<TasksData>("/admin-command/admissions/tasks")` |
| `apps\web\src\components\school\admissions-dashboard\templates-workspace.tsx:11` | **GET** | `"/admin-command/admissions/templates"` | `useSchoolQuery` | `Returns: TemplatesData` | `useSchoolQuery<TemplatesData>("/admin-command/admissions/templates")` |
| `apps\web\src\components\school\admissions-dashboard\transfers-workspace.tsx:11` | **GET** | `"/admin-command/admissions/transfers"` | `useSchoolQuery` | `Returns: TransfersData` | `useSchoolQuery<TransfersData>("/admin-command/admissions/transfers")` |
| `apps\web\src\components\school\admissions\admissions-workspace.tsx:27` | **GET** | `'/admin-command/admissions/admissions'` | `useSchoolQuery` | `Returns: AdmissionsData` | `useSchoolQuery<AdmissionsData>('/admin-command/admissions/admissions')` |
| `apps\web\src\components\school\admissions\applications-workspace.tsx:26` | **GET** | `'/admin-command/admissions/applications'` | `useSchoolQuery` | `Returns: ApplicationsData` | `useSchoolQuery<ApplicationsData>('/admin-command/admissions/applications')` |
| `apps\web\src\components\school\admissions\class-placement-workspace.tsx:24` | **GET** | `'/admin-command/admissions/class-placement'` | `useSchoolQuery` | `Returns: ClassPlacementData` | `useSchoolQuery<ClassPlacementData>('/admin-command/admissions/class-placement')` |
| `apps\web\src\components\school\admissions\documents-workspace.tsx:25` | **GET** | `'/admin-command/admissions/documents'` | `useSchoolQuery` | `Returns: DocumentsData` | `useSchoolQuery<DocumentsData>('/admin-command/admissions/documents')` |
| `apps\web\src\components\school\admissions\interviews-workspace.tsx:26` | **GET** | `'/admin-command/admissions/interviews'` | `useSchoolQuery` | `Returns: InterviewsData` | `useSchoolQuery<InterviewsData>('/admin-command/admissions/interviews')` |
| `apps\web\src\components\school\admissions\overview-workspace.tsx:25` | **GET** | `'/admin-command/admissions/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/admissions/overview')` |
| `apps\web\src\components\school\admissions\parent-linking-workspace.tsx:27` | **GET** | `'/admin-command/admissions/parent-linking'` | `useSchoolQuery` | `Returns: ParentLinkingData` | `useSchoolQuery<ParentLinkingData>('/admin-command/admissions/parent-linking')` |
| `apps\web\src\components\school\admissions\reports-workspace.tsx:22` | **GET** | `'/admin-command/admissions/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/admissions/reports')` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:231` | **GET** | `"/api/boarding/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/boarding/dashboard")` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:291` | **GET** | `"/api/boarding/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/boarding/dashboard")` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:316` | **GET** | `"/api/boarding/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/boarding/dashboard")` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:331` | **GET** | `"/api/boarding/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/boarding/dashboard")` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:337` | **POST** | `"/api/admin-command/boarding/assign-bed"` | `requestDashboardApi` | `Body: JSON.stringify({ student_id: studentId || "auto"` | `requestDashboardApi("/api/admin-command/boarding/assign-bed", {         metho...` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:383` | **GET** | `"/api/boarding/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/boarding/dashboard")` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:389` | **POST** | `"/api/admin-command/boarding/roll-call"` | `requestDashboardApi` | `Body: JSON.stringify(studentId ? { student_id: studentId` | `requestDashboardApi("/api/admin-command/boarding/roll-call", {         method...` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:478` | **GET** | `"/api/boarding/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/boarding/dashboard")` |
| `apps\web\src\components\school\boarding-master-command-center.tsx:484` | **POST** | `"/api/admin-command/boarding/incidents"` | `requestDashboardApi` | `Body: JSON.stringify(incidentId ? { action: "escalate"` | `requestDashboardApi("/api/admin-command/boarding/incidents", {         method...` |
| `apps\web\src\components\school\boarding-master\allocation-workspace.tsx:26` | **GET** | `'/admin-command/boarding-master/allocation'` | `useSchoolQuery` | `Returns: AllocationData` | `useSchoolQuery<AllocationData>('/admin-command/boarding-master/allocation')` |
| `apps\web\src\components\school\boarding-master\boarding-attendance-workspace.tsx:25` | **GET** | `'/admin-command/boarding-master/boarding-attendance'` | `useSchoolQuery` | `Returns: BoardingAttendanceData` | `useSchoolQuery<BoardingAttendanceData>('/admin-command/boarding-master/boardi...` |
| `apps\web\src\components\school\boarding-master\hostels-workspace.tsx:26` | **GET** | `'/admin-command/boarding-master/hostels'` | `useSchoolQuery` | `Returns: HostelsData` | `useSchoolQuery<HostelsData>('/admin-command/boarding-master/hostels')` |
| `apps\web\src\components\school\boarding-master\incidents-workspace.tsx:25` | **GET** | `'/admin-command/boarding-master/incidents'` | `useSchoolQuery` | `Returns: IncidentsData` | `useSchoolQuery<IncidentsData>('/admin-command/boarding-master/incidents')` |
| `apps\web\src\components\school\boarding-master\leave-exit-workspace.tsx:27` | **GET** | `'/admin-command/boarding-master/leave-exit'` | `useSchoolQuery` | `Returns: LeaveExitData` | `useSchoolQuery<LeaveExitData>('/admin-command/boarding-master/leave-exit')` |
| `apps\web\src\components\school\boarding-master\overview-workspace.tsx:23` | **GET** | `'/admin-command/boarding-master/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/boarding-master/overview')` |
| `apps\web\src\components\school\boarding-master\reports-workspace.tsx:22` | **GET** | `'/admin-command/boarding-master/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/boarding-master/reports')` |
| `apps\web\src\components\school\boarding-master\rooms-beds-workspace.tsx:25` | **GET** | `'/admin-command/boarding-master/rooms-beds'` | `useSchoolQuery` | `Returns: RoomsBedsData` | `useSchoolQuery<RoomsBedsData>('/admin-command/boarding-master/rooms-beds')` |
| `apps\web\src\components\school\class-teacher\attendance-follow-up-workspace.tsx:32` | **GET** | `'/admin-command/class-teacher/attendance-follow-up'` | `useSchoolQuery` | `Returns: AttendanceFollowUpData` | `useSchoolQuery<AttendanceFollowUpData>('/admin-command/class-teacher/attendan...` |
| `apps\web\src\components\school\class-teacher\class-academics-workspace.tsx:30` | **GET** | `'/admin-command/class-teacher/class-academics'` | `useSchoolQuery` | `Returns: ClassAcademicsData` | `useSchoolQuery<ClassAcademicsData>('/admin-command/class-teacher/class-academ...` |
| `apps\web\src\components\school\class-teacher\discipline-follow-up-workspace.tsx:33` | **GET** | `'/admin-command/class-teacher/discipline-follow-up'` | `useSchoolQuery` | `Returns: DisciplineFollowUpData` | `useSchoolQuery<DisciplineFollowUpData>('/admin-command/class-teacher/discipli...` |
| `apps\web\src\components\school\class-teacher\learner-profiles-workspace.tsx:35` | **GET** | `'/admin-command/class-teacher/learner-profiles'` | `useSchoolQuery` | `Returns: LearnerProfilesData` | `useSchoolQuery<LearnerProfilesData>('/admin-command/class-teacher/learner-pro...` |
| `apps\web\src\components\school\class-teacher\my-class-workspace.tsx:32` | **GET** | `'/admin-command/class-teacher/my-class'` | `useSchoolQuery` | `Returns: MyClassData` | `useSchoolQuery<MyClassData>('/admin-command/class-teacher/my-class')` |
| `apps\web\src\components\school\class-teacher\overview-workspace.tsx:30` | **GET** | `'/admin-command/class-teacher/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/class-teacher/overview')` |
| `apps\web\src\components\school\class-teacher\parent-contacts-workspace.tsx:32` | **GET** | `'/admin-command/class-teacher/parent-contacts'` | `useSchoolQuery` | `Returns: ParentContactsData` | `useSchoolQuery<ParentContactsData>('/admin-command/class-teacher/parent-conta...` |
| `apps\web\src\components\school\class-teacher\report-comments-workspace.tsx:32` | **GET** | `'/admin-command/class-teacher/report-comments'` | `useSchoolQuery` | `Returns: ReportCommentsData` | `useSchoolQuery<ReportCommentsData>('/admin-command/class-teacher/report-comme...` |
| `apps\web\src\components\school\class-teacher\reports-workspace.tsx:30` | **GET** | `'/admin-command/class-teacher/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/class-teacher/reports')` |
| `apps\web\src\components\school\class-teacher\welfare-notes-workspace.tsx:32` | **GET** | `'/admin-command/class-teacher/welfare-notes'` | `useSchoolQuery` | `Returns: WelfareNotesData` | `useSchoolQuery<WelfareNotesData>('/admin-command/class-teacher/welfare-notes')` |
| `apps\web\src\components\school\class-teacher\workspaces\communication.tsx:18` | **POST** | `"/api/academic/communications"` | `requestDashboardApi` | `Body: JSON.stringify({
          message: formData.get("message")` | `requestDashboardApi("/api/academic/communications", {         method: "POST",...` |
| `apps\web\src\components\school\counsellor-command-center.tsx:142` | **GET** | `"/api/counselling/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/counselling/dashboard")` |
| `apps\web\src\components\school\counsellor-command-center.tsx:143` | **GET** | `"/api/counselling/referrals"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/counselling/referrals")` |
| `apps\web\src\components\school\counsellor-command-center.tsx:144` | **GET** | `"/api/counselling/sessions"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/counselling/sessions")` |
| `apps\web\src\components\school\dean-academics-command-center.tsx:445` | **GET** | `'/api/exams/marks/school'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/exams/marks/school', { enabled: !!liveSession.session })` |
| `apps\web\src\components\school\dean-academics-command-center.tsx:458` | **POST** | `"/api/academic/dean/lock-batch"` | `requestDashboardApi` | `Body: JSON.stringify({
          schoolId` | `requestDashboardApi("/api/academic/dean/lock-batch", {         method: "POST"...` |
| `apps\web\src\components\school\dean-academics-command-center.tsx:880` | **POST** | `"/api/academic/dean/action"` | `requestDashboardApi` | `Body: JSON.stringify({
          action: selectedAction` | `requestDashboardApi("/api/academic/dean/action", {         method: "POST",   ...` |
| `apps\web\src\components\school\dean-academics\academic-interventions-workspace.tsx:27` | **GET** | `'/admin-command/dean-academics/academic-interventions'` | `useSchoolQuery` | `Returns: AcademicInterventionsData` | `useSchoolQuery<AcademicInterventionsData>('/admin-command/dean-academics/acad...` |
| `apps\web\src\components\school\dean-academics\assessments-workspace.tsx:27` | **GET** | `'/admin-command/dean-academics/assessments'` | `useSchoolQuery` | `Returns: AssessmentsData` | `useSchoolQuery<AssessmentsData>('/admin-command/dean-academics/assessments')` |
| `apps\web\src\components\school\dean-academics\curriculum-coverage-workspace.tsx:27` | **GET** | `'/admin-command/dean-academics/curriculum-coverage'` | `useSchoolQuery` | `Returns: CurriculumCoverageData` | `useSchoolQuery<CurriculumCoverageData>('/admin-command/dean-academics/curricu...` |
| `apps\web\src\components\school\dean-academics\department-performance-workspace.tsx:26` | **GET** | `'/admin-command/dean-academics/department-performance'` | `useSchoolQuery` | `Returns: DepartmentPerformanceData` | `useSchoolQuery<DepartmentPerformanceData>('/admin-command/dean-academics/depa...` |
| `apps\web\src\components\school\dean-academics\lesson-logs-workspace.tsx:27` | **GET** | `'/admin-command/dean-academics/lesson-logs'` | `useSchoolQuery` | `Returns: LessonLogsData` | `useSchoolQuery<LessonLogsData>('/admin-command/dean-academics/lesson-logs')` |
| `apps\web\src\components\school\dean-academics\lesson-plans-workspace.tsx:27` | **GET** | `'/admin-command/dean-academics/lesson-plans'` | `useSchoolQuery` | `Returns: LessonPlansData` | `useSchoolQuery<LessonPlansData>('/admin-command/dean-academics/lesson-plans')` |
| `apps\web\src\components\school\dean-academics\overview-workspace.tsx:23` | **GET** | `'/admin-command/dean-academics/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/dean-academics/overview')` |
| `apps\web\src\components\school\dean-academics\reports-workspace.tsx:22` | **GET** | `'/admin-command/dean-academics/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/dean-academics/reports')` |
| `apps\web\src\components\school\dean-academics\teacher-workload-workspace.tsx:26` | **GET** | `'/admin-command/dean-academics/teacher-workload'` | `useSchoolQuery` | `Returns: TeacherWorkloadData` | `useSchoolQuery<TeacherWorkloadData>('/admin-command/dean-academics/teacher-wo...` |
| `apps\web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx:30` | **GET** | `'/admin-command/deputy/academics'` | `useSchoolQuery` | `Returns: AcademicsData` | `useSchoolQuery<AcademicsData>('/admin-command/deputy/academics')` |
| `apps\web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx:35` | **POST** | `({ id }) => `/admin-command/deputy/academics/${id}/message-hod`` | `useSchoolMutation` | `Body: { id: string }` | `useSchoolMutation<{ id: string }, { id: string }>(     ({ id }) => \`/admin-co...` |
| `apps\web\src\components\school\deputy-principal\approvals-workspace.tsx:25` | **GET** | `'/admin-command/deputy/approvals'` | `useSchoolQuery` | `Returns: ApprovalsData` | `useSchoolQuery<ApprovalsData>('/admin-command/deputy/approvals')` |
| `apps\web\src\components\school\deputy-principal\attendance-workspace.tsx:28` | **GET** | `'/admin-command/deputy/attendance'` | `useSchoolQuery` | `Returns: AttendanceData` | `useSchoolQuery<AttendanceData>('/admin-command/deputy/attendance')` |
| `apps\web\src\components\school\deputy-principal\classes-streams-workspace.tsx:28` | **GET** | `'/admin-command/deputy/classes'` | `useSchoolQuery` | `Returns: ClassesData` | `useSchoolQuery<ClassesData>('/admin-command/deputy/classes')` |
| `apps\web\src\components\school\deputy-principal\communication-workspace.tsx:22` | **GET** | `'/api/communication/sms'` | `useSchoolQuery` | `Returns: { data: CommMessage[] }` | `useSchoolQuery<{ data: CommMessage[] }>('/api/communication/sms')` |
| `apps\web\src\components\school\deputy-principal\communication-workspace.tsx:30` | **POST** | `'/api/communication/sms'` | `requestDashboardApi` | `Body: {
          recipientPhone: formData.recipient` | `requestDashboardApi('/api/communication/sms', {         method: 'POST',      ...` |
| `apps\web\src\components\school\deputy-principal\daily-operations-workspace.tsx:34` | **GET** | `'/admin-command/deputy/daily-operations'` | `useSchoolQuery` | `Returns: DailyOperationsData` | `useSchoolQuery<DailyOperationsData>('/admin-command/deputy/daily-operations')` |
| `apps\web\src\components\school\deputy-principal\discipline-workspace.tsx:32` | **GET** | `'/admin-command/deputy/discipline'` | `useSchoolQuery` | `Returns: DisciplineIncident[]` | `useSchoolQuery<DisciplineIncident[]>('/admin-command/deputy/discipline')` |
| `apps\web\src\components\school\deputy-principal\exams-marks-workspace.tsx:26` | **GET** | `'/admin-command/deputy/exams'` | `useSchoolQuery` | `Returns: ExamsData` | `useSchoolQuery<ExamsData>('/admin-command/deputy/exams')` |
| `apps\web\src\components\school\deputy-principal\overview-workspace.tsx:31` | **GET** | `'/admin-command/deputy/overview'` | `useSchoolQuery` | `Returns: DeputyOverviewData` | `useSchoolQuery<DeputyOverviewData>('/admin-command/deputy/overview')` |
| `apps\web\src\components\school\deputy-principal\reports-workspace.tsx:25` | **GET** | `'/admin-command/deputy/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/deputy/reports')` |
| `apps\web\src\components\school\deputy-principal\staff-duty-workspace.tsx:28` | **GET** | `'/admin-command/deputy/staff-duty'` | `useSchoolQuery` | `Returns: StaffDutyData` | `useSchoolQuery<StaffDutyData>('/admin-command/deputy/staff-duty')` |
| `apps\web\src\components\school\deputy-principal\staff-duty-workspace.tsx:34` | **POST** | `({ id }) => `/admin-command/deputy/staff-duty/${id}/request-report`` | `useSchoolMutation` | `Body: { id: string }` | `useSchoolMutation<{ id: string }, { id: string }>(     ({ id }) => \`/admin-co...` |
| `apps\web\src\components\school\deputy-principal\staff-roles-workspace.tsx:25` | **GET** | `'/admin-command/deputy/staff'` | `useSchoolQuery` | `Returns: StaffData` | `useSchoolQuery<StaffData>('/admin-command/deputy/staff')` |
| `apps\web\src\components\school\deputy-principal\teaching-workspace.tsx:26` | **GET** | `'/admin-command/deputy/teaching'` | `useSchoolQuery` | `Returns: TeachingData` | `useSchoolQuery<TeachingData>('/admin-command/deputy/teaching')` |
| `apps\web\src\components\school\deputy-principal\timetable-relief-workspace.tsx:29` | **GET** | `'/admin-command/deputy/timetable'` | `useSchoolQuery` | `Returns: TimetableData` | `useSchoolQuery<TimetableData>('/admin-command/deputy/timetable')` |
| `apps\web\src\components\school\deputy-principal\timetable-relief-workspace.tsx:32` | **POST** | `({ id }) => `/admin-command/deputy/timetable/${id}/assign`` | `useSchoolMutation` | `Body: { id: string; teacherName: string }` | `useSchoolMutation<     { id: string; teacherName: string },     { id: string;...` |
| `apps\web\src\components\school\deputy-principal\welfare-workspace.tsx:31` | **GET** | `'/admin-command/deputy/welfare'` | `useSchoolQuery` | `Returns: WelfareData` | `useSchoolQuery<WelfareData>('/admin-command/deputy/welfare')` |
| `apps\web\src\components\school\deputy-principal\welfare-workspace.tsx:33` | **POST** | `'/admin-command/deputy/welfare'` | `useSchoolMutation` | `N/A` | `useSchoolMutation('/admin-command/deputy/welfare', 'POST', {     onSuccess: (...` |
| `apps\web\src\components\school\discipline-master\actions-interventions-workspace.tsx:14` | **GET** | `"/discipline/actions-interventions"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/actions-interventions")` |
| `apps\web\src\components\school\discipline-master\actions-sanctions-workspace.tsx:14` | **GET** | `"/discipline/actions-sanctions"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/actions-sanctions")` |
| `apps\web\src\components\school\discipline-master\audit-trail-workspace.tsx:14` | **GET** | `"/discipline/audit-trail"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/audit-trail")` |
| `apps\web\src\components\school\discipline-master\cases-workspace.tsx:14` | **GET** | `"/discipline/cases"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/cases")` |
| `apps\web\src\components\school\discipline-master\class-house-monitoring-workspace.tsx:14` | **GET** | `"/discipline/class-house-monitoring"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/class-house-monitoring")` |
| `apps\web\src\components\school\discipline-master\counselling-referrals-workspace.tsx:14` | **GET** | `"/discipline/counselling-referrals"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/counselling-referrals")` |
| `apps\web\src\components\school\discipline-master\detention-programs-workspace.tsx:14` | **GET** | `"/discipline/detention-programs"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/detention-programs")` |
| `apps\web\src\components\school\discipline-master\incident-log-workspace.tsx:14` | **GET** | `"/discipline/incident-log"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/incident-log")` |
| `apps\web\src\components\school\discipline-master\incident-register-workspace.tsx:14` | **GET** | `"/discipline/incident-register"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/incident-register")` |
| `apps\web\src\components\school\discipline-master\investigations-workspace.tsx:14` | **GET** | `"/discipline/investigations"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/investigations")` |
| `apps\web\src\components\school\discipline-master\log-incident-workspace.tsx:14` | **GET** | `"/discipline/log-incident"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/log-incident")` |
| `apps\web\src\components\school\discipline-master\overview-workspace.tsx:14` | **GET** | `"/discipline/overview"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/overview")` |
| `apps\web\src\components\school\discipline-master\parent-communication-workspace.tsx:14` | **GET** | `"/discipline/parent-communication"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/parent-communication")` |
| `apps\web\src\components\school\discipline-master\parent-summons-workspace.tsx:14` | **GET** | `"/discipline/parent-summons"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/parent-summons")` |
| `apps\web\src\components\school\discipline-master\report-intake-workspace.tsx:14` | **GET** | `"/discipline/report-intake"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/report-intake")` |
| `apps\web\src\components\school\discipline-master\reports-downloads-workspace.tsx:14` | **GET** | `"/discipline/reports-downloads"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/reports-downloads")` |
| `apps\web\src\components\school\discipline-master\reports-workspace.tsx:14` | **GET** | `"/discipline/reports"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/reports")` |
| `apps\web\src\components\school\discipline-master\serious-cases-approvals-workspace.tsx:14` | **GET** | `"/discipline/serious-cases-approvals"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/serious-cases-approvals")` |
| `apps\web\src\components\school\discipline-master\settings-workspace.tsx:14` | **GET** | `"/discipline/settings"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/settings")` |
| `apps\web\src\components\school\discipline-master\student-conduct-profiles-workspace.tsx:14` | **GET** | `"/discipline/student-conduct-profiles"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/student-conduct-profiles")` |
| `apps\web\src\components\school\discipline-master\templates-rules-workspace.tsx:14` | **GET** | `"/discipline/templates-rules"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/templates-rules")` |
| `apps\web\src\components\school\discipline-master\triage-queue-workspace.tsx:14` | **GET** | `"/discipline/triage-queue"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/discipline/triage-queue")` |
| `apps\web\src\components\school\docx-operational-workspace.tsx:43` | **POST** | `"/api/workflow/events"` | `fetch` | `Body: JSON.stringify({
          eventType: `UI_ACTION_TRIGGERED`` | `fetch("/api/workflow/events", {         method: "POST",         headers: { "C...` |
| `apps\web\src\components\school\docx-operational-workspace.tsx:135` | **POST** | `"/api/workflow/events"` | `fetch` | `Body: JSON.stringify({
                        eventType: `FORM_SUBMISSION`` | `fetch("/api/workflow/events", {                       method: "POST",        ...` |
| `apps\web\src\components\school\exams-dashboard\academic-setup-approval-workspace.tsx:11` | **GET** | `"/admin-command/exams/academic-setup-approval"` | `useSchoolQuery` | `Returns: AcademicSetupApprovalData` | `useSchoolQuery<AcademicSetupApprovalData>("/admin-command/exams/academic-setu...` |
| `apps\web\src\components\school\exams-dashboard\exam-readiness-workspace.tsx:11` | **GET** | `"/admin-command/exams/readiness"` | `useSchoolQuery` | `Returns: ExamReadinessData` | `useSchoolQuery<ExamReadinessData>("/admin-command/exams/readiness")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:933` | **POST** | `"/api/academic/exams-manager/import-marks"` | `requestDashboardApi` | `Body: JSON.stringify({ type: "csv_import"` | `requestDashboardApi("/api/academic/exams-manager/import-marks", {            ...` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:950` | **POST** | `"/api/academic/exams-manager/export-marks"` | `requestDashboardApi` | `Body: JSON.stringify({ type: "csv_export"` | `requestDashboardApi("/api/academic/exams-manager/export-marks", {            ...` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:970` | **POST** | `"/api/academic/exams-manager/zeraki-sync"` | `requestDashboardApi` | `Body: JSON.stringify({ sync: true` | `requestDashboardApi("/api/academic/exams-manager/zeraki-sync", {             ...` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1298` | **GET** | `"/api/exams/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/exams/dashboard")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1334` | **POST** | `"/api/exams/configuration"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/exams/configuration")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1335` | **POST** | `"/api/exams/draft"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/exams/draft")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1336` | **POST** | `"/api/exams/alignment"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/exams/alignment")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1337` | **POST** | `"/api/exams/marks"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/exams/marks")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1338` | **POST** | `"/api/exams/review"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/exams/review")` |
| `apps\web\src\components\school\exams-manager-command-center.tsx:1339` | **POST** | `"/api/exams/lifecycle"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/exams/lifecycle")` |
| `apps\web\src\components\school\exams-manager\analysis-workspace.tsx:28` | **GET** | `'/admin-command/exams-manager/analysis'` | `useSchoolQuery` | `Returns: AnalysisData` | `useSchoolQuery<AnalysisData>('/admin-command/exams-manager/analysis')` |
| `apps\web\src\components\school\exams-manager\exam-setup-workspace.tsx:34` | **GET** | `'/admin-command/exams-manager/exam-setup'` | `useSchoolQuery` | `Returns: ExamSetupData` | `useSchoolQuery<ExamSetupData>('/admin-command/exams-manager/exam-setup')` |
| `apps\web\src\components\school\exams-manager\exam-timetable-workspace.tsx:33` | **GET** | `'/admin-command/exams-manager/exam-timetable'` | `useSchoolQuery` | `Returns: TimetableData` | `useSchoolQuery<TimetableData>('/admin-command/exams-manager/exam-timetable')` |
| `apps\web\src\components\school\exams-manager\marks-entry-workspace.tsx:34` | **GET** | `'/admin-command/exams-manager/marks-entry'` | `useSchoolQuery` | `Returns: MarksEntryData` | `useSchoolQuery<MarksEntryData>('/admin-command/exams-manager/marks-entry')` |
| `apps\web\src\components\school\exams-manager\moderation-workspace.tsx:34` | **GET** | `'/admin-command/exams-manager/moderation'` | `useSchoolQuery` | `Returns: ModerationData` | `useSchoolQuery<ModerationData>('/admin-command/exams-manager/moderation')` |
| `apps\web\src\components\school\exams-manager\overview-workspace.tsx:31` | **GET** | `'/admin-command/exams-manager/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/exams-manager/overview')` |
| `apps\web\src\components\school\exams-manager\publishing-workspace.tsx:26` | **GET** | `'/admin-command/exams-manager/publishing'` | `useSchoolQuery` | `Returns: PublishingData` | `useSchoolQuery<PublishingData>('/admin-command/exams-manager/publishing')` |
| `apps\web\src\components\school\exams-manager\report-cards-workspace.tsx:27` | **GET** | `'/admin-command/exams-manager/report-cards'` | `useSchoolQuery` | `Returns: ReportCardsData` | `useSchoolQuery<ReportCardsData>('/admin-command/exams-manager/report-cards')` |
| `apps\web\src\components\school\exams-manager\reports-workspace.tsx:22` | **GET** | `'/admin-command/exams-manager/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/exams-manager/reports')` |
| `apps\web\src\components\school\grade-master-command-center.tsx:288` | **GET** | `"/api/grade-master/overview"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/grade-master/overview", { enabled: !!liveSession.se...` |
| `apps\web\src\components\school\grade-master-command-center.tsx:383` | **POST** | `"/api/academic/communications"` | `requestDashboardApi` | `Body: JSON.stringify({ type: "teacher_message"` | `requestDashboardApi("/api/academic/communications", { method: "POST", body: J...` |
| `apps\web\src\components\school\grade-master-command-center.tsx:458` | **POST** | `"/api/academic/grade-master/compile"` | `requestDashboardApi` | `Body: JSON.stringify({ action` | `requestDashboardApi("/api/academic/grade-master/compile", { method: "POST", b...` |
| `apps\web\src\components\school\grade-master-command-center.tsx:529` | **POST** | `"/api/academic/communications"` | `requestDashboardApi` | `Body: JSON.stringify({ type: "bulk_notice"` | `requestDashboardApi("/api/academic/communications", { method: "POST", body: J...` |
| `apps\web\src\components\school\grade-master-command-center.tsx:599` | **POST** | `"/api/academic/grade-master/comment"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "add_comment"` | `requestDashboardApi("/api/academic/grade-master/comment", { method: "POST", b...` |
| `apps\web\src\components\school\guidance-counselling\follow-ups-workspace.tsx:26` | **GET** | `'/admin-command/guidance-counselling/follow-ups'` | `useSchoolQuery` | `Returns: FollowUpsData` | `useSchoolQuery<FollowUpsData>('/admin-command/guidance-counselling/follow-ups')` |
| `apps\web\src\components\school\guidance-counselling\overview-workspace.tsx:23` | **GET** | `'/admin-command/guidance-counselling/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/guidance-counselling/overview')` |
| `apps\web\src\components\school\guidance-counselling\parent-engagement-workspace.tsx:26` | **GET** | `'/admin-command/guidance-counselling/parent-engagement'` | `useSchoolQuery` | `Returns: ParentEngagementData` | `useSchoolQuery<ParentEngagementData>('/admin-command/guidance-counselling/par...` |
| `apps\web\src\components\school\guidance-counselling\referrals-workspace.tsx:26` | **GET** | `'/admin-command/guidance-counselling/referrals'` | `useSchoolQuery` | `Returns: ReferralsData` | `useSchoolQuery<ReferralsData>('/admin-command/guidance-counselling/referrals')` |
| `apps\web\src\components\school\guidance-counselling\reports-workspace.tsx:22` | **GET** | `'/admin-command/guidance-counselling/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/guidance-counselling/reports')` |
| `apps\web\src\components\school\guidance-counselling\sessions-workspace.tsx:27` | **GET** | `'/admin-command/guidance-counselling/sessions'` | `useSchoolQuery` | `Returns: SessionsData` | `useSchoolQuery<SessionsData>('/admin-command/guidance-counselling/sessions')` |
| `apps\web\src\components\school\guidance-counselling\welfare-notes-workspace.tsx:26` | **GET** | `'/admin-command/guidance-counselling/welfare-notes'` | `useSchoolQuery` | `Returns: WelfareNotesData` | `useSchoolQuery<WelfareNotesData>('/admin-command/guidance-counselling/welfare...` |
| `apps\web\src\components\school\hod-command-center.tsx:182` | **GET** | `"/api/academics/my-assignments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/my-assignments", { enabled: !!liveSessi...` |
| `apps\web\src\components\school\hod-command-center.tsx:183` | **GET** | `"/api/academics/my-lesson-logs"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/my-lesson-logs", { enabled: !!liveSessi...` |
| `apps\web\src\components\school\hod-command-center.tsx:239` | **GET** | `"/api/hr/staff?department=academics"` | `useSchoolQuery` | `Returns: any | Query: department=academics` | `useSchoolQuery<any>("/api/hr/staff?department=academics", { enabled: !!liveSe...` |
| `apps\web\src\components\school\hod-command-center.tsx:246` | **POST** | `"/api/academic/hod/requests"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "add_teacher"` | `requestDashboardApi("/api/academic/hod/requests", {         method: "POST",  ...` |
| `apps\web\src\components\school\hod-command-center.tsx:309` | **GET** | `"/api/academics/teacher-assignments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/teacher-assignments", { enabled: !!live...` |
| `apps\web\src\components\school\hod-command-center.tsx:319` | **POST** | `"/api/academic/hod/subject-allocation"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "allocate_subject"` | `requestDashboardApi("/api/academic/hod/subject-allocation", {         method:...` |
| `apps\web\src\components\school\hod-command-center.tsx:417` | **POST** | `"/api/academic/hod/department-meetings"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "log_meeting"` | `requestDashboardApi("/api/academic/hod/department-meetings", {         method...` |
| `apps\web\src\components\school\hod-command-center.tsx:472` | **GET** | `"/api/academics/summary"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/academics/summary", { enabled: !!liveSession.sessio...` |
| `apps\web\src\components\school\hod-command-center.tsx:480` | **POST** | `"/api/academic/hod/requests"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "new_report"` | `requestDashboardApi("/api/academic/hod/requests", {         method: "POST",  ...` |
| `apps\web\src\components\school\hod-command-center.tsx:497` | **POST** | `"/api/academic/hod/requests"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "weekly_update"` | `requestDashboardApi("/api/academic/hod/requests", {         method: "POST",  ...` |
| `apps\web\src\components\school\hod-dashboard\department-overview-workspace.tsx:11` | **GET** | `"/admin-command/hod/department-overview"` | `useSchoolQuery` | `Returns: DepartmentOverviewData` | `useSchoolQuery<DepartmentOverviewData>("/admin-command/hod/department-overview")` |
| `apps\web\src\components\school\hod-dashboard\review-queue-workspace.tsx:11` | **GET** | `"/admin-command/hod/review-queue"` | `useSchoolQuery` | `Returns: ReviewQueueData` | `useSchoolQuery<ReviewQueueData>("/admin-command/hod/review-queue")` |
| `apps\web\src\components\school\hod\coverage-review-workspace.tsx:26` | **GET** | `'/admin-command/hod/coverage-review'` | `useSchoolQuery` | `Returns: CoverageReviewData` | `useSchoolQuery<CoverageReviewData>('/admin-command/hod/coverage-review')` |
| `apps\web\src\components\school\hod\department-teachers-workspace.tsx:25` | **GET** | `'/admin-command/hod/department-teachers'` | `useSchoolQuery` | `Returns: DepartmentTeachersData` | `useSchoolQuery<DepartmentTeachersData>('/admin-command/hod/department-teachers')` |
| `apps\web\src\components\school\hod\lesson-plans-workspace.tsx:27` | **GET** | `'/admin-command/hod/lesson-plans'` | `useSchoolQuery` | `Returns: LessonPlansData` | `useSchoolQuery<LessonPlansData>('/admin-command/hod/lesson-plans')` |
| `apps\web\src\components\school\hod\marks-moderation-workspace.tsx:28` | **GET** | `'/admin-command/hod/marks-moderation'` | `useSchoolQuery` | `Returns: MarksModerationData` | `useSchoolQuery<MarksModerationData>('/admin-command/hod/marks-moderation')` |
| `apps\web\src\components\school\hod\overview-workspace.tsx:23` | **GET** | `'/admin-command/hod/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/hod/overview')` |
| `apps\web\src\components\school\hod\reports-workspace.tsx:22` | **GET** | `'/admin-command/hod/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/hod/reports')` |
| `apps\web\src\components\school\hod\resource-requests-workspace.tsx:26` | **GET** | `'/admin-command/hod/resource-requests'` | `useSchoolQuery` | `Returns: ResourceRequestsData` | `useSchoolQuery<ResourceRequestsData>('/admin-command/hod/resource-requests')` |
| `apps\web\src\components\school\hod\subject-allocation-workspace.tsx:25` | **GET** | `'/admin-command/hod/subject-allocation'` | `useSchoolQuery` | `Returns: SubjectAllocationData` | `useSchoolQuery<SubjectAllocationData>('/admin-command/hod/subject-allocation')` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:35` | **GET** | `"/api/support/tickets?limit=5"` | `useSchoolQuery` | `Returns: any | Query: limit=5` | `useSchoolQuery<any>("/api/support/tickets?limit=5")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:36` | **GET** | `"/api/observability/alerts"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/observability/alerts")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:37` | **GET** | `"/api/observability/health"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/observability/health")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:38` | **GET** | `"/api/assets/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/assets/dashboard")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:90` | **GET** | `"/api/support/tickets"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/support/tickets")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:134` | **GET** | `"/api/assets/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/assets/dashboard")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:186` | **GET** | `"/api/observability/alerts"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/observability/alerts")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:228` | **GET** | `"/api/support/tickets"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/support/tickets")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:229` | **GET** | `"/api/observability/alerts"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/observability/alerts")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:230` | **GET** | `"/api/health"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/health")` |
| `apps\web\src\components\school\ict-manager-command-center.tsx:231` | **GET** | `"/api/assets"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/assets")` |
| `apps\web\src\components\school\ict-manager\asset-assignment-workspace.tsx:26` | **GET** | `'/admin-command/ict-manager/asset-assignment'` | `useSchoolQuery` | `Returns: AssetAssignmentData` | `useSchoolQuery<AssetAssignmentData>('/admin-command/ict-manager/asset-assignm...` |
| `apps\web\src\components\school\ict-manager\assets-workspace.tsx:27` | **GET** | `'/admin-command/ict-manager/assets'` | `useSchoolQuery` | `Returns: AssetsData` | `useSchoolQuery<AssetsData>('/admin-command/ict-manager/assets')` |
| `apps\web\src\components\school\ict-manager\facilities-issues-workspace.tsx:26` | **GET** | `'/admin-command/ict-manager/facilities-issues'` | `useSchoolQuery` | `Returns: FacilitiesIssuesData` | `useSchoolQuery<FacilitiesIssuesData>('/admin-command/ict-manager/facilities-i...` |
| `apps\web\src\components\school\ict-manager\loans-returns-workspace.tsx:26` | **GET** | `'/admin-command/ict-manager/loans-returns'` | `useSchoolQuery` | `Returns: LoansReturnsData` | `useSchoolQuery<LoansReturnsData>('/admin-command/ict-manager/loans-returns')` |
| `apps\web\src\components\school\ict-manager\maintenance-workspace.tsx:26` | **GET** | `'/admin-command/ict-manager/maintenance'` | `useSchoolQuery` | `Returns: MaintenanceData` | `useSchoolQuery<MaintenanceData>('/admin-command/ict-manager/maintenance')` |
| `apps\web\src\components\school\ict-manager\overview-workspace.tsx:23` | **GET** | `'/admin-command/ict-manager/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/ict-manager/overview')` |
| `apps\web\src\components\school\ict-manager\reports-workspace.tsx:22` | **GET** | `'/admin-command/ict-manager/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/ict-manager/reports')` |
| `apps\web\src\components\school\laboratory-technician-command-center.tsx:169` | **GET** | `"/api/labs/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/labs/dashboard")` |
| `apps\web\src\components\school\laboratory-technician\apparatus-issue-workspace.tsx:27` | **GET** | `'/admin-command/laboratory-technician/apparatus-issue'` | `useSchoolQuery` | `Returns: ApparatusIssueData` | `useSchoolQuery<ApparatusIssueData>('/admin-command/laboratory-technician/appa...` |
| `apps\web\src\components\school\laboratory-technician\chemicals-workspace.tsx:27` | **GET** | `'/admin-command/laboratory-technician/chemicals'` | `useSchoolQuery` | `Returns: ChemicalsData` | `useSchoolQuery<ChemicalsData>('/admin-command/laboratory-technician/chemicals')` |
| `apps\web\src\components\school\laboratory-technician\lab-inventory-workspace.tsx:27` | **GET** | `'/admin-command/laboratory-technician/lab-inventory'` | `useSchoolQuery` | `Returns: LabInventoryData` | `useSchoolQuery<LabInventoryData>('/admin-command/laboratory-technician/lab-in...` |
| `apps\web\src\components\school\laboratory-technician\lab-timetable-workspace.tsx:27` | **GET** | `'/admin-command/laboratory-technician/lab-timetable'` | `useSchoolQuery` | `Returns: LabTimetableData` | `useSchoolQuery<LabTimetableData>('/admin-command/laboratory-technician/lab-ti...` |
| `apps\web\src\components\school\laboratory-technician\overview-workspace.tsx:23` | **GET** | `'/admin-command/laboratory-technician/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/laboratory-technician/overview')` |
| `apps\web\src\components\school\laboratory-technician\reports-workspace.tsx:22` | **GET** | `'/admin-command/laboratory-technician/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/laboratory-technician/reports')` |
| `apps\web\src\components\school\laboratory-technician\safety-incidents-workspace.tsx:26` | **GET** | `'/admin-command/laboratory-technician/safety-incidents'` | `useSchoolQuery` | `Returns: SafetyIncidentsData` | `useSchoolQuery<SafetyIncidentsData>('/admin-command/laboratory-technician/saf...` |
| `apps\web\src\components\school\librarian-command-center.tsx:171` | **GET** | `"/api/library/summary"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/library/summary")` |
| `apps\web\src\components\school\librarian-command-center.tsx:172` | **GET** | `"/api/library/circulation"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/library/circulation")` |
| `apps\web\src\components\school\librarian-command-center.tsx:330` | **POST** | `"/api/admin-command/library/issue"` | `requestDashboardApi` | `Body: JSON.stringify({ borrowerId: selectedBorrower?.adm` | `requestDashboardApi("/api/admin-command/library/issue", {         method: "PO...` |
| `apps\web\src\components\school\librarian-command-center.tsx:434` | **POST** | `"/api/admin-command/library/return"` | `requestDashboardApi` | `Body: JSON.stringify({ barcode: barcodeInput` | `requestDashboardApi("/api/admin-command/library/return", {         method: "P...` |
| `apps\web\src\components\school\librarian-command-center.tsx:481` | **POST** | `"/api/admin-command/library/add"` | `requestDashboardApi` | `Body: JSON.stringify({ title: "New Book"` | `requestDashboardApi("/api/admin-command/library/add", {         method: "POST...` |
| `apps\web\src\components\school\librarian-command-center.tsx:535` | **GET** | `"/api/library/catalog"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/library/catalog")` |
| `apps\web\src\components\school\librarian\books-workspace.tsx:32` | **GET** | `'/admin-command/librarian/books'` | `useSchoolQuery` | `Returns: BooksData` | `useSchoolQuery<BooksData>('/admin-command/librarian/books')` |
| `apps\web\src\components\school\librarian\borrowers-workspace.tsx:30` | **GET** | `'/admin-command/librarian/borrowers'` | `useSchoolQuery` | `Returns: BorrowersData` | `useSchoolQuery<BorrowersData>('/admin-command/librarian/borrowers')` |
| `apps\web\src\components\school\librarian\fines-lost-damaged-workspace.tsx:33` | **GET** | `'/admin-command/librarian/fines-lost-damaged'` | `useSchoolQuery` | `Returns: FinesData` | `useSchoolQuery<FinesData>('/admin-command/librarian/fines-lost-damaged')` |
| `apps\web\src\components\school\librarian\issue-book-workspace.tsx:31` | **GET** | `'/admin-command/librarian/issue-book'` | `useSchoolQuery` | `Returns: IssueBookData` | `useSchoolQuery<IssueBookData>('/admin-command/librarian/issue-book')` |
| `apps\web\src\components\school\librarian\overdue-books-workspace.tsx:34` | **GET** | `'/admin-command/librarian/overdue-books'` | `useSchoolQuery` | `Returns: OverdueBooksData` | `useSchoolQuery<OverdueBooksData>('/admin-command/librarian/overdue-books')` |
| `apps\web\src\components\school\librarian\overview-workspace.tsx:30` | **GET** | `'/admin-command/librarian/overview'` | `useSchoolQuery` | `Returns: LibrarianOverviewData` | `useSchoolQuery<LibrarianOverviewData>('/admin-command/librarian/overview')` |
| `apps\web\src\components\school\librarian\reports-workspace.tsx:30` | **GET** | `'/admin-command/librarian/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/librarian/reports')` |
| `apps\web\src\components\school\librarian\return-book-workspace.tsx:32` | **GET** | `'/admin-command/librarian/return-book'` | `useSchoolQuery` | `Returns: ReturnBookData` | `useSchoolQuery<ReturnBookData>('/admin-command/librarian/return-book')` |
| `apps\web\src\components\school\nurse-command-center.tsx:23` | **POST** | `"/api/admin-command/clinic/visit"` | `requestDashboardApi` | `Body: JSON.stringify(data)` | `requestDashboardApi("/api/admin-command/clinic/visit", {         method: "POS...` |
| `apps\web\src\components\school\nurse\dispensing-log-workspace.tsx:28` | **GET** | `'/admin-command/nurse/dispensing-log'` | `useSchoolQuery` | `Returns: DispensingData` | `useSchoolQuery<DispensingData>('/admin-command/nurse/dispensing-log')` |
| `apps\web\src\components\school\nurse\health-reports-workspace.tsx:28` | **GET** | `'/admin-command/nurse/health-reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/nurse/health-reports')` |
| `apps\web\src\components\school\nurse\medicine-inventory-workspace.tsx:28` | **GET** | `'/admin-command/nurse/medicine-inventory'` | `useSchoolQuery` | `Returns: MedicineData` | `useSchoolQuery<MedicineData>('/admin-command/nurse/medicine-inventory')` |
| `apps\web\src\components\school\nurse\overview-workspace.tsx:28` | **GET** | `'/admin-command/nurse/overview'` | `useSchoolQuery` | `Returns: NurseOverviewData` | `useSchoolQuery<NurseOverviewData>('/admin-command/nurse/overview')` |
| `apps\web\src\components\school\nurse\parent-notifications-workspace.tsx:28` | **GET** | `'/admin-command/nurse/parent-notifications'` | `useSchoolQuery` | `Returns: NotificationsData` | `useSchoolQuery<NotificationsData>('/admin-command/nurse/parent-notifications')` |
| `apps\web\src\components\school\nurse\sick-bay-queue-workspace.tsx:27` | **GET** | `'/admin-command/nurse/sick-bay-queue'` | `useSchoolQuery` | `Returns: SickBayData` | `useSchoolQuery<SickBayData>('/admin-command/nurse/sick-bay-queue')` |
| `apps\web\src\components\school\nurse\visits-workspace.tsx:28` | **GET** | `'/admin-command/nurse/visits'` | `useSchoolQuery` | `Returns: VisitsData` | `useSchoolQuery<VisitsData>('/admin-command/nurse/visits')` |
| `apps\web\src\components\school\operational-blueprint-workspace.tsx:11` | **GET** | `"/admin-command/school/operational-blueprint"` | `useSchoolQuery` | `Returns: OperationalBlueprintData` | `useSchoolQuery<OperationalBlueprintData>("/admin-command/school/operational-b...` |
| `apps\web\src\components\school\parent\academics-workspace.tsx:10` | **GET** | `'/api/academics/my-assignments'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/academics/my-assignments')` |
| `apps\web\src\components\school\parent\academics-workspace.tsx:11` | **GET** | `'/api/exams/report-cards'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/exams/report-cards')` |
| `apps\web\src\components\school\parent\academics-workspace.tsx:12` | **GET** | `'/api/exams/marks'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/exams/marks')` |
| `apps\web\src\components\school\parent\behavior-workspace.tsx:13` | **GET** | `'/api/discipline/parent/incidents'` | `useSchoolQuery` | `Returns: { data?: any[] }` | `useSchoolQuery<{ data?: any[] }>('/api/discipline/parent/incidents')` |
| `apps\web\src\components\school\parent\behavior-workspace.tsx:16` | **GET** | `'/api/discipline/students/me/behavior-score'` | `useSchoolQuery` | `Returns: { score?: number }` | `useSchoolQuery<{ score?: number }>('/api/discipline/students/me/behavior-score')` |
| `apps\web\src\components\school\parent\behavior-workspace.tsx:30` | **POST** | ``/api/parent-portal/behavior/acknowledge`` | `requestDashboardApi` | `Body: JSON.stringify({ incidentId: id` | `requestDashboardApi(\`/api/parent-portal/behavior/acknowledge\`, {         meth...` |
| `apps\web\src\components\school\parent\clinic-health-workspace.tsx:10` | **GET** | `'/api/clinic/parent/students/me/history'` | `useSchoolQuery` | `Returns: { visits?: any[]; allergies?: string[]; medications?: any[] }` | `useSchoolQuery<{ visits?: any[]; allergies?: string[]; medications?: any[] }>...` |
| `apps\web\src\components\school\parent\dashboard-workspace.tsx:11` | **GET** | `"/admin-command/parent/dashboard"` | `useSchoolQuery` | `Returns: DashboardData` | `useSchoolQuery<DashboardData>("/admin-command/parent/dashboard")` |
| `apps\web\src\components\school\parent\downloads-workspace.tsx:11` | **GET** | `"/admin-command/parent/downloads"` | `useSchoolQuery` | `Returns: DownloadsData` | `useSchoolQuery<DownloadsData>("/admin-command/parent/downloads")` |
| `apps\web\src\components\school\parent\fees-workspace.tsx:15` | **GET** | `'/api/finance/accounts-overview'` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>('/api/finance/accounts-overview')` |
| `apps\web\src\components\school\parent\fees-workspace.tsx:16` | **GET** | `'/api/finance/collections'` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>('/api/finance/collections')` |
| `apps\web\src\components\school\parent\fees-workspace.tsx:17` | **GET** | `'/api/finance/invoices'` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>('/api/finance/invoices')` |
| `apps\web\src\components\school\parent\fees-workspace.tsx:22` | **POST** | `"/api/parent-portal/fees/pay"` | `requestDashboardApi` | `Body: JSON.stringify({
          id: `PAY-${Date.now()` | `requestDashboardApi("/api/parent-portal/fees/pay", {         method: "POST", ...` |
| `apps\web\src\components\school\parent\health-workspace.tsx:11` | **GET** | `"/admin-command/parent/health"` | `useSchoolQuery` | `Returns: HealthData` | `useSchoolQuery<HealthData>("/admin-command/parent/health")` |
| `apps\web\src\components\school\parent\messages-workspace.tsx:11` | **GET** | `"/admin-command/parent/messages"` | `useSchoolQuery` | `Returns: MessagesData` | `useSchoolQuery<MessagesData>("/admin-command/parent/messages")` |
| `apps\web\src\components\school\parent\notifications-workspace.tsx:11` | **GET** | `"/admin-command/parent/notifications"` | `useSchoolQuery` | `Returns: NotificationsData` | `useSchoolQuery<NotificationsData>("/admin-command/parent/notifications")` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:24` | **GET** | `'/admin-command/principal/academic-setup'` | `useSchoolQuery` | `Returns: AcademicSetupData` | `useSchoolQuery<AcademicSetupData>('/admin-command/principal/academic-setup')` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:26` | **GET** | `'/academics/academic-years'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/academic-years')` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:43` | **POST** | `'/academics/years'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/academics/years', {         method: "POST",         bod...` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:66` | **POST** | `'/academics/terms'` | `requestDashboardApi` | `Body: {
          academic_year_id: formData.get("academic_year_id")` | `requestDashboardApi('/academics/terms', {         method: "POST",         bod...` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:88` | **DELETE** | ``/academics/years/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/years/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:95` | **GET** | `'/academics/grading-systems'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/grading-systems')` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:96` | **GET** | `'/academics/attendance-settings'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/attendance-settings')` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:97` | **GET** | `'/academics/report-card-settings'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/report-card-settings')` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:117` | **POST** | `'/academics/grading-systems'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/academics/grading-systems', {         method: "POST",  ...` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:139` | **POST** | `'/academics/attendance-settings'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/academics/attendance-settings', {         method: "POST...` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:161` | **POST** | `'/academics/report-card-settings'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/academics/report-card-settings', {         method: "POS...` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:183` | **DELETE** | ``/academics/grading-systems/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/grading-systems/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:194` | **DELETE** | ``/academics/attendance-settings/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/attendance-settings/${id}\`, { method: "DELETE...` |
| `apps\web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:205` | **DELETE** | ``/academics/report-card-settings/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/report-card-settings/${id}\`, { method: "DELET...` |
| `apps\web\src\components\school\principal-dashboard\academics-workspace.tsx:17` | **GET** | `'/admin-command/principal/academics'` | `useSchoolQuery` | `Returns: PrincipalAcademicsData` | `useSchoolQuery<PrincipalAcademicsData>('/admin-command/principal/academics')` |
| `apps\web\src\components\school\principal-dashboard\approvals-workspace.tsx:16` | **GET** | `'/admin-command/principal/approvals'` | `useSchoolQuery` | `Returns: ApprovalsOverviewData` | `useSchoolQuery<ApprovalsOverviewData>('/admin-command/principal/approvals')` |
| `apps\web\src\components\school\principal-dashboard\attendance-workspace.tsx:24` | **GET** | `'/admin-command/principal/attendance'` | `useSchoolQuery` | `Returns: PrincipalAttendanceData` | `useSchoolQuery<PrincipalAttendanceData>('/admin-command/principal/attendance')` |
| `apps\web\src\components\school\principal-dashboard\attendance-workspace.tsx:39` | **POST** | `'/admin-command/attendance/absences'` | `requestDashboardApi` | `Body: {
          studentId: formData.get("studentId")` | `requestDashboardApi('/admin-command/attendance/absences', {         method: "...` |
| `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:24` | **GET** | `'/admin-command/principal/classes'` | `useSchoolQuery` | `Returns: PrincipalClassesData` | `useSchoolQuery<PrincipalClassesData>('/admin-command/principal/classes')` |
| `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:25` | **GET** | `'/academics/academic-years'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/academic-years')` |
| `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:26` | **GET** | `'/academics/class-sections'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/class-sections')` |
| `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:43` | **POST** | `'/academics/class-sections'` | `requestDashboardApi` | `Body: {
          academic_year_id: formData.get("academic_year_id")` | `requestDashboardApi('/academics/class-sections', {         method: "POST",   ...` |
| `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:67` | **POST** | `'/academics/class-streams'` | `requestDashboardApi` | `Body: {
          class_section_id: formData.get("class_section_id")` | `requestDashboardApi('/academics/class-streams', {         method: "POST",    ...` |
| `apps\web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:87` | **DELETE** | ``/academics/class-sections/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/class-sections/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:24` | **GET** | `'/admin-command/principal/communication'` | `useSchoolQuery` | `Returns: PrincipalCommunicationData` | `useSchoolQuery<PrincipalCommunicationData>('/admin-command/principal/communic...` |
| `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:25` | **GET** | `'/admin-command/communication-templates'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/admin-command/communication-templates')` |
| `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:43` | **POST** | `'/admin-command/communication-templates'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/admin-command/communication-templates', {         metho...` |
| `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:76` | **POST** | `'/admin-command/communication-broadcasts'` | `requestDashboardApi` | `Body: {
          audience: formData.get("audience")` | `requestDashboardApi('/admin-command/communication-broadcasts', {         meth...` |
| `apps\web\src\components\school\principal-dashboard\communication-workspace.tsx:97` | **DELETE** | ``/admin-command/communication-templates/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/admin-command/communication-templates/${id}\`, { method:...` |
| `apps\web\src\components\school\principal-dashboard\discipline-workspace.tsx:22` | **GET** | `'/admin-command/principal/discipline'` | `useSchoolQuery` | `Returns: PrincipalDisciplineData` | `useSchoolQuery<PrincipalDisciplineData>('/admin-command/principal/discipline')` |
| `apps\web\src\components\school\principal-dashboard\discipline-workspace.tsx:37` | **POST** | `'/admin-command/discipline/incidents'` | `requestDashboardApi` | `Body: {
      //     studentId: formData.get("studentId")` | `requestDashboardApi('/admin-command/discipline/incidents', {       //   metho...` |
| `apps\web\src\components\school\principal-dashboard\exams-reports-workspace.tsx:23` | **GET** | `'/admin-command/principal/exams'` | `useSchoolQuery` | `Returns: PrincipalExamsData` | `useSchoolQuery<PrincipalExamsData>('/admin-command/principal/exams')` |
| `apps\web\src\components\school\principal-dashboard\exams-reports-workspace.tsx:38` | **POST** | `'/admin-command/exams/cycles'` | `requestDashboardApi` | `Body: {
      //     name: formData.get("name")` | `requestDashboardApi('/admin-command/exams/cycles', {       //   method: "POST...` |
| `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:22` | **GET** | `'/admin-command/principal/finance-overview'` | `useSchoolQuery` | `Returns: PrincipalWorkspaceData` | `useSchoolQuery<PrincipalWorkspaceData>('/admin-command/principal/finance-over...` |
| `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:23` | **GET** | `'/finance/fee-categories'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/finance/fee-categories')` |
| `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:40` | **POST** | `'/finance/fee-categories'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/finance/fee-categories', {         method: "POST",     ...` |
| `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:64` | **POST** | `'/finance/waivers'` | `requestDashboardApi` | `Body: {
          student_id: formData.get("student_id")` | `requestDashboardApi('/finance/waivers', {         method: "POST",         bod...` |
| `apps\web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:86` | **DELETE** | ``/finance/fee-categories/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/finance/fee-categories/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\overview-workspace.tsx:23` | **GET** | `'/admin-command/principal/overview'` | `useSchoolQuery` | `Returns: PrincipalOverviewData` | `useSchoolQuery<PrincipalOverviewData>('/admin-command/principal/overview')` |
| `apps\web\src\components\school\principal-dashboard\reports-workspace.tsx:23` | **GET** | `'/admin-command/principal/reports'` | `useSchoolQuery` | `Returns: PrincipalReportsData` | `useSchoolQuery<PrincipalReportsData>('/admin-command/principal/reports')` |
| `apps\web\src\components\school\principal-dashboard\reports-workspace.tsx:36` | **POST** | `'/admin-command/reports/categories'` | `requestDashboardApi` | `Body: { name: formData.get("name")` | `requestDashboardApi('/admin-command/reports/categories', {         method: "P...` |
| `apps\web\src\components\school\principal-dashboard\reports-workspace.tsx:54` | **POST** | `'/admin-command/reports/schedule'` | `requestDashboardApi` | `Body: { title: formData.get("title")` | `requestDashboardApi('/admin-command/reports/schedule', {         method: "POS...` |
| `apps\web\src\components\school\principal-dashboard\school-profile-workspace.tsx:25` | **GET** | `'/admin-command/principal/school-profile'` | `useSchoolQuery` | `Returns: SchoolProfileData` | `useSchoolQuery<SchoolProfileData>('/admin-command/principal/school-profile')` |
| `apps\web\src\components\school\principal-dashboard\school-profile-workspace.tsx:41` | **POST** | `'/admin-command/principal/school-profile/logo'` | `requestDashboardApi` | `Body: formData` | `requestDashboardApi('/admin-command/principal/school-profile/logo', {        ...` |
| `apps\web\src\components\school\principal-dashboard\settings-workspace.tsx:26` | **GET** | `'/admin-command/principal/settings'` | `useSchoolQuery` | `Returns: PrincipalSettingsData` | `useSchoolQuery<PrincipalSettingsData>('/admin-command/principal/settings')` |
| `apps\web\src\components\school\principal-dashboard\setup-checklist-workspace.tsx:14` | **GET** | `'/admin-command/principal/setup-checklist'` | `useSchoolQuery` | `Returns: SetupChecklistData` | `useSchoolQuery<SetupChecklistData>('/admin-command/principal/setup-checklist')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:25` | **GET** | `'/admin-command/principal/staff'` | `useSchoolQuery` | `Returns: PrincipalStaffData` | `useSchoolQuery<PrincipalStaffData>('/admin-command/principal/staff')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:26` | **GET** | `'/academics/academic-terms'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/academic-terms')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:27` | **GET** | `'/academics/academic-years'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/academic-years')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:28` | **GET** | `'/academics/class-sections'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/class-sections')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:29` | **GET** | `'/academics/subjects'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/subjects')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:30` | **GET** | `'/academics/class-teachers'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/class-teachers')` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:56` | **POST** | `'/academics/teacher-assignments'` | `requestDashboardApi` | `Body: {
          academic_term_id: formData.get("academic_term_id")` | `requestDashboardApi('/academics/teacher-assignments', {         method: "POST...` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:80` | **POST** | `'/academics/class-teachers'` | `requestDashboardApi` | `Body: {
          academic_year_id: formData.get("academic_year_id")` | `requestDashboardApi('/academics/class-teachers', {         method: "POST",   ...` |
| `apps\web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:100` | **DELETE** | ``/academics/class-teachers/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/class-teachers/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\students-workspace.tsx:24` | **GET** | `'/admin-command/principal/students'` | `useSchoolQuery` | `Returns: PrincipalStudentsData` | `useSchoolQuery<PrincipalStudentsData>('/admin-command/principal/students')` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:24` | **GET** | `'/admin-command/principal/subjects'` | `useSchoolQuery` | `Returns: PrincipalSubjectsData` | `useSchoolQuery<PrincipalSubjectsData>('/admin-command/principal/subjects')` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:25` | **GET** | `'/academics/academic-years'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/academic-years')` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:26` | **GET** | `'/academics/subjects'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/subjects')` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:27` | **GET** | `'/academics/departments'` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>('/academics/departments')` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:45` | **POST** | `'/academics/subjects'` | `requestDashboardApi` | `Body: {
          code: formData.get("code")` | `requestDashboardApi('/academics/subjects', {         method: "POST",         ...` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:64` | **DELETE** | ``/academics/subjects/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/subjects/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:99` | **POST** | `'/academics/departments'` | `requestDashboardApi` | `Body: {
          name: formData.get("name")` | `requestDashboardApi('/academics/departments', {         method: "POST",      ...` |
| `apps\web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:118` | **DELETE** | ``/academics/departments/${id}`` | `requestDashboardApi` | `N/A` | `requestDashboardApi(\`/academics/departments/${id}\`, { method: "DELETE" })` |
| `apps\web\src\components\school\principal-dashboard\teaching-workspace.tsx:16` | **GET** | `'/admin-command/principal/teaching'` | `useSchoolQuery` | `Returns: PrincipalTeachingData` | `useSchoolQuery<PrincipalTeachingData>('/admin-command/principal/teaching')` |
| `apps\web\src\components\school\principal\academic-setup-workspace.tsx:18` | **GET** | `'/admin-command/principal/academic-setup'` | `useSchoolQuery` | `Returns: AcademicSetupData` | `useSchoolQuery<AcademicSetupData>('/admin-command/principal/academic-setup')` |
| `apps\web\src\components\school\principal\academics-workspace.tsx:27` | **GET** | `'/admin-command/principal/academics'` | `useSchoolQuery` | `Returns: AcademicsData` | `useSchoolQuery<AcademicsData>('/admin-command/principal/academics')` |
| `apps\web\src\components\school\principal\approvals-workspace.tsx:26` | **GET** | `'/admin-command/principal/approvals'` | `useSchoolQuery` | `Returns: ApprovalsData` | `useSchoolQuery<ApprovalsData>('/admin-command/principal/approvals')` |
| `apps\web\src\components\school\principal\attendance-monitoring-workspace.tsx:32` | **GET** | `'/admin-command/principal/attendance-monitoring'` | `useSchoolQuery` | `Returns: AttendanceData` | `useSchoolQuery<AttendanceData>('/admin-command/principal/attendance-monitoring')` |
| `apps\web\src\components\school\principal\classes-streams-workspace.tsx:26` | **GET** | `'/admin-command/principal/classes-streams'` | `useSchoolQuery` | `Returns: ClassesStreamsData` | `useSchoolQuery<ClassesStreamsData>('/admin-command/principal/classes-streams')` |
| `apps\web\src\components\school\principal\communication-workspace.tsx:31` | **GET** | `'/admin-command/principal/communication'` | `useSchoolQuery` | `Returns: CommunicationData` | `useSchoolQuery<CommunicationData>('/admin-command/principal/communication')` |
| `apps\web\src\components\school\principal\discipline-workspace.tsx:28` | **GET** | `'/admin-command/principal/discipline'` | `useSchoolQuery` | `Returns: DisciplineData` | `useSchoolQuery<DisciplineData>('/admin-command/principal/discipline')` |
| `apps\web\src\components\school\principal\exams-report-cards-workspace.tsx:27` | **GET** | `'/admin-command/principal/exams-report-cards'` | `useSchoolQuery` | `Returns: ExamsReportCardsData` | `useSchoolQuery<ExamsReportCardsData>('/admin-command/principal/exams-report-c...` |
| `apps\web\src\components\school\principal\finance-overview-workspace.tsx:25` | **GET** | `'/admin-command/principal/finance-overview'` | `useSchoolQuery` | `Returns: FinanceOverviewData` | `useSchoolQuery<FinanceOverviewData>('/admin-command/principal/finance-overview')` |
| `apps\web\src\components\school\principal\overview-workspace.tsx:30` | **GET** | `'/admin-command/principal/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/principal/overview')` |
| `apps\web\src\components\school\principal\reports-workspace.tsx:22` | **GET** | `'/admin-command/principal/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/principal/reports')` |
| `apps\web\src\components\school\principal\school-profile-workspace.tsx:30` | **GET** | `'/admin-command/principal/school-profile'` | `useSchoolQuery` | `Returns: SchoolProfileData` | `useSchoolQuery<SchoolProfileData>('/admin-command/principal/school-profile')` |
| `apps\web\src\components\school\principal\setup-checklist-workspace.tsx:25` | **GET** | `'/admin-command/principal/setup-checklist'` | `useSchoolQuery` | `Returns: SetupChecklistData` | `useSchoolQuery<SetupChecklistData>('/admin-command/principal/setup-checklist')` |
| `apps\web\src\components\school\principal\staff-roles-workspace.tsx:27` | **GET** | `'/admin-command/principal/staff-roles'` | `useSchoolQuery` | `Returns: StaffRolesData` | `useSchoolQuery<StaffRolesData>('/admin-command/principal/staff-roles')` |
| `apps\web\src\components\school\principal\students-workspace.tsx:28` | **GET** | `'/admin-command/principal/students'` | `useSchoolQuery` | `Returns: StudentsData` | `useSchoolQuery<StudentsData>('/admin-command/principal/students')` |
| `apps\web\src\components\school\principal\subjects-departments-workspace.tsx:26` | **GET** | `'/admin-command/principal/subjects-departments'` | `useSchoolQuery` | `Returns: SubjectsDepartmentsData` | `useSchoolQuery<SubjectsDepartmentsData>('/admin-command/principal/subjects-de...` |
| `apps\web\src\components\school\procurement-officer-command-center.tsx:37` | **GET** | `"/api/inventory/purchase-orders?limit=5"` | `useSchoolQuery` | `Returns: any | Query: limit=5` | `useSchoolQuery<any>("/api/inventory/purchase-orders?limit=5")` |
| `apps\web\src\components\school\procurement-officer-command-center.tsx:38` | **GET** | `"/api/inventory/requests?status=pending"` | `useSchoolQuery` | `Returns: any | Query: status=pending` | `useSchoolQuery<any>("/api/inventory/requests?status=pending")` |
| `apps\web\src\components\school\procurement-officer-command-center.tsx:39` | **GET** | `"/api/inventory/summary"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/inventory/summary")` |
| `apps\web\src\components\school\procurement-officer-command-center.tsx:89` | **GET** | `"/api/inventory/purchase-orders"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/inventory/purchase-orders")` |
| `apps\web\src\components\school\procurement-officer-command-center.tsx:133` | **GET** | `"/api/inventory/suppliers"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/inventory/suppliers")` |
| `apps\web\src\components\school\procurement-officer-command-center.tsx:175` | **GET** | `"/api/inventory/requests"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/inventory/requests")` |
| `apps\web\src\components\school\procurement-officer\deliveries-workspace.tsx:26` | **GET** | `'/admin-command/procurement-officer/deliveries'` | `useSchoolQuery` | `Returns: DeliveriesData` | `useSchoolQuery<DeliveriesData>('/admin-command/procurement-officer/deliveries')` |
| `apps\web\src\components\school\procurement-officer\overview-workspace.tsx:23` | **GET** | `'/admin-command/procurement-officer/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/procurement-officer/overview')` |
| `apps\web\src\components\school\procurement-officer\purchase-orders-workspace.tsx:27` | **GET** | `'/admin-command/procurement-officer/purchase-orders'` | `useSchoolQuery` | `Returns: PurchaseOrdersData` | `useSchoolQuery<PurchaseOrdersData>('/admin-command/procurement-officer/purcha...` |
| `apps\web\src\components\school\procurement-officer\purchase-requests-workspace.tsx:27` | **GET** | `'/admin-command/procurement-officer/purchase-requests'` | `useSchoolQuery` | `Returns: PurchaseRequestsData` | `useSchoolQuery<PurchaseRequestsData>('/admin-command/procurement-officer/purc...` |
| `apps\web\src\components\school\procurement-officer\quotations-workspace.tsx:26` | **GET** | `'/admin-command/procurement-officer/quotations'` | `useSchoolQuery` | `Returns: QuotationsData` | `useSchoolQuery<QuotationsData>('/admin-command/procurement-officer/quotations')` |
| `apps\web\src\components\school\procurement-officer\reports-workspace.tsx:22` | **GET** | `'/admin-command/procurement-officer/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/procurement-officer/reports')` |
| `apps\web\src\components\school\procurement-officer\suppliers-workspace.tsx:26` | **GET** | `'/admin-command/procurement-officer/suppliers'` | `useSchoolQuery` | `Returns: SuppliersData` | `useSchoolQuery<SuppliersData>('/admin-command/procurement-officer/suppliers')` |
| `apps\web\src\components\school\registrar-command-center.tsx:1004` | **GET** | `'/admin-command/admissions/dashboard'` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>('/admin-command/admissions/dashboard')` |
| `apps\web\src\components\school\registrar-command-center.tsx:1099` | **POST** | ``/api/admissions/applications/${selectedApplicantPreview.id}/approve`` | `requestDashboardApi` | `Body: { applicantId: selectedApplicantPreview.id` | `requestDashboardApi(\`/api/admissions/applications/${selectedApplicantPreview....` |
| `apps\web\src\components\school\registrar-command-center.tsx:1167` | **POST** | `"/api/admissions/quick-actions"` | `requestDashboardApi` | `Body: { action: "quick_admission_action"` | `requestDashboardApi("/api/admissions/quick-actions", {         method: "POST"...` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4905` | **GET** | `"/api/clinic/visits"` | `useSchoolQuery` | `Returns: ClinicVisitRecord[]` | `useSchoolQuery<ClinicVisitRecord[]>("/api/clinic/visits")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4907` | **POST** | `"/api/clinic/visits"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/clinic/visits")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4909` | **GET** | `"/api/clinic/medicines/stock"` | `useSchoolQuery` | `Returns: MedicineStockRecord[]` | `useSchoolQuery<MedicineStockRecord[]>("/api/clinic/medicines/stock")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4911` | **POST** | `"/api/clinic/medicines/stock"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/clinic/medicines/stock")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4914` | **GET** | `"/api/admissions/applicants"` | `useSchoolQuery` | `Returns: AdmissionApplicantRecord[]` | `useSchoolQuery<AdmissionApplicantRecord[]>("/api/admissions/applicants")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4916` | **POST** | `"/api/admissions/applicants"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/admissions/applicants")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4919` | **GET** | `"/api/library/books"` | `useSchoolQuery` | `Returns: LibraryBookRecord[]` | `useSchoolQuery<LibraryBookRecord[]>("/api/library/books")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4921` | **POST** | `"/api/library/books"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/library/books")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4923` | **GET** | `"/api/library/loans"` | `useSchoolQuery` | `Returns: LibraryLoanRecord[]` | `useSchoolQuery<LibraryLoanRecord[]>("/api/library/loans")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4925` | **POST** | `"/api/library/loans"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/library/loans")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4931` | **GET** | `"/api/boarding/roll-calls"` | `useSchoolQuery` | `Returns: BoardingRollCallRecord[]` | `useSchoolQuery<BoardingRollCallRecord[]>("/api/boarding/roll-calls")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4933` | **POST** | `"/api/boarding/roll-calls"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/boarding/roll-calls")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4935` | **GET** | `"/api/boarding/exeats"` | `useSchoolQuery` | `Returns: ExeatRequestRecord[]` | `useSchoolQuery<ExeatRequestRecord[]>("/api/boarding/exeats")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4937` | **POST** | `"/api/boarding/exeats"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/boarding/exeats")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4941` | **GET** | `"/api/transport/vehicles"` | `useSchoolQuery` | `Returns: TransportVehicleRecord[]` | `useSchoolQuery<TransportVehicleRecord[]>("/api/transport/vehicles")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4943` | **POST** | `"/api/transport/vehicles"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/transport/vehicles")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4945` | **GET** | `"/api/transport/trips"` | `useSchoolQuery` | `Returns: TransportTripRecord[]` | `useSchoolQuery<TransportTripRecord[]>("/api/transport/trips")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4947` | **POST** | `"/api/transport/trips"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/transport/trips")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4950` | **GET** | `"/api/labs/inventory"` | `useSchoolQuery` | `Returns: LabInventoryRecord[]` | `useSchoolQuery<LabInventoryRecord[]>("/api/labs/inventory")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4952` | **POST** | `"/api/labs/inventory"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/labs/inventory")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4954` | **GET** | `"/api/labs/requests"` | `useSchoolQuery` | `Returns: LabPracticalRequestRecord[]` | `useSchoolQuery<LabPracticalRequestRecord[]>("/api/labs/requests")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4956` | **POST** | `"/api/labs/requests"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/labs/requests")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4958` | **GET** | `"/api/labs/issues"` | `useSchoolQuery` | `Returns: LabIssueRecord[]` | `useSchoolQuery<LabIssueRecord[]>("/api/labs/issues")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4960` | **POST** | `"/api/labs/issues"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/labs/issues")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4963` | **GET** | `"/api/finance/balances"` | `useSchoolQuery` | `Returns: FeeBalanceRecord[]` | `useSchoolQuery<FeeBalanceRecord[]>("/api/finance/balances")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4965` | **POST** | `"/api/finance/balances"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/finance/balances")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4967` | **GET** | `"/api/finance/payments"` | `useSchoolQuery` | `Returns: FeePaymentRecord[]` | `useSchoolQuery<FeePaymentRecord[]>("/api/finance/payments")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4969` | **POST** | `"/api/finance/payments"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/finance/payments")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4973` | **GET** | `"/api/secretary/visitors"` | `useSchoolQuery` | `Returns: SecretaryVisitorRecord[]` | `useSchoolQuery<SecretaryVisitorRecord[]>("/api/secretary/visitors")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4975` | **POST** | `"/api/secretary/visitors"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/secretary/visitors")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4977` | **GET** | `"/api/secretary/inquiries"` | `useSchoolQuery` | `Returns: SecretaryInquiryRecord[]` | `useSchoolQuery<SecretaryInquiryRecord[]>("/api/secretary/inquiries")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4979` | **POST** | `"/api/secretary/inquiries"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/secretary/inquiries")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4983` | **GET** | `"/api/support/discipline"` | `useSchoolQuery` | `Returns: DisciplineCaseRecord[]` | `useSchoolQuery<DisciplineCaseRecord[]>("/api/support/discipline")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4985` | **POST** | `"/api/support/discipline"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/support/discipline")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4989` | **GET** | `"/api/support/counselling"` | `useSchoolQuery` | `Returns: CounsellingSessionRecord[]` | `useSchoolQuery<CounsellingSessionRecord[]>("/api/support/counselling")` |
| `apps\web\src\components\school\role-operational-command-center.tsx:4991` | **POST** | `"/api/support/counselling"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/support/counselling")` |
| `apps\web\src\components\school\school-finance-page.tsx:271` | **GET** | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {         cach...` |
| `apps\web\src\components\school\school-finance-page.tsx:287` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `fetch` | `Query: limit=25&offset=0` | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", ...` |
| `apps\web\src\components\school\school-finance-page.tsx:311` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {    ...` |
| `apps\web\src\components\school\school-finance-page.tsx:348` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation?${params.toSt...` |
| `apps\web\src\components\school\school-finance-page.tsx:379` | **GET** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\school-finance-page.tsx:454` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\school-finance-page.tsx:487` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\school-finance-page.tsx:535` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation/export?${para...` |
| `apps\web\src\components\school\school-finance-page.tsx:676` | **POST** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          name: feeStructureDraft.name.trim()` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\school-finance-page.tsx:725` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\school-finance-page.tsx:778` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            idempotency_key: idempotencyKey` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\school-finance-page.tsx:838` | **GET** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\school-finance-page.tsx:893` | **POST** | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()` | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {         met...` |
| `apps\web\src\components\school\school-finance-page.tsx:949` | **POST** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          idempotency_key: `finance-quick-${Date.now()` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\school-pages.tsx:1117` | **GET** | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {         cach...` |
| `apps\web\src\components\school\school-pages.tsx:1133` | **GET** | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `fetch` | `Query: limit=25&offset=0` | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", ...` |
| `apps\web\src\components\school\school-pages.tsx:1157` | **GET** | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {    ...` |
| `apps\web\src\components\school\school-pages.tsx:1194` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation?${params.toSt...` |
| `apps\web\src\components\school\school-pages.tsx:1225` | **GET** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\school-pages.tsx:1300` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\school-pages.tsx:1333` | **GET** | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(           \`/api/billing/student-balances/...` |
| `apps\web\src\components\school\school-pages.tsx:1381` | **GET** | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `fetch` | `Query: ${params.toString()}` | `fetch(         buildBillingApiPath(\`/api/billing/reconciliation/export?${para...` |
| `apps\web\src\components\school\school-pages.tsx:1522` | **POST** | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          name: feeStructureDraft.name.trim()` | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {      ...` |
| `apps\web\src\components\school\school-pages.tsx:1571` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\school-pages.tsx:1624` | **POST** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `fetch` | `Body: JSON.stringify({
            idempotency_key: idempotencyKey` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\school-pages.tsx:1684` | **GET** | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `fetch` | `N/A` | `fetch(         buildBillingApiPath(\`/api/billing/fee-structures/${encodeURICo...` |
| `apps\web\src\components\school\school-pages.tsx:1739` | **POST** | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()` | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {         met...` |
| `apps\web\src\components\school\school-pages.tsx:1795` | **POST** | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `fetch` | `Body: JSON.stringify({
          idempotency_key: `finance-quick-${Date.now()` | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), { ...` |
| `apps\web\src\components\school\school-pages.tsx:2858` | **GET** | `"/api/school/sms/wallet"` | `fetch` | `N/A` | `fetch("/api/school/sms/wallet", {           method: "GET",           credenti...` |
| `apps\web\src\components\school\school-pages.tsx:2913` | **POST** | `"/api/sms/send"` | `fetch` | `Body: JSON.stringify({
          recipient: trimmedRecipient` | `fetch("/api/sms/send", {         method: "POST",         headers: {          ...` |
| `apps\web\src\components\school\school-pages.tsx:3114` | **GET** | `"/api/integrations/daraja"` | `fetch` | `N/A` | `fetch("/api/integrations/daraja", {           method: "GET",           creden...` |
| `apps\web\src\components\school\school-pages.tsx:3154` | **PUT** | `"/api/integrations/daraja"` | `fetch` | `Body: JSON.stringify({
          ...form` | `fetch("/api/integrations/daraja", {         method: "PUT",         headers: {...` |
| `apps\web\src\components\school\school-pages.tsx:3193` | **POST** | ``/api/integrations/daraja/test?environment=${encodeURIComponent(form.environment)}`` | `fetch` | `Query: environment=${encodeURIComponent(form.environment)}` | `fetch(\`/api/integrations/daraja/test?environment=${encodeURIComponent(form.en...` |
| `apps\web\src\components\school\school-pages.tsx:3600` | **GET** | ``/api/clinic/analytics/principal${query}`` | `fetch` | `N/A` | `fetch(\`/api/clinic/analytics/principal${query}\`, { credentials: "same-origin"...` |
| `apps\web\src\components\school\school-pages.tsx:3601` | **GET** | ``/api/clinic/medicines${query}`` | `fetch` | `N/A` | `fetch(\`/api/clinic/medicines${query}\`, { credentials: "same-origin", cache: "...` |
| `apps\web\src\components\school\school-pages.tsx:3911` | **GET** | `"/api/school/modules/me"` | `fetch` | `N/A` | `fetch("/api/school/modules/me", {           method: "GET",           credenti...` |
| `apps\web\src\components\school\school-pages.tsx:3987` | **GET** | `"/api/events/notifications?limit=8"` | `fetch` | `Query: limit=8` | `fetch("/api/events/notifications?limit=8", {           method: "GET",        ...` |
| `apps\web\src\components\school\school-pages.tsx:4055` | **GET** | `"/api/academics/teacher-assignments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/teacher-assignments")` |
| `apps\web\src\components\school\school-pages.tsx:4099` | **POST** | ``/api/events/notifications/${encodeURIComponent(item.id)}/read`` | `fetch` | `N/A` | `fetch(\`/api/events/notifications/${encodeURIComponent(item.id)}/read\`, {     ...` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:288` | **GET** | `"/api/visitors/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/visitors/dashboard")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:352` | **GET** | `"/api/visitors/logs"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/visitors/logs")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:370` | **GET** | `"/api/communication/summary"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/communication/summary")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:388` | **GET** | `"/api/admissions"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/admissions")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:425` | **POST** | `"/api/admin-command/frontoffice/visitors"` | `requestDashboardApi` | `Body: JSON.stringify({
          name: formData.get("name")` | `requestDashboardApi("/api/admin-command/frontoffice/visitors", {         meth...` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:472` | **GET** | `"/api/visitors/logs"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/visitors/logs")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:501` | **GET** | `"/api/communication/summary"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/communication/summary")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:528` | **POST** | `"/api/admin-command/frontoffice/appointments"` | `requestDashboardApi` | `Body: JSON.stringify({
          visitorName: formData.get("visitorName")` | `requestDashboardApi("/api/admin-command/frontoffice/appointments", {         ...` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:582` | **GET** | `"/api/visitors/appointments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/visitors/appointments")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:611` | **GET** | `"/api/communication/summary"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/communication/summary")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:629` | **GET** | `"/api/admissions/applications"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/admissions/applications")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:647` | **GET** | `"/api/communication/messages"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/communication/messages")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:674` | **POST** | `"/api/admin-command/frontoffice/mail"` | `requestDashboardApi` | `Body: JSON.stringify({
          sender: formData.get("sender")` | `requestDashboardApi("/api/admin-command/frontoffice/mail", {         method: ...` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:726` | **GET** | `"/api/operations/reports"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/operations/reports")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:755` | **GET** | `"/api/hr/staff"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/hr/staff")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:773` | **GET** | `"/api/operations/reports"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/operations/reports")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:791` | **GET** | `"/api/dashboard/summary?role=secretary"` | `useSchoolQuery` | `Returns: any[] | Query: role=secretary` | `useSchoolQuery<any[]>("/api/dashboard/summary?role=secretary")` |
| `apps\web\src\components\school\secretary-command-center-full.tsx:809` | **GET** | `"/api/school/settings"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/school/settings")` |
| `apps\web\src\components\school\secretary-command-center.tsx:18` | **GET** | `'/admin-command/secretary/dashboard'` | `useSchoolQuery` | `Returns: SecretaryDashboardData` | `useSchoolQuery<SecretaryDashboardData>('/admin-command/secretary/dashboard')` |
| `apps\web\src\components\school\secretary\appointments-workspace.tsx:33` | **GET** | `'/admin-command/secretary/appointments'` | `useSchoolQuery` | `Returns: AppointmentsData` | `useSchoolQuery<AppointmentsData>('/admin-command/secretary/appointments')` |
| `apps\web\src\components\school\secretary\calls-log-workspace.tsx:36` | **GET** | `'/admin-command/secretary/calls-log'` | `useSchoolQuery` | `Returns: CallsData` | `useSchoolQuery<CallsData>('/admin-command/secretary/calls-log')` |
| `apps\web\src\components\school\secretary\letters-documents-workspace.tsx:32` | **GET** | `'/admin-command/secretary/letters-documents'` | `useSchoolQuery` | `Returns: DocumentsData` | `useSchoolQuery<DocumentsData>('/admin-command/secretary/letters-documents')` |
| `apps\web\src\components\school\secretary\overview-workspace.tsx:29` | **GET** | `'/admin-command/secretary/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/secretary/overview')` |
| `apps\web\src\components\school\secretary\parent-messages-workspace.tsx:34` | **GET** | `'/admin-command/secretary/parent-messages'` | `useSchoolQuery` | `Returns: MessagesData` | `useSchoolQuery<MessagesData>('/admin-command/secretary/parent-messages')` |
| `apps\web\src\components\school\secretary\reception-queue-workspace.tsx:31` | **GET** | `'/admin-command/secretary/reception-queue'` | `useSchoolQuery` | `Returns: QueueData` | `useSchoolQuery<QueueData>('/admin-command/secretary/reception-queue')` |
| `apps\web\src\components\school\secretary\reports-workspace.tsx:31` | **GET** | `'/admin-command/secretary/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/secretary/reports')` |
| `apps\web\src\components\school\secretary\student-clearance-workspace.tsx:34` | **GET** | `'/admin-command/secretary/student-clearance'` | `useSchoolQuery` | `Returns: ClearanceData` | `useSchoolQuery<ClearanceData>('/admin-command/secretary/student-clearance')` |
| `apps\web\src\components\school\secretary\visitors-workspace.tsx:34` | **GET** | `'/admin-command/secretary/visitors'` | `useSchoolQuery` | `Returns: VisitorsData` | `useSchoolQuery<VisitorsData>('/admin-command/secretary/visitors')` |
| `apps\web\src\components\school\security-command-center.tsx:157` | **GET** | `"/api/visitors/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/visitors/dashboard")` |
| `apps\web\src\components\school\security-command-center.tsx:251` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "start_shift"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:266` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "end_shift"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:308` | **POST** | `"/api/visitors/logs"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/visitors/logs")` |
| `apps\web\src\components\school\security-command-center.tsx:309` | **GET** | `"/api/visitors/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/visitors/dashboard")` |
| `apps\web\src\components\school\security-command-center.tsx:328` | **PATCH** | ``/api/visitors/logs/${recordId}/checkout`` | `fetch` | `N/A` | `fetch(\`/api/visitors/logs/${recordId}/checkout\`, {       method: "PATCH",    ...` |
| `apps\web\src\components\school\security-command-center.tsx:395` | **GET** | `"/api/visitors/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/visitors/dashboard")` |
| `apps\web\src\components\school\security-command-center.tsx:455` | **GET** | `"/api/visitors/appointments"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/visitors/appointments")` |
| `apps\web\src\components\school\security-command-center.tsx:498` | **GET** | `"/api/visitors/student-exits"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/visitors/student-exits")` |
| `apps\web\src\components\school\security-command-center.tsx:546` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "record_late_arrival"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:597` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "record_early_departure"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:650` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "record_staff_entry"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:665` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "record_staff_exit"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:721` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "record_vehicle_entry"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:772` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "record_delivery"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:826` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "send_emergency_alert"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-command-center.tsx:841` | **POST** | `"/api/admin-command/frontoffice/dispatch"` | `requestDashboardApi` | `Body: JSON.stringify({ action: "report_incident"` | `requestDashboardApi("/api/admin-command/frontoffice/dispatch", {         meth...` |
| `apps\web\src\components\school\security-officer\gate-register-workspace.tsx:26` | **GET** | `'/admin-command/security-officer/gate-register'` | `useSchoolQuery` | `Returns: GateRegisterData` | `useSchoolQuery<GateRegisterData>('/admin-command/security-officer/gate-regist...` |
| `apps\web\src\components\school\security-officer\incidents-workspace.tsx:25` | **GET** | `'/admin-command/security-officer/incidents'` | `useSchoolQuery` | `Returns: IncidentsData` | `useSchoolQuery<IncidentsData>('/admin-command/security-officer/incidents')` |
| `apps\web\src\components\school\security-officer\overview-workspace.tsx:23` | **GET** | `'/admin-command/security-officer/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/security-officer/overview')` |
| `apps\web\src\components\school\security-officer\reports-workspace.tsx:22` | **GET** | `'/admin-command/security-officer/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/security-officer/reports')` |
| `apps\web\src\components\school\security-officer\staff-movement-workspace.tsx:25` | **GET** | `'/admin-command/security-officer/staff-movement'` | `useSchoolQuery` | `Returns: StaffMovementData` | `useSchoolQuery<StaffMovementData>('/admin-command/security-officer/staff-move...` |
| `apps\web\src\components\school\security-officer\student-exit-passes-workspace.tsx:26` | **GET** | `'/admin-command/security-officer/student-exit-passes'` | `useSchoolQuery` | `Returns: StudentExitPassesData` | `useSchoolQuery<StudentExitPassesData>('/admin-command/security-officer/studen...` |
| `apps\web\src\components\school\security-officer\visitors-workspace.tsx:27` | **GET** | `'/admin-command/security-officer/visitors'` | `useSchoolQuery` | `Returns: VisitorsData` | `useSchoolQuery<VisitorsData>('/admin-command/security-officer/visitors')` |
| `apps\web\src\components\school\session-management-panel.tsx:22` | **GET** | `"/api/auth/sessions"` | `useSchoolQuery` | `Returns: SessionRow[]` | `useSchoolQuery<SessionRow[]>("/api/auth/sessions")` |
| `apps\web\src\components\school\session-management-panel.tsx:24` | **POST** | `"/api/auth/sessions/revoke"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/auth/sessions/revoke")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1188` | **GET** | `"/api/inventory/requests"` | `useSchoolQuery` | `Returns: InventoryRequisition[]` | `useSchoolQuery<InventoryRequisition[]>("/api/inventory/requests")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1193` | **POST** | `"/api/inventory/requisitions"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/inventory/requisitions")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1289` | **GET** | `"/api/inventory/heatmap"` | `useSchoolQuery` | `Returns: InventoryHeatmap[]` | `useSchoolQuery<InventoryHeatmap[]>("/api/inventory/heatmap")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1336` | **GET** | `"/api/inventory/suppliers"` | `useSchoolQuery` | `Returns: InventorySupplier[]` | `useSchoolQuery<InventorySupplier[]>("/api/inventory/suppliers")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1387` | **GET** | `"/api/inventory/incidents"` | `useSchoolQuery` | `Returns: InventoryWaste[]` | `useSchoolQuery<InventoryWaste[]>("/api/inventory/incidents")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1411` | **GET** | `"/api/inventory/stock-movements"` | `useSchoolQuery` | `Returns: InventoryAuditTrail[]` | `useSchoolQuery<InventoryAuditTrail[]>("/api/inventory/stock-movements")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1457` | **GET** | `"/api/inventory/insights"` | `useSchoolQuery` | `Returns: AiInsight[]` | `useSchoolQuery<AiInsight[]>("/api/inventory/insights")` |
| `apps\web\src\components\school\storekeeper-command-center.tsx:1595` | **GET** | `"/api/inventory/summary"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/inventory/summary")` |
| `apps\web\src\components\school\storekeeper\damaged-missing-workspace.tsx:35` | **GET** | `'/admin-command/storekeeper/damaged-missing'` | `useSchoolQuery` | `Returns: DamagedMissingData` | `useSchoolQuery<DamagedMissingData>('/admin-command/storekeeper/damaged-missing')` |
| `apps\web\src\components\school\storekeeper\items-workspace.tsx:33` | **GET** | `'/admin-command/storekeeper/items'` | `useSchoolQuery` | `Returns: ItemsData` | `useSchoolQuery<ItemsData>('/admin-command/storekeeper/items')` |
| `apps\web\src\components\school\storekeeper\low-stock-workspace.tsx:31` | **GET** | `'/admin-command/storekeeper/low-stock'` | `useSchoolQuery` | `Returns: LowStockData` | `useSchoolQuery<LowStockData>('/admin-command/storekeeper/low-stock')` |
| `apps\web\src\components\school\storekeeper\overview-workspace.tsx:32` | **GET** | `'/admin-command/storekeeper/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/storekeeper/overview')` |
| `apps\web\src\components\school\storekeeper\reports-workspace.tsx:30` | **GET** | `'/admin-command/storekeeper/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/storekeeper/reports')` |
| `apps\web\src\components\school\storekeeper\requests-workspace.tsx:35` | **GET** | `'/admin-command/storekeeper/requests'` | `useSchoolQuery` | `Returns: RequestsData` | `useSchoolQuery<RequestsData>('/admin-command/storekeeper/requests')` |
| `apps\web\src\components\school\storekeeper\stock-in-workspace.tsx:11` | **GET** | `"/admin-command/storekeeper/stock-in"` | `useSchoolQuery` | `Returns: StockInData` | `useSchoolQuery<StockInData>("/admin-command/storekeeper/stock-in")` |
| `apps\web\src\components\school\storekeeper\stock-issue-workspace.tsx:11` | **GET** | `"/admin-command/storekeeper/stock-issue"` | `useSchoolQuery` | `Returns: StockIssueData` | `useSchoolQuery<StockIssueData>("/admin-command/storekeeper/stock-issue")` |
| `apps\web\src\components\school\storekeeper\stocktake-workspace.tsx:34` | **GET** | `'/admin-command/storekeeper/stocktake'` | `useSchoolQuery` | `Returns: StocktakeData` | `useSchoolQuery<StocktakeData>('/admin-command/storekeeper/stocktake')` |
| `apps\web\src\components\school\student-command-center.tsx:9` | **GET** | `"/api/student/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/student/dashboard")` |
| `apps\web\src\components\school\student-directory-workspace.tsx:43` | **GET** | `buildBillingApiPath("/api/students/summary/dashboard", tenantSlug)` | `fetch` | `N/A` | `fetch(buildBillingApiPath("/api/students/summary/dashboard", tenantSlug), {  ...` |
| `apps\web\src\components\school\student\academics-workspace.tsx:14` | **GET** | `'/api/academics/my-assignments'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/academics/my-assignments')` |
| `apps\web\src\components\school\student\academics-workspace.tsx:15` | **GET** | `'/api/exams/report-cards'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/exams/report-cards')` |
| `apps\web\src\components\school\student\academics-workspace.tsx:25` | **POST** | `"/api/student-portal/assignments/mark-done"` | `requestDashboardApi` | `Body: JSON.stringify({ id` | `requestDashboardApi("/api/student-portal/assignments/mark-done", {         me...` |
| `apps\web\src\components\school\student\behavior-workspace.tsx:10` | **GET** | `'/api/discipline/parent/incidents'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/discipline/parent/incidents')` |
| `apps\web\src\components\school\student\behavior-workspace.tsx:13` | **GET** | `'/api/discipline/students/me/behavior-score'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/discipline/students/me/behavior-score')` |
| `apps\web\src\components\school\student\dashboard-workspace.tsx:11` | **GET** | `"/admin-command/student/dashboard"` | `useSchoolQuery` | `Returns: DashboardData` | `useSchoolQuery<DashboardData>("/admin-command/student/dashboard")` |
| `apps\web\src\components\school\student\downloads-workspace.tsx:11` | **GET** | `"/admin-command/student/downloads"` | `useSchoolQuery` | `Returns: DownloadsData` | `useSchoolQuery<DownloadsData>("/admin-command/student/downloads")` |
| `apps\web\src\components\school\student\fees-workspace.tsx:10` | **GET** | `'/api/finance/accounts-overview'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/finance/accounts-overview')` |
| `apps\web\src\components\school\student\messages-workspace.tsx:11` | **GET** | `"/admin-command/student/messages"` | `useSchoolQuery` | `Returns: MessagesData` | `useSchoolQuery<MessagesData>("/admin-command/student/messages")` |
| `apps\web\src\components\school\student\notifications-workspace.tsx:11` | **GET** | `"/admin-command/student/notifications"` | `useSchoolQuery` | `Returns: NotificationsData` | `useSchoolQuery<NotificationsData>("/admin-command/student/notifications")` |
| `apps\web\src\components\school\teacher-dashboard\academic-setup-workspace.tsx:12` | **GET** | `"/admin-command/teacher/academic-setup"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/academic-setup", {       ten...` |
| `apps\web\src\components\school\teacher-dashboard\cbc-assessment-workspace.tsx:12` | **GET** | `"/admin-command/teacher/cbc-assessments"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/cbc-assessments", {       te...` |
| `apps\web\src\components\school\teacher-dashboard\club-workspace.tsx:12` | **GET** | `"/admin-command/teacher/clubs"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/clubs", {       tenantId: li...` |
| `apps\web\src\components\school\teacher-dashboard\invigilation-workspace.tsx:12` | **GET** | `"/admin-command/teacher/invigilation"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/invigilation", {       tenan...` |
| `apps\web\src\components\school\teacher-dashboard\learner-progress-workspace.tsx:12` | **GET** | `"/admin-command/teacher/learner-progress"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/learner-progress", {       t...` |
| `apps\web\src\components\school\teacher-dashboard\mark-entry-workspace.tsx:12` | **GET** | `"/admin-command/teacher/mark-entry"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/mark-entry", {       tenantI...` |
| `apps\web\src\components\school\teacher-dashboard\my-profile-workspace.tsx:12` | **GET** | `"/admin-command/teacher/profile"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/profile", {       tenantId: ...` |
| `apps\web\src\components\school\teacher-dashboard\notifications-workspace.tsx:12` | **GET** | `"/admin-command/teacher/notifications"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/notifications", {       tena...` |
| `apps\web\src\components\school\teacher-dashboard\reports-downloads-workspace.tsx:12` | **GET** | `"/admin-command/teacher/reports"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/reports", {       tenantId: ...` |
| `apps\web\src\components\school\teacher-dashboard\store-requests-workspace.tsx:12` | **GET** | `"/admin-command/teacher/store-requests"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/store-requests", {       ten...` |
| `apps\web\src\components\school\teacher-dashboard\subject-allocations-workspace.tsx:12` | **GET** | `"/admin-command/teacher/subject-allocations"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/subject-allocations", {     ...` |
| `apps\web\src\components\school\teacher-dashboard\syllabus-coverage-workspace.tsx:12` | **GET** | `"/admin-command/teacher/syllabus-coverage"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/syllabus-coverage", {       ...` |
| `apps\web\src\components\school\teacher-dashboard\teaching-resources-workspace.tsx:12` | **GET** | `"/admin-command/teacher/resources"` | `requestDashboardApi` | `Types: any` | `requestDashboardApi<any>("/admin-command/teacher/resources", {       tenantId...` |
| `apps\web\src\components\school\teacher\assignments-homework-workspace.tsx:17` | **GET** | `'/api/academics/my-assignments'` | `useSchoolQuery` | `N/A` | `useSchoolQuery('/api/academics/my-assignments')` |
| `apps\web\src\components\school\teacher\assignments-homework-workspace.tsx:19` | **POST** | `{
    endpoint: '/api/academics/assignments',
    method: 'POST',
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
    }
  }` | `useSchoolMutation` | `N/A` | `useSchoolMutation({     endpoint: '/api/academics/assignments',     method: '...` |
| `apps\web\src\components\school\teacher\lesson-logs-workspace.tsx:12` | **GET** | ``/api/academics/my-lesson-logs?date=${activeDate}`` | `useSchoolQuery` | `Returns: any[] | Query: date=${activeDate}` | `useSchoolQuery<any[]>(\`/api/academics/my-lesson-logs?date=${activeDate}\`)` |
| `apps\web\src\components\school\teacher\lesson-logs-workspace.tsx:13` | **POST** | `"/api/academics/lesson-logs"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/api/academics/lesson-logs", "POST")` |
| `apps\web\src\components\school\teacher\lesson-plans-workspace.tsx:11` | **GET** | `"/admin-command/teacher/lesson-plans"` | `useSchoolQuery` | `Returns: LessonPlansData` | `useSchoolQuery<LessonPlansData>("/admin-command/teacher/lesson-plans")` |
| `apps\web\src\components\school\teacher\marks-entry-workspace.tsx:17` | **GET** | `'/api/students?class=' + encodeURIComponent(selectedClass)` | `useSchoolQuery` | `Query: class=` | `useSchoolQuery('/api/students?class=' + encodeURIComponent(selectedClass))` |
| `apps\web\src\components\school\teacher\marks-entry-workspace.tsx:18` | **GET** | `'/api/exams/marks?exam=' + encodeURIComponent(selectedExam)` | `useSchoolQuery` | `Query: exam=` | `useSchoolQuery('/api/exams/marks?exam=' + encodeURIComponent(selectedExam))` |
| `apps\web\src\components\school\teacher\marks-entry-workspace.tsx:50` | **POST** | `"/api/academic/marks/enter"` | `requestDashboardApi` | `Body: JSON.stringify({
          exam: selectedExam` | `requestDashboardApi("/api/academic/marks/enter", {         method: "POST",   ...` |
| `apps\web\src\components\school\teacher\messages-workspace.tsx:11` | **GET** | `"/admin-command/teacher/messages"` | `useSchoolQuery` | `Returns: MessagesData` | `useSchoolQuery<MessagesData>("/admin-command/teacher/messages")` |
| `apps\web\src\components\school\teacher\my-timetable-workspace.tsx:23` | **GET** | `"/api/timetable/my-schedule"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/timetable/my-schedule")` |
| `apps\web\src\components\school\teacher\overview-workspace.tsx:9` | **GET** | `"/api/dashboard/layout?role=teacher"` | `useSchoolQuery` | `Returns: any | Query: role=teacher` | `useSchoolQuery<any>("/api/dashboard/layout?role=teacher")` |
| `apps\web\src\components\school\teacher\reports-workspace.tsx:11` | **GET** | `"/admin-command/teacher/reports"` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>("/admin-command/teacher/reports")` |
| `apps\web\src\components\school\teacher\resource-requests-workspace.tsx:11` | **GET** | `"/admin-command/teacher/resource-requests"` | `useSchoolQuery` | `Returns: ResourceRequestsData` | `useSchoolQuery<ResourceRequestsData>("/admin-command/teacher/resource-requests")` |
| `apps\web\src\components\school\teacher\student-notes-workspace.tsx:11` | **GET** | `"/admin-command/teacher/student-notes"` | `useSchoolQuery` | `Returns: StudentNotesData` | `useSchoolQuery<StudentNotesData>("/admin-command/teacher/student-notes")` |
| `apps\web\src\components\school\teacher\subjects-classes-workspace.tsx:9` | **GET** | `"/api/academics/teacher-assignments"` | `useSchoolQuery` | `Returns: any[]` | `useSchoolQuery<any[]>("/api/academics/teacher-assignments")` |
| `apps\web\src\components\school\teacher\teacher-attendance-workspace.tsx:11` | **GET** | `"/admin-command/teacher/attendance"` | `useSchoolQuery` | `Returns: TeacherAttendanceData` | `useSchoolQuery<TeacherAttendanceData>("/admin-command/teacher/attendance")` |
| `apps\web\src\components\school\teacher\utilities-workspace.tsx:11` | **GET** | `"/admin-command/teacher/utilities"` | `useSchoolQuery` | `Returns: UtilitiesData` | `useSchoolQuery<UtilitiesData>("/admin-command/teacher/utilities")` |
| `apps\web\src\components\school\transport-manager-command-center.tsx:481` | **GET** | `"/api/transport/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/transport/dashboard")` |
| `apps\web\src\components\school\transport-manager-command-center.tsx:604` | **GET** | `"/api/transport/dashboard"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/transport/dashboard")` |
| `apps\web\src\components\school\transport-manager-command-center.tsx:692` | **POST** | `"/api/admin-command/transport/route"` | `requestDashboardApi` | `Body: JSON.stringify(data)` | `requestDashboardApi("/api/admin-command/transport/route", {         method: "...` |
| `apps\web\src\components\school\transport-manager-command-center.tsx:814` | **POST** | `"/api/admin-command/transport/maintenance"` | `requestDashboardApi` | `Body: JSON.stringify(data)` | `requestDashboardApi("/api/admin-command/transport/maintenance", {         met...` |
| `apps\web\src\components\school\transport-manager\drivers-workspace.tsx:25` | **GET** | `'/admin-command/transport-manager/drivers'` | `useSchoolQuery` | `Returns: DriversData` | `useSchoolQuery<DriversData>('/admin-command/transport-manager/drivers')` |
| `apps\web\src\components\school\transport-manager\fuel-maintenance-workspace.tsx:26` | **GET** | `'/admin-command/transport-manager/fuel-maintenance'` | `useSchoolQuery` | `Returns: FuelMaintenanceData` | `useSchoolQuery<FuelMaintenanceData>('/admin-command/transport-manager/fuel-ma...` |
| `apps\web\src\components\school\transport-manager\overview-workspace.tsx:23` | **GET** | `'/admin-command/transport-manager/overview'` | `useSchoolQuery` | `Returns: OverviewData` | `useSchoolQuery<OverviewData>('/admin-command/transport-manager/overview')` |
| `apps\web\src\components\school\transport-manager\reports-workspace.tsx:22` | **GET** | `'/admin-command/transport-manager/reports'` | `useSchoolQuery` | `Returns: ReportsData` | `useSchoolQuery<ReportsData>('/admin-command/transport-manager/reports')` |
| `apps\web\src\components\school\transport-manager\routes-workspace.tsx:25` | **GET** | `'/admin-command/transport-manager/routes'` | `useSchoolQuery` | `Returns: RoutesData` | `useSchoolQuery<RoutesData>('/admin-command/transport-manager/routes')` |
| `apps\web\src\components\school\transport-manager\student-transport-list-workspace.tsx:25` | **GET** | `'/admin-command/transport-manager/student-transport-list'` | `useSchoolQuery` | `Returns: StudentTransportListData` | `useSchoolQuery<StudentTransportListData>('/admin-command/transport-manager/st...` |
| `apps\web\src\components\school\transport-manager\trips-workspace.tsx:27` | **GET** | `'/admin-command/transport-manager/trips'` | `useSchoolQuery` | `Returns: TripsData` | `useSchoolQuery<TripsData>('/admin-command/transport-manager/trips')` |
| `apps\web\src\components\school\transport-manager\vehicles-workspace.tsx:26` | **GET** | `'/admin-command/transport-manager/vehicles'` | `useSchoolQuery` | `Returns: VehiclesData` | `useSchoolQuery<VehiclesData>('/admin-command/transport-manager/vehicles')` |
| `apps\web\src\components\school\user-management-panel.tsx:83` | **GET** | `"/api/auth/invitations?limit=50&offset=0"` | `fetch` | `Query: limit=50&offset=0` | `fetch("/api/auth/invitations?limit=50&offset=0", {           method: "GET",  ...` |
| `apps\web\src\components\school\user-management-panel.tsx:130` | **POST** | `"/api/auth/invitations"` | `fetch` | `Body: JSON.stringify({
          display_name: displayName` | `fetch("/api/auth/invitations", {         method: "POST",         credentials:...` |
| `apps\web\src\components\school\user-management-panel.tsx:179` | **POST** | ``/api/auth/invitations/${user.id}/resend`` | `fetch` | `N/A` | `fetch(\`/api/auth/invitations/${user.id}/resend\`, {         method: "POST",   ...` |
| `apps\web\src\components\school\user-management-panel.tsx:210` | **DELETE** | ``/api/auth/invitations/${user.id}`` | `fetch` | `N/A` | `fetch(\`/api/auth/invitations/${user.id}\`, {         method: "DELETE",        ...` |
| `apps\web\src\components\school\user-management-panel.tsx:237` | **PATCH** | ``/api/auth/tenant-users/${user.id}/status`` | `fetch` | `Body: JSON.stringify({ status` | `fetch(\`/api/auth/tenant-users/${user.id}/status\`, {         method: "PATCH", ...` |
| `apps\web\src\components\school\user-management-panel.tsx:274` | **PATCH** | ``/api/auth/tenant-users/${user.id}/role`` | `fetch` | `Body: JSON.stringify({ role_code: nextRoleCode` | `fetch(\`/api/auth/tenant-users/${user.id}/role\`, {         method: "PATCH",   ...` |
| `apps\web\src\components\school\user-management-workspace.tsx:573` | **GET** | `"/api/auth/invitations?limit=50&offset=0"` | `fetch` | `Query: limit=50&offset=0` | `fetch("/api/auth/invitations?limit=50&offset=0", {           method: "GET",  ...` |
| `apps\web\src\components\school\user-management-workspace.tsx:683` | **PATCH** | ``/api/auth/tenant-users/${encodeURIComponent(user.id)}/status`` | `fetch` | `Body: JSON.stringify({ status: status === "Active" ? "active" : "suspended"` | `fetch(\`/api/auth/tenant-users/${encodeURIComponent(user.id)}/status\`, {      ...` |
| `apps\web\src\components\school\user-management-workspace.tsx:767` | **POST** | ``/api/auth/invitations/${encodeURIComponent(invite.id)}/resend`` | `fetch` | `N/A` | `fetch(\`/api/auth/invitations/${encodeURIComponent(invite.id)}/resend\`, {     ...` |
| `apps\web\src\components\school\user-management-workspace.tsx:834` | **DELETE** | ``/api/auth/invitations/${encodeURIComponent(invite.id)}`` | `fetch` | `N/A` | `fetch(\`/api/auth/invitations/${encodeURIComponent(invite.id)}\`, {         met...` |
| `apps\web\src\components\school\user-management-workspace.tsx:924` | **PATCH** | ``/api/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role`` | `fetch` | `Body: JSON.stringify({ role_code: roleCodeForLabel(updates.role)` | `fetch(\`/api/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role\`, { ...` |
| `apps\web\src\components\school\user-management-workspace.tsx:1013` | **POST** | `"/api/auth/invitations"` | `fetch` | `Body: JSON.stringify({
          display_name: invitedName` | `fetch("/api/auth/invitations", {         method: "POST",         credentials:...` |
| `apps\web\src\components\student\student-command-center.tsx:27` | **GET** | `"/api/student/overview"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/student/overview")` |
| `apps\web\src\components\student\student-command-center.tsx:47` | **GET** | `"/api/student/academics"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/student/academics")` |
| `apps\web\src\components\student\student-command-center.tsx:67` | **GET** | `"/api/student/attendance"` | `useSchoolQuery` | `Returns: any` | `useSchoolQuery<any>("/api/student/attendance")` |
| `apps\web\src\components\sync\SyncCenter.tsx:30` | **POST** | `'/api/sync/retry'` | `fetch` | `Body: JSON.stringify({ operations: [record]` | `fetch('/api/sync/retry', {             method: 'POST',             headers: {...` |
| `apps\web\src\hooks\useAttendance.ts:12` | **GET** | `studentId ? `/api/students/${studentId}/attendance` : null` | `useSchoolQuery` | `Returns: AttendanceRecord[] | Query:  ` | `useSchoolQuery<AttendanceRecord[]>(     studentId ? \`/api/students/${studentI...` |
| `apps\web\src\hooks\useAttendance.ts:21` | **GET** | ``/api/attendance${queryParams}`` | `useSchoolQuery` | `Returns: AttendanceRecord[]` | `useSchoolQuery<AttendanceRecord[]>(\`/api/attendance${queryParams}\`)` |
| `apps\web\src\hooks\useAttendance.ts:25` | **POST** | `"/api/attendance/mark"` | `useSchoolMutation` | `Body: { records: Omit<AttendanceRecord` | `useSchoolMutation<any, { records: Omit<AttendanceRecord, "id" \| "school_id">[...` |
| `apps\web\src\hooks\useDiscipline.ts:12` | **GET** | `studentId ? `/api/students/${studentId}/discipline` : null` | `useSchoolQuery` | `Returns: DisciplineCase[] | Query:  ` | `useSchoolQuery<DisciplineCase[]>(     studentId ? \`/api/students/${studentId}...` |
| `apps\web\src\hooks\useDiscipline.ts:21` | **GET** | ``/api/discipline${queryParams}`` | `useSchoolQuery` | `Returns: DisciplineCase[]` | `useSchoolQuery<DisciplineCase[]>(\`/api/discipline${queryParams}\`)` |
| `apps\web\src\hooks\useDiscipline.ts:25` | **POST** | `"/api/discipline/cases"` | `useSchoolMutation` | `Body: Omit<DisciplineCase` | `useSchoolMutation<DisciplineCase, Omit<DisciplineCase, "id" \| "school_id">>( ...` |
| `apps\web\src\hooks\useDiscipline.ts:31` | **PATCH** | ``/api/discipline/cases/${caseId}`` | `useSchoolMutation` | `Body: Partial<DisciplineCase` | `useSchoolMutation<DisciplineCase, Partial<DisciplineCase>>(     \`/api/discipl...` |
| `apps\web\src\hooks\useFees.ts:12` | **GET** | `studentId ? `/api/students/${studentId}/fees` : null` | `useSchoolQuery` | `Returns: FeeAccount | Query:  ` | `useSchoolQuery<FeeAccount>(     studentId ? \`/api/students/${studentId}/fees\`...` |
| `apps\web\src\hooks\useFees.ts:21` | **GET** | ``/api/fees${queryParams}`` | `useSchoolQuery` | `Returns: FeeAccount[]` | `useSchoolQuery<FeeAccount[]>(\`/api/fees${queryParams}\`)` |
| `apps\web\src\hooks\useFees.ts:25` | **POST** | `"/api/fees/payments"` | `useSchoolMutation` | `Body: { student_id: string; amount: number; payment_method: string; ref_number: string }` | `useSchoolMutation<any, { student_id: string; amount: number; payment_method: ...` |
| `apps\web\src\hooks\useFees.ts:31` | **GET** | `"/api/fees/summary"` | `useSchoolQuery` | `Returns: { total_expected: number; total_collected: number; total_arrears: number }` | `useSchoolQuery<{ total_expected: number; total_collected: number; total_arrea...` |
| `apps\web\src\hooks\useHealth.ts:12` | **GET** | `studentId ? `/api/students/${studentId}/health` : null` | `useSchoolQuery` | `Returns: HealthVisit[] | Query:  ` | `useSchoolQuery<HealthVisit[]>(     studentId ? \`/api/students/${studentId}/he...` |
| `apps\web\src\hooks\useHealth.ts:21` | **GET** | ``/api/health${queryParams}`` | `useSchoolQuery` | `Returns: HealthVisit[]` | `useSchoolQuery<HealthVisit[]>(\`/api/health${queryParams}\`)` |
| `apps\web\src\hooks\useHealth.ts:25` | **POST** | `"/api/health/visits"` | `useSchoolMutation` | `Body: Omit<HealthVisit` | `useSchoolMutation<HealthVisit, Omit<HealthVisit, "id" \| "school_id">>(     "/...` |
| `apps\web\src\hooks\useLibrary.ts:12` | **GET** | `studentId ? `/api/students/${studentId}/library` : null` | `useSchoolQuery` | `Returns: LibraryLoan[] | Query:  ` | `useSchoolQuery<LibraryLoan[]>(     studentId ? \`/api/students/${studentId}/li...` |
| `apps\web\src\hooks\useLibrary.ts:21` | **GET** | ``/api/library/loans${queryParams}`` | `useSchoolQuery` | `Returns: LibraryLoan[]` | `useSchoolQuery<LibraryLoan[]>(\`/api/library/loans${queryParams}\`)` |
| `apps\web\src\hooks\useLibrary.ts:25` | **POST** | `"/api/library/issue"` | `useSchoolMutation` | `Body: Omit<LibraryLoan` | `useSchoolMutation<LibraryLoan, Omit<LibraryLoan, "id" \| "school_id">>(     "/...` |
| `apps\web\src\hooks\useLibrary.ts:31` | **PATCH** | ``/api/library/loans/${loanId}`` | `useSchoolMutation` | `Body: { return_date: string; status: "RETURNED" }` | `useSchoolMutation<LibraryLoan, { return_date: string; status: "RETURNED" }>( ...` |
| `apps\web\src\hooks\useStudents.ts:21` | **GET** | ``/api/students${queryParams}`` | `useSchoolQuery` | `Returns: Student[]` | `useSchoolQuery<Student[]>(\`/api/students${queryParams}\`)` |
| `apps\web\src\hooks\useStudents.ts:25` | **GET** | `studentId ? `/api/students/${studentId}` : null` | `useSchoolQuery` | `Returns: Student | Query:  ` | `useSchoolQuery<Student>(studentId ? \`/api/students/${studentId}\` : null)` |
| `apps\web\src\hooks\useStudents.ts:29` | **GET** | `studentId ? `/api/students/${studentId}/guardians` : null` | `useSchoolQuery` | `Returns: StudentGuardian[] | Query:  ` | `useSchoolQuery<StudentGuardian[]>(     studentId ? \`/api/students/${studentId...` |
| `apps\web\src\hooks\useStudents.ts:35` | **POST** | `"/api/students/admit"` | `useSchoolMutation` | `Body: Omit<Student` | `useSchoolMutation<Student, Omit<Student, "id" \| "school_id">>("/api/students/...` |
| `apps\web\src\hooks\useStudents.ts:39` | **PATCH** | ``/api/students/${studentId}`` | `useSchoolMutation` | `Body: Partial<Student` | `useSchoolMutation<Student, Partial<Student>>(     \`/api/students/${studentId}...` |
| `apps\web\src\lib\auth\csrf-client.ts:5` | **GET** | `"/api/auth/csrf"` | `fetch` | `N/A` | `fetch("/api/auth/csrf", {       method: "GET",       credentials: "same-origi...` |
| `apps\web\src\lib\auth\invitation-client.ts:18` | **POST** | `"/api/auth/invitations/accept"` | `fetch` | `Body: JSON.stringify(input)` | `fetch("/api/auth/invitations/accept", {     method: "POST",     headers: {   ...` |
| `apps\web\src\lib\auth\use-experience-session.ts:72` | **GET** | ``/api/auth/me?${query.toString()}`` | `fetch` | `Query: ${query.toString()}` | `fetch(\`/api/auth/me?${query.toString()}\`, {           method: "GET",         ...` |
| `apps\web\src\lib\auth\use-experience-session.ts:119` | **POST** | `"/api/auth/login"` | `fetch` | `Body: JSON.stringify({
          audience` | `fetch("/api/auth/login", {         method: "POST",         headers: {        ...` |
| `apps\web\src\lib\auth\use-experience-session.ts:152` | **POST** | `"/api/auth/logout"` | `fetch` | `Body: JSON.stringify({ audience` | `fetch("/api/auth/logout", {         method: "POST",         headers: {       ...` |
| `apps\web\src\lib\auth\use-experience-session.ts:173` | **POST** | `"/api/auth/refresh"` | `fetch` | `Body: JSON.stringify({
          audience` | `fetch("/api/auth/refresh", {         method: "POST",         headers: {      ...` |
| `apps\web\src\lib\client\approvals-api.ts:19` | **GET** | `'/api/approvals/pending'` | `fetch` | `N/A` | `fetch('/api/approvals/pending')` |
| `apps\web\src\lib\client\approvals-api.ts:26` | **GET** | `'/api/approvals/my-requests'` | `fetch` | `N/A` | `fetch('/api/approvals/my-requests')` |
| `apps\web\src\lib\client\approvals-api.ts:33` | **PATCH** | ``/api/approvals/${id}/action`` | `fetch` | `Body: JSON.stringify({ action` | `fetch(\`/api/approvals/${id}/action\`, {       method: 'PATCH',       headers: ...` |
| `apps\web\src\lib\dashboard\school-api-proxy-client.ts:47` | **GET** | ``/api${path}`` | `fetch` | `Body: requestBody` | `fetch(\`/api${path}\`, {     method,     headers,     credentials: "same-origin...` |
| `apps\web\src\lib\data\class-teacher-hooks.ts:10` | **GET** | `endpoint` | `requestDashboardApi` | `Body: options?.body ? JSON.parse(options.body as string) : undefined` | `requestDashboardApi(endpoint, {     method: options?.method as any \|\| "GET", ...` |
| `apps\web\src\lib\data\school-hooks.test.tsx:33` | **GET** | `"/test-route"` | `useSchoolQuery` | `N/A` | `useSchoolQuery("/test-route")` |
| `apps\web\src\lib\data\school-hooks.test.tsx:45` | **GET** | `"/test-route"` | `useSchoolQuery` | `N/A` | `useSchoolQuery("/test-route")` |
| `apps\web\src\lib\data\school-hooks.test.tsx:56` | **GET** | `"/test-route"` | `useSchoolQuery` | `N/A` | `useSchoolQuery("/test-route", { tenantId: "explicit-tenant" })` |
| `apps\web\src\lib\data\school-hooks.test.tsx:71` | **GET** | `"/admin-command/principal/overview"` | `useSchoolQuery` | `N/A` | `useSchoolQuery("/admin-command/principal/overview")` |
| `apps\web\src\lib\data\school-hooks.test.tsx:83` | **POST** | `"/test-mutation"` | `useSchoolMutation` | `N/A` | `useSchoolMutation("/test-mutation")` |
| `apps\web\src\lib\discipline\discipline-live.ts:176` | **GET** | ``/api/discipline/${path}${query}`` | `fetch` | `Body: requestBody` | `fetch(\`/api/discipline/${path}${query}\`, {     method,     headers: {       A...` |
| `apps\web\src\lib\discipline\discipline-live.ts:206` | **GET** | ``/api/counselling/${path}${query}`` | `fetch` | `Body: options?.body ? JSON.stringify(options.body) : undefined` | `fetch(\`/api/counselling/${path}${query}\`, {     method,     headers: {       ...` |
| `apps\web\src\lib\discipline\discipline-live.ts:256` | **GET** | ``/api/admissions/students/${encodeURIComponent(studentId)}/profile?tenantSlug=${encodeURIComponent(tenantSlug)}`` | `fetch` | `Query: tenantSlug=${encodeURIComponent(tenantSlug)}` | `fetch(     \`/api/admissions/students/${encodeURIComponent(studentId)}/profile...` |
| `apps\web\src\lib\experiences\portal-api.ts:45` | **GET** | `"/api/portals/parent/children"` | `useSchoolQuery` | `Returns: LinkedChild[]` | `useSchoolQuery<LinkedChild[]>("/api/portals/parent/children")` |
| `apps\web\src\lib\experiences\portal-api.ts:49` | **GET** | ``/api/portals/reports${studentId ? `?studentId=${studentId}` : ""}`` | `useSchoolQuery` | `Returns: ReportCard[] | Query:  ` | `useSchoolQuery<ReportCard[]>(     \`/api/portals/reports${studentId ? \`?studen...` |
| `apps\web\src\lib\experiences\portal-api.ts:56` | **GET** | ``/api/portals/fees/history${studentId ? `?studentId=${studentId}` : ""}`` | `useSchoolQuery` | `Returns: FeeRecord[] | Query:  ` | `useSchoolQuery<FeeRecord[]>(     \`/api/portals/fees/history${studentId ? \`?st...` |
| `apps\web\src\lib\module-access\server-school-module-access.ts:162` | **GET** | `"/school/modules/me"` | `requestDashboardApi` | `Types: unknown` | `requestDashboardApi<unknown>("/school/modules/me", {       tenantId: input.te...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:208` | **GET** | `"/api/platform/schools"` | `fetch` | `N/A` | `fetch("/api/platform/schools", {     method: "GET",     credentials: "same-or...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:219` | **GET** | `"/api/platform/schools/summary"` | `fetch` | `N/A` | `fetch("/api/platform/schools/summary", {     method: "GET",     credentials: ...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:233` | **GET** | `"/api/platform/modules"` | `fetch` | `N/A` | `fetch("/api/platform/modules", {     method: "GET",     credentials: "same-or...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:247` | **GET** | ``/api/platform/schools/${encodeURIComponent(tenantId)}/modules`` | `fetch` | `N/A` | `fetch(     \`/api/platform/schools/${encodeURIComponent(tenantId)}/modules\`,  ...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:479` | **GET** | `"/api/platform/templates"` | `fetch` | `N/A` | `fetch("/api/platform/templates", { method: "GET", credentials: "same-origin",...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:485` | **GET** | `"/api/platform/broadcasts"` | `fetch` | `N/A` | `fetch("/api/platform/broadcasts", { method: "GET", credentials: "same-origin"...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:491` | **GET** | `"/api/platform/audit-logs"` | `fetch` | `N/A` | `fetch("/api/platform/audit-logs", { method: "GET", credentials: "same-origin"...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:497` | **GET** | `"/api/platform/backups"` | `fetch` | `N/A` | `fetch("/api/platform/backups", { method: "GET", credentials: "same-origin", c...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:503` | **GET** | `"/api/platform/security-policies"` | `fetch` | `N/A` | `fetch("/api/platform/security-policies", { method: "GET", credentials: "same-...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:509` | **GET** | `"/api/platform/reports"` | `fetch` | `N/A` | `fetch("/api/platform/reports", { method: "GET", credentials: "same-origin", c...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:515` | **GET** | `"/api/platform/users"` | `fetch` | `N/A` | `fetch("/api/platform/users", { method: "GET", credentials: "same-origin", cac...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:586` | **GET** | `"/api/platform/settings"` | `fetch` | `N/A` | `fetch("/api/platform/settings", { method: "GET", credentials: "same-origin", ...` |
| `apps\web\src\lib\platform\school-onboarding-client.ts:591` | **GET** | `"/api/platform/gateways"` | `fetch` | `N/A` | `fetch("/api/platform/gateways", { method: "GET", credentials: "same-origin", ...` |
| `apps\web\src\lib\school\school-operational-store.ts:528` | **POST** | `endpoint` | `fetch` | `Body: JSON.stringify(payload)` | `fetch(endpoint, {     method: "POST",     headers: {       Accept: "applicati...` |
| `apps\web\src\lib\students\student-data-service.ts:43` | **POST** | `"/students"` | `requestDashboardApi` | `Types: Student | Body: data` | `requestDashboardApi<Student>("/students", {       method: "POST",       body:...` |
| `apps\web\src\lib\students\student-data-service.ts:59` | **PATCH** | ``/students/${studentId}`` | `requestDashboardApi` | `Types: Student | Body: data` | `requestDashboardApi<Student>(\`/students/${studentId}\`, {       method: "PATCH...` |
| `apps\web\src\lib\students\student-data-service.ts:75` | **POST** | ``/students/lifecycle/${studentId}/enroll`` | `requestDashboardApi` | `Types: Student` | `requestDashboardApi<Student>(\`/students/lifecycle/${studentId}/enroll\`, {    ...` |
| `apps\web\src\lib\students\student-data-service.ts:90` | **POST** | ``/students/lifecycle/${studentId}/place-in-class`` | `requestDashboardApi` | `Types: Student | Body: { classId` | `requestDashboardApi<Student>(\`/students/lifecycle/${studentId}/place-in-class...` |
| `apps\web\src\lib\students\student-data-service.ts:109` | **GET** | ``/students${queryParams}`` | `requestDashboardApi` | `Types: Student[]` | `requestDashboardApi<Student[]>(\`/students${queryParams}\`)` |
| `apps\web\src\lib\students\student-data-service.ts:113` | **GET** | ``/students/${studentId}`` | `requestDashboardApi` | `Types: Student` | `requestDashboardApi<Student>(\`/students/${studentId}\`)` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:15` | **POST** | ``/api/students/lifecycle/${studentId}/enroll`` | `fetch` | `N/A` | `fetch(\`/api/students/lifecycle/${studentId}/enroll\`, {     method: 'POST',   ...` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:24` | **POST** | ``/api/students/lifecycle/${studentId}/place-in-class`` | `fetch` | `Body: JSON.stringify(payload)` | `fetch(\`/api/students/lifecycle/${studentId}/place-in-class\`, {     method: 'P...` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:35` | **POST** | ``/api/students/lifecycle/${studentId}/promote`` | `fetch` | `Body: JSON.stringify(payload)` | `fetch(\`/api/students/lifecycle/${studentId}/promote\`, {     method: 'POST',  ...` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:46` | **POST** | ``/api/students/lifecycle/${studentId}/suspend`` | `fetch` | `Body: JSON.stringify({ reason` | `fetch(\`/api/students/lifecycle/${studentId}/suspend\`, {     method: 'POST',  ...` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:57` | **POST** | ``/api/students/lifecycle/${studentId}/initiate-clearance`` | `fetch` | `N/A` | `fetch(\`/api/students/lifecycle/${studentId}/initiate-clearance\`, {     method...` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:66` | **POST** | ``/api/students/lifecycle/${studentId}/exit`` | `fetch` | `Body: JSON.stringify(payload)` | `fetch(\`/api/students/lifecycle/${studentId}/exit\`, {     method: 'POST',     ...` |
| `apps\web\src\lib\students\student-lifecycle.api.ts:77` | **PATCH** | ``/api/students/lifecycle/${studentId}/archive`` | `fetch` | `N/A` | `fetch(\`/api/students/lifecycle/${studentId}/archive\`, {     method: 'PATCH', ...` |
| `apps\web\src\lib\students\student-lookup.ts:19` | **GET** | ``/api/admissions/students?${params.toString()}`` | `fetch` | `Query: ${params.toString()}` | `fetch(\`/api/admissions/students?${params.toString()}\`, {     credentials: "sa...` |
| `apps\web\src\lib\support\support-live.ts:607` | **GET** | ``/api/support${path}${query ? `${separator}${query}` : ""}`` | `fetch` | `Body: options?.formData ?? (options?.body ? JSON.stringify(options.body) : undefined) | Query:  ` | `fetch(\`/api/support${path}${query ? \`${separator}${query}\` : ""}\`, {     meth...` |
| `apps\web\src\lib\support\support-live.ts:638` | **GET** | ``/api/support${path}`` | `fetch` | `N/A` | `fetch(\`/api/support${path}\`, {     method: "GET",     credentials: "same-orig...` |
| `apps\web\src\lib\workflows\offline-sync-engine.ts:80` | **POST** | `'/api/operational-workflows/offline-sync'` | `fetch` | `Body: JSON.stringify({
              action_id: item.actionId` | `fetch('/api/operational-workflows/offline-sync', {             method: 'POST'...` |
