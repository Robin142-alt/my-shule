# Implementation 142: Extreme Frontend ERP Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use `codex-security:security-scan` before changing authentication, tenant isolation, finance/payment visibility, health records, counselling records, discipline records, visitor/security workflows, export controls, or search permissions.

**Goal:** Implement the full `MYSHULE EXTREME FRONTEND ERP RECONSTRUCTION MASTER PROMPT.docx` as a practical Kenyan school ERP frontend where every role has a focused command center, every dashboard is action-first, and every workflow is executable, audited, capability-aware, and resilient.

**Architecture:** Keep MyShule as a fixed-shell, role-based, capability-governed ERP. Dashboards render static workspace layouts and consume typed operational blueprints, scoped search contracts, workflow bindings, widget states, and backend execution proxies. Modules provide data/actions; dashboards never directly own module logic.

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS/system theme tokens, Jest design tests, Playwright/Browser QA, NestJS API proxies, Vercel frontend deployment, Railway backend readiness checks.

---

## Non-Negotiable Product Decisions

- **No long-page dashboards.** Sidebar navigation switches isolated workspaces. Main content changes; sidebar and topbar stay fixed.
- **Operations first.** First viewport shows urgent actions, workflow inbox, execution queues, approvals, escalations, failed operations, and operational alerts before analytics.
- **System theme only.** Use existing MyShule theme tokens, typography, cards, borders, surfaces, and semantic colors. Do not introduce random palettes.
- **No fake buttons.** Every button has an action contract. Missing backend handlers render `DEGRADED` with retry/fallback, never decorative success.
- **No silent failures.** Every widget, page, table, form, modal, queue, and button supports visible loading, empty, success, error, degraded, permission denied, validation failed, retry, and offline/draft states where useful.
- **Global search is restricted.** Full global search is only for Principal, Deputy Principal, Secretary/Receptionist, and Accountant. All other roles get scoped search only.
- **Kenyan school reality is mandatory.** Use Kenyan sample data and workflows: `Brian Otieno`, `MYS/2026/001`, `07XXXXXXXX`, `QEX7ABC123`, `Grade 7 East`, `Term 1`, `KES 18,500`, M-Pesa, SMS, receipts, admission letters, class lists, printed reports, low-bandwidth recovery.

---

## Current Repo Starting Point

The repo already contains partial foundations that must be completed, not replaced:

- `apps/web/src/lib/operational/myshule-extreme-operating-system.ts` contains a DOCX contract and role/module blueprint skeleton.
- `apps/web/src/lib/operational/extreme-erp-blueprints.ts` contains added operational modules such as School Admin, HR/Payroll, Timetable Builder, Communication Center, Procurement, Calendar, Meals, Co-curricular, Data Security, Setup Wizard, ICT Assets, Document Printing, Reports, and Universal Approvals.
- `apps/web/src/components/system/app-topbar.tsx` already has search, quick actions, urgent action counter, sync badge, and profile context.
- `apps/web/src/components/school/*command-center.tsx` contains many role-specific command centers but coverage and action binding are uneven.
- `apps/web/src/components/workflows/approval-command-panel.tsx` and `apps/web/src/lib/workflows/workflow-catalog.ts` contain the first operational workflow execution path.
- `apps/web/tests/design/extreme-docx-operating-system.test.ts`, `extreme-erp-reconstruction.test.tsx`, and `global-school-search.test.tsx` already assert part of the DOCX contract.

Implementation 142 completes the remaining DOCX coverage and hardens it with tests so the system cannot drift back into passive dashboards.

---

## File Structure

### Create

- `apps/web/src/lib/search/search-access-policy.ts` - role-aware search modes, allowed entity scopes, and action visibility.
- `apps/web/src/lib/search/operational-search-registry.ts` - typed entity registry for students, parents, staff, receipts, M-Pesa, visitors, books, buses, documents, incidents, inventory, and role-scoped entities.
- `apps/web/src/lib/search/operational-search-resolver.ts` - filters search results by role, tenant context, ownership, workspace, and capabilities.
- `apps/web/src/components/operational/operational-action-button.tsx` - shared action button with health states, confirmation, loading, retry, and fallback display.
- `apps/web/src/components/operational/operational-queue.tsx` - executable queue component with row actions, SLA, owner, bulk actions, and audit affordance.
- `apps/web/src/components/operational/operational-table.tsx` - standard table shell with search, filters, sort, column visibility, pagination, row actions, bulk actions, export, print, loading, empty, and error states.
- `apps/web/src/components/operational/operational-form-shell.tsx` - governed form wrapper with standard footer, draft state, validation state, submit, print, SMS, and approval actions.
- `apps/web/src/components/operational/right-details-drawer.tsx` - persistent drawer for detail, comments, attachments, history, workflow state, and audit trail.
- `apps/web/src/components/operational/operational-state-panel.tsx` - reusable loading/empty/error/degraded/locked/failed/retry/offline panels.
- `apps/web/tests/design/search-access-policy.test.ts`
- `apps/web/tests/design/role-dashboard-structure.test.tsx`
- `apps/web/tests/design/operational-action-contract.test.tsx`
- `apps/web/tests/design/universal-form-table-system.test.tsx`
- `apps/web/tests/design/mobile-low-bandwidth.test.tsx`

### Modify

- `apps/web/src/components/system/app-topbar.tsx` - replace broad hardcoded search with role-aware resolver and role-scoped result actions.
- `apps/web/src/components/school/erp-shell.tsx` - pass role, school, term/year, search mode, quick actions, urgent count, and sync state into topbar.
- `apps/web/src/components/platform/platform-shell.tsx` - platform search for Super Admin/System Monitor only.
- `apps/web/src/components/portal/portal-shell.tsx` - parent/student self-only search.
- `apps/web/src/components/school/school-pages.tsx` - render all added module workspaces and route them through blueprint + operational primitives.
- `apps/web/src/lib/experiences/school-data.ts` - complete role navigation, sidebar grouping, labels, and scoped quick actions.
- `apps/web/src/lib/routing/experience-routes.ts` - add missing role/module routes and route aliases.
- `apps/web/src/lib/module-access/module-access-map.ts` - complete module entitlement codes for all DOCX modules.
- `apps/web/src/lib/features/module-readiness.ts` - mark completed modules production-ready only after their tests pass.
- `apps/web/src/lib/workflows/workflow-catalog.ts` - add missing operational workflows and action contracts.
- `apps/web/src/lib/workflows/operational-workflow-client.ts` - ensure failures return visible action states.
- All role command centers under `apps/web/src/components/school/*command-center.tsx` - replace passive sections with operational primitives and ensure role-specific structure.

---

## Search Governance Matrix

| Role | Search Mode | Allowed Entities | Forbidden Entities |
| --- | --- | --- | --- |
| Principal | `GLOBAL_EXECUTIVE` | Students, parents, staff, classes, fees, receipts, invoices, M-Pesa, exams, assignments, incidents, books, inventory, buses, routes, visitors, admissions, documents, reports, audit summaries | Raw secrets, unrelated tenants |
| Deputy Principal | `GLOBAL_OPERATIONS` | Students, staff, classes, attendance, timetable, discipline, boarding, security, incidents, transport, parent escalations | Finance ledgers unless permitted, platform tenant data |
| Secretary / Receptionist | `GLOBAL_FRONT_OFFICE` | Students, parents, visitors, admissions, appointments, documents, receipts, messages, parent contacts | Payroll, private counselling notes, platform settings |
| Accountant | `GLOBAL_FINANCE` | Students, parents, invoices, receipts, balances, M-Pesa, banks, waivers, payroll summaries, finance reports | Counselling notes, medical details, platform tenant data |
| Teacher | `ROLE_SCOPED` | Assigned classes, assigned students, subjects, lessons, assignments, marks, parent contacts for assigned learners | Whole-school finance, unrelated classes, private case notes |
| Class Teacher | `ROLE_SCOPED` | Own class roster, parents, attendance, welfare flags, discipline follow-ups, assignments, reports | Other classes, finance-wide records, private medical/counselling details unless referred |
| Grade/Form Master | `ROLE_SCOPED` | Assigned grade streams, class teachers, students, attendance, discipline, performance, parent escalations | Other grades, finance ledger, platform settings |
| HOD | `ROLE_SCOPED` | Department teachers, subjects, classes, syllabus, exams, lesson plans, performance | Other departments, finance ledger, private welfare notes |
| Dean of Academics | `ROLE_SCOPED` | Exams, classes, subjects, report batches, moderation queues, curriculum compliance | Fee records, medical/counselling records, publishing controls |
| Exams Manager | `ROLE_SCOPED` | Exams, marksheets, grading, timetable, report drafts, validation errors | Principal approval override, parent publishing, finance records |
| Nurse | `SENSITIVE_SCOPED` | Permitted student medical profiles, clinic visits, medicine, referrals, parent health notifications | Finance, discipline punishment notes, unrelated students |
| Guidance & Counselling | `SENSITIVE_SCOPED` | Assigned welfare cases, referrals, appointments, emergency cases, parent meetings | Finance ledger, unrelated case files, raw public search |
| Discipline Master | `SENSITIVE_SCOPED` | Incident reports, discipline profiles, dorm cases, bullying reports, parent meetings, counselling referrals | Medical details unless referred, finance ledger, unrelated case notes |
| Librarian | `MODULE_SCOPED` | Books, borrowers, library cards, overdue items, returns, fines | Medical, finance ledger, discipline notes |
| Parent | `SELF_ONLY` | Own children, fees, attendance, assignments, report cards, messages, transport, documents | Other students, staff records, internal notes |
| Student | `SELF_ONLY` | Own timetable, assignments, exams, results, library, notices, profile | Other students, finance operations, staff data |
| Storekeeper | `MODULE_SCOPED` | Inventory, suppliers, stock requests, receipts, issues, damaged items | Student private records, finance ledger |
| Boarding Master | `MODULE_SCOPED` | Boarding students, dorms, bed allocations, leave-outs, night attendance, dorm incidents | Day-only students unless assigned, finance ledger |
| Security Officer | `MODULE_SCOPED` | Visitors, gate passes, student exits, staff exits, vehicles, security incidents | Finance, medical, private counselling |
| Transport Manager | `MODULE_SCOPED` | Routes, buses, drivers, assigned students, stops, trips, maintenance, incidents | Whole-school student records beyond transport assignment |
| Laboratory Technician | `MODULE_SCOPED` | Lab sessions, chemicals, apparatus, breakages, practical exams, safety logs | Finance ledger, student private notes |
| Admissions Officer / Registrar | `MODULE_SCOPED` | Inquiries, applications, guardians, documents, interviews, admitted students, letters | Existing confidential student cases unrelated to admission |
| Super Admin | `PLATFORM` | Tenants, schools, users, modules, billing status, integrations, system health, audit events | Tenant data contents unless explicitly impersonating with audit |
| System Monitor | `PLATFORM_HEALTH` | Services, queues, event bus, failed jobs, deployments, SMS/M-Pesa callbacks, logs, backups | Student PII, parent PII, secrets |
| HR / Payroll | `ROLE_SCOPED` | Staff, leave, attendance, payroll, payslips, appraisals, contracts, duties | Student private records, medical/counselling cases |
| School Administrator | `ROLE_SCOPED` | School profile, users, roles, classes, streams, terms, fee setup, SMS rules, workflow rules | Tenant platform controls, raw secrets |

---

## Role Dashboard Structure Matrix

Each role must have: fixed shell, scoped search, urgent action strip, workflow inbox, execution queues, operational table, governed forms, right details drawer, audit activity, print/SMS where relevant, and supporting analytics at the bottom.

### Principal

- **Sidebar:** Dashboard, Academics, Finance, Students, Staff, Discipline, Attendance, Communication, Transport, Inventory, Reports, Compliance, Users & Roles, School Settings, Billing & Subscription, Audit Logs.
- **First viewport:** Greeting, school health, pending approvals, critical risks, executive KPIs.
- **Queues:** Results approval, budget approval, procurement approval, student transfer approval, audit exceptions.
- **Actions:** Approve Results, Approve Budget, Send Announcement, Invite Staff, Configure M-Pesa, Generate Board Report, Open Incident Center.
- **Drawer:** Approval evidence, comments, audit chain, related events, impacted modules.

### Deputy Principal

- **Sidebar:** Dashboard, Attendance, Discipline, Staff Coverage, Timetable, Boarding, Security, Teacher Reports, Parent Escalations, Operations Reports, Settings.
- **First viewport:** Absent teachers, uncovered lessons, discipline escalations, attendance exceptions, boarding/security alerts.
- **Queues:** Class coverage, discipline escalation, timetable conflict, boarding incident, parent escalation.
- **Actions:** Assign Substitute, Escalate Case, Notify Parent, Resolve Conflict, Open Security Incident, Generate Daily Report.

### Secretary / Receptionist

