# MyShule Production Readiness Matrix

Date: 2026-06-08  
Scope of this matrix update: shared dashboard action contract, fake-success safety gate, communication readiness helpers, Principal/Deputy reference checks, academic/exams checks, finance/admissions checks, operational-role checks, parent/student portal checks, Super Admin/System Monitor checks, backend daily-operations API tests, tenant isolation source audit, and tenant integration preflight evidence.

## Status Legend

| Status | Meaning |
| --- | --- |
| VERIFIED_REAL_WORKFLOW | Test evidence proves the enabled action opens real UI, changes visible state, queues/logs communication, opens print preview, downloads a file, or calls a real backend/store path. |
| VERIFIED_DISABLED_WITH_REASON | Test evidence proves the action is disabled and shows a specific reason. |
| PARTIAL_REQUIRES_BACKEND | UI workflow exists, but durable backend/API/config hardening is still needed before full production scale. |
| NOT_AUDITED | Not covered by this matrix update. |

## Button Outcome Matrix

| Dashboard | Module | Button / Action | Current Behaviour Evidence | Classification | Required Fix | Backend/API Needed | Final Status | Test Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Principal | Attendance | View Attendance | Opens attendance workspace/table, not a toast-only "Opened Attendance" message. | REAL_WORKFLOW | Keep as reference pattern. | Existing school operational store/API. | VERIFIED_REAL_WORKFLOW | `principal-production-readiness.test.tsx`, `dashboard-action-contract.test.ts` |
| Principal | Attendance | Open Workspaces / Send Absence SMS | Workspace navigation now reports operational record and metric counts; SMS confirmation reports guardian recipient count before queueing instead of generic opened copy. | REAL_WORKFLOW or DISABLED_REQUIRED by provider state | Wire same evidence-backed confirmation pattern everywhere SMS is used. | `GET /sms/readiness`, `POST /sms/bulk-send` already covered by backend focused tests. | VERIFIED_REAL_WORKFLOW | `principal-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `integrations.test.js` |
| Principal | Attendance | Print Attendance Report | Opens print preview evidence. | REAL_WORKFLOW | None for reference path. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `dashboard-action-contract.test.ts`, prior `role-dashboard-structure.test.tsx` |
| Deputy Principal | Discipline/Emergency | Notify/Emergency actions | Existing command-center flow has visible dialog/workflow state and no fake-only completion copy. | REAL_WORKFLOW | Extend formal contract coverage later. | School operational store and event log. | VERIFIED_REAL_WORKFLOW | `deputy-principal-command-center.test.tsx` |
| Deputy Principal | Discipline/Emergency | Search Result Selection | Search selection now reports loaded deputy section plus incident/staff/attendance detail instead of generic follow-up copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Deputy operations search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `deputy-principal-command-center.test.tsx` |
| Exams Manager | Exams | Exam Setup / Exam Builder | Opens setup/configuration workspace; staff copy does not expose parent/student management workflow. | REAL_WORKFLOW | Continue backend publish/approval deep tests. | Exams APIs for publish/parent download already partially covered elsewhere. | VERIFIED_REAL_WORKFLOW | `academic-office-production-readiness.test.tsx`, `portal-platform-command-centers.test.tsx` |
| Exams Manager | Exams | Search Result Selection | Search selection now reports loaded exam workspace plus selected record detail instead of generic "selected in exams records" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Exams search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Exams Manager | Exams | Marks Entry Open | Marks-entry action now reports the exact subject, class stream, pending learner count, and teacher/Dean notifications instead of generic selected-class copy. | REAL_WORKFLOW | Continue durable marks-entry API and teacher assignment authorization coverage. | Exams marks-entry API for live mode. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Dean/HOD/Class/Teacher | Academics | Marks, review, lesson/class actions | Existing academic command-center tests cover visible working controls and school-scoped events. | PARTIAL_WORKFLOW | Add per-action contracts for publish/return/approval. | Exams and operational workflow APIs. | PARTIAL_REQUIRES_BACKEND | `academic-command-centers.test.tsx`, `class-dean-command-centers.test.tsx`, `teacher-command-center.test.tsx` |
| Dean/Class Teacher | Academics | Search Result Selection | Class teacher and Dean search selections now report loaded role workspace plus selected learner/exam detail instead of generic selected copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Academic search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx` |
| Dean of Academics | Academics | Save Academic Action | Dean action save now reports school id, event/entity id, exam, class stream, and Exams Manager/Principal/Class Teacher notification audience instead of generic follow-up copy. | REAL_WORKFLOW | Continue durable approval/return/reject endpoint contracts for live mode. | Exams/dean academic workflow API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| HOD/Grade Master | Academics | Search Result Selection | HOD and Grade Master search selections now report loaded academic leadership workspace plus selected assessment/parent detail instead of generic selected copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Academic search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `academic-command-centers.test.tsx` |
| Grade/Form Master | Reports | Save Report Request | Grade report request now reports school id, report entity id, Form 2 context, and Principal/Deputy/Dean notification audience instead of generic review/export copy. | REAL_WORKFLOW | Continue durable grade report artifact/approval endpoint coverage. | Grade/Form Master report API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Grade/Form Master | Academics/Reports | Table Filter / Export | Stream table filter/export actions now report school id, action entity id, Form 2 context, and Deputy/Principal/Class Teacher notification audience instead of generic filter/export copy. | REAL_WORKFLOW | Continue durable table-filter persistence and export artifact endpoint coverage. | Grade/Form Master table/export API for live mode. | VERIFIED_REAL_WORKFLOW | `academic-command-centers.test.tsx`, `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| HOD | Reports | Save Report Review | HOD report review now reports school id, report entity id, Mathematics department context, and Dean/Exams Manager/Principal notification audience instead of generic review/export copy. | REAL_WORKFLOW | Continue durable HOD report artifact/approval endpoint coverage. | HOD report workflow API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| HOD | Academics | Table Search / Filter | HOD table search/filter actions now report school id, action entity id, Mathematics department context, and Dean/Principal notification audience instead of generic table copy. | REAL_WORKFLOW | Continue durable saved-search and table-filter persistence endpoint coverage. | HOD academics table API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| HOD | Academics | Save Department Export Request | HOD export request now reports school id, generated tenant-scoped CSV filename, and Dean/Exams Manager/Principal notification audience instead of generic export-saved copy. | REAL_WORKFLOW | Continue server-side export artifact endpoint coverage for live mode. | HOD/academics export API for live mode. | VERIFIED_REAL_WORKFLOW | `academic-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| HOD | Communications | Save Department Communication Draft | HOD communication draft save now reports school id, draft entity id, Mathematics department context, and Dean/Principal/Teacher notification audience instead of generic draft-saved copy. | REAL_WORKFLOW | Continue durable message-draft endpoint and delivery approval coverage. | Communications draft API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Class Teacher | Reports | Class Report Preview | Report preview action now shows class name, learner-record count, and document reference before opening printable preview. | REAL_WORKFLOW | Continue durable report artifact API coverage. | Class report artifact API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx` |
| Class Teacher | Communications | Save Parent Template | Parent template save now reports school id, template entity id, Form 2 Blue SMS context, and Deputy/Grade Master notification audience instead of generic template-saved copy. | REAL_WORKFLOW | Continue durable SMS-template endpoint and approval coverage. | Communications template API for live mode. | VERIFIED_REAL_WORKFLOW | `class-dean-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Accountant | Fees | Export fee list | Generates/downloads CSV evidence instead of "export generated". | REAL_WORKFLOW | None for CSV path. | Existing `downloadCsvFile`. | VERIFIED_REAL_WORKFLOW | `front-office-finance-production-readiness.test.tsx`, `finance-security-command-centers.test.tsx` |
| Accountant | Finance Command Center | Export Preview / Download CSV | Export preview notice now includes school id and transaction row count; download still emits `FINANCE_EXPORT_DOWNLOADED` same-school event. | REAL_WORKFLOW | None for CSV path; live finance export API optional for server-side artifacts. | Existing `downloadCsvFile` and school operational event store. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx` |
| Accountant | Finance Command Center | Download Transaction Export | Download completion now reports school id, generated CSV filename, transaction row count, and Principal/Deputy notification audience instead of generic export-downloaded copy. | REAL_WORKFLOW | Continue server-side artifact endpoint coverage for live mode. | Finance export API for live mode. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Accountant | Finance Intelligence | Create Finance Task | Finance insight details now include confidence, priority, and principal/deputy review audience; creating a task reports school id, entity id, and notification audience while emitting `FINANCE_INTELLIGENCE_TASK_CREATED`. | REAL_WORKFLOW | Continue durable task-assignment API coverage for live mode. | School operational event store and workflow/task API for live mode. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx` |
| Accountant | Finance Command Center | Search Result Selection | Search selection now reports loaded finance workspace plus receipt/M-PESA/supplier detail instead of generic "selected in finance section" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Finance search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx` |
| Accountant | Fees | Record payment / print receipt | Payment desk has receipt workflow evidence and existing finance workflow tests. | REAL_WORKFLOW | Continue durable finance backend audit for all vote heads/reversals. | Finance/payment APIs where live mode is enabled. | PARTIAL_REQUIRES_BACKEND | `front-office-finance-production-readiness.test.tsx`, `finance-human-workflows.test.tsx` |
| Accountant | Fees | Export Fee List Evidence | Fee-list CSV download now reports school id plus balance and payment counts instead of generic download copy. | REAL_WORKFLOW | Continue durable export artifact endpoint coverage. | Finance export API for live mode. | VERIFIED_REAL_WORKFLOW | `role.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Admissions Officer | Admissions | Save Inquiry | Adds a visible applicant row and follow-up state. | REAL_WORKFLOW | Continue backend admission/application API hardening. | Admissions API for durable production persistence. | VERIFIED_REAL_WORKFLOW | `front-office-finance-production-readiness.test.tsx`, `admissions-workspace.test.tsx` |
| Admissions Officer | Admissions | Save Inquiry Evidence | Inquiry save now persists a school-scoped applicant record, emits `ADMISSION_INQUIRY_RECORDED`, and reports school id, applicant entity id, document state, parent-contact capture, and Principal/Secretary/Accountant/Class Teacher notification audience. | REAL_WORKFLOW | Continue durable admissions endpoint coverage for live mode. | Admissions API for durable production persistence. | VERIFIED_REAL_WORKFLOW | `front-office-finance-production-readiness.test.tsx`, `role.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Admissions Officer | Admissions | Print Pipeline | Opens admissions pipeline print preview evidence. | REAL_WORKFLOW | None for preview path; durable print artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `front-office-finance-production-readiness.test.tsx` |
| Admissions Officer | Admissions | Print Pipeline Evidence | Admissions pipeline print now reports school id, applicant-record count, and Admissions/Principal notification audience instead of generic preview copy. | REAL_WORKFLOW | None for preview path; durable print artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `front-office-finance-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Nurse | Sick Bay | Save Visit and Deduct Stock | Saves visit, deducts stock, updates visible notice. | REAL_WORKFLOW | Add expiry/stock validation at durable API boundary where missing. | Clinic/medicine stock API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Nurse | Sick Bay | Save Visit Evidence | Visit save now reports school id, clinic visit entity id, stock deduction quantity, and Principal/Deputy/Class Teacher/Boarding notification audience instead of generic visit-saved copy. | REAL_WORKFLOW | Continue durable clinic visit/stock endpoint coverage. | Clinic/medicine stock API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `role.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Nurse | Sick Bay | Print Register | Opens sick bay register print preview. | REAL_WORKFLOW | None for UI preview. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Nurse | Sick Bay | Print Register Evidence | Sick bay register print now reports school id, visit-record count, and Nurse/Principal notification audience instead of generic preview copy. | REAL_WORKFLOW | None for UI preview; durable artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Librarian | Library | Issue Book | Adds issue evidence to borrower register. | REAL_WORKFLOW | Add durable issue/return/fine backend tests where missing. | Library API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Librarian | Library | Print Library Report | Opens report print preview evidence. | REAL_WORKFLOW | None for preview. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Librarian | Library | Print Library Report Evidence | Library report print now reports school id, borrower/catalogue counts, and Librarian/Principal notification audience instead of generic preview copy. | REAL_WORKFLOW | None for preview; durable artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Storekeeper | Inventory | Issue Stock | Updates movement history with receiver/department evidence. | REAL_WORKFLOW | Add durable stock availability/approval API tests where missing. | Inventory API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Storekeeper | Inventory | Export Stock Report | Downloads CSV evidence. | REAL_WORKFLOW | None for CSV path. | Existing `downloadCsvFile`. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Storekeeper | Inventory | Export Stock Report Evidence | Stock CSV download now reports school id plus catalogue and movement counts instead of generic download copy. | REAL_WORKFLOW | Continue durable export artifact endpoint coverage. | Inventory export API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Boarding Master | Hostel | Save Roll Call | Adds/updates roll call visible state. | REAL_WORKFLOW | Add durable boarding roll-call API tests where missing. | Boarding API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Boarding Master | Hostel | Print Roll Call | Opens hostel roll-call print preview. | REAL_WORKFLOW | None for preview. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Boarding Master | Hostel | Print Roll Call Evidence | Hostel roll-call print now reports school id, roll-call record count, and Boarding/Deputy notification audience instead of generic preview copy. | REAL_WORKFLOW | None for preview; durable artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Boarding Master | Hostel | Search Result Selection | Search selection now reports loaded boarding section plus roll-call/dorm/clinic detail instead of generic "selected in boarding records" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Boarding search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `boarding-master-command-center.test.tsx` |
| Boarding Master | Hostel | Quick Boarding Response | Quick response save now reports school id, boarding entity id, dorm/learner context, and Deputy/Principal/Security/Nurse notification audience instead of generic quick-response copy. | REAL_WORKFLOW | Continue durable boarding task endpoint coverage. | Boarding workflow/task API for live mode. | VERIFIED_REAL_WORKFLOW | `boarding-master-command-center.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Transport Manager | Transport | Add Trip Record | Adds learner trip attendance evidence. | REAL_WORKFLOW | Continue durable transport API validation for route capacity/linked learner. | Transport API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `transport-module.test.tsx` |
| Transport Manager | Transport | Print Route List | Opens transport route-list print preview. | REAL_WORKFLOW | None for preview. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Transport Manager | Transport | Print Route List Evidence | Route-list print now reports school id, vehicle/trip counts, and Transport/Principal notification audience instead of generic preview copy. | REAL_WORKFLOW | None for preview; durable artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Laboratory Technician | Laboratory | Add Practical Request | Saves practical request visible state. | REAL_WORKFLOW | Add durable hazard/stock workflow tests where missing. | Laboratory API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Laboratory Technician | Laboratory | Print Practical Checklist | Opens checklist print preview. | REAL_WORKFLOW | None for preview. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Laboratory Technician | Laboratory | Print Practical Checklist Evidence | Practical checklist print now reports school id, practical-request/lab-stock counts, and Lab/Dean notification audience instead of generic preview copy. | REAL_WORKFLOW | None for preview; durable artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `dashboard-production-readiness.test.tsx`, `role.test.tsx` |
| Laboratory Technician | Laboratory | Search Result Selection | Search selection now reports loaded lab section plus chemical/equipment/session detail instead of generic "selected in lab records" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Laboratory search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx` |
| Discipline Master | Discipline | Add Incident | Creates visible discipline case and execution log evidence. | REAL_WORKFLOW | Add durable discipline API tests where missing. | Discipline API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `student-support-command-centers.test.tsx` |
| Discipline Master | Discipline | Add Incident Evidence | Incident save now reports school id, discipline case entity id, severity, and Deputy/Principal/Class Teacher/Discipline notification audience instead of generic case-recorded copy. | REAL_WORKFLOW | Continue durable discipline endpoint coverage. | Discipline API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `role.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Discipline Master | Discipline | Print Letter | Opens discipline letter preview evidence. | REAL_WORKFLOW | None for preview; durable document artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Discipline Master | Discipline | Search Result Selection | Search selection now reports loaded discipline workspace plus selected case/risk detail instead of generic follow-up copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Discipline search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx` |
| Counsellor | Counselling | Save Session | Creates visible counselling session evidence without exposing confidential notes to portals. | REAL_WORKFLOW | Add durable counselling API tests where missing. | Counselling API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `portal-platform-command-centers.test.tsx` |
| Counsellor | Counselling | Save Session Evidence | Session save now reports school id, counselling session entity id, risk level, and Deputy/Principal/Discipline/Class Teacher notification audience instead of generic session-recorded copy. | REAL_WORKFLOW | Continue durable counselling endpoint coverage. | Counselling API for live mode. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx`, `role.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Counsellor | Counselling | Print Summary | Opens counselling summary preview evidence. | REAL_WORKFLOW | None for preview; durable document artifact optional. | Existing print helper. | VERIFIED_REAL_WORKFLOW | `operational-modules-production-readiness.test.tsx` |
| Counsellor | Counselling | Search Result Selection | Search selection now reports loaded counselling section plus referral/meeting/report detail instead of generic "selected in counselling records" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Counselling search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx` |
| Counsellor | Counselling | Quick-add Counselling Session | Quick-add save now reports school id, counselling session entity id, and Deputy/Class Teacher/Principal notification audience instead of generic quick-add copy. | REAL_WORKFLOW | Continue durable counselling session endpoint coverage. | Counselling API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Parent | Academics | View/Print/Download Report | Opens child-scoped parent report viewer with published report content only; print and download actions now show preview/file evidence instead of generic opened/prepared copy. | REAL_WORKFLOW | Continue backend linked-child enforcement tests. | Parent report-card download API. | VERIFIED_REAL_WORKFLOW | `academic-parent-portal-upgrade.test.tsx` |
| Parent | Academics | Acknowledge Report | Mutates visible acknowledgement state; does not claim fake backend send. | REAL_WORKFLOW | Add durable acknowledgement endpoint if not already live. | Parent acknowledgement API for live mode. | VERIFIED_REAL_WORKFLOW | `academic-parent-portal-upgrade.test.tsx` |
| Parent | Academics | Switch Linked Child | Changes active child context and reports published report/result counts for that child instead of generic "academic record opened" copy. | REAL_WORKFLOW | Continue backend linked-child enforcement tests. | Parent linked-child API for live mode. | VERIFIED_REAL_WORKFLOW | `academic-parent-portal-upgrade.test.tsx` |
| Parent | Portal | Linked Learner Switch / Notifications / Emergency Contacts | Linked learner buttons change active child context, feed, header, card metrics, and visible loaded-count evidence; notifications and emergency contacts open visible panel/data and avoid fake-only wording. | REAL_WORKFLOW | None for local panel; live notifications should use backend store. | Portal notification API and linked-learner API for live mode. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Parent | Portal | Quick Action Routes | Parent quick-action links now report active linked learner, target route, and linked-child feed count instead of generic navigation copy. | REAL_WORKFLOW | Continue live route-level authorization checks for linked children. | Parent linked-learner route/API policy. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Student | Portal | View Assignment / Message Teacher | Quick-action feedback now reports the target route, verified learner, and loaded learner-safe update count; unsupported Submit Work is disabled with reason. | REAL_WORKFLOW and DISABLED_REQUIRED | Keep disabled until assignment context is connected. | LMS submission endpoint exists; UI still needs assignment binding. | VERIFIED_DISABLED_WITH_REASON | `portal-platform-command-centers.test.tsx` |
| Parent/Student | Fees | Share Statement | Clipboard flow copies the actual family statement and now reports copied posted-payment row count for the verified family account. | REAL_WORKFLOW | Continue durable statement artifact/download endpoint coverage. | Parent fee statement API for live mode. | VERIFIED_REAL_WORKFLOW | `experience-actions.test.tsx` |
| Student | Academics | Staff exam workflow | Student does not see parent report-card acknowledgement or staff publish/moderation actions. | REAL_WORKFLOW access restriction | None. | Portal access policy. | VERIFIED_REAL_WORKFLOW | `academic-parent-portal-upgrade.test.tsx` |
| Super Admin | Shell | Search / Notifications | Route/panel evidence shown; no fake-only action copy. | REAL_WORKFLOW | Add broader tenant action contracts later. | Platform routes/API. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Super Admin | Schools | Reset Admin | Downloads a tenant-scoped admin reset CSV bundle with tenant id, admin email, generated timestamp, expiry timestamp, recovery action, filename, and 15-minute expiry evidence. | REAL_WORKFLOW | Replace local CSV bundle with durable reset-token API when available. | Platform school recovery/reset endpoint for live mode. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Registrar | Admissions | Search Result Selection | Search selection now reports loaded admissions section plus applicant/admission/guardian detail instead of generic "selected in admissions records" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Admissions search/read API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx` |
| Registrar | Admissions | Apply Applicant Filter | Applicant filter apply now reports school id, filter entity id, visible record count, and Secretary/Principal notification audience instead of generic filter-applied copy. | REAL_WORKFLOW | Continue durable applicant-list filter/audit endpoint coverage. | Admissions review API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Registrar | Admissions | Record Application Preview | Application preview review now reports school id, admissions preview entity id, application status, and office/fee/class/leadership notifications instead of generic preview-recorded copy. | REAL_WORKFLOW | Continue durable admission-review endpoint and notification delivery coverage. | Admissions review API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Registrar | Admissions | Save Quick Admissions Action | Quick action save now reports school id, action entity id, next step, and Secretary/Accountant/Class Teacher/Principal notification audience instead of generic quick-action copy. | REAL_WORKFLOW | Continue durable admissions task endpoint coverage. | Admissions workflow/task API for live mode. | VERIFIED_REAL_WORKFLOW | `student-support-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| System Monitor | Infrastructure | Retry Failed SMS / Notify Admin / Mark Issue Solved | Updates visible issue status/message. | REAL_WORKFLOW | Wire live retry endpoints where not configured. | Observability/support retry APIs for live mode. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| System Monitor | Infrastructure | Download System Report | Downloads CSV evidence. | REAL_WORKFLOW | None for CSV path. | Existing `downloadCsvFile`. | VERIFIED_REAL_WORKFLOW | `portal-platform-command-centers.test.tsx` |
| Security Officer | Security/Visitors | Check-in/out, visitor pass, alert office, emergency panic, reports | Visitor check-in/out mutates school-scoped records/events, alert office publishes a security event, visitor pass opens print preview, emergency/report actions create visible reviewed/raised states. | REAL_WORKFLOW | Continue durable visitors/security API hardening for live mode. | Visitors/security API for live mode. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx` |
| Security Officer | Security/Visitors | Search Result Selection | Search selection now reports loaded security workspace plus visitor/pickup/vehicle detail instead of generic "selected in security records" copy. | REAL_WORKFLOW | Continue endpoint-level search/result authorization coverage. | Visitors/security search API for live mode. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx` |
| Security Officer | Security/Visitors | Save Report Review | Security report review now reports school id, report entity id, and principal/deputy/security notification audience instead of generic report-review copy. | REAL_WORKFLOW | Continue durable report-review endpoint and audit-log coverage. | Security report API for live mode. | VERIFIED_REAL_WORKFLOW | `finance-security-command-centers.test.tsx`, `dashboard-production-readiness.test.tsx` |
| Platform | Module Readiness | Production-ready allowlist / inactive modules | `getModuleReadiness` separates visible demo UI from UI completeness, live API connection, tenant safety, production readiness, and missing reasons. | REAL_WORKFLOW | Keep module readiness honest as backend contracts mature. | None. | VERIFIED_REAL_WORKFLOW | `module-readiness.test.ts` |
| Shared Operational UI | Forms | Print / Preview Print | Shared operational forms open real print preview documents and now show form title plus loaded field-count evidence instead of generic prepared copy. | REAL_WORKFLOW | Continue wiring individual form submissions to durable domain APIs. | Existing `openPrintDocument`. | VERIFIED_REAL_WORKFLOW | `universal-form-table-system.test.tsx` |
| Backend/API | Daily operations APIs | Admissions, exams, finance/payments, students, clinic, library, inventory, boarding/hostel, transport, labs, discipline, visitors/security, workflow dispatch/consumer paths | Focused compiled API tests prove tenant-safe schemas/RLS, validation, audit/event paths, bounded lists, report artifacts, M-PESA safeguards, and role/module gates across priority operational domains. | REAL_WORKFLOW | Keep expanding endpoint-level tests until every dashboard action has a durable API contract. | Existing API modules. | VERIFIED_REAL_WORKFLOW | `node --test dist/apps/api/src/modules/...` focused 242-test backend sweep |
| Backend/API | Tenant isolation audit | Forced RLS/source tenant evidence | Tenant isolation audit generated `docs/security/implementation10-security-audit.md` with status `pass`, including critical support, integrations, discipline, parent portal, auth membership, upload, SMS, Daraja, and forced-RLS checks. | REAL_WORKFLOW | Run live database isolation integration suite when `DATABASE_URL` is available. | Existing tenant audit script. | VERIFIED_REAL_WORKFLOW | `npm.cmd run tenant:isolation:audit` |
| Backend/API | Tenant isolation integration | School A / school B live database boundary tests | Dedicated integration suite was attempted but stopped at environment guard because `DATABASE_URL` is missing in this shell. No integration assertions ran. | DISABLED_REQUIRED by environment | Provide integration database URL and rerun before any full production claim. | PostgreSQL integration database. | VERIFIED_DISABLED_WITH_REASON | `npm.cmd run test:tenant-isolation` |

