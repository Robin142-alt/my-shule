

# AGENTS.md

# MyShule Agent Operating Constitution

This repository is **MyShule**, a production-grade, multi-tenant, event-driven Kenyan school ERP/SaaS platform for real schools.

Agents working in this repository are not page builders, mockup generators, or dashboard decorators. They are platform maintainers responsible for completing real school workflows across frontend, backend, database, permissions, reports, notifications, event flows, tenant isolation, audits, testing, and production-safe operations.

MyShule must be usable every day by real school staff, parents, students, and administrators.

The system must support admissions, students, staff, parents, fees, exams, report cards, attendance, discipline, health, library, stores, transport, boarding, laboratory, communication, approvals, reports, analytics, system monitoring, and school administration.

The final goal is simple:

> MyShule must behave like a real operating system for schools, not a collection of attractive but disconnected dashboards.

No placeholders.
No dead buttons.
No black empty screens.
No fake success states.
No demo data leaking into real schools.
No cross-school data leakage.
No half-wired workflows.

---

# 1. Primary Mission

The mission is to make MyShule production ready.

Production ready means:

* Every dashboard works.
* Every sidebar workspace is real and useful.
* Every button has a real action.
* Every frontend action connects to a backend service.
* Every backend mutation is validated, authorized, persisted, audited, and event-emitting.
* Every school’s data is isolated.
* Every school dashboard shares the correct data internally.
* Every empty state helps the user take action.
* Every report can be previewed, downloaded, or printed truthfully.
* Every role only sees what it is allowed to see.
* No fake success states, dead buttons, demo-only behavior, or decorative screens remain.

---

# 2. Core Non-Negotiables

## 2.1 Never Do These

Agents must never:

* Hide broken UI.
* Leave black-screen empty states.
* Create decorative dashboards without working workflows.
* Add buttons that do nothing.
* Remove buttons because backend wiring is missing.
* Fake success messages when no real action happened.
* Use demo data as real production data.
* Seed demo data into real invited schools.
* Bypass tenant isolation.
* Bypass permissions.
* Bypass validation.
* Bypass event emission.
* Bypass audit logging.
* Skip approval rules.
* Couple dashboards directly to each other.
* Mutate school-owned data without `school_id` or tenant scope.
* Create frontend-only workflows without backend persistence.
* Create backend endpoints with no frontend integration where UI is required.
* Create duplicate workspaces with copied content.
* Allow users to access another school’s data by changing IDs.
* Print fake documents without preview/download.
* Mark a workflow complete if it is half-wired.
* Ignore mobile usability.

## 2.2 Always Do These

Agents must always:

* Repair incomplete workflows instead of hiding them.
* Keep broken features visible with meaningful error or degraded states.
* Wire buttons to real handlers.
* Validate forms.
* Persist data correctly.
* Emit events for important state changes.
* Update affected dashboards through shared data, events, projections, or notifications.
* Enforce strict school isolation.
* Preserve auditability.
* Add or update tests where risk exists.
* Follow existing project patterns unless they are clearly broken.
* Keep dashboards operational.
* Keep data visible across dashboards within the same school.
* Ensure every sidebar item opens a real workspace.
* Ensure every workspace supports a real school task.
* Ensure every action has loading, success, error, and empty states.
* Ensure every record belongs to exactly one school unless explicitly global.
* Ensure invited schools start clean.
* Ensure demo data belongs only to approved demo tenants.
* Ensure frontend and backend contracts match.
* Ensure reports and print documents are previewable and downloadable.
* Verify changes before reporting completion.

---

# 3. Mandatory Boot Order

Before making meaningful changes, agents must reason through this order:

1. Agent Governance Protocol
2. Tenant Isolation Layer
3. Event Bus Initialization
4. Database Contract Layer
5. Permission Matrix
6. Role and Dashboard Registry
7. Widget Registry
8. Frontend Routing Registry
9. Backend API Contract Registry
10. Workflow State Machines
11. Notification Engine
12. Approval Engine
13. Offline Sync Rules
14. Reports and Print Engine
15. Testing Contract
16. Production Readiness Verification

No agent may implement isolated UI without checking the relevant backend contract, role permission, tenant rule, event emission, audit trail, and workflow impact.