- **Sidebar:** Dashboard, Student Lookup, Admissions, Visitors, Parents, Documents, Appointments, Messages, Receipts, Printing, Reports, Settings.
- **First viewport:** Front-office queue, visitors on campus, parent requests, missing documents, appointments, print queue.
- **Queues:** Visitor check-in/out, parent request, admission follow-up, document request, SMS retry.
- **Actions:** Register Visitor, Print Letter, Send Parent SMS, Update Parent Phone, Record Inquiry, Book Appointment.

### Accountant

- **Sidebar:** Dashboard, Payments, M-Pesa, Invoices, Receipts, Balances, Arrears, Waivers, Payroll, Bank Reconciliation, Reports, Finance Settings.
- **First viewport:** Failed payment reconciliation, fee exceptions, arrears actions, receipt queue, M-Pesa callback monitor.
- **Queues:** Payment reconciliation, waiver approval, receipt resend, arrears follow-up, payroll exception.
- **Actions:** Record Payment, Reconcile M-Pesa, Print Receipt, Send Fee Reminder, Approve Waiver, Export Statement.

### Teacher

- **Sidebar:** Dashboard, My Lessons, Attendance, Assignments, Marks Entry, Lesson Plans, Class Notes, Parent Messages, Reports, Settings.
- **First viewport:** Today’s lessons, attendance not marked, assignments to grade, marks pending, parent messages.
- **Queues:** Attendance submission, assignment grading, marks entry, lesson plan submission, parent response.
- **Actions:** Mark Attendance, Upload Assignment, Enter Marks, Submit Lesson Plan, Send Parent Message, Add Class Note.

### Class Teacher

- **Sidebar:** Dashboard, My Class, Attendance, Academic Performance, Assignments, Discipline, Parent Communication, Student Welfare, Timetable, Reports, Announcements, Documents, Settings.
- **First viewport:** Class follow-ups, absentees, students needing attention, missing assignments, unread parent messages.
- **Queues:** Chronic absentee follow-up, welfare referral, discipline follow-up, missing assignment, parent communication.
- **Actions:** Message Parent, Record Note, Mark Concern, Refer Counsellor, Generate Class Report, Post Announcement.

### Grade / Form Master

- **Sidebar:** Dashboard, Streams & Classes, Attendance Oversight, Discipline Oversight, Academic Monitoring, Teachers Coordination, Student Welfare, Parent Escalations, Performance Analytics, Meetings, Reports, Settings.
- **First viewport:** Grade urgent actions, stream risk, teacher follow-ups, parent escalations, attendance/discipline anomalies.
- **Queues:** Stream attendance issue, class teacher report, parent escalation, intervention meeting, academic risk review.
- **Actions:** Notify Class Teacher, Schedule Meeting, Escalate Parent Case, Compare Streams, Generate Grade Report.

### HOD

- **Sidebar:** Dashboard, Teachers, Subjects, Syllabus Coverage, Exams & Performance, Lesson Plans, Attendance Analysis, Resources, Meetings, Student Analytics, Timetable, Compliance, Communication, Settings.
- **First viewport:** Lesson plan reviews, syllabus delays, weak subject alerts, teacher submissions, meeting actions.
- **Queues:** Lesson plan approval, syllabus recovery, assessment submission, resource request, teacher follow-up.
- **Actions:** Approve Lesson Plan, Return Plan, Assign Teacher, Send Department Notice, Schedule Meeting, Generate HOD Report.

### Dean of Academics

- **Sidebar:** Overview, Pending Reviews, Exam Moderation, Report Card Approval, Grading Integrity, Teacher Submission Review, Academic Alerts, Curriculum Compliance, Approval History.
- **First viewport:** Exams awaiting Dean review, report-card batches, integrity anomalies, missing marks, submission delays.
- **Queues:** Exam review, report-card batch review, grading anomaly, curriculum compliance issue.
- **Actions:** Approve Batch, Reject Batch, Return for Correction, Request Reprocessing, Open Integrity Scan.
- **Forbidden:** Publish results, edit marks, override Principal.

### Exams Manager

- **Sidebar:** Overview, Exam Builder, Timetable Scheduler, Marks Entry Hub, Grade Processing, Report Card Drafts, Submission Tracker, Data Validation, Export Center, Archive.
- **First viewport:** Active exam workflows, missing marks, draft reports, validation failures, send-to-Dean queue.
- **Queues:** Missing marks, invalid grade range, draft report generation, timetable conflict, Dean submission.
- **Actions:** Create Exam, Upload Marks, Process Grades, Generate Draft Reports, Validate Data, Send to Dean.
- **Forbidden:** Approve report cards, publish results.

### Nurse / Clinic

- **Sidebar:** Dashboard, Sick Bay Visits, Medicine Inventory, Student Medical Profiles, Emergencies, Referrals, Parent Notifications, Reports, Settings.
- **First viewport:** Current sick bay students, emergency cases, medicine low-stock, follow-up visits, parent notifications.
- **Queues:** Clinic visit, medicine refill, referral, parent notification, emergency intervention.
- **Actions:** Log Visit, Dispense Medicine, Notify Guardian, Refer Clinic/Hospital, Print Medical Note.

### Guidance & Counselling

- **Sidebar:** Dashboard, Student Cases, Appointments, Discipline Referrals, Wellness Analytics, Parent Meetings, Emergency Cases, Mental Health Tracking, AI Insights, Reports, Settings.
- **First viewport:** Critical welfare alerts, high-risk students, today’s sessions, referrals, parent meetings.
- **Queues:** Urgent intervention, counselling session, teacher referral, parent meeting, follow-up overdue.
- **Actions:** Start Session, Add Notes, Escalate Emergency, Notify Principal, Schedule Parent Meeting.

### Discipline Master

- **Sidebar:** Dashboard, Incident Reports, Student Discipline Profiles, Prefects Reports, Dormitory Cases, Bullying Reports, Suspensions, Parent Meetings, Counselling Referrals, Behaviour Analytics, Teacher Complaints, Reports, Settings.
- **First viewport:** Live incidents, high-risk students, repeat offenders, bullying alerts, parent meetings, counselling referrals.
- **Queues:** Incident review, suspension review, bullying investigation, parent contact, counselling referral.
- **Actions:** Record Case, Notify Parent, Refer Counsellor, Print Discipline Slip, Escalate to Deputy, Mark Resolved.

### Librarian

- **Sidebar:** Dashboard, Book Catalogue, Borrowing, Returns, Overdue Books, Fines, Lost Books, Library Cards, Reports, Settings.
- **First viewport:** Due returns, overdue books, scan issue/return panel, lost/damaged books, borrower alerts.
- **Queues:** Overdue return, lost book, fine follow-up, damaged book, catalogue update.
- **Actions:** Scan Issue, Scan Return, Send Reminder, Print Library Card, Record Lost Book, Export Report.

### Parent

- **Sidebar:** Dashboard, My Children, Fees, Results, Attendance, Assignments, Messages, Transport, Discipline, Health, Documents, Settings.
- **First viewport:** Child alerts, fee balance/payment, latest attendance, school messages, assignment/report updates.
- **Queues:** Unread notice, fee payment, meeting request, document download, transport alert.
- **Actions:** Pay Fees, Download Report Card, Message School, View Fee Statement, Confirm Meeting.

### Student

- **Sidebar:** Dashboard, Timetable, Assignments, Exams, Results, Library, Notices, Fees View, Profile, Settings.
- **First viewport:** Today’s lessons, assignments due, exam reminders, library due dates, notices.
- **Queues:** Assignment due, library return, exam preparation notice, unread announcement.
- **Actions:** Open Assignment, View Timetable, Download Result, View Library Due Date.

### Storekeeper

- **Sidebar:** Dashboard, Stock Room, Stock Requests, Receipts, Issues, Suppliers, Low Stock, Damaged Items, Procurement Links, Reports, Settings.
- **First viewport:** Low stock, pending requests, stock issue approvals, supplier follow-ups, damaged items.
- **Queues:** Stock request, stock receipt, stock issue, reorder suggestion, damage report.
- **Actions:** Issue Stock, Receive Stock, Request Procurement, Print Stock Card, Mark Damaged, Export Movement.

### Boarding Master

- **Sidebar:** Dashboard, Dormitories, Bed Allocation, Night Attendance, Leave Outs, Dorm Incidents, Health/Welfare, Parent Communication, Reports, Settings.
- **First viewport:** Missing students, night attendance, dorm incidents, leave-outs, welfare follow-ups.
- **Queues:** Leave-out approval, missing student, dorm incident, bed allocation, parent contact.
- **Actions:** Mark Night Attendance, Approve Leave-Out, Assign Bed, Notify Parent, Escalate Incident.

### Security Officer

- **Sidebar:** Dashboard, Visitor Log, Gate Passes, Student Exit, Staff Exit, Vehicle Log, Incidents, Emergency Alerts, Reports, Settings.
- **First viewport:** Visitors on campus, pending exits, unauthorized access alerts, vehicle movement, emergency actions.
- **Queues:** Visitor check-in/out, gate pass verification, student exit, incident report, emergency escalation.
- **Actions:** Register Visitor, Verify Gate Pass, Log Vehicle, Report Incident, Call Admin, Print Visitor Badge.

### Transport Manager

- **Sidebar:** Dashboard, Fleet Management, Routes & Stops, Student Allocation, Drivers, Fuel, Maintenance, Trip Monitoring, Transport Attendance, GPS Tracking, Parent Notifications, Incidents, Compliance, Reports, Settings.
- **First viewport:** Active trips, delayed routes, missed pickups, vehicle maintenance, parent notification queue.
- **Queues:** Route delay, missed pickup, maintenance, driver issue, parent alert.
- **Actions:** Assign Route, Send Route SMS, Log Fuel, Schedule Maintenance, Record Incident, Print Manifest.

### Laboratory Technician

- **Sidebar:** Dashboard, Practical Schedule, Lab Requests, Chemicals, Apparatus, Inventory, Breakages, Safety Logs, Maintenance, Practical Exams, Reports, Settings.
- **First viewport:** Practical sessions today, missing apparatus, dangerous chemical alerts, breakage records, safety inspections.
- **Queues:** Practical setup, chemical reorder, apparatus issue, breakage approval, safety inspection.
- **Actions:** Mark Lab Ready, Deduct Chemical Stock, Record Breakage, Print Practical Sheet, Request Procurement, Log Safety Check.

### Admissions Officer / Registrar

- **Sidebar:** Dashboard, Inquiries, Applications, Document Verification, Interviews, Admission Decisions, Student Registration, Parent Contacts, Printing, Reports, Settings.
- **First viewport:** New inquiries, pending applications, missing documents, admission decisions, parent follow-ups, letters to print.
- **Queues:** Inquiry follow-up, document verification, interview scheduling, admission decision, registration.
- **Actions:** Record Inquiry, Verify Document, Approve Admission, Reject Application, Print Admission Letter, Send Parent SMS.

### Super Admin

- **Sidebar:** Dashboard, Schools, Tenants, Modules, Billing Control, Users, SMS Configuration, Daraja Configuration, Support, System Health, Deployments, Audit Logs, Settings.
- **First viewport:** Tenant health, schools requiring action, manual billing status, module changes, failed integrations, platform alerts.
- **Queues:** Tenant setup, module entitlement, billing status update, support escalation, integration issue.
- **Actions:** Create School, Enable Module, Set Billing Status, Configure SMS, Configure Daraja, View Audit.

### System Monitor

- **Sidebar:** Dashboard, API Health, Failed Jobs, Event Bus, Queues, SMS Monitor, M-Pesa Callbacks, Deployments, Logs, Alerts, Backups, Security, Reports.
- **First viewport:** Critical system alerts, failed jobs, queue backlog, event consumer failures, SMS/M-Pesa failures, readiness status.
- **Queues:** Failed job, event replay, queue retry, callback failure, backup verification.
- **Actions:** Retry Job, Replay Event, Open Logs, Acknowledge Alert, Trigger Backup Check.

### HR / Payroll

- **Sidebar:** Dashboard, Staff Records, Leave Requests, Attendance, Payroll, Payslips, Appraisals, Contracts, Duties, Reports, Settings.
- **First viewport:** Leave approvals, payroll exceptions, attendance gaps, contract expiries, appraisal follow-ups.
- **Queues:** Leave request, payroll exception, contract renewal, appraisal, duty allocation.
- **Actions:** Approve Leave, Assign Cover, Generate Payslip, Update Contract, Send Staff Notice.

### School Administrator

- **Sidebar:** Dashboard, School Profile, Users, Roles, Classes, Streams, Terms, Fee Setup, SMS Rules, Documents, Workflow Rules, Settings.
- **First viewport:** Setup gaps, role requests, class/stream setup issues, fee structure changes, SMS rule status, workflow configuration alerts.
- **Queues:** User setup, role assignment, class setup, fee setup, SMS rule review, workflow rule approval.
- **Actions:** Invite User, Assign Role, Create Stream, Configure Fee Structure, Configure SMS Rule, Update Workflow Rule.

---

## Expanded Role Action Catalog

These actions must be represented in the role blueprints, quick-action menus where appropriate, workflow queues, and button/action contracts. Actions that are not executable yet must render as `DEGRADED` with retry/fallback and audit visibility, never as decorative buttons.