## Shared Action System Created Or Enforced

- Added shared dashboard action contract spine:
  - `apps/web/src/lib/dashboard/dashboard-action-contract.ts`
  - `apps/web/src/lib/dashboard/dashboard-action-registry.ts`
  - `apps/web/src/lib/dashboard/dashboard-action-executor.ts`
- Added communication workflow helpers:
  - `apps/web/src/lib/dashboard/communication-workflows.ts`
  - `apps/web/src/components/dashboard/action-confirmation-modal.tsx`
- Added a code-search safety test that fails on fake-only phrases in active dashboard source areas.

## Fake Handlers Found Or Guarded

The current guard fails if dashboard sources reintroduce these fake-only patterns:

- `Action completed`
- `Workflow dispatched`
- `completed successfully`
- `is being sent`
- `print started`
- `export generated`
- `opened for ... follow-up`
- `Print preview opened for`
- `Download prepared for`
- `academic record opened`
- `profile selected.`
- `one-time admin reset bundle is ready`
- `Printable preview prepared`
- `Print copy prepared from the current form details`
- `export preview prepared`
- `preview prepared for`
- `confirmation opened`
- `workspace opened.`
- `Navigating to ... route.`
- `Statement copied for sharing`
- `action details ready`
- `selected in finance section`
- `selected in security records`
- `selected in exams records`
- `selected in my class`
- `selected in pending reviews`
- `selected in counselling records`
- `selected in lab records`
- `selected in admissions records`
- `selected in boarding records`
- `selected in exams & performance`
- `selected in parent escalations`
- `selected for discipline follow-up`
- `selected for deputy follow-up`
- `Marks entry sheet ready for selected class and subject`
- `saved for Dean follow-up`
- `saved for review and export`
- `export saved for department records`
- `application preview recorded.`
- `${title} export saved.`
- `${title} filters applied.`
- `${tableAction.title} search saved.`
- `${tableAction.title} filters applied.`
- `${communicationDraft.title} communication draft saved.`
- `Quick admissions action saved.`
- `Quick boarding response saved.`
- `${parentTemplate.label} parent template saved.`
- `${streamDetailReview.title} review saved.`
- `Quick-add counselling session saved.`
- `${activeApplicantFilter} applicant filter applied.`
- `${reportReview} report review saved.`
- `${visit.student} visit saved.`
- `${applicant.applicant} saved.`
- `${payment.student} payment recorded. Receipt`
- `${newCase.student} discipline case recorded.`
- `${newSession.student} counselling session recorded.`
- `${exportPreview} export downloaded.`
- `Sick bay register print preview ready.`
- `Admissions pipeline print preview ready.`
- `Library report print preview ready.`
- `Hostel roll call sheet print preview ready.`
- `Transport route list print preview ready.`
- `Practical checklist print preview ready.`
- `Stock CSV downloaded with`
- `Fee list CSV downloaded with`

