# MyShule Dashboard Action Amendment Report

Date: 2026-06-06  
Scope completed in this batch: static UX/action audit, Principal Attendance reference implementation verification, parent/student exam publishing cleanup, portal quick-action truth cleanup, shared CSV export repair, Super Admin navigation wording, broad role-command fake-action wording sweep, generic operational fallback cleanup, System Monitor CSV export repair, and regression verification.

## Fake Handlers Found

- Principal Attendance previously had generic queued/completed fallback wording in `principal-practical-dashboard.tsx`.
- Student portal quick actions changed local notice text such as action opened without always navigating or mutating.
- Parent command center hardcoded Brian Otieno in quick-action notices.
- Exams publishing copy still said parent/student portals in staff workflows.
- Storekeeper stock export and Accountant fee export showed export-ready text without a real file download.
- Approval PDF export fallback could report prepared without a downloadable file.
- Super Admin shell notifications/search used vague opened wording even though they navigate.
- Deputy, Dean, HOD, Grade Master, Class Teacher, Boarding, Discipline, Counselling, Laboratory, Registrar, Accountant, Security, Exams Manager, Storekeeper, Transport, and shared role command centers contained many opened-style notices for in-page selection, search, filters, and print previews.
- Generic operational table/form/action-button fallbacks said `completed after the connected workflow responded`, which made connected-handler return paths read like blanket success.
- System Monitor `Download System Report` only set a prepared-for-download message without creating a file.
- Parent notification, emergency-contact, language, and mobile profile actions used opened-style text for panels or visible data.
- Shared implementation100 live-module status update used generic completion text after a PATCH.

## Shared Action System Fixed Or Created

- Added `DashboardActionContract` and `principalAttendanceActionContracts` for Principal Attendance.
- Added `dashboard-action-contract.test.ts` safety coverage for:
  - Principal Attendance contracts.
  - fake Principal fallback phrases.
  - parent-portal-only exam publishing.
  - portal quick-action fake opened notices.
  - real CSV downloads in shared role dashboards.
  - approval PDF export failure on missing file.
  - Super Admin route-based navigation notices.
  - shared role/security print-preview copy avoids fake `opened for printing`.
  - System Monitor report download uses `downloadCsvFile`.
  - generic operational fallbacks avoid fake completion phrases.

## Dashboards Audited

Recorded static role UX/action audit in:

- `docs/validation/myshule-role-dashboard-ux-action-scan-2026-06-06.md`
- Existing broad frontend scan remains in `docs/validation/myshule-frontend-dashboard-scan-2026-06-06.md`

## Button Outcome Matrix Summary

| Area | Buttons/Actions | Final Status |
| --- | --- | --- |
| Principal > Attendance | View Attendance, Send Absence SMS, Print Attendance Report | Fixed as reference implementation. |
| Staff Exams Publishing | Approve/publish/unpublish/notify report-card copy | Fixed to parent portal only. |
| Student Portal Quick Actions | Assignment, progress, downloads, messages, notifications, unsupported submit/library/timetable | Real links or disabled with visible reason. |
| Parent Command Center | Quick cards, notifications, AI assistant | Real links, disabled reason for disconnected AI/anchor-only workspaces, no hardcoded opened-for-Brian notices. |
| Storekeeper Shared Workspace | Stock report export | Fixed to generate CSV download. |
| Accountant Shared Workspace | Fee list export | Fixed to generate CSV download. |
| Approval Panel | Report-card PDF export fallback | Missing file now fails instead of pretending export success. |
| Super Admin Shell | Search result and notification actions | Route-based navigation wording tied to `router.push`. |
| System Monitor | Download System Report | Fixed to generate `myshule-system-health-YYYY-MM-DD.csv`. |
| Generic Operational Components | Table, form, action button, queue connected-handler fallbacks | Reworded to connected-workflow returned / API status updated; no fake-only completion. |
| Role Command Centers | Search, filters, selected rows, print previews, reports, SMS notices | Reworded selected/ready/print-preview/download/queued states across the audited role surfaces. |

## Buttons Fixed

- View Attendance opens a real attendance workspace with date, class filter, search, present/absent/late/missing summaries, teacher, last updated, and source.
- Send Absence SMS opens a confirmation modal with recipients, missing phone numbers, message preview, and SMS provider disabled reason.
- Print Attendance Report opens real print preview.
- Stock report export downloads `stock-report.csv`.
- Fee list export downloads `fee-list.csv`.
- Student portal quick actions now navigate or show disabled reason.
- System Monitor report downloads a CSV with school, issue, category, attempts, status, owner, and generated timestamp.
- Role search/result clicks now say selected/workspace ready rather than opened-as-success.
- Shared role print buttons now say print preview ready and still invoke the real print preview helper.
- Generic operational form/table/action button connected paths now say returned from the connected workflow instead of generic completed.
- Parent notification and emergency-contact controls now describe visible panels/data rather than fake opened workspaces.