### Principal Actions

- Approve Results
- Return Results for Correction
- Approve Budget
- Reject Budget Request
- Approve Procurement
- Escalate Critical Incident
- Send Whole-School Announcement
- Send Emergency Broadcast
- Invite Staff
- Suspend User Account
- Assign Senior Role
- Configure M-Pesa
- View Audit Trail
- Generate Board Report
- Open Compliance Review
- Request Department Report
- Approve Student Transfer
- Review Finance Anomaly

### Deputy Principal Actions

- Assign Substitute Teacher
- Resolve Timetable Conflict
- Escalate Discipline Case
- Approve Student Exit
- Notify Parent
- Call Student
- Record Teacher Complaint
- Create Operations Note
- Schedule Staff Briefing
- Open Dormitory Incident
- Trigger Security Follow-Up
- Generate Daily Operations Report
- Mark Case Resolved
- Return Case for More Evidence
- Assign Case Owner
- Send Teacher Reminder

### Secretary / Receptionist Actions

- Register Visitor
- Check Out Visitor
- Print Visitor Badge
- Record Parent Inquiry
- Update Parent Phone
- Book Appointment
- Send Parent SMS
- Print Admission Letter
- Print Student Profile
- Upload Document
- Verify Document
- Create Front-Office Note
- Route Request to Principal
- Route Request to Accountant
- Retry Failed SMS
- Search Student Record
- Print Class List
- Archive Completed Request

### Accountant Actions

- Record Payment
- Reconcile M-Pesa
- Reverse Payment
- Print Receipt
- Send Receipt to Parent
- Send Fee Reminder
- Generate Fee Statement
- Approve Waiver
- Reject Waiver
- Create Invoice
- Allocate Payment
- Flag Suspicious Transaction
- Export Arrears Report
- Review Payroll Exception
- Open Bank Reconciliation
- Retry Callback Verification
- Lock Finance Period
- Generate Finance Summary

### Teacher Actions

- Mark Attendance
- Mark Bulk Present
- Upload Assignment
- Grade Assignment
- Enter Marks
- Save Marks Draft
- Submit Marks
- Submit Lesson Plan
- Add Class Note
- Send Parent Message
- Request Counselling Referral
- Record Behaviour Note
- Print Lesson Sheet
- Download Class List
- Reschedule Lesson
- Report Missing Learner

### Class Teacher Actions

- Message Parent
- Record Student Note
- Mark Student Concern
- Refer to Counsellor
- Record Discipline Follow-Up
- Create Welfare Follow-Up
- Generate Class Report
- Print Class List
- Post Class Announcement
- Track Missing Assignment
- Mark Absence Reason
- Escalate Chronic Absenteeism
- Schedule Parent Meeting
- Download Attendance Summary
- Open Student Profile
- Add Guardian Update Request

### Grade / Form Master Actions

- Compare Streams
- Notify Class Teacher
- Schedule Grade Meeting
- Escalate Parent Case
- Assign Intervention Owner
- Review Stream Attendance
- Review Stream Discipline
- Review Stream Performance
- Generate Grade Report
- Send Grade Announcement
- Open Risk Student List
- Approve Intervention Plan
- Return Teacher Report
- Record Meeting Action
- Export Stream Comparison

### HOD Actions

- Approve Lesson Plan
- Return Lesson Plan
- Assign Teacher
- Reassign Subject
- Send Department Notice
- Schedule Department Meeting
- Review Syllabus Coverage
- Create Recovery Plan
- Review Assessment Submission
- Approve Department Resource Request
- Generate HOD Report
- Open Subject Analytics
- Flag Weak Topic
- Request Teacher Explanation
- Export Department Performance

### Dean of Academics Actions

- Open Exam Review
- Approve Exam Batch
- Reject Exam Batch
- Return for Correction
- Approve Report Card Batch
- Request Report Reprocessing
- Open Integrity Scan
- Flag Grading Anomaly
- Request Teacher Submission
- Review Curriculum Compliance
- Add Review Comment
- Send to Principal Approval
- View Approval History
- Export Moderation Report
- Escalate Academic Risk

### Exams Manager Actions

- Create Exam
- Edit Exam
- Schedule Exam
- Resolve Exam Clash
- Upload Marks
- Open Marks Entry
- Process Grades
- Validate Data
- Generate Draft Report Cards
- Request Missing Marks
- Send to Dean Review
- Export Marksheet
- Reprocess Drafts
- Archive Exam
- Open Submission Tracker
- Flag Invalid Grade Range

### Nurse / Clinic Actions

- Log Sick Bay Visit
- Add Medical Note
- Dispense Medicine
- Record Medicine Stock Use
- Notify Guardian
- Refer to Hospital
- Create Follow-Up Visit
- Mark Emergency Case
- Print Medical Note
- Update Allergy Record
- Request Medicine Reorder
- Record Clinic Incident
- Close Visit
- Escalate Health Concern
- Export Clinic Report

### Guidance & Counselling Actions

- Start Session
- Add Confidential Notes
- Schedule Follow-Up
- Escalate Emergency
- Notify Principal
- Contact Guardian
- Refer to Clinic
- Create Parent Meeting
- Mark Case Monitoring
- Close Case
- Reopen Case
- Record Teacher Referral
- Review Anonymous Report
- Generate Welfare Summary
- Open Risk Trend

### Discipline Master Actions

- Record Incident
- Add Evidence
- Notify Parent
- Print Discipline Slip
- Refer to Counsellor
- Escalate to Deputy
- Assign Investigation Owner
- Mark Case Resolved
- Schedule Parent Meeting
- Suspend Student Request
- Record Prefect Report
- Review Repeat Offender
- Log Bullying Case
- Generate Discipline Report
- Add Positive Behaviour Note

### Librarian Actions

- Scan Issue Book
- Scan Return Book
- Register Book
- Mark Book Lost
- Mark Book Damaged
- Send Overdue Reminder
- Print Library Card
- Add Fine
- Waive Fine Request
- Reserve Book
- Update Catalogue
- Export Borrowing Report
- Open Borrower Profile
- Bulk Notify Borrowers
- Archive Old Record

### Parent Actions

- Pay Fees
- Download Report Card
- View Fee Statement
- Message School
- Confirm Meeting
- View Attendance
- View Assignment
- View Transport Alert
- Download Receipt
- Update Contact Request
- Submit Absence Reason
- View Discipline Notice
- View Health Notice
- Acknowledge Announcement

### Student Actions

- Open Assignment
- Submit Assignment
- View Timetable
- View Result
- Download Result
- View Library Due Date
- Read Notice
- Mark Notice Read
- View Exam Timetable
- Open Study Material
- Request Library Renewal
- View Profile

### Storekeeper Actions

- Issue Stock
- Receive Stock
- Request Procurement
- Print Stock Card
- Mark Damaged
- Mark Lost
- Approve Stock Issue
- Reject Stock Issue
- Add Supplier
- Update Batch
- Record Stock Count
- Flag Unusual Reduction
- Export Movement Report
- Open Audit Trail
- Retry Inventory Sync

### Boarding Master Actions

- Mark Night Attendance
- Approve Leave-Out
- Reject Leave-Out
- Assign Bed
- Transfer Bed
- Notify Parent
- Escalate Dorm Incident
- Record Dorm Incident
- Create Welfare Follow-Up
- Print Dorm List
- Log Missing Student
- Close Leave-Out
- Schedule Dorm Inspection
- Export Boarding Report

### Security Officer Actions

- Register Visitor
- Verify Gate Pass
- Check Out Visitor
- Log Vehicle Entry
- Log Vehicle Exit
- Report Incident
- Call Admin
- Print Visitor Badge
- Approve Staff Exit
- Verify Student Exit
- Trigger Emergency Alert
- Add Evidence Photo
- Mark Incident Resolved
- Export Gate Log
- Retry Visitor Sync

### Transport Manager Actions

- Assign Route
- Create Route
- Assign Student to Route
- Send Route SMS
- Log Fuel
- Schedule Maintenance
- Record Incident
- Print Manifest
- Mark Bus Departed
- Mark Bus Arrived
- Record Missed Pickup
- Notify Delayed Route
- Assign Driver
- Update Vehicle Compliance
- Export Route Report

### Laboratory Technician Actions

- Mark Lab Ready
- Mark Setup Complete
- Deduct Chemical Stock
- Record Breakage
- Upload Breakage Evidence
- Print Practical Sheet
- Request Procurement
- Log Safety Check
- Schedule Maintenance
- Flag Restricted Chemical
- Assign Apparatus
- Confirm Apparatus Return
- Create Practical Request
- Cancel Unsafe Session
- Export Chemical Report

### Admissions Officer / Registrar Actions

- Record Inquiry
- Create Application
- Verify Document
- Request Missing Document
- Schedule Interview
- Approve Admission
- Reject Application
- Return Application
- Register Student
- Create Guardian Record
- Print Admission Letter
- Send Parent SMS
- Generate Admission Number
- Export Admissions Report
- Archive Completed Application

### Super Admin Actions

- Create School
- Activate Tenant
- Suspend Tenant
- Restore Tenant
- Enable Module
- Disable Module
- Set Billing Status
- Configure Platform SMS
- Configure Daraja
- Invite School Owner
- Reset Admin Access
- View Tenant Audit
- Open Support Escalation
- Trigger Health Check
- Export Tenant Report
- Review Deployment Status

### System Monitor Actions

- Retry Failed Job
- Replay Event
- Acknowledge Alert
- Open Logs
- Trigger Backup Check
- Verify Queue Health
- Inspect Event Consumer
- Retry SMS Delivery
- Retry M-Pesa Callback
- Open Deployment
- Mark Incident Investigating
- Export SLO Report
- Trigger Synthetic Check
- Open Circuit Breaker Status
- Escalate Infrastructure Alert

### HR / Payroll Actions

- Create Staff Record
- Approve Leave
- Reject Leave
- Assign Cover
- Generate Payslip
- Update Contract
- Send Staff Notice
- Record Staff Attendance
- Open Payroll Exception
- Approve Payroll Adjustment
- Schedule Appraisal
- Record Appraisal Note
- Export Payroll Report
- Disable Staff Login
- Print Staff Letter

### School Administrator Actions

- Invite User
- Assign Role
- Suspend User
- Create Class
- Create Stream
- Configure Term
- Configure Academic Year
- Configure Fee Structure
- Configure SMS Rule
- Update Workflow Rule
- Upload School Logo
- Update School Profile
- Create Document Template
- Review Setup Gap
- Open Permission Matrix
- Export Setup Report

---

## Expanded Role Queue Catalog

Every queue must be executable, not a static list. Each queue item must show `priority`, `owner`, `SLA/due time`, `current workflow state`, `next action`, `last update`, `comments`, `attachments where useful`, and `audit trail`. Queue rows must support row actions, bulk actions, assignment, escalation, retry, rollback where allowed, and right-drawer inspection.

### Principal Queues

- **Results Approval Queue:** report-card batches, exam results, moderation summaries, Dean comments, integrity flags.
- **Budget and Procurement Queue:** department budgets, procurement requests, purchase orders, supplier exceptions.
- **Critical Incident Queue:** security incidents, severe discipline cases, exam malpractice, transport emergencies, abuse allegations.
- **Finance Risk Queue:** fee reversals, unusual M-Pesa activity, arrears spikes, payroll exceptions, budget overruns.
- **Staff Accountability Queue:** pending appraisals, teacher absenteeism, unsubmitted reports, role assignment requests.
- **Compliance Queue:** missing ministry reports, audit gaps, policy breaches, incomplete records.
- **Parent Confidence Queue:** unresolved parent complaints, board-level concerns, repeated communication failures.
- **Strategic Reports Queue:** board reports, term summaries, academic trend reports, finance health reports.

### Deputy Principal Queues

- **Daily Attendance Exception Queue:** class attendance gaps, missing registers, chronic absenteeism, late arrivals.
- **Teacher Coverage Queue:** absent teachers, uncovered lessons, substitution requests, class disruption alerts.
- **Discipline Escalation Queue:** fights, bullying, teacher complaints, repeat offenders, suspension requests.
- **Timetable Conflict Queue:** room clashes, teacher clashes, stream overlaps, urgent substitutions.
- **Boarding and Dormitory Queue:** night roll call exceptions, dorm incidents, leave-out requests, missing students.
- **Security Follow-Up Queue:** gate incidents, unauthorized exits, visitor escalations, emergency alerts.
- **Parent Escalation Queue:** parent complaints routed from class teachers, discipline meetings, unresolved cases.
- **Operations Report Queue:** daily reports, weekly discipline summaries, attendance summaries, deputy sign-offs.

### Secretary / Receptionist Queues