Known fake/partial behaviors from earlier audit are recorded in `myshule-dashboard-action-amendment-report-2026-06-06.md`; this update adds active regression coverage over the priority surfaces.

## Buttons Disabled And Exact Reasons

- Student Submit Work: `Disabled: submit-work form is not connected to an assignment yet.`
- SMS confirmation helpers map missing provider readiness to: `Disabled: SMS provider is not configured.`
- Existing disabled student/parent disconnected workspaces remain preferable to fake success until their live backend/context is connected.

## APIs Connected Or Created

- Backend endpoints already covered by focused tests:
  - `GET /sms/readiness`
  - `POST /sms/bulk-send`
  - `POST /lms/assignments/:assignmentId/submissions`
- Backend operational services covered by the focused compiled API sweep:
  - Admissions registration, exports, parent invite, class capacity, subject/timetable enrollment, and lifecycle hooks.
  - Exams mark entry, lock/approval, publish, report-card generation, verification, and tenant-scoped report lookup.
  - Finance/payments/M-PESA tenant config, callback verification, reconciliation, dual approval, redacted exports, and provider readiness.
  - Clinic, library, inventory, boarding/hostel, transport, labs, discipline/counselling, visitors/security operational mutations, RLS schemas, and audit evidence.
  - Workflow dispatcher and event consumers for governed dispatch, completion, audit evidence, and same-school task materialization.