---

# 4. Mandatory Execution Chain

For every meaningful feature or action, follow this chain:

1. Intent
2. Authentication
3. Role and capability check
4. School/tenant scope check
5. Input validation
6. Backend service execution
7. Database/projection update
8. Event emission
9. Notification or approval trigger where needed
10. Widget/dashboard refresh
11. Audit logging
12. User feedback
13. Test or verification

No step should be skipped for production workflows.

---

# 5. Agent Governance Protocol

The Agent Governance Protocol, AGP, is the supreme execution authority.

Every action must pass:

* Identity validation
* Role validation
* Capability validation
* Tenant/school validation
* Policy validation
* Input validation
* Audit binding

AGP must block:

* Unauthorized execution
* Cross-school data leakage
* Silent mutations
* Untracked changes
* Privilege escalation
* Unsafe exports
* Approval bypasses

Frontend role checks are not enough. Backend enforcement is mandatory.

---

# 6. Tenant Isolation Rules

MyShule is multi-tenant. Every real school is a tenant.

The system may use `school_id`, `tenant_id`, or both depending on the existing schema, but the meaning must remain consistent:

* `school_id` is the school ownership boundary.
* `tenant_id` may only be used as an internal tenant alias if already present.
* Do not mix them carelessly.
* Do not query school-owned data without tenant/school filtering.

Every school-owned record must be scoped.

This includes:

* Students
* Parents
* Staff
* Classes
* Streams
* Subjects
* Attendance
* Fees
* Invoices
* Payments
* Receipts
* Exams
* Marks
* Report cards
* Discipline cases
* Health visits
* Medicine stock
* Library books
* Book issues
* Store inventory
* Stock issues
* Boarding records
* Transport records
* Visitors
* Notifications
* Messages
* Reports
* Documents
* Audit logs
* Approval requests
* Offline sync records

Agents must never allow:

* Cross-school reads
* Cross-school writes
* Global school-data queries without `school_id` filtering
* Dashboard data from another tenant
* Parent access to children from another school
* Staff access to schools where they have no membership
* Demo data appearing in a real invited school

Only these may be global:

* Platform configuration
* Super Admin records
* Module catalog
* Subscription/package definitions
* System health metadata
* Provider settings
* Global audit metadata

Even global records must not expose school-private data.

---

# 7. Shared School Data Rules

Dashboards inside the same school must share one source of truth through the backend, database, event bus, and projections.

Do not duplicate disconnected dashboard data.

Examples:

* If the Secretary admits a student, that student must appear in class lists, fees, attendance, exams, parent portal, student portal, discipline, library, boarding, transport, and principal dashboards where relevant.
* If the Accountant records a fee payment, the parent balance, student balance, principal finance summary, receipt, and audit log must update.
* If the Teacher enters marks, HOD/Dean can review, Exams Manager can moderate, Principal can approve/publish, and Parent/Student can view only after publishing.
* If the Nurse records a serious health visit, the parent receives an alert where configured, Principal/Deputy can view the urgent case, and medicine stock updates if medicine was dispensed.
* If the Librarian marks a book overdue or lost, the Parent/Student portal updates, the Accountant sees any billable fine, and the Principal can view the summary.

Each dashboard is a different workflow layer over the same school data.

All cross-dashboard communication must remain school-scoped.

---

# 8. Event-Driven Architecture Rules

The event bus is the operational truth layer.

Every meaningful state-changing action must emit an event.

If the project is currently monolithic, implement events using the existing local event system, message queue, domain event table, service abstraction, or codebase pattern. Do not force a full microservices rewrite unless explicitly requested.

Events must include:

* `event_id`
* `event_type`
* `school_id`
* `actor_user_id`
* `actor_role`
* `entity_type`
* `entity_id`
* `timestamp`
* `payload`
* `source_dashboard`
* `correlation_id`

Example events include:

* `student.created`
* `student.admitted`
* `student.transferred`
* `student.graduated`
* `staff.invited`
* `staff.activated`
* `staff.role_updated`
* `attendance.marked`
* `exam.created`
* `marks.submitted`
* `marks.moderated`
* `report_card.generated`
* `report_card.published`
* `invoice.created`
* `payment.received`
* `receipt.generated`
* `library.book_issued`
* `library.book_returned`
* `library.fine_created`
* `health.visit_logged`
* `health.parent_alert_sent`
* `discipline.incident_logged`
* `discipline.parent_summoned`
* `store.stock_received`
* `store.item_issued`
* `visitor.checked_in`
* `visitor.checked_out`
* `transport.route_assigned`
* `transport.trip_logged`
* `boarding.roll_call_submitted`
* `approval.requested`
* `approval.approved`
* `approval.rejected`
* `notification.sent`
* `document.generated`
* `offline_sync.queued`
* `offline_sync.completed`
* `offline_sync.failed`

Failure events should exist where useful:

* `action.failed`
* `service.timeout`
* `notification.failed`
* `payment.callback_failed`
* `sync.failed`
* `report_generation.failed`

Events must power:

* Notifications
* Audit logs
* Cross-dashboard updates
* Reports
* Analytics
* Approval queues
* Background jobs
* Parent/student visibility
* System Monitor diagnostics

---

# 9. Database Contract Rules

The database stores durable state, projections, and read models.

Rules:

* No school-owned table without school/tenant scope.
* No mutation without validation and authorization.
* No sensitive mutation without audit logging.
* No financial mutation without traceability.
* No report publishing without status tracking.
* No direct cross-service database access where a governed API/event exists.
* Use transactions for multi-step workflows.
* Use unique constraints where duplicates are dangerous.
* Use tenant-aware indexes for school-scoped queries.

Every important table should include:

* `id`
* `school_id` where tenant-owned
* `created_at`
* `updated_at`
* `created_by`
* `updated_by`
* Status/state where workflow-based
* Audit/event linkage where relevant

Recommended write flow:

1. Command
2. Validate
3. Authorize
4. Save transactionally
5. Emit event
6. Update projections/read models
7. Notify affected users
8. Audit

Important school records must support lifecycle states.

Student lifecycle:

* `inquiry`
* `applicant`
* `accepted`
* `admitted`
* `active`
* `suspended`
* `transferred`
* `graduated`
* `archived`

Staff lifecycle:

* `invited`
* `pending_setup`
* `active`
* `suspended`
* `transferred`
* `exited`
* `archived`

Invoice lifecycle:

* `draft`
* `issued`
* `partially_paid`
* `paid`
* `overdue`
* `waived`
* `cancelled`

Approval lifecycle:

* `requested`
* `pending_review`
* `approved`
* `rejected`
* `escalated`
* `cancelled`
* `expired`

---

# 10. Frontend And Backend Wiring Rules

Every frontend workflow must map to a backend contract.

Agents must check:

* Page route
* Sidebar route
* Workspace component
* Form schema
* API endpoint
* Request DTO
* Response DTO
* Validation
* Permission guard
* Tenant guard
* Event emission
* Audit logging
* Notification trigger
* Error handling
* Tests

Frontend must not invent fields the backend does not accept.

Backend must not return shapes the frontend cannot render.

Every endpoint/service must include:

* Authentication
* Authorization
* School/tenant scoping
* Input validation
* Business rule validation
* Safe persistence
* Event emission
* Audit logging where needed
* Clear error responses

Do not rely on frontend checks alone.

---

# 11. Dashboard, Sidebar, And Workspace Rules

Every sidebar item must open a real, unique, useful workspace.

Sidebar items must not scroll to sections on one long page unless the product explicitly uses that pattern.

Each workspace must include, where appropriate:

* Workspace title
* Short operational summary
* Search
* Filters
* Main table/list/grid/cards
* Primary action
* Row actions
* Empty state
* Loading state
* Error state
* Success feedback
* Permission-aware controls
* Mobile-friendly layout

A workspace must never be:

* A blank black page
* “Coming soon”
* Static explanation only
* A button that does nothing
* A table with no actions
* An empty state with no next step
* Fake analytics with no source data
* Repeated generic content copied from another workspace

Every workspace must include at least one of:

* A form
* A list/table
* A queue
* A dashboard widget
* A report
* A print/download action
* A review action
* A communication action
* A workflow step
* A useful empty state with a real next action

Good empty states must say:

* What is missing
* Why it matters
* What the user can do next

Examples:

* “No students have been admitted yet. Add the first student manually or import a student list.”
* “No fee structure exists. Create fee structure before invoicing.”
* “No books found. Add a book manually or import the library catalogue.”
* “No exam configured. Create an exam, add subjects, then open mark entry.”
* “No medicine stock. Add medicine stock before dispensing.”

---

# 12. Button And Action Rules

Buttons must never be decorative.

Every button must have:

* One clear purpose
* Permission check
* Click handler
* Validation
* Loading state
* Error state
* Success state
* Backend call where needed
* Truthful queued/offline state where offline support exists
* UI refresh after completion
* Audit log where required
* Event emission where required

Button states:

* `ACTIVE`: fully operational
* `LOADING`: action in progress
* `LOCKED`: user lacks permission
* `DEGRADED`: fallback path active
* `FAILED`: visible failure with retry/repair path
* `OFFLINE_QUEUED`: saved locally for sync where offline support exists

If a button is not wired, wire it. Do not delete it unless the product requirement itself is invalid.

No button may silently fail.

---

# 13. Form And Import Rules

Every form must include:

* Required field validation
* Correct input types
* Helpful error messages
* Submit loading state
* Disabled double-submit
* Cancel/close behavior
* Success confirmation
* Error recovery
* Backend validation
* School-scoped persistence

Bulk forms/imports must include:

* File validation
* Preview before import
* Duplicate handling
* Partial-success summary
* Downloadable error report where useful
* Audit trail

---

# 14. Widget Registry Rules

Dashboards may be widget-driven, but widgets must support real workflows.

Every widget should define:

* Widget ID
* School scope
* Required permissions
* Data source
* Event subscriptions
* Loading state
* Empty state
* Error state
* Degraded state
* Refresh behavior
* Actions

Widget states:

* `ACTIVE`
* `EMPTY`
* `LOADING`
* `LOCKED`
* `DEGRADED`
* `FAILED`

Broken widgets must remain visible with useful recovery information.

Never hide a widget simply because data is missing or a service failed.

---

# 15. Role Rules

MyShule supports these roles:

* Super Admin
* System Monitor
* Principal
* Deputy Principal
* Secretary
* Accountant/Bursar
* Teacher
* Class Teacher
* Grade/Form Master
* Head of Department
* Dean of Academics
* Exams Manager
* Admissions Officer
* Nurse
* School Counsellor
* Discipline Master
* Librarian
* Storekeeper
* Boarding Master
* Security Officer
* Transport Manager
* Laboratory Technician
* Parent
* Student

Leadership roles may still teach.

The following roles can also perform teacher workflows if assigned teaching duties:

* Principal
* Deputy Principal
* Dean of Academics
* Head of Department
* Exams Manager
* Discipline Master
* Boarding Master
* Grade/Form Master
* Class Teacher
* Guidance/Counselling Teacher

They must be able to:

* Enter marks
* Record lesson coverage
* Give homework/assignments
* Take attendance
* View assigned classes and subjects

Do not assume leadership roles are non-teaching roles.

---

# 16. Permission Rules

Permissions must be role-based, school-scoped, and capability-aware.

A user may only access:

* Their own school
* Their assigned modules
* Their permitted dashboards
* Their permitted actions
* Their assigned classes, subjects, departments, dorms, routes, or work areas where applicable
* Their children’s data if parent
* Their own data if student

Sensitive actions require strict permission checks:

* Staff invitation
* Role assignment
* Fee waiver
* Payment reversal
* Mark publishing
* Report card publishing
* Student transfer
* Student exit
* Student suspension
* Discipline escalation
* Medical sensitive notes
* Stock adjustment
* Lost/damaged asset confirmation
* Data export
* Module enabling/disabling
* Tenant configuration

---

# 17. Invitation And Onboarding Rules

The correct school onboarding flow is:

1. Super Admin creates school.
2. Super Admin invites the first Principal.
3. Principal accepts invitation.
4. Principal completes school setup.
5. Principal invites and manages staff.
6. Staff accept invitations.
7. Parents/students are linked only after real school data exists.

Rules:

* The first Principal is invited only during Super Admin school onboarding.
* Principal is not self-created outside onboarding.
* System Monitor is invited only by Super Admin.
* Staff belong to a school.
* Parents belong through linked students.
* Students belong to a school and class/grade/form.
* Invitation acceptance must use the invited email.
* Login redirects must match the user’s correct role/dashboard.
* Wrong-role access must be denied truthfully.

New invited schools must be clean.

They must not receive:

* Kisumu Boys demo students
* Demo parents
* Demo staff
* Demo invoices
* Demo exams
* Demo health records
* Demo discipline records
* Demo library records
* Demo store data

Demo data may only exist in explicitly marked demo schools.

---

# 18. Module Rules

MyShule modules must be controlled manually by Super Admin or authorized platform administration.

Paid modules include:

* Admissions
* Academics
* Exams and Report Cards
* Attendance
* Finance
* Library
* Health/Nurse
* Discipline
* Counselling
* Transport
* Boarding
* Store/Inventory
* Laboratory
* Security/Visitors
* Communication
* Parent Portal
* Student Portal
* Staff Management
* Timetable
* Documents/Letters
* Notifications
* Analytics
* Offline Sync
* System Monitoring

If a module is disabled:

* Hide or lock its advanced actions.
* Do not break dashboards.
* Show a useful module-disabled or upgrade state.
* Do not delete existing data.

---

# 19. Approval Rules

Approvals must be explicit and traceable.

Approval workflows may apply to:

* Fee waivers
* Payment reversals
* Budget approvals
* Stock adjustments
* Stock write-offs
* Lost/damaged asset confirmations
* Discipline escalation
* Medical emergency escalation
* Boarding exeat approval
* Report card publishing
* Student suspension
* Student transfer/exit
* Staff suspension
* Staff role changes
* Sensitive record edits

Every approval must record:

* Requester
* Approver
* School
* Status
* Reason
* Comments
* Timestamp
* Related entity
* Decision notes
* Audit log
* Notification events

Approval statuses should include:

* `PENDING`
* `APPROVED`
* `REJECTED`
* `CANCELLED`
* `EXPIRED`
* `ESCALATED`

---

# 20. Notification Rules

Notifications must be triggered by real events.

Supported channels:

* In-app
* SMS
* Email
* Parent portal
* Student portal where appropriate

Notifications must include:

* Recipient
* `school_id`
* Title
* Message
* Priority
* Related entity
* Read/unread state
* Delivery status
* Retry state where applicable

Trigger examples:

* Fee payment recorded
* Fee arrears detected
* Report card published
* Discipline case opened
* Parent summons issued
* Serious health incident recorded
* Student absent
* Book overdue
* Stock low
* Expired medicine
* Visitor checked in
* Admission accepted
* Approval requested
* Approval completed
* Transport route changed
* Boarding exeat approved
* Failed payment callback
* Failed sync job

Do not send cross-school notifications.

Do not mark a notification as sent unless the provider accepts it or a truthful queued state exists.

---

# 21. Offline Sync Rules

Where offline support exists, the system must:

* Save locally when offline.
* Show truthful saved-for-sync status.
* Sync automatically when online.
* Prevent duplicate submissions.
* Track sync status.
* Allow retry.
* Show failed sync items.
* Resolve conflicts clearly.
* Never pretend offline data has reached the server before it syncs.

Offline-capable workflows may include:

* Attendance
* Marks entry
* Lesson coverage
* Health visit drafts
* Store issue drafts
* Discipline incident drafts
* Boarding roll call
* Security visitor queue

Useful sync statuses:

* `LOCAL_DRAFT`
* `QUEUED`
* `SYNCING`
* `SYNCED`
* `FAILED`
* `CONFLICT`

Every sync must preserve:

* `school_id`
* Actor
* Timestamp
* Original local creation time
* Conflict state
* Event emission after successful sync

Offline sync must not duplicate records.

---

# 22. Report And Print Rules

Reports must never fake printing.

Every printable document must support:

* Preview
* Download
* Print
* Document number
* Correct school branding
* Correct student/staff/parent details where applicable
* Correct dates
* Correct totals
* Correct signatures/approval status where applicable
* Generated date
* Generated by
* Audit-safe generation

Required documents include:

* Fee receipt
* Fee statement
* Report card
* Admission letter
* Visitor slip
* Library issue slip
* Library return slip
* Library fine notice
* Stock issue slip
* Stocktake report
* Discipline letter
* Parent summons
* Medical referral
* Hostel/boarding roll call
* Transport report
* Exam analysis
* Board/principal report

No “printed successfully” message should appear unless a real preview, download, or print path exists.

---

# 23. Dashboard Communication Rules

Dashboards communicate through shared data, APIs, events, notifications, projections, and approval queues.

They must not directly mutate each other’s private UI state.

Examples:

Teacher to Storekeeper:

* Teacher requests item.
* Storekeeper receives request.
* Storekeeper approves, issues, or declines.
* Teacher receives notification.
* Stock ledger updates.

Nurse to Parent/Principal:

* Nurse logs health visit.
* Parent is alerted if needed.
* Principal/Deputy sees urgent case if escalated.
* Student health history updates.

Librarian to Parent/Accountant:

* Book overdue creates fine where enabled.
* Parent receives notice.
* Accountant sees financial impact if fine is billable.

Exams to Parent:

* Teacher submits marks.
* HOD/Dean moderates.
* Exams Manager publishes.
* Parent sees report card only after publishing.

Security to Secretary/Principal:

* Visitor checks in.
* Secretary sees visitor queue.
* Principal/Deputy receives alert for VIP or flagged visitor.

---

# 24. Domain And Architecture Rules

MyShule may currently be monolithic, modular, or partially service-oriented.

Agents must not force a microservices rewrite unless explicitly instructed.

Instead:

* Preserve clean domain boundaries.
* Keep services modular.
* Use events between domains.
* Avoid direct dashboard-to-dashboard coupling.
* Avoid one giant shared service for everything.
* Make future extraction to microservices possible.

Core domains include:

* Identity/Auth
* Schools/Tenants
* Students
* Staff
* Parents
* Admissions
* Academics
* Exams
* Report Cards
* Attendance
* Finance
* Discipline
* Health
* Library
* Inventory/Stores
* Transport
* Boarding
* Laboratory
* Communication
* Notifications
* Reports/Documents
* Approvals
* Audit
* System Monitoring

---

# 25. Frontend Rules

The frontend must be operational, not decorative.

Every dashboard must:

* Load real data.
* Handle loading.
* Handle errors.
* Handle empty states.
* Support mobile.
* Use real actions.
* Respect permissions.
* Refresh after mutations.
* Avoid cramped layouts.
* Avoid nested scrolling where possible.
* Keep sidebar/topbar stable.
* Make the main workspace large enough for real work.

Mobile views must use:

* Responsive tables or cards
* Drawers/modals where useful
* Clear touch targets
* Compact action menus
* Readable forms
* No overlapping controls

UI must be:

* Clear
* Fast
* Mobile-friendly
* Dense enough for school offices
* Calm enough for daily use
* Useful even when data is empty
* Consistent across dashboards

Avoid:

* Overly decorative cards
* Repeated fake widgets
* Huge unused spacing
* Black empty screens
* Tiny unreadable tables
* Nested scrolling traps
* Buttons with unclear meaning
* Fake “coming soon” workspaces

---

# 26. Demo Data Rules

Demo data must never leak into real invited schools.

Only the designated demo school may contain demo records.

Newly onboarded schools must start clean, with only required setup defaults.

Do not seed Kisumu Boys or any other demo data into new schools unless explicitly requested.

---

# 27. Super Admin And System Monitor Rules

Super Admin handles:

* School onboarding
* Principal invitation
* Module access control
* Tenant configuration
* Provider configuration
* High-level tenant health
* Controlled administrative actions

System Monitor handles:

* Failed jobs
* Retry queues
* SMS/email delivery failures
* Payment callback failures
* Offline sync health
* Event processing health
* Service health
* Audit/repair visibility

System Monitor is invited by Super Admin only.

---

# 28. Kenyan School Context Rules

MyShule must support Kenyan school realities.

Agents should consider:

* CBC
* 8-4-4 legacy structures
* Hybrid schools
* Primary, junior school, senior school, and secondary school setups
* Terms
* Streams
* Houses
* Boarding students
* Day scholars
* Fee balances
* M-Pesa payments
* Parent SMS communication
* Manual admissions
* Application-based admissions
* Report cards
* Class teacher comments
* Principal comments
* Attendance registers
* Exam moderation
* Staff who hold multiple responsibilities