- **Front Desk Request Queue:** parent requests, walk-ins, phone inquiries, appointment requests.
- **Visitor Processing Queue:** visitor check-ins, badges, host confirmations, checkout overdue visitors.
- **Admissions Follow-Up Queue:** new inquiries, incomplete applications, document requests, interview scheduling.
- **Document Printing Queue:** admission letters, student profiles, class lists, official letters, receipts where permitted.
- **Parent Communication Queue:** SMS retries, missed calls, parent callback tasks, message delivery failures.
- **Student Record Correction Queue:** parent phone updates, guardian changes, spelling corrections, document updates.
- **Appointment Queue:** principal meetings, accountant meetings, teacher meetings, visitor appointments.
- **Receipt Support Queue:** receipt reprints, parent receipt requests, payment reference lookups.

### Accountant Queues

- **Payment Reconciliation Queue:** unmatched M-Pesa transactions, duplicate payments, stale callbacks, bank deposits.
- **Receipt Queue:** receipts to print, receipts to resend, failed receipt delivery, receipt reversal requests.
- **Arrears Follow-Up Queue:** high-balance students, chronic defaulters, exam-clearance blockers, reminder batches.
- **Waiver Approval Queue:** bursary requests, scholarship adjustments, principal approval cases, rejected waivers.
- **Invoice Queue:** fee invoices, transport invoices, boarding invoices, special charges, correction requests.
- **Payroll Exception Queue:** missing payroll data, failed salary calculations, deductions, staff payment queries.
- **Bank Reconciliation Queue:** bank statement imports, cash deposits, ledger mismatches, unposted collections.
- **Finance Reports Queue:** fee collection reports, arrears reports, board finance summaries, audit exports.

### Teacher Queues

- **Attendance Submission Queue:** lessons requiring attendance, unsynced attendance, late arrivals, absent reasons.
- **Assignment Grading Queue:** submitted assignments, late submissions, missing work, feedback pending.
- **Marks Entry Queue:** open marksheets, missing marks, invalid mark ranges, submission deadlines.
- **Lesson Plan Queue:** draft plans, pending submissions, returned plans, HOD review comments.
- **Parent Message Queue:** unread replies, parent concerns, attendance follow-ups, assignment reminders.
- **Class Note Queue:** behaviour notes, academic concerns, welfare observations, follow-up reminders.
- **Lesson Reminder Queue:** upcoming lessons, room changes, substitution notices, practical requirements.
- **Referral Queue:** counselling referrals, discipline referrals, clinic referrals, class teacher handoff.

### Class Teacher Queues

- **Class Attendance Queue:** daily absentees, chronic absenteeism, unexplained absences, late arrivals.
- **Student Welfare Queue:** emotional concerns, health concerns, bullying reports, vulnerable students.
- **Parent Communication Queue:** unread messages, parent meeting requests, difficult family follow-ups, SMS retries.
- **Discipline Follow-Up Queue:** incidents involving class students, intervention notes, parent acknowledgement.
- **Academic Risk Queue:** declining grades, missing assignments, weak subjects, students needing support.
- **Assignment Completion Queue:** missing submissions, overdue work, repeated late submissions, teacher feedback.
- **Class Report Queue:** term summaries, attendance reports, discipline summaries, parent communication summaries.
- **Announcement Queue:** class notices, read confirmations, pinned announcements, expiry reminders.

### Grade / Form Master Queues

- **Stream Risk Queue:** streams with poor attendance, weak performance, discipline spikes, teacher gaps.
- **Class Teacher Follow-Up Queue:** missing reports, unresolved escalations, attendance submission delays.
- **Grade Discipline Queue:** repeat offenders, bullying cases, suspension cases, cross-stream conflict trends.
- **Grade Academic Queue:** weak subjects, failing students, stream ranking alerts, exam comparison issues.
- **Parent Escalation Queue:** unresolved complaints, sensitive family cases, meeting requests, teacher escalations.
- **Intervention Meeting Queue:** parent meetings, teacher meetings, disciplinary hearings, follow-up tasks.
- **Student Welfare Queue:** counselling referrals, health concerns, vulnerable students, boarding concerns.
- **Grade Report Queue:** attendance summaries, stream reports, academic analysis, intervention reports.

### HOD Queues

- **Lesson Plan Review Queue:** submitted plans, pending plans, returned plans, curriculum alignment issues.
- **Syllabus Coverage Queue:** delayed classes, pending topics, pace concerns, recovery-plan requests.
- **Teacher Submission Queue:** missing marks, late assessments, unsubmitted reports, repeated non-compliance.
- **Subject Performance Queue:** weak topics, declining subject trends, class comparison alerts, pass-rate issues.
- **Department Resource Queue:** textbook shortages, lab resource requests, digital material needs, procurement links.
- **Department Meeting Queue:** meeting agenda items, attendance, action items, report follow-ups.
- **Timetable Coordination Queue:** teacher workload imbalance, lesson clashes, substitution requests.
- **Curriculum Compliance Queue:** CBC/CBE mapping gaps, assessment policy issues, audit findings.

### Dean of Academics Queues

- **Pending Exam Review Queue:** exams awaiting Dean review, completion status, missing marks, submission quality.
- **Report Card Approval Queue:** report batches, grade distributions, outliers, missing subject data.
- **Academic Integrity Queue:** suspicious score spikes, grading inflation, subject inconsistency, flagged teachers.
- **Teacher Submission Queue:** late marks, incomplete grading, repeat offenders, accountability notes.
- **Curriculum Compliance Queue:** missing strands, under-weighted topics, over-weighted topics, syllabus alignment.
- **Academic Alerts Queue:** missing marks, unmoderated exams, grading deviations, approval blockers.
- **Approval History Queue:** approved batches, rejected batches, returned batches, comments, version changes.
- **Principal Handoff Queue:** Dean-approved items ready for Principal approval, returned items, blocked handoffs.

### Exams Manager Queues

- **Exam Setup Queue:** draft exams, incomplete subject mapping, weighting rule gaps, term alignment issues.
- **Timetable Scheduling Queue:** subject clashes, room constraints, class overlaps, invigilator gaps.
- **Marks Entry Queue:** pending marksheets, late submissions, incomplete classes, bulk upload errors.
- **Grade Processing Queue:** grade boundary checks, weighted score calculation, rank generation, invalid ranges.
- **Draft Report Queue:** report cards to generate, reprocessing requests, missing attendance summaries, draft errors.
- **Submission Tracker Queue:** teachers who submitted, missing subjects, late submissions, completion percentage.
- **Data Validation Queue:** duplicate marks, missing marks, subject mismatches, invalid scores.
- **Dean Review Queue:** validated exam batches ready for Dean, returned corrections, rejected batches.

### Nurse / Clinic Queues

- **Sick Bay Queue:** students currently in sick bay, waiting review, discharge pending, follow-up needed.
- **Medicine Inventory Queue:** low stock, expired medicine, emergency supply gaps, reorder requests.
- **Emergency Health Queue:** serious cases, referrals, guardian notification, ambulance/hospital escalation.
- **Medical Profile Queue:** allergies, chronic conditions, clinic history updates, missing guardian consent.
- **Parent Notification Queue:** SMS delivery, guardian calls, failed notifications, acknowledgement tracking.
- **Referral Queue:** hospital referral, counsellor referral, principal notification, follow-up appointment.
- **Clinic Report Queue:** daily visits, medicine usage, health trends, emergency readiness.
- **Confidential Review Queue:** sensitive health notes requiring restricted access and audit tracking.

### Guidance & Counselling Queues

- **Critical Emergency Queue:** self-harm alerts, abuse allegations, suicidal indicators, violent behaviour warnings.
- **High-Risk Student Queue:** depression signs, isolation, bullying reports, academic decline, absenteeism.
- **Session Queue:** upcoming sessions, missed sessions, completed sessions needing notes, emergency walk-ins.
- **Teacher Referral Queue:** teacher concerns, urgency ratings, behaviour notes, classroom observations.
- **Parent Meeting Queue:** pending meetings, difficult family situations, separated-family alerts, communication logs.
- **Follow-Up Queue:** overdue follow-ups, monitoring cases, unresolved interventions, escalation reminders.
- **Anonymous Report Queue:** bullying, abuse, drug abuse, depression, suicidal thoughts, investigation status.
- **Wellness Insight Queue:** AI alerts, dorm conflict trends, exam anxiety trends, class wellbeing changes.

### Discipline Master Queues

- **Live Incident Queue:** fights, bullying, vandalism, theft, fake sickness, substance abuse, exam misconduct.
- **High-Risk Student Queue:** repeated offenders, chronic latecomers, suspicious movement, clinic-visit patterns.
- **Prefect Report Queue:** anonymous reports, dorm noise, contraband alerts, suspicious activity.
- **Dormitory Case Queue:** night movement, missing students, dorm switching, lights-out violations.
- **Parent Meeting Queue:** contacted parents, pending meetings, unreachable guardians, warning letters.
- **Counselling Referral Queue:** students referred, session status, improvement progress, follow-up schedules.
- **Suspension Queue:** suspension requests, approval state, return-to-school plans, parent acknowledgement.
- **Positive Behaviour Queue:** improved students, leadership growth, prefect commendations, recognition actions.

### Librarian Queues

- **Borrowing Queue:** pending borrowings, scan issue confirmations, borrower validation, book availability.
- **Return Queue:** due returns, scan return confirmations, damaged returns, lost-book checks.
- **Overdue Queue:** overdue books, parent/student reminders, repeated overdue borrowers, fine follow-ups.
- **Catalogue Queue:** new books, missing metadata, barcode generation, shelf assignment.
- **Lost and Damaged Queue:** lost books, damaged books, replacement requests, fine assessment.
- **Library Card Queue:** card printing, renewals, blocked borrowers, class card batches.
- **Inventory Audit Queue:** stock count gaps, shelf mismatches, missing copies, audit reports.
- **Reports Queue:** borrowing trends, overdue reports, book utilization, fine summaries.

### Parent Queues

- **Child Alert Queue:** attendance alerts, discipline notices, health notices, transport alerts, academic concerns.
- **Fee Queue:** balances, due payments, receipts, failed payment confirmations, fee statements.
- **Message Queue:** unread school messages, teacher replies, meeting requests, announcement acknowledgements.
- **Report Card Queue:** new report cards, downloadable reports, teacher comments, approval-published results.
- **Assignment Queue:** upcoming assignments, overdue submissions, teacher feedback, child reminders.
- **Document Queue:** receipts, admission letters, clearance forms, school letters, downloadable files.
- **Meeting Queue:** parent meetings, confirmation requests, reschedule requests, meeting notes.
- **Transport Queue:** route updates, pickup confirmations, delays, emergency transport alerts.

### Student Queues

- **Today Queue:** lessons, timetable changes, notices, assignment reminders.
- **Assignment Queue:** due assignments, submitted assignments, late assignments, teacher feedback.
- **Exam Queue:** upcoming exams, exam timetable, released results, revision notices.
- **Library Queue:** borrowed books, due returns, overdue warnings, renewal requests.
- **Notice Queue:** unread announcements, class notices, school events, read confirmations.
- **Result Queue:** report cards, subject results, performance feedback, downloadable summaries.
- **Profile Queue:** profile update requests, document notices, account settings.
- **Support Queue:** help requests, teacher messages, student support notices.

### Storekeeper Queues

- **Stock Request Queue:** department requests, approval state, issue readiness, rejected requests.
- **Stock Receipt Queue:** supplier deliveries, batch verification, quantity mismatches, receipt printing.
- **Stock Issue Queue:** approved issues, pending pickup, issued items, recipient confirmation.
- **Low Stock Queue:** reorder thresholds, fast-moving items, emergency shortages, procurement requests.
- **Damaged/Lost Queue:** damaged stock, lost stock, write-off requests, evidence attachments.
- **Supplier Queue:** supplier follow-ups, quotation requests, delivery delays, supplier records.
- **Stock Count Queue:** count discrepancies, audit adjustments, reconciliation, movement logs.
- **Inventory Report Queue:** valuation, wastage, movement, dead stock, unusual reductions.

### Boarding Master Queues

- **Night Attendance Queue:** missing students, late roll call, unconfirmed dorms, attendance corrections.
- **Leave-Out Queue:** leave-out requests, approvals, returns, overdue students.
- **Dorm Incident Queue:** bullying, noise, conflict, property damage, night movement.
- **Bed Allocation Queue:** new allocations, transfers, capacity alerts, vacant beds.
- **Welfare Queue:** homesickness, isolation, health concerns, counselling referrals.
- **Parent Communication Queue:** leave notifications, incident messages, failed SMS, parent acknowledgements.
- **Dorm Inspection Queue:** inspection findings, maintenance requests, cleanliness alerts, follow-up actions.
- **Boarding Reports Queue:** dorm summaries, attendance reports, welfare reports, incident reports.

### Security Officer Queues

- **Visitor Queue:** visitors on campus, host confirmation, overdue checkout, blocked visitor alerts.
- **Gate Pass Queue:** student exits, staff exits, parent pickups, approval validation.
- **Vehicle Queue:** vehicle entries, deliveries, route vehicles, unknown vehicles.
- **Incident Queue:** unauthorized access, gate conflicts, emergency incidents, evidence attachments.
- **Emergency Queue:** panic alerts, security escalation, principal/deputy notification, incident updates.
- **Badge Printing Queue:** visitor badges, contractor passes, temporary passes, reprints.
- **Access Audit Queue:** suspicious movement, repeated visits, failed verifications, manual overrides.
- **Security Report Queue:** daily gate log, visitor history, incident summary, emergency report.