## Buttons Disabled And Exact Reasons

- Student Submit Work: `Disabled: submit-work form is not connected to an assignment yet.`
- Student View Library Due Date: `Disabled: student library due-date workspace is not connected.`
- Student Open Timetable: `Disabled: student timetable workspace is not connected.`
- Parent AI Assistant: `Disabled: AI child summary endpoint is not connected.`
- Parent anchor-only card fallback: `Disabled: <label> workspace is not connected.`
- Principal absence SMS confirm: `Disabled: SMS provider is not configured.` when provider settings are unavailable.

## APIs Connected Or Created

- No new backend APIs were created in this batch.
- Existing approval panel `/exams/report-cards/:id/parent-download` now must return a file name or URL; otherwise UI reports failure.
- Principal Attendance uses existing school operational store and event publication.
- Shared exports use existing `downloadCsvFile`.

## Cross-Dashboard Notifications/Tasks Added

- Principal absence SMS queue creates school-scoped SMS logs and parent notifications when provider and contacts are available.
- Principal Attendance workspace/print actions emit school operational events.

## Print Previews Added

- Principal attendance report print preview.
- Existing shared print previews were retained and wording changed to print preview ready.

## Export Actions Fixed Or Disabled

- Fixed Storekeeper stock report CSV.
- Fixed Accountant fee list CSV.
- Fixed System Monitor health report CSV.
- Approval PDF export now fails when no downloadable file is returned.

## SMS/Email Workflows Fixed Or Disabled

- Principal absence SMS now requires recipient confirmation and provider configuration.
- Missing SMS provider disables confirmation.
- Other role SMS actions were partially reworded from sent to queued where they queue local school communication.
- Library overdue messaging now says parent/guardian SMS queued instead of parent/student for the staff workflow.

## Tests Added Or Updated

- Added `apps/web/tests/design/dashboard-action-contract.test.ts`.
- Updated Principal Attendance regression in `role-dashboard-structure.test.tsx`.
- Updated exams parent-portal-only expectations.
- Updated portal/platform command-center expectations for route links and disabled reasons.
- Updated shared role tests for print-preview-ready copy, CSV downloads, parent/guardian messaging, and M-Pesa reconciliation wording.
- Updated universal operational component tests for connected-workflow return copy.
- Updated academic, boarding, deputy, finance/security, student-support, storekeeper, teacher, transport, and portal/platform command center tests for selected/ready wording.

## Tests Run

- `npm --prefix apps/web run test:design -- role-dashboard-structure.test.tsx dashboard-action-contract.test.ts`
- `npm --prefix apps/web run test:design -- exams-workspace.test.tsx academic-parent-portal-upgrade.test.tsx`
- `npm --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx`
- `npm --prefix apps/web run test:design -- frontend-operationalization.test.tsx -t "report|print"`
- `npm --prefix apps/web run test:design -- role-dashboard-structure.test.tsx dashboard-action-contract.test.ts exams-workspace.test.tsx academic-parent-portal-upgrade.test.tsx portal-platform-command-centers.test.tsx`
- `npm --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx finance-security-command-centers.test.tsx`
- `npm --prefix apps/web run test:design -- dashboard-action-contract.test.ts`
- `npm --prefix apps/web run test:design -- universal-form-table-system.test.tsx`
- `npm --prefix apps/web run test:design -- academic-command-centers.test.tsx boarding-master-command-center.test.tsx class-dean-command-centers.test.tsx deputy-principal-command-center.test.tsx student-support-command-centers.test.tsx`
- `npm --prefix apps/web run test:design -- frontend-operationalization.test.tsx -t "Incident center|Boarding record"`
- `npm --prefix apps/web run test:design -- role.test.tsx`

## Lint Result

- Earlier `npm run web:lint` passed with 0 errors and 0 warnings after Principal Attendance cleanup.
- Final post-sweep `npm run web:lint` passed with 0 errors after rerunning with a longer timeout.

## Remaining Risks

- This batch does not prove every dashboard button across every role is fully production-ready.
- `role-operational-command-center.tsx` remains very large, so full role-by-role hardening should continue module by module.
- Browser verification was not run because authenticated dashboards cannot be opened in this environment per user instruction.
- Some shared role workflows still rely on local school operational store rather than durable backend endpoints.

## Backend/Config Still Needed

- SMS provider configuration and real queue endpoint for all communication workflows.
- Student assignment submission endpoint.
- Student timetable workspace/API.
- Student library due-date workspace/API.
- Parent AI child summary endpoint.
- Durable same-school task/notification endpoints for all cross-dashboard actions.
- Export endpoints for non-CSV/PDF outputs that are still unsupported.