- Frontend helpers now consume/readiness-map these workflows for confirmation and disabled reasons.
- No additional backend API was created in this matrix update.

## Cross-Dashboard Notifications And Tasks

- Existing operational workflow consumer materializes same-school task/notification projections and is covered by backend focused tests.
- Role operational actions tested here publish/update local school-scoped operational state and visible notification/queue evidence.
- Remaining work: domain-specific durable mutations for every operational module should be completed API by API before claiming full production readiness across all 1000+ schools.

## Tests Added In This Update

- `apps/web/tests/design/dashboard-production-readiness.test.tsx`
- `apps/web/tests/design/principal-production-readiness.test.tsx`
- `apps/web/tests/design/academic-office-production-readiness.test.tsx`
- `apps/web/tests/design/front-office-finance-production-readiness.test.tsx`
- `apps/web/tests/design/operational-modules-production-readiness.test.tsx`

## Tests Run In This Update

- `npm.cmd --prefix apps/web run test:design -- front-office-finance-production-readiness.test.tsx admissions-workspace.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- operational-modules-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx`
- `npm.cmd run web:lint`
- `npm.cmd --prefix apps/web run test:design -- finance-security-command-centers.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- module-readiness.test.ts`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts`
- `npm.cmd --prefix apps/web run test:design -- dashboard-production-readiness.test.tsx academic-parent-portal-upgrade.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts`
- `npm.cmd --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-production-readiness.test.tsx dashboard-action-contract.test.ts portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts`
- `npm.cmd --prefix apps/web run test:design -- universal-form-table-system.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd run web:lint`
- `npm.cmd run build`
- `npm.cmd --prefix apps/web run test:design -- finance-security-command-centers.test.tsx class-dean-command-centers.test.tsx principal-production-readiness.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx experience-actions.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- class-dean-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- student-support-command-centers.test.tsx boarding-master-command-center.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- academic-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- student-support-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- deputy-principal-command-center.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- finance-security-command-centers.test.tsx portal-platform-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- finance-security-command-centers.test.tsx portal-platform-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `node --test dist/apps/api/src/middleware/tenant.middleware.test.js dist/apps/api/src/database/tenant-database-policy.test.js dist/apps/api/src/scripts/tenant-isolation-audit.test.js dist/apps/api/src/modules/events/consumers/operational-workflow-execution.consumer.test.js dist/apps/api/src/modules/integrations/integrations.test.js dist/apps/api/src/modules/lms/lms.test.js`
- `npm.cmd run tenant:isolation:audit`
- `node --test dist/apps/api/src/modules/admissions/admissions.test.js dist/apps/api/src/modules/admissions/admissions.repository.test.js dist/apps/api/src/modules/exams/exams.test.js dist/apps/api/src/modules/finance/finance.test.js dist/apps/api/src/modules/payments/payments.test.js dist/apps/api/src/modules/students/students.test.js dist/apps/api/src/modules/clinic/clinic.test.js dist/apps/api/src/modules/library/library.test.js dist/apps/api/src/modules/inventory/inventory.test.js dist/apps/api/src/modules/inventory/repositories/inventory.repository.test.js dist/apps/api/src/modules/boarding/boarding.test.js dist/apps/api/src/modules/hostel/hostel.test.js dist/apps/api/src/modules/transport/transport.test.js dist/apps/api/src/modules/labs/labs.test.js dist/apps/api/src/modules/discipline/discipline.test.js dist/apps/api/src/modules/visitors/visitors.test.js dist/apps/api/src/modules/security/security.test.js dist/apps/api/src/modules/events/operational-workflow-dispatcher.service.test.js dist/apps/api/src/modules/events/consumers/operational-workflow-dispatched.consumer.test.js dist/apps/api/src/modules/events/consumers/operational-workflow-execution.consumer.test.js dist/apps/api/src/modules/events/consumers/operational-workflow-completed.consumer.test.js`
- Attempted: `npm.cmd run test:tenant-isolation` blocked before assertions by missing `DATABASE_URL`.
- `npm.cmd --prefix apps/web run test:design -- class-dean-command-centers.test.tsx academic-command-centers.test.tsx student-support-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd run web:lint`
- `npm.cmd run build`
- `npm.cmd --prefix apps/web run test:design -- boarding-master-command-center.test.tsx class-dean-command-centers.test.tsx student-support-command-centers.test.tsx finance-security-command-centers.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd run web:lint`
- `npm.cmd run build`
- `npm.cmd --prefix apps/web run test:design -- operational-modules-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx finance-security-command-centers.test.tsx role.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- dashboard-action-contract.test.ts dashboard-production-readiness.test.tsx principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx academic-office-production-readiness.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- front-office-finance-production-readiness.test.tsx operational-modules-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx experience-actions.test.tsx academic-parent-portal-upgrade.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- finance-security-command-centers.test.tsx student-support-command-centers.test.tsx boarding-master-command-center.test.tsx module-readiness.test.ts universal-form-table-system.test.tsx`
- `npm.cmd run web:lint`
- `npm.cmd run build`
- `npm.cmd --prefix apps/web run test:design -- operational-modules-production-readiness.test.tsx front-office-finance-production-readiness.test.tsx dashboard-production-readiness.test.tsx`
- `npm.cmd --prefix apps/web run test:design -- role.test.tsx`
- `npm.cmd run web:lint`
- `npm.cmd run build`