### Transport Manager Queues

- **Active Trip Queue:** buses on route, ETA updates, route progress, live delays.
- **Delayed Route Queue:** late pickups, traffic delays, parent notifications, route deviations.
- **Missed Pickup Queue:** students missed, unauthorized boarding, unknown passengers, parent alerts.
- **Maintenance Queue:** scheduled service, urgent repairs, unsafe vehicles, warranty follow-ups.
- **Fuel Queue:** fuel logs, suspicious consumption, high-consuming vehicles, station records.
- **Driver Queue:** absent drivers, license expiry, document gaps, incident rate alerts.
- **Parent Notification Queue:** route changes, bus arriving, emergency alerts, SMS delivery status.
- **Compliance Queue:** insurance expiry, inspection dates, permits, license renewals.

### Laboratory Technician Queues

- **Practical Setup Queue:** today’s practicals, pending setup, missing apparatus, teacher readiness.
- **Chemical Safety Queue:** restricted chemicals, low stock, expiry alerts, suspicious usage.
- **Apparatus Queue:** equipment assignment, borrowing logs, return confirmations, missing items.
- **Breakage Queue:** damage reports, evidence uploads, repair cost estimates, parent/discipline links.
- **Safety Inspection Queue:** fire extinguisher checks, eye wash checks, gas leakage, safety gear.
- **Maintenance Queue:** repairs, calibration schedules, technician visits, delayed service.
- **Practical Exam Queue:** KCSE/CBC practical prep, confidential materials, shortage alerts, countdown tasks.
- **Procurement Queue:** reorder suggestions, stock requests, supplier follow-ups, batch tracking.

### Admissions Officer / Registrar Queues

- **Inquiry Queue:** new inquiries, follow-up calls, prospect status, source tracking.
- **Application Queue:** submitted applications, incomplete forms, pending review, returned applications.
- **Document Verification Queue:** missing birth certificate, missing report card, invalid documents, upload review.
- **Interview Queue:** scheduled interviews, missed interviews, reschedules, interviewer notes.
- **Decision Queue:** admission approvals, rejections, waitlist, principal exceptions.
- **Registration Queue:** admission number generation, class placement, guardian creation, student record creation.
- **Parent Communication Queue:** SMS updates, admission letters, missing document notices, failed delivery.
- **Printing Queue:** admission letters, fee structures, class placement slips, student profiles.

### Super Admin Queues

- **Tenant Lifecycle Queue:** provisioning, setup in progress, awaiting verification, active-limited, suspended.
- **Module Entitlement Queue:** enable module, disable module, limited access, module mismatch alerts.
- **Billing Control Queue:** manual overdue status, grace period, restricted access, restoration requests.
- **Platform User Queue:** owner invitations, locked accounts, role changes, impersonation approvals.
- **Integration Queue:** SMS provider, Daraja credentials, webhook health, callback failures.
- **Support Escalation Queue:** school tickets, critical incidents, SLA breaches, support handoffs.
- **Deployment Queue:** failed deployment, readiness degraded, rollback review, release approval.
- **Audit Queue:** suspicious admin action, tenant access review, permission drift, export audit.

### System Monitor Queues

- **Failed Job Queue:** failed workers, retryable jobs, dead-letter items, stalled jobs.
- **Event Bus Queue:** missing subscribers, failed consumers, replay requests, event lag.
- **API Health Queue:** degraded readiness, p95 latency alerts, 5xx spikes, circuit breaker changes.
- **SMS Monitor Queue:** failed SMS, retry backlog, provider disabled, delivery webhook gaps.
- **M-Pesa Callback Queue:** failed callbacks, overdue intents, reconciliation mismatches, replay checks.
- **Deployment Queue:** active deployment, rollback candidate, failed build, environment drift.
- **Backup Queue:** backup verification, failed backup, restore drill, retention warning.
- **Security Queue:** tenant isolation breach attempts, failed auth spikes, suspicious exports, secret scans.

### HR / Payroll Queues

- **Leave Queue:** leave requests, rejected leave, approved leave needing cover, return-to-work checks.
- **Payroll Queue:** payroll exceptions, deductions, payslip generation, salary approval.
- **Staff Attendance Queue:** absent staff, lateness, missing biometric logs, coverage requests.
- **Contract Queue:** expiring contracts, renewal approvals, document uploads, staff letters.
- **Appraisal Queue:** pending appraisals, returned appraisals, follow-up objectives, performance notes.
- **Duty Allocation Queue:** duty gaps, weekend duty, substitution, staff reminders.
- **Staff Account Queue:** login setup, disabled accounts, role changes, password reset requests.
- **HR Reports Queue:** payroll report, leave report, staff attendance report, appraisal summary.

### School Administrator Queues

- **Setup Gap Queue:** missing school profile fields, missing logo, incomplete term/year setup.
- **User Role Queue:** invitations, role assignment, permission review, suspended users.
- **Academic Setup Queue:** classes, streams, subjects, terms, academic year, grading structures.
- **Fee Setup Queue:** fee structures, transport fees, boarding fees, waivers, charge templates.
- **SMS Rule Queue:** templates, delivery rules, event triggers, failed configuration checks.
- **Workflow Rule Queue:** approval chains, escalation rules, SLA timers, rollback rules.
- **Document Template Queue:** admission letters, receipts, report templates, clearance forms.
- **Permission Matrix Queue:** role capabilities, module permissions, sensitive access, audit review.

---

## Expanded Role Workflow Catalog

Every workflow must define: `workflowId`, `roleOwner`, `startState`, `allowedTransitions`, `requiredCapability`, `queueSource`, `primaryActions`, `emittedEvents`, `failureState`, `retryPolicy`, and `auditEvent`. These workflows are the execution backbone for the sidebars, first viewport cards, queues, and action buttons above.

### Principal Workflows

- **Academic Result Approval:** `Dean Approved -> Principal Review -> Approved -> Published Handoff` with actions Approve Results, Return for Correction, View Integrity Evidence.
- **Budget Approval:** `Submitted -> Principal Review -> Approved/Rejected -> Finance Execution` with actions Approve Budget, Reject Budget Request, Request Revision.
- **Procurement Approval:** `Requested -> Department Review -> Principal Approval -> Purchase Order` with actions Approve Procurement, Escalate, View Supplier Evidence.
- **Critical Incident Escalation:** `Reported -> Principal Review -> Assigned -> Resolved -> Archived` with actions Escalate Critical Incident, Assign Owner, Send Emergency Broadcast.
- **User and Role Governance:** `Invite Requested -> Principal Review -> Role Assigned -> Active` with actions Invite Staff, Assign Senior Role, Suspend User Account.
- **Board Reporting:** `Draft -> Evidence Review -> Generated -> Shared` with actions Generate Board Report, Export Report, View Audit Trail.

### Deputy Principal Workflows

- **Teacher Coverage:** `Gap Detected -> Substitute Assigned -> Class Covered -> Closed`.
- **Discipline Escalation:** `Reported -> Deputy Review -> Parent Notified -> Intervention -> Resolved`.
- **Timetable Conflict Resolution:** `Conflict Detected -> Proposed Fix -> Staff Notified -> Published`.
- **Boarding Incident Follow-Up:** `Dorm Incident -> Deputy Review -> Owner Assigned -> Follow-Up -> Closed`.
- **Security Follow-Up:** `Security Alert -> Deputy Review -> Action Assigned -> Evidence Added -> Closed`.
- **Daily Operations Reporting:** `Draft -> Reviewed -> Submitted -> Archived`.

### Secretary / Receptionist Workflows

- **Visitor Management:** `Arrived -> Host Confirmed -> Badge Printed -> Checked Out`.
- **Parent Request Routing:** `Received -> Categorized -> Routed -> Responded -> Closed`.
- **Admission Inquiry Follow-Up:** `Inquiry -> Parent Contacted -> Application Started -> Handoff`.
- **Document Printing:** `Requested -> Verified -> Printed -> Issued -> Archived`.
- **Student Record Correction:** `Correction Requested -> Verified -> Updated -> Parent Notified`.
- **Appointment Booking:** `Requested -> Scheduled -> Confirmed -> Completed`.

### Accountant Workflows

- **M-Pesa Reconciliation:** `Callback Received -> Matched -> Posted -> Receipt Sent`, with failure path `Unmatched -> Review -> Retry/Reversal`.
- **Manual Payment Recording:** `Draft -> Validated -> Posted -> Receipt Printed -> Parent Notified`.
- **Fee Waiver:** `Requested -> Accountant Review -> Principal Approval -> Applied/Rejected`.
- **Arrears Follow-Up:** `Balance Flagged -> Reminder Sent -> Parent Follow-Up -> Escalated/Closed`.
- **Payment Reversal:** `Requested -> Reason Captured -> Approved -> Reversed -> Audit Archived`.
- **Payroll Exception:** `Exception Detected -> Reviewed -> Corrected -> Payroll Ready`.

### Teacher Workflows

- **Lesson Attendance:** `Not Started -> Marking -> Saved Locally/Synced -> Submitted`.
- **Marks Submission:** `Draft -> Submitted -> HOD/Exams Review -> Accepted/Returned`.
- **Assignment Grading:** `Assigned -> Submitted -> Graded -> Feedback Sent`.
- **Lesson Plan Submission:** `Draft -> Submitted -> HOD Review -> Approved/Returned`.
- **Parent Message:** `Draft -> Sent -> Delivered/Failed -> Retried/Acknowledged`.
- **Student Referral:** `Concern Recorded -> Referral Submitted -> Owner Assigned -> Follow-Up`.

### Class Teacher Workflows

- **Chronic Absentee Follow-Up:** `Flagged -> Parent Contacted -> Reason Captured -> Intervention -> Closed`.
- **Student Welfare Referral:** `Concern -> Class Teacher Review -> Counsellor/Clinic Referral -> Follow-Up`.
- **Class Report Generation:** `Draft -> Reviewed -> Printed/Exported -> Archived`.
- **Parent Meeting:** `Requested -> Scheduled -> Confirmed -> Notes Added -> Closed`.
- **Discipline Follow-Up:** `Incident Routed -> Parent Acknowledged -> Intervention -> Resolved`.
- **Missing Assignment Follow-Up:** `Missing Work -> Parent/Student Notified -> Submitted/Closed`.

### Grade / Form Master Workflows

- **Stream Risk Intervention:** `Risk Detected -> Stream Reviewed -> Owner Assigned -> Intervention -> Reported`.
- **Class Teacher Report Review:** `Submitted -> Grade Master Review -> Accepted/Returned -> Archived`.
- **Grade Parent Escalation:** `Escalated -> Reviewed -> Meeting Scheduled -> Resolution Logged`.
- **Cross-Stream Discipline Review:** `Trend Detected -> Investigation -> Action Plan -> Follow-Up`.
- **Grade Academic Recovery:** `Weak Area Detected -> Recovery Plan -> Teacher Action -> Review`.
- **Grade Meeting:** `Agenda Draft -> Scheduled -> Conducted -> Action Items Closed`.

### HOD Workflows

- **Lesson Plan Approval:** `Submitted -> HOD Review -> Approved/Returned -> Archived`.
- **Syllabus Recovery:** `Delay Detected -> Recovery Plan -> Teacher Execution -> Coverage Restored`.
- **Assessment Submission:** `Pending -> Submitted -> Reviewed -> Accepted/Returned`.
- **Weak Topic Intervention:** `Topic Flagged -> Teacher Assigned -> Remediation -> Performance Review`.
- **Department Resource Request:** `Requested -> HOD Review -> Procurement Handoff -> Fulfilled`.
- **Department Meeting:** `Agenda -> Meeting -> Action Items -> Follow-Up`.

### Dean of Academics Workflows

- **Exam Moderation:** `Exams Office Submitted -> Dean Review -> Approved/Rejected/Returned`.
- **Report Card Review:** `Draft Generated -> Dean Review -> Approved -> Principal Handoff`.
- **Academic Integrity Review:** `Anomaly Detected -> Evidence Review -> Teacher Response -> Decision`.
- **Teacher Submission Compliance:** `Late/Missing -> Reminder -> Escalation -> Closed`.
- **Curriculum Compliance Review:** `Gap Detected -> Department Response -> Verified -> Closed`.
- **Approval History Audit:** `Decision Recorded -> Immutable Audit -> Version Archived`.

### Exams Manager Workflows

- **Exam Creation:** `Draft -> Configured -> Validated -> Active`.
- **Exam Scheduling:** `Draft Timetable -> Conflict Check -> Published`.
- **Marks Entry:** `Open -> In Progress -> Completed -> Validated`.
- **Grade Processing:** `Marks Complete -> Grade Computed -> Draft Report Generated`.
- **Data Validation:** `Validation Started -> Errors Found/Clean -> Corrected -> Ready`.
- **Dean Submission:** `Validated Draft -> Sent to Dean -> Accepted/Returned`.