## Backend Amendment Sweep - 2026-06-06

### Fake/Partial Backend Handlers Found

- `OperationalWorkflowExecutionConsumer` consumed `workflow.action.dispatched` and emitted `workflow.action.completed`, but it did not materialize a same-school dashboard task/notification for the affected role dashboard.
- School SMS backend had a real single-recipient send path with wallet reservation, provider readiness validation, encrypted logs, dispatch, and refund-on-failure, but it did not expose a bulk endpoint that returns sent/failed/skipped evidence for absence notices, fee reminders, overdue notices, or broadcasts.
- School SMS readiness existed inside `SmsDispatchService`, but dashboards had no read-only endpoint to decide whether the confirmation button should be enabled or disabled with a backend-backed reason.

### Backend APIs Created Or Extended

- Added `GET /sms/readiness` guarded by `school_sms:read`.
  - Returns `status`, `can_send`, `disabled_reason`, and `missing` config labels.
  - Does not expose provider secrets.
- Added `POST /sms/bulk-send` guarded by `school_sms:send`.
  - Accepts selected recipients plus message/message type.
  - Reuses the existing tenant-scoped `sendSms` workflow for each valid recipient.
  - Returns `sent_count`, `failed_count`, `skipped_count`, sent log IDs, failure reasons, and skipped missing-phone records.
- Added `POST /lms/assignments/:assignmentId/submissions` guarded by `lms:read` for current student-role compatibility.
  - Verifies the assignment exists in the current tenant.
  - Rejects closed, archived, or locked assignments.
  - Inserts a real `lms_submissions` row with metadata and actor binding.
  - Writes an `lms.assignment.submitted` audit log.
- Extended `OperationalWorkflowExecutionConsumer`.
  - Materializes a same-tenant notification/task through `SchoolOperationNotificationsRepository`.
  - Targets `targetRoles`/`audienceRoles`/recipient roles from the workflow payload, with source role fallback.
  - Records source module, related module, related record, action type, origin role, workflow ID, node ID, emitted events, and execution handler.

### Backend Buttons/Workflows Fixed

- Principal/Accountant/Librarian/Nurse/Secretary style SMS confirmation flows can now call one bulk endpoint and show real sent/failed/skipped summary evidence.
- SMS confirm buttons can now call readiness first and disable with the exact backend reason when provider/config is missing.
- Cross-dashboard operational dispatch now creates a durable same-school notification/task projection instead of only emitting outbox completion evidence.
- Student LMS submit-work actions now have a real backend submission endpoint instead of remaining frontend-disabled for missing backend.

### Backend Tests Added Or Updated

- `OperationalWorkflowExecutionConsumer` now verifies dashboard task materialization is tenant-scoped and role-targeted.
- `SchoolSmsWalletService` now verifies bulk SMS returns real sent/failed/skipped evidence and preserves tenant-scoped reservation inputs.
- `SchoolSmsWalletService` now verifies readiness response exposes missing config without leaking provider secrets.
- `LmsSchemaService` now verifies `lms_submissions` metadata/actor columns and tenant-aware submission index.
- `LmsService` now verifies assignment submissions are tenant-scoped and audited.

### Backend Tests Run

- `npm.cmd run build`
- `node --test dist/apps/api/src/modules/events/consumers/operational-workflow-execution.consumer.test.js dist/apps/api/src/modules/integrations/integrations.test.js`
- `node --test dist/apps/api/src/modules/events/consumers/operational-workflow-execution.consumer.test.js dist/apps/api/src/modules/integrations/integrations.test.js dist/apps/api/src/modules/lms/lms.test.js`
- `npm.cmd --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx`

### Backend Build/Lint Result

- TypeScript build passed.
- Focused backend regression tests passed: 22/22.
- Focused portal regression test passed: 12/12. JSDOM printed expected navigation-not-implemented warnings for link clicks.

### Backend Remaining Risks

- Bulk SMS sends sequentially through the current wallet/log path. That is safer for accounting, but large schools may need a queue-backed bulk dispatcher before sending thousands of messages.
- Operational workflow notifications are now materialized, but domain-specific handlers still need deeper mutations per module where a workflow must approve, reject, publish, issue stock, or update records.
- Student assignment submission now has backend storage, but linked-student identity enforcement should be tightened once auth context exposes learner IDs consistently.
- Student timetable, student library due-date, and parent AI summary APIs remain disconnected and should stay disabled in UI until backend endpoints and permissions are implemented.
- Student library due-date should not be enabled by simply granting broad `library:read`; it needs a self/linked-child scoped permission and query.