---

# 29. Testing Contract

Before work is considered complete, agents must run or create tests appropriate to the change.

Tests should cover:

* Authentication
* Authorization
* School isolation
* Dashboard routing
* Sidebar workspace rendering
* Empty states
* Button wiring
* Form validation
* CRUD workflows
* Cross-dashboard data sharing
* Event emission
* Notifications
* Approval flows
* Reports
* Print/download paths
* Offline sync where applicable
* Mobile responsiveness where practical
* Error states
* Audit logs

A feature is not production-ready until it passes workflow tests.

If tests fail because the feature is incomplete, implement the missing feature instead of weakening the test.

---

# 30. Agent Working Rules

When modifying this repository:

* Read the existing code structure first.
* Inspect the current routes, APIs, database schema, permissions, and tests related to the task.
* Understand current patterns before changing files.
* Preserve existing architecture and code style unless a change is necessary for production readiness.
* Keep changes scoped to the requested feature.
* Do not remove user work.
* Do not delete actions to avoid wiring them.
* Do not create disconnected mock systems.
* Prefer completing existing workflows over adding new visual surfaces.
* Fix root causes.
* Respect `school_id`/tenant isolation everywhere.
* Verify changes before reporting completion.
* Document assumptions only when they affect behavior.
* Preserve architectural direction without overengineering the current codebase.

Before marking work complete, verify:

* The route opens.
* The sidebar item works.
* The workspace is useful.
* The button/action works.
* The backend persists data.
* Tenant isolation is enforced.
* Permissions are enforced.
* Events/audit logs are emitted where required.
* Notifications are triggered where required.
* Empty/loading/error/success states exist.
* Mobile layout is usable.
* Relevant tests pass or are added.

---

# 31. Repair And Failure Policy

When an agent finds a broken workflow, it must repair it if the fix is within scope.

Preferred repair order:

1. Identify the broken route/action.
2. Find the intended workflow.
3. Check the backend endpoint.
4. Check the data model.
5. Check permissions.
6. Wire frontend to backend.
7. Add proper empty/loading/error/success states.
8. Emit required events.
9. Add notifications if needed.
10. Add or update tests.
11. Verify end to end.

When a failure occurs, do not:

* Hide the feature.
* Delete the button.
* Pretend success.
* Lose the event.
* Skip audit.
* Leak data.
* Fail silently.

Instead:

* Show a truthful error.
* Emit a failure event where relevant.
* Preserve visibility.
* Attempt repair if possible.
* Provide retry.
* Degrade safely.
* Log/audit the failure.
* Keep the user informed.

---

# 32. Production Readiness Definition

A MyShule feature is production-ready only if:

* The sidebar route opens correctly.
* The workspace is not blank.
* The user can perform the expected daily task.
* The form validates correctly.
* The backend persists data.
* The data appears in all relevant dashboards.
* Tenant isolation is enforced.
* Permissions are enforced.
* Events are emitted.
* Notifications are created where needed.
* Audit logs are recorded.
* Reports/prints are truthful where applicable.
* Empty/loading/error/success states exist.
* Mobile layout works.
* Tests pass.
* No fake/demo data leaks into real schools.

Primary success metrics:

* Real school usability
* Complete workflows
* Tenant-safe execution
* Correct permissions
* Reliable data sharing
* Operational continuity
* Auditability
* Mobile usability
* Report accuracy
* Production stability

---

# 33. Final Agent Instruction

Before marking any task complete, the agent must ask internally:

1. Does this preserve tenant isolation?
2. Does this use real shared school data?
3. Does this dashboard action actually work?
4. Does the backend persist the change?
5. Does another relevant dashboard receive the update?
6. Are events, notifications, and audit logs handled?
7. Are empty states useful?
8. Are permissions enforced?
9. Does this work on mobile?
10. Would a real Kenyan school be able to use this tomorrow?

If the answer is no, the task is not complete.

Build MyShule as if a real Kenyan school will use it tomorrow morning.

Complete the workflows.
Wire the system.
Protect the data.
Make it production ready.