### Nurse / Clinic Workflows

- **Sick Bay Visit:** `Student Arrives -> Visit Logged -> Treatment/Referral -> Discharged`.
- **Medicine Dispensing:** `Requested -> Stock Checked -> Dispensed -> Stock Deducted`.
- **Emergency Referral:** `Emergency Flagged -> Guardian Notified -> Clinic/Hospital Referral -> Follow-Up`.
- **Medical Profile Update:** `Update Draft -> Verified -> Saved -> Audit Logged`.
- **Medicine Reorder:** `Low Stock -> Reorder Request -> Store/Procurement Handoff`.
- **Parent Health Notification:** `Message Draft -> Sent -> Delivered/Retry`.

### Guidance & Counselling Workflows

- **Emergency Intervention:** `Critical Alert -> Counsellor Review -> Principal/Guardian/Clinic Notified -> Active Intervention`.
- **Counselling Session:** `Scheduled -> Started -> Notes Saved -> Follow-Up Scheduled`.
- **Teacher Referral:** `Referral Submitted -> Triage -> Session/Monitoring -> Closed`.
- **Anonymous Report Review:** `Report Received -> Risk Classified -> Investigation -> Escalation/Closure`.
- **Parent Meeting:** `Requested -> Scheduled -> Conducted -> Follow-Up`.
- **Case Closure:** `Monitoring -> Review -> Closed/Reopened`.

### Discipline Master Workflows

- **Incident Case:** `Reported -> Evidence Added -> Reviewed -> Action Taken -> Resolved`.
- **Bullying Investigation:** `Reported -> Investigation -> Parent/Counsellor Handoff -> Follow-Up`.
- **Suspension Request:** `Draft -> Deputy/Principal Review -> Approved/Rejected -> Return Plan`.
- **Parent Meeting:** `Meeting Requested -> Parent Notified -> Meeting Held -> Acknowledged`.
- **Prefect Report Review:** `Submitted -> Verified -> Actioned/Escalated -> Archived`.
- **Positive Behaviour Recognition:** `Recommendation -> Reviewed -> Recognized -> Archived`.

### Librarian Workflows

- **Book Issue:** `Scan Book -> Validate Borrower -> Issued -> Due Date Set`.
- **Book Return:** `Scan Return -> Condition Checked -> Closed/Fine/Lost`.
- **Overdue Follow-Up:** `Overdue -> Reminder Sent -> Returned/Fine/Escalated`.
- **Lost Book:** `Marked Lost -> Fine/Replacement -> Parent Notified -> Closed`.
- **Catalogue Update:** `New Book -> Metadata Added -> Barcode Printed -> Shelved`.
- **Library Card Printing:** `Requested -> Verified -> Printed -> Issued`.

### Parent Workflows

- **Fee Payment:** `Balance Viewed -> Payment Started -> Confirmed -> Receipt Available`.
- **Report Card Access:** `Published -> Parent Viewed -> Downloaded/Acknowledged`.
- **School Message:** `Received -> Read -> Reply/Confirm`.
- **Meeting Confirmation:** `Requested -> Parent Confirms/Reschedules -> Meeting Completed`.
- **Transport Alert:** `Alert Received -> Acknowledged -> Follow-Up if Needed`.
- **Absence Reason Submission:** `Absence Alert -> Reason Submitted -> Class Teacher Review`.

### Student Workflows

- **Assignment Submission:** `Assigned -> Opened -> Submitted -> Feedback Received`.
- **Exam Readiness:** `Exam Notice -> Timetable Viewed -> Result Published`.
- **Library Renewal:** `Due Date Alert -> Renewal Requested -> Approved/Rejected`.
- **Notice Acknowledgement:** `Notice Received -> Read -> Acknowledged`.
- **Profile Update Request:** `Request Draft -> Submitted -> Admin Review`.
- **Study Material Access:** `Material Published -> Opened -> Downloaded`.

### Storekeeper Workflows

- **Stock Request:** `Requested -> Approved -> Issued -> Recipient Confirmed`.
- **Stock Receipt:** `Delivery Received -> Verified -> Stock Updated -> Receipt Printed`.
- **Low Stock Reorder:** `Threshold Breached -> Procurement Request -> Supplier Follow-Up`.
- **Damaged Stock:** `Damage Reported -> Evidence Added -> Write-Off/Repair -> Closed`.
- **Stock Count:** `Count Started -> Discrepancy Found -> Reconciled -> Audit Logged`.
- **Supplier Follow-Up:** `Request Sent -> Supplier Response -> Delivery/Closure`.

### Boarding Master Workflows

- **Night Attendance:** `Roll Call Open -> Marked -> Exceptions Reviewed -> Closed`.
- **Leave-Out:** `Requested -> Approved/Rejected -> Student Out -> Returned/Overdue`.
- **Dorm Incident:** `Reported -> Evidence Added -> Parent/Deputy Notified -> Resolved`.
- **Bed Allocation:** `Request -> Bed Assigned -> Student Moved -> Dorm List Updated`.
- **Dorm Inspection:** `Inspection Scheduled -> Findings Logged -> Maintenance/Welfare Follow-Up`.
- **Boarding Welfare:** `Concern Flagged -> Counsellor/Clinic Referral -> Follow-Up`.

### Security Officer Workflows

- **Visitor Check-In:** `Arrived -> Host Verified -> Badge Printed -> On Campus`.
- **Visitor Check-Out:** `On Campus -> Checked Out -> Log Closed`.
- **Student Exit:** `Exit Requested -> Approval Verified -> Exit Logged -> Return Checked`.
- **Vehicle Log:** `Vehicle Arrives -> Purpose Logged -> Exit Logged`.
- **Security Incident:** `Reported -> Evidence Added -> Admin Notified -> Resolved`.
- **Emergency Alert:** `Triggered -> Deputy/Principal Notified -> Response Logged`.

### Transport Manager Workflows

- **Route Assignment:** `Route Draft -> Vehicle/Driver Assigned -> Students Assigned -> Active`.
- **Trip Monitoring:** `Trip Started -> In Progress -> Delayed/Normal -> Completed`.
- **Missed Pickup:** `Detected -> Parent Notified -> Resolution Logged`.
- **Maintenance:** `Issue Reported -> Scheduled -> In Progress -> Completed`.
- **Fuel Logging:** `Refill Logged -> Efficiency Checked -> Anomaly Flagged/Closed`.
- **Compliance Renewal:** `Expiry Alert -> Document Updated -> Verified`.

### Laboratory Technician Workflows

- **Practical Setup:** `Teacher Request -> Setup Pending -> Setup Complete -> Lab Ready`.
- **Chemical Deduction:** `Practical Approved -> Stock Deducted -> Usage Logged`.
- **Restricted Chemical Handling:** `Request -> Supervisor Approval -> Issued -> Returned/Closed`.
- **Breakage Reporting:** `Breakage Logged -> Evidence Added -> Cost Estimated -> Approved/Closed`.
- **Safety Inspection:** `Checklist Open -> Inspection Done -> Issue Escalated/Closed`.
- **Practical Exam Prep:** `Exam Scheduled -> Materials Locked -> Stations Ready -> Exam Complete`.

### Admissions Officer / Registrar Workflows

- **Inquiry to Application:** `Inquiry -> Follow-Up -> Application Started`.
- **Application Review:** `Submitted -> Document Review -> Interview/Decision`.
- **Document Verification:** `Uploaded -> Verified/Rejected -> Parent Notified`.
- **Admission Decision:** `Reviewed -> Approved/Rejected/Waitlisted -> Letter Generated`.
- **Student Registration:** `Approved -> Admission Number -> Class Placement -> Student Record`.
- **Parent Communication:** `Message Draft -> Sent -> Delivered/Retry`.

### Super Admin Workflows

- **Tenant Provisioning:** `Created -> Setup In Progress -> Awaiting Verification -> Active`.
- **Module Entitlement:** `Request -> Enabled/Disabled/Limited -> Capability Recalculated`.
- **Manual Billing Control:** `Active -> Grace/Overdue/Restricted/Suspended -> Restored`.
- **Platform SMS Configuration:** `Draft -> Validated -> Activated -> Monitored`.
- **Daraja Configuration:** `Credentials Added -> Callback Validated -> Production Ready`.
- **Support Escalation:** `Ticket Escalated -> Owner Assigned -> Resolved`.

### System Monitor Workflows

- **Failed Job Recovery:** `Failed -> Retry Queued -> Success/Dead Letter`.
- **Event Replay:** `Replay Requested -> Consumer Checked -> Replayed -> Projection Verified`.
- **SLO Alert Response:** `Alert Raised -> Acknowledged -> Investigating -> Resolved`.
- **SMS Failure Recovery:** `Delivery Failed -> Retry -> Delivered/Escalated`.
- **M-Pesa Callback Recovery:** `Callback Failed -> Replay/Verify -> Reconciled`.
- **Backup Verification:** `Backup Completed -> Restore Check -> Verified/Failed`.

### HR / Payroll Workflows

- **Leave Approval:** `Submitted -> HR Review -> Approved/Rejected -> Cover Assigned`.
- **Payroll Processing:** `Draft Payroll -> Exceptions Reviewed -> Approved -> Payslips Generated`.
- **Staff Attendance Review:** `Absence Detected -> Reason Captured -> Cover/Discipline`.
- **Contract Renewal:** `Expiry Alert -> Review -> Renewed/Closed`.
- **Appraisal:** `Scheduled -> Completed -> Notes Added -> Follow-Up Objectives`.
- **Staff Account Management:** `Invite/Change -> Role Verified -> Active/Suspended`.

### School Administrator Workflows

- **School Setup:** `Incomplete -> Updated -> Verified -> Active`.
- **User Role Setup:** `Invite -> Role Assigned -> Permission Verified -> Active`.
- **Academic Setup:** `Class/Stream Draft -> Validated -> Published`.
- **Fee Setup:** `Draft Structure -> Reviewed -> Approved -> Active`.
- **SMS Rule Setup:** `Template Draft -> Trigger Mapped -> Tested -> Active`.
- **Workflow Rule Setup:** `Rule Draft -> Permission Review -> Published`.

---

## Dashboard Coverage Enforcement Checklist

The implementation is not complete unless every role passes all checks below.

| Coverage Area | Required for Every Role | Evidence Required |
| --- | --- | --- |
| Sidebar | Role-specific workspace list, fixed position, active state, no anchor scrolling | `role-dashboard-structure.test.tsx` checks labels and no long-page section jumps |
| First Viewport | Greeting/context, urgent action strip, workflow inbox, top exceptions, sync state | Render test checks first screen before scrolling |
| Actions | At least 12 role-specific actions for operator roles and at least 6 for portal roles | Manifest test checks action catalog and UI buttons |
| Workflows | At least 5 role-specific workflows for operator roles and at least 4 for portal roles | Workflow catalog test checks workflow IDs, transitions, capabilities, events |
| Queues | At least 6 executable queues for operator roles and at least 4 for portal roles | Queue test checks owner, priority, SLA, next action, audit trail |
| Tables | Search, filters, sort, columns, pagination, row actions, bulk actions, export, print | Universal table test |
| Forms | Standard footer, validation, draft, submit, print/SMS/approval where relevant | Universal form test |
| Failure States | `LOADING`, `EMPTY`, `LOCKED`, `DEGRADED`, `FAILED`, `RETRY`, `OFFLINE_DRAFT` | State panel/action tests |
| Search Scope | Global only for Principal, Deputy, Secretary, Accountant; scoped for all others | `search-access-policy.test.ts` |
| Mobile | Urgent actions, queue, scoped search, quick form, sync badge visible | `mobile-low-bandwidth.test.tsx` |

Add this assertion pattern to the role structure tests:

```ts
for (const roleId of ALL_OPERATIONAL_ROLES) {
  const blueprint = getOperationalRoleBlueprint(roleId);

  expect(blueprint.sidebar.length).toBeGreaterThanOrEqual(6);
  expect(blueprint.firstViewport.length).toBeGreaterThanOrEqual(5);
  expect(blueprint.primaryActions.length).toBeGreaterThanOrEqual(roleId === "parent" || roleId === "student" ? 6 : 12);
  expect(blueprint.queues.length).toBeGreaterThanOrEqual(roleId === "parent" || roleId === "student" ? 4 : 6);
  expect(blueprint.workflows.length).toBeGreaterThanOrEqual(roleId === "parent" || roleId === "student" ? 4 : 5);
  expect(blueprint.tables.length).toBeGreaterThanOrEqual(1);
  expect(blueprint.forms.length).toBeGreaterThanOrEqual(1);
  expect(blueprint.states).toEqual(expect.arrayContaining(["LOADING", "EMPTY", "LOCKED", "DEGRADED", "FAILED"]));
}
```

---

## Task 1: Freeze the DOCX Coverage Manifest

**Files:**