Result:

- Design regression subset: 47 passed / 47.
- Expanded focused design regression subset: 61 passed / 61.
- Expanded focused design regression subset after parent portal copy hardening: 62 passed / 62.
- Parent portal proof-based report action subset: 8 passed / 8.
- Portal/platform command-center regression after linked-learner and reset-bundle hardening: 13 passed / 13.
- Guard/portal subset after global phrase guard expansion: 35 passed / 35.
- Expanded focused design regression subset after linked-learner and reset-bundle hardening: 63 passed / 63.
- Shared operational form print/source guard subset: 10 passed / 10.
- Expanded focused design regression subset with shared operational form print coverage: 70 passed / 70.
- Accountant/Class Teacher/Principal weak-feedback regression subset: 16 passed / 16.
- Expanded focused design regression subset with class-teacher coverage: 78 passed / 78.
- Portal route/statement weak-feedback regression subset: 28 passed / 28.
- Expanded focused design regression subset with portal statement coverage: 90 passed / 90.
- Finance intelligence / parent quick-action weak-feedback regression subset: 21 passed / 21.
- Finance/exams/security search-selection weak-feedback regression subset: 21 passed / 21.
- Expanded focused design regression subset with finance intelligence and parent quick-action coverage: 91 passed / 91.
- Expanded focused design regression subset after search-selection hardening: 91 passed / 91.
- Class teacher / Dean search-selection weak-feedback regression subset: 10 passed / 10.
- Expanded focused design regression subset after academic search-selection hardening: 91 passed / 91.
- Support-role search-selection weak-feedback regression subset: 8 passed / 8.
- Expanded focused design regression subset with support-role search coverage: 96 passed / 96.
- HOD/Grade Master search-selection weak-feedback regression subset: 5 passed / 5.
- Expanded focused design regression subset with HOD/Grade search coverage: 98 passed / 98.
- Discipline search-selection weak-feedback regression subset: 7 passed / 7.
- Expanded focused design regression subset with discipline search coverage: 98 passed / 98.
- Deputy search-selection weak-feedback regression subset: 4 passed / 4.
- Expanded focused design regression subset with deputy search coverage: 98 passed / 98.
- Exams marks-entry weak-feedback regression subset: 17 passed / 17.
- Expanded focused design regression subset with marks-entry coverage: 98 passed / 98.
- Dean/Grade/HOD/Registrar action evidence regression subset: 16 passed / 16.
- Expanded focused design regression subset after academic/admissions action evidence hardening: 98 passed / 98.
- Web lint after academic/admissions action evidence hardening: passed.
- TypeScript build after academic/admissions action evidence hardening: passed.
- Boarding/Class/Counselling/Admissions/Security action evidence regression subset: 19 passed / 19.
- Expanded focused design regression subset after boarding/support/security evidence hardening: 98 passed / 98.
- Web lint after boarding/support/security evidence hardening: passed.
- TypeScript build after boarding/support/security evidence hardening: passed.
- Shared operational clinic/admissions/finance/discipline/counselling evidence regression subset: 40 passed / 40.
- Expanded focused design regression surface after shared operational evidence hardening: passed as split batches, 98 passed / 98.
- Web lint after shared operational evidence hardening: passed.
- TypeScript build after shared operational evidence hardening: passed.
- Shared operational report/export evidence regression subset: 13 passed / 13.
- Broad role dashboard regression after report/export evidence hardening: 23 passed / 23.
- Web lint after report/export evidence hardening: passed.
- TypeScript build after report/export evidence hardening: passed.
- Portal/platform plus parent academics subset: 16 passed / 16.
- Operational module production readiness: 8 passed / 8.
- Security/finance command centers: 4 passed / 4.
- Module readiness truth levels: 10 passed / 10.
- Web lint: passed.
- TypeScript build: passed.
- Focused backend tenant/workflow/security subset: 37 passed / 37.
- Tenant isolation source/schema audit: passed and wrote `docs/security/implementation10-security-audit.md`.
- Focused backend daily-operations API sweep: 242 passed / 242.
- Tenant isolation integration suite: not executed to assertions because `DATABASE_URL` is not configured.