- Modify: `apps/web/src/lib/operational/myshule-extreme-operating-system.ts`
- Modify: `apps/web/tests/design/extreme-docx-operating-system.test.ts`
- Create: `apps/web/tests/design/role-dashboard-structure.test.tsx`

- [x] **Step 1: Expand the manifest tests first**

Add assertions that every role blueprint includes:

```ts
expect(blueprint.searchMode).toMatch(/GLOBAL|SCOPED|SELF|PLATFORM/);
expect(blueprint.sidebar.length).toBeGreaterThanOrEqual(6);
expect(blueprint.firstViewport.length).toBeGreaterThanOrEqual(5);
expect(blueprint.queues.length).toBeGreaterThanOrEqual(1);
expect(blueprint.primaryActions.length).toBeGreaterThanOrEqual(5);
expect(blueprint.forms.length).toBeGreaterThanOrEqual(1);
expect(blueprint.tables.length).toBeGreaterThanOrEqual(1);
expect(blueprint.printOutputs.length).toBeGreaterThanOrEqual(1);
expect(blueprint.states).toEqual(expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]));
```

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/extreme-docx-operating-system.test.ts tests/design/role-dashboard-structure.test.tsx
```

Expected before implementation: fail for missing search modes, queue metadata, or role structure fields.

- [x] **Step 2: Add missing typed manifest fields**

Update role and module blueprint types to include:

```ts
type SearchAccessMode =
  | "GLOBAL_EXECUTIVE"
  | "GLOBAL_OPERATIONS"
  | "GLOBAL_FRONT_OFFICE"
  | "GLOBAL_FINANCE"
  | "ROLE_SCOPED"
  | "MODULE_SCOPED"
  | "SENSITIVE_SCOPED"
  | "SELF_ONLY"
  | "PLATFORM"
  | "PLATFORM_HEALTH";
```

Each role blueprint must include `searchMode`, `searchEntities`, `forbiddenEntities`, `queues`, `states`, `mobileBehavior`, and `lowBandwidthBehavior`.

- [x] **Step 3: Fill all 24 DOCX role structures**

Use the role matrix in this document as the source of truth. Do not collapse roles into shared generic dashboard text. Similar components are allowed, but the role blueprint content must be role-specific.

- [x] **Step 4: Fill the 14 added module contracts**

Ensure each added module has:

- `uniqueSidebar`
- `urgentActionStrip`
- `mainTable`
- `forms`
- `rightDetailsDrawer`
- `approvalWorkflow`
- `smsTriggers`
- `printOutputs`
- `auditTrail`
- `permissionChecks`
- `states`
- `mobileBehavior`
- `lowBandwidthBehavior`

Run the same tests again. Expected after implementation: pass.

---

## Task 2: Implement Role-Aware Search Governance

**Files:**

- Create: `apps/web/src/lib/search/search-access-policy.ts`
- Create: `apps/web/src/lib/search/operational-search-registry.ts`
- Create: `apps/web/src/lib/search/operational-search-resolver.ts`
- Modify: `apps/web/src/components/system/app-topbar.tsx`
- Modify: `apps/web/tests/design/global-school-search.test.tsx`
- Create: `apps/web/tests/design/search-access-policy.test.ts`

- [x] **Step 1: Add failing search governance tests**

Test these exact expectations:

- Principal can see student, parent, receipt, M-Pesa, staff, incident, transport, inventory, visitor, and document results.
- Deputy can see operations-wide results but not finance ledger details unless capability says yes.
- Secretary can see front-office results but not private counselling notes or payroll.
- Accountant can see finance results but not medical/counselling records.
- Teacher sees only assigned classes/students.
- Parent sees only own children.
- Student sees only own records.
- Nurse/Counsellor/Discipline searches are sensitive and capability-limited.

Expected command:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/search-access-policy.test.ts tests/design/global-school-search.test.tsx
```

Expected before implementation: fail because search is still too broad/hardcoded.

- [x] **Step 2: Implement the role search policy**

`search-access-policy.ts` must export:

```ts
export type SearchAccessMode = ...;
export type SearchEntityType =
  | "student"
  | "parent"
  | "staff"
  | "class"
  | "subject"
  | "receipt"
  | "invoice"
  | "mpesa"
  | "exam"
  | "assignment"
  | "incident"
  | "book"
  | "inventory"
  | "bus"
  | "route"
  | "visitor"
  | "admission"
  | "document"
  | "supportTicket"
  | "healthCase"
  | "counsellingCase"
  | "disciplineCase"
  | "platformTenant"
  | "systemJob";
```

Add `resolveSearchPolicy(role, capabilities)` returning allowed entities and actions.

- [x] **Step 3: Implement the operational search registry**

Add sample records using Kenyan examples:

- Brian Otieno, `MYS/2026/001`, `Grade 7 East`
- Parent phone `07XXXXXXXX`
- M-Pesa code `QEX7ABC123`
- Receipt with print/send/reversal action
- Visitor, book, bus, route, admission, inventory, document, support-ticket records

No sample record should leak secrets or real PII.

- [x] **Step 4: Wire AppTopbar to the resolver**

Replace fixed demo search behavior with:

```ts
const policy = resolveSearchPolicy(profile.roleKey, capabilities);
const results = resolveOperationalSearch(query, policy, context);
```

Search result actions must be rendered as buttons with `OperationalActionContract`, not static links.

- [x] **Step 5: Verify scoped search behavior**

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/search-access-policy.test.ts tests/design/global-school-search.test.tsx
```

Expected after implementation: all role search boundaries pass.

---

## Task 3: Complete the Universal Authenticated Shell

**Files:**

- Modify: `apps/web/src/components/system/app-topbar.tsx`
- Modify: `apps/web/src/components/school/erp-shell.tsx`
- Modify: `apps/web/src/components/platform/platform-shell.tsx`
- Modify: `apps/web/src/components/portal/portal-shell.tsx`
- Modify: `apps/web/tests/design/experience-shells.test.tsx`
- Modify: `apps/web/tests/design/layout.test.tsx`

- [x] **Step 1: Add shell tests**

Assert every authenticated shell renders:

- school logo/name
- current academic year selector
- current term selector
- current date
- logged-in user
- role badge
- active dashboard name
- scoped/global search
- notifications
- urgent action counter
- sync status indicator
- quick action menu
- fixed sidebar
- main content workspace

- [x] **Step 2: Pass role profile and search mode into topbar**

`erp-shell.tsx`, `platform-shell.tsx`, and `portal-shell.tsx` must pass role metadata so the topbar can choose the correct search mode and quick actions.

- [x] **Step 3: Make quick actions role-specific**

Examples:

- Principal: Approve Results, Approve Budget, Send Announcement, Generate Board Report.
- Accountant: Record Payment, Reconcile M-Pesa, Print Receipt, Send Reminder.
- Teacher: Mark Attendance, Upload Assignment, Enter Marks.
- Parent: Pay Fees, Download Report Card, Message School.

No role should see irrelevant quick actions.

- [x] **Step 4: Verify shell remains stable**

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/experience-shells.test.tsx tests/design/layout.test.tsx tests/design/global-school-search.test.tsx
```

---

## Task 4: Build the Universal Operational Components

**Files:**

- Create: `apps/web/src/components/operational/operational-action-button.tsx`
- Create: `apps/web/src/components/operational/operational-queue.tsx`
- Create: `apps/web/src/components/operational/operational-table.tsx`
- Create: `apps/web/src/components/operational/operational-form-shell.tsx`
- Create: `apps/web/src/components/operational/right-details-drawer.tsx`
- Create: `apps/web/src/components/operational/operational-state-panel.tsx`
- Create: `apps/web/tests/design/operational-action-contract.test.tsx`
- Create: `apps/web/tests/design/universal-form-table-system.test.tsx`

- [x] **Step 1: Test action health states**

Assert `OperationalActionButton` supports:

- `ACTIVE`
- `LOADING`
- `SUCCESS`
- `LOCKED`
- `DEGRADED`
- `FAILED`
- `VALIDATION_FAILED`
- `RETRY`
- `OFFLINE_DRAFT`

`LOCKED`, `DEGRADED`, and `FAILED` must keep the button visible.

- [x] **Step 2: Implement `OperationalActionButton`**

The component must accept:

```ts
type OperationalActionContract = {
  actionId: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  capability: string;
  workflowBinding: string;
  auditEvent: string;
  confirmation?: "NONE" | "REASON_REQUIRED" | "DANGER_CONFIRM";
  retryPolicy?: "NONE" | "RETRY" | "ESCALATE";
  health: "ACTIVE" | "LOADING" | "SUCCESS" | "LOCKED" | "DEGRADED" | "FAILED" | "VALIDATION_FAILED" | "RETRY" | "OFFLINE_DRAFT";
};
```

- [x] **Step 3: Test universal table requirements**

Assert `OperationalTable` renders title, description, search, filters, sort, column visibility, pagination, status badges, row actions, bulk actions, export, print, loading, empty, and error states.

- [x] **Step 4: Test universal form footer**

Assert `OperationalFormShell` can render Cancel, Save Draft, Submit, Preview, Print, Submit for Approval, Save and Send SMS, and Save and Print depending on form contract.

- [x] **Step 5: Implement the primitives with theme tokens**

Use existing `Card`, `StatusPill`, buttons/classes, and CSS variables. Avoid hardcoded new colors unless they reference semantic tokens.

---

## Task 5: Reconstruct Every Role Command Center

**Files:**

- Modify all files matching `apps/web/src/components/school/*command-center.tsx`
- Modify: `apps/web/src/components/portal/parent-command-center.tsx`
- Modify: `apps/web/src/components/platform/superadmin-pages.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/tests/design/role-dashboard-structure.test.tsx`

- [x] **Step 1: Add one test that loops through all roles**

For every role route, assert:

- the sidebar has role-specific entries
- first viewport asks what needs action now
- urgent action strip is present
- workflow queue is present
- operational table is present
- governed form or modal launcher is present
- right drawer trigger is present
- audit text is present
- role-scoped search mode is correct

- [x] **Step 2: Principal, Deputy, Secretary, Accountant**

Implement these as broad command centers with their special search modes:

- Principal: `GLOBAL_EXECUTIVE`
- Deputy: `GLOBAL_OPERATIONS`
- Secretary: `GLOBAL_FRONT_OFFICE`
- Accountant: `GLOBAL_FINANCE`

Each must expose full operational queues and high-level action buttons.

- [x] **Step 3: Academic roles**

Implement Teacher, Class Teacher, Grade/Form Master, HOD, Dean, and Exams Manager as scoped academic command centers. Each must avoid whole-school global search unless explicitly allowed by capability.

- [x] **Step 4: Welfare and discipline roles**

Implement Nurse, Guidance/Counselling, and Discipline Master using `SENSITIVE_SCOPED` search. These dashboards must show confidentiality indicators, limited search, audit trail, and emergency escalation actions.

- [x] **Step 5: Operational service roles**

Implement Librarian, Storekeeper, Boarding Master, Security Officer, Transport Manager, Lab Technician, and Admissions Officer using module-scoped search and action-first queues.

- [x] **Step 6: Portal/platform roles**

Implement Parent and Student with `SELF_ONLY` search. Implement Super Admin and System Monitor with platform search that never exposes tenant records unless explicitly authorized.

- [x] **Step 7: HR and School Administrator**

Implement HR/Payroll and School Administrator as distinct dashboards, not hidden inside Super Admin.

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/role-dashboard-structure.test.tsx
```

---

## Task 6: Complete Added Module Workspaces

**Files:**

- Modify: `apps/web/src/lib/operational/extreme-erp-blueprints.ts`
- Modify: `apps/web/src/components/school/operational-blueprint-workspace.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/src/lib/routing/experience-routes.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`
- Modify: `apps/web/src/lib/features/module-readiness.ts`
- Modify: `apps/web/tests/design/extreme-erp-reconstruction.test.tsx`

- [x] **Step 1: Ensure all 14 added modules route**

Routes/workspaces:

- `school-admin`
- `hr-payroll`
- `timetable-builder`
- `communication-center`
- `procurement`
- `school-calendar`
- `canteen-meals`
- `co-curricular`
- `data-security`
- `setup-wizard`
- `ict-assets`
- `document-printing`
- `reports-analytics`
- `universal-approvals`

- [x] **Step 2: Replace blueprint display with operational components**

`OperationalBlueprintWorkspace` should render real queue/table/form/drawer/state components, not only static descriptive cards.

- [x] **Step 3: Connect quick actions to workflow catalog**

Every urgent action in the module blueprint must map to a workflow/action ID.

- [x] **Step 4: Verify module completeness**

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/extreme-erp-reconstruction.test.tsx
```

---

## Task 7: Expand Workflow Catalog and Action Execution

**Files:**

- Modify: `apps/web/src/lib/workflows/workflow-catalog.ts`
- Modify: `apps/web/src/lib/workflows/operational-workflow-client.ts`
- Modify: `apps/web/src/components/workflows/approval-command-panel.tsx`
- Modify: `apps/web/tests/design/frontend-operationalization.test.tsx`
- Modify: `apps/web/tests/design/experience-actions.test.tsx`

- [x] **Step 1: Add missing workflows**

Add workflow definitions for:

- admissions approval
- transport route assignment
- lab breakage approval
- chemical reorder
- stock issue
- visitor incident
- boarding leave-out
- counselling escalation
- discipline parent meeting
- library lost book
- payroll exception
- timetable publish
- procurement purchase order
- document print request
- SMS retry
- M-Pesa reconciliation
- report export
- universal approval escalation

- [x] **Step 2: Enforce action state contract**

Every workflow action must define:

- `actionId`
- `label`
- `capability`
- `workflowBinding`
- `handler`
- `eventContract`
- `auditEvent`
- `failurePolicy`
- `health`

- [x] **Step 3: Keep failures visible**

If dispatch fails, the UI must show `FAILED` or `DEGRADED`, a retry button, and audit/failure text. It must not remove the action.

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/frontend-operationalization.test.tsx tests/design/experience-actions.test.tsx
```

---

## Task 8: Forms, Tables, Printing, SMS, and Documents

**Files:**

- Modify: `apps/web/src/components/operational/operational-form-shell.tsx`
- Modify: `apps/web/src/components/operational/operational-table.tsx`
- Modify: `apps/web/src/components/school/operational-blueprint-workspace.tsx`
- Modify: role command center files that currently use custom table/form markup
- Modify: `apps/web/tests/design/universal-form-table-system.test.tsx`

- [x] **Step 1: Standardize form footer behavior**

Every form contract must support the relevant subset of:

- Cancel
- Save Draft
- Submit
- Preview
- Print
- Submit for Approval
- Save and Send SMS
- Save and Print

- [x] **Step 2: Standardize table behavior**

Every table must support:

- search box
- filters
- sort controls
- column visibility
- pagination
- status badges
- row actions
- bulk select
- bulk actions
- export
- print
- loading skeleton
- empty state
- error state

- [x] **Step 3: Implement print/SMS action surfaces**

Printing outputs must include admission letters, receipts, report cards, class lists, fee statements, clearance forms, stock cards, route manifests, visitor badges, library cards, medical notes, and board reports.

SMS actions must show delivery state and retry behavior.

---

## Task 9: Mobile, Offline, and Low-Bandwidth Behavior

**Files:**

- Create: `apps/web/tests/design/mobile-low-bandwidth.test.tsx`
- Modify: `apps/web/src/components/system/app-topbar.tsx`
- Modify: `apps/web/src/components/operational/*`
- Modify: role command center files where first viewport overflows mobile

- [x] **Step 1: Add mobile tests**

Assert mobile views prioritize:

- urgent actions
- search appropriate to role
- workflow inbox
- quick forms
- emergency buttons
- sync/offline badge

- [x] **Step 2: Add offline/degraded copy**

Use clear messages:

- `Attendance saved locally, but sync failed. Sync again.`
- `Payment saved, but SMS failed. Retry SMS.`
- `M-Pesa transaction could not be reconciled. Check transaction code.`
- `You cannot approve this request. Only the Principal has permission.`

- [x] **Step 3: Verify no layout collapse**

Role dashboards must not lose action buttons, forms, or queue cards in mobile, locked, failed, or degraded states.

---

## Task 10: Certification, Scorecard, and Deployment Gate

**Files:**

- Modify: `docs/scorecards/production-readiness-scorecard.md`
- Create or modify: `apps/web/tests/design/implementation142-certification.test.ts`
- Optionally add script: `apps/api/src/scripts/implementation142-certification.ts` if the repo’s certification pattern requires it.

- [x] **Step 1: Add Implementation 142 certification checks**

Certification must verify:

- all DOCX roles exist
- all role structures are complete
- search governance is correct
- all 14 added modules exist
- all buttons have action contracts
- all tables/forms expose required controls
- all role dashboards have visible failure states
- all role dashboards use scoped search correctly
- all role dashboards avoid long-scroll section navigation

- [x] **Step 2: Run focused verification**

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath \
tests/design/extreme-docx-operating-system.test.ts \
tests/design/extreme-erp-reconstruction.test.tsx \
tests/design/global-school-search.test.tsx \
tests/design/search-access-policy.test.ts \
tests/design/role-dashboard-structure.test.tsx \
tests/design/operational-action-contract.test.tsx \
tests/design/universal-form-table-system.test.tsx \
tests/design/frontend-operationalization.test.tsx \
tests/design/experience-actions.test.tsx \
tests/design/mobile-low-bandwidth.test.tsx
```

- [x] **Step 3: Run lint and build**

Run:

```bash
npm --prefix apps/web run lint
npm --prefix apps/web run build
```

- [x] **Step 4: Deploy frontend**

Run from `apps/web`:

```bash
vercel deploy --prod --yes
```

- [x] **Step 5: Smoke-check production**

Run:

```bash
Invoke-WebRequest -Uri "https://myshule.online" -UseBasicParsing
vercel inspect <new-deployment-url>
vercel logs <new-deployment-url> --since 10m --level error
Invoke-WebRequest -Uri "https://myshule.online/api/operational-workflows/principal/catalog" -UseBasicParsing
Invoke-WebRequest -Uri "https://my-shule-api-production.up.railway.app/health/ready" -UseBasicParsing
```

Expected:

- `myshule.online` returns `200`
- Vercel deployment is `Ready`
- protected workflow API returns `401` without a session
- Vercel error logs show no relevant app errors
- Railway readiness is reachable and any degraded state is explained by telemetry, not broken core dependencies

---

## Task 11: Corrective Dashboard Isolation Gate

This task exists because Implementation 142 is not acceptable if dashboards only look operational while still sharing the same queue, form, table, or diagnostic content behind every sidebar item.

**Files:**

- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Modify: `apps/web/src/components/operational/operational-action-button.tsx`
- Modify: `apps/web/src/components/operational/operational-queue.tsx`
- Modify: `apps/web/src/components/operational/operational-table.tsx`
- Modify: `apps/web/src/components/operational/operational-form-shell.tsx`
- Modify: `apps/web/tests/design/role.test.tsx`
- Modify: `apps/web/tests/design/role-dashboard-structure.test.tsx`

- [x] **Step 1: Stop shared sidebar content**

Every sidebar item must generate its own isolated workspace contract:

- unique workspace action strip
- unique workflow queue title
- unique queue items
- unique row actions
- unique table columns
- unique form fields
- unique footer actions
- unique workflow state path

Examples:

- `Attendance` must show attendance actions such as Mark Present, Mark Absent, Record Reason, Notify Parent.
- `Parent Communication` must show communication actions such as Send Message, Schedule Meeting, Use Template, Mark Responded.
- `Finance Oversight` must show finance actions such as Record Payment, Reconcile, Print Receipt, Send Reminder.
- `Laboratory Chemicals` must show lab actions such as Add Chemical, Record Breakage, Schedule Maintenance, Submit Incident.

- [x] **Step 2: Stop self-healing noise in normal workspaces**

Self-healing, recovery-state, capability-contract, and fallback diagnostics must not fill ordinary dashboards.

Allowed:

- normal workspace queue
- normal workspace records
- normal workspace form
- normal workspace audit timeline

Forbidden outside audit/system-health workspaces:

- giant `Visible recovery states` panels
- constant `Capability:` / `Workflow:` / `Audit:` technical blocks
- repeated AGP implementation messages in every action card
- loading/empty/degraded demo panels appended to every table

- [x] **Step 3: Improve dashboard action buttons**

Action buttons must feel like professional ERP controls, not diagnostic cards.

Requirements:

- compact controls by default
- system theme colors only
- no visible `ACTIVE` chip on healthy compact buttons
- health chips appear only for degraded, failed, locked, retry, validation, or offline states
- aria labels still expose health state for tests and accessibility

- [x] **Step 4: Make queues real operational workspaces**

Each workspace queue must contain multiple realistic Kenyan school workflow items, not one generic repeated item.

Each queue item must include:

- title
- owner
- SLA
- priority
- stage path
- at least 3 executable actions
- audit trail readiness

- [x] **Step 5: Make records and forms workspace-specific**

Records and forms must reflect the clicked sidebar item.

Examples:

- Attendance records columns: Student/Class, Reason, Last Seen, Status, Next Action.
- Finance records columns: Account, Amount, Payment Ref, Parent, Status, Next Action.
- Transport records columns: Vehicle/Route, Driver, ETA, Status, Next Action.
- Clinic forms: Student, Visit Type, Medicine/Referral, Guardian Phone, Clinical Note.
- Security forms: Visitor/Pass, ID Number, Destination, Action Taken, Admin Notification.

- [x] **Step 6: Keep first viewport action-first**

The first viewport for every role must show:

- urgent action question
- first-viewport issues
- role primary actions
- workflow inbox

It must not show:

- analytics-first layouts
- recovery demo panels
- long stacked module pages

- [x] **Step 7: Add regression tests for the exact failures reported**

Tests must prove:

- sidebar clicks switch isolated workspace content
- Attendance and Parent Communication do not share actions
- records are hidden until Records tab
- forms are hidden until Form tab
- normal Audit tab does not show self-healing recovery panels
- diagnostic recovery panels are isolated to Audit Logs/system-health style workspaces
- action buttons remain executable through governed workflow dispatch

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/role.test.tsx tests/design/role-dashboard-structure.test.tsx
```

Expected:

- all tests pass
- no sidebar workspace shares the same operational queue/form/table unless intentionally scoped to the same business function
- no ordinary dashboard is filled with self-healing messages

---

## Task 12: Button Execution and Data Entry Reality Gate

This task exists because Implementation 142 is not complete if buttons merely change color, dispatch empty workflow events, or leave form data trapped in the browser.

**Files:**

- Modify: `apps/web/src/components/operational/operational-form-shell.tsx`
- Modify: `apps/web/src/components/operational/operational-table.tsx`
- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Modify: `apps/web/tests/design/role.test.tsx`

- [x] **Step 1: Capture actual form values**

Every governed form must submit the field values entered by the user.

Required payload shape:

- `workspace`
- `source.type`
- `source.action`
- `formTitle`
- `formData`
- `runtimeActionContract`

Example:

```json
{
  "workspace": "Finance Oversight",
  "source": { "type": "form", "action": "Submit" },
  "formData": {
    "amount-paid": "18500",
    "transaction-code": "QEX7ABC123",
    "parent-phone": "0712345678"
  }
}
```

- [x] **Step 2: Dispatch form data through the workflow API**

Form buttons must send real payloads to:

```text
/api/operational-workflows/roles/:role/actions/:actionId/dispatch
```

The backend outbox event must receive the submitted payload inside the event-sourced workflow dispatch body.

- [x] **Step 3: Materialize submitted entries inside the active workspace**

After successful dispatch, the active workspace must update visibly without requiring reload.

Required:

- submitted form entry appears in the workspace records table
- submitted form entry appears in the workflow queue
- status shows `Saved from form submission` or `Draft saved`
- entered values such as M-Pesa code, amount, phone, student, and notes remain visible

- [x] **Step 4: Make table controls executable**

Table controls must invoke action handlers:

- Export
- Print
- Filters
- Sort controls
- Columns
- Bulk actions
- Row actions

No table control may be decorative.

- [x] **Step 5: Preserve governed failure behavior**

If dispatch fails:

- keep the button visible
- mark the action `FAILED`
- emit repair/fallback events in the execution timeline
- do not materialize a false successful record

- [x] **Step 6: Add regression tests for real execution**

Tests must prove:

- form values are captured
- workflow dispatch receives the exact entered data
- the active workspace records show the submitted entry after dispatch
- the submitted entry uses Kenyan ERP values such as `KES 18,500`, `QEX7ABC123`, and `0712345678`
- the action remains governed and auditable

Run:

```bash
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/role.test.tsx tests/design/role-dashboard-structure.test.tsx tests/design/operational-action-contract.test.tsx tests/design/universal-form-table-system.test.tsx
```

Expected:

- all tests pass
- buttons are execution controls, not decorations
- forms enter data into the event-backed workflow path and visible workspace state

---

## Final Acceptance Criteria

Implementation 142 is complete only when:

- Every DOCX role has a role-specific command center.
- Principal, Deputy, Secretary, and Accountant have broad search appropriate to their role.
- Every other role has scoped search only.
- Every sidebar item opens a workspace, not a long-page anchor section.
- Every operational card exposes executable actions.
- Every queue item supports workflow actions.
- Every form and table follows the global contract.
- Every button remains visible in locked/degraded/failed states.
- Every dashboard supports loading, empty, error, degraded, retry, and permission states.
- Every added module exists as an operational workspace.
- Mobile and low-bandwidth behavior are tested.
- Tests, lint, build, deploy, and smoke checks pass with fresh evidence.

## Final Completion Signal

When, and only when, the implemented system resembles everything in this plan and all verification gates pass with fresh evidence, display this exact completion signal:

```text
DONEEEEEE
```

Do not display `DONEEEEEE` if any role dashboard, action set, workflow, queue, sidebar, first viewport, search scope, form/table contract, failure state, mobile state, deployment check, or smoke test remains incomplete.