## Remaining Risks

- This is a priority-surface implementation and regression pass, not a complete proof that every active button in every dashboard is production-ready.
- `role-operational-command-center.tsx` remains a large shared surface; a full module-by-module extraction would reduce future regression risk.
- Some frontend workflows are still verified through the local school operational store and print/export helpers even where backend domain services now have focused tests; every individual button still needs an explicit action-to-endpoint contract before a full production claim.
- Security Officer is now covered by dedicated command-center regression tests and visitors/security backend smoke coverage, but deeper live endpoint and permission tests are still needed before production scale.
- Full tenant isolation integration tests were attempted but did not run assertions because `DATABASE_URL` is missing in this shell.
- Full app TypeScript build was rerun and passed.

## Backend/Config Still Needed Before Full Production Claim

- SMS provider credentials and queue scaling for high-volume school messaging.
- Durable backend APIs for all local-store operational workflows: clinic, library, inventory, boarding, discipline, counselling, transport, lab, visitors/security.
- Full finance/admissions/exams production service tests for every approval, publish, reversal, class allocation, and report artifact path.
- Parent/student linked-identity enforcement at API level for every portal query.
- Super Admin live platform actions for suspend/reactivate/configure SMS/email/invite/tenant logs with permission and confirmation tests.
- End-to-end tenant isolation tests across school A/school B data boundaries.
