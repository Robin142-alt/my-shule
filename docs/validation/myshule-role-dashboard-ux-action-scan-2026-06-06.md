# MyShule Role Dashboard UX And Action Scan

Date: 2026-06-06  
Scope: static code scan only. Browser verification was intentionally skipped because authenticated dashboards cannot be opened in this environment.

## Evidence Read

- `apps/web/src/components/school/school-pages.tsx`
- `apps/web/src/lib/experiences/school-data.ts`
- `apps/web/src/lib/module-access/module-access-map.ts`
- `apps/web/src/components/school/*command-center.tsx`
- `apps/web/src/components/school/principal-practical-dashboard.tsx`
- `apps/web/src/components/portal/portal-pages.tsx`
- `apps/web/src/components/portal/parent-command-center.tsx`
- `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- `apps/web/src/components/workflows/approval-command-panel.tsx`
- `apps/web/src/components/layouts/school-shell.tsx`
- `apps/web/src/components/layouts/superadmin-shell.tsx`
- `apps/web/tests/design/role-dashboard-structure.test.tsx`

## Executive Findings

1. The visual dashboard shell is not the main blocker. The blocker is action truth: many actions still resolve to local notice/status copy unless they open a real workspace, print preview, modal, export, mutation, or disabled reason.
2. Principal Attendance is the correct reference area. Current worktree code already adds a `principalAttendanceActionContracts` export, attendance workspace, absence SMS confirmation modal, and print-preview test assertions.
3. The shared role surface is too centralized. `role-operational-command-center.tsx` drives many operational roles, so one generic notice/action pattern can affect Deputy, Secretary, Accountant, Nurse, Discipline, Boarding, Transport, Laboratory, Library, Store, Security, and Admissions workflows.
4. Parent portal has two experiences. `portal-pages.tsx` has stronger published-only academic behavior, while `parent-command-center.tsx` still contains hardcoded Brian/Aisha copy and fake `opened for Brian Otieno` action feedback.
5. Exams workflow still contains parent/student publishing text in staff areas, even though the current governance rule says exam publishing should target the parent portal only and student should not gain exam-management workflow.
6. Approval panel language still uses `completed` and `generated` heavily. Some of it is backed by API calls, but copy and contracts need tightening so success only follows real backend response or print/export creation.
7. Super Admin and System Monitor areas are not yet covered by a dashboard action contract in the scanned files. Their quick actions and notices need the same enabled-with-proof or disabled-with-reason rule.

## Role UX Outcome Matrix

| Dashboard | Current UX Evidence | Classification | Required Fix |
| --- | --- | --- | --- |
| Principal | `principal-practical-dashboard.tsx` has new Principal Attendance contract/workspace/modal/print preview code. | PARTIAL_WORKFLOW moving to REAL_WORKFLOW for Attendance only | Verify tests; extend contract pattern beyond Attendance. |
| Deputy Principal | Routed through role command-center/shared operational surfaces and exams role module. | PARTIAL_WORKFLOW | Convert approvals, discipline, attendance sweeps, SMS, and print actions to contracts. |
| Secretary | Shared operational workspace includes queue/document/SMS copy. | PARTIAL_WORKFLOW | Ensure parent queue, appointment, letter, broadcast, and visitor actions mutate store/API or disable. |
| Accountant/Bursar | Finance pages have real billing APIs; command-center reminders still use local queue language. | PARTIAL_WORKFLOW | Require payment/receipt/reminder/export contracts and SMS provider disabled states. |
| Teacher | Dedicated command center writes attendance/lesson flows to store in tests. | PARTIAL_WORKFLOW | Add contracts for register submit, lesson log, parent message, marks, store requests. |
| Dean/HOD/Grade Master/Exams Manager | Exams module is feature-rich but staff publishing copy still references parent/student. | PARTIAL_WORKFLOW | Parent-only publishing language; publish/return/approve actions require contract and audit result. |
| Class Teacher | Dedicated command center is present and tests exist. | PARTIAL_WORKFLOW | Confirm class attendance/concerns/parent messages prove store/API writes. |
| Nurse | Shared operational clinic workspace has stock/notification language. | PARTIAL_WORKFLOW | Medicine dispense must validate stock/expiry and notification must confirm recipients/provider. |
| Counsellor | Shared counselling workspace shows referrals/follow-up. | PARTIAL_WORKFLOW | Referral, session, escalation, guardian contact must create tasks/logs or disable. |
| Discipline Master | Shared discipline workspace has notify/escalate/letter actions. | PARTIAL_WORKFLOW | Incident, summon, referral, suspension, print letter need contracts and confirmation. |
| Librarian | Shared library workspace has loan/notice language. | PARTIAL_WORKFLOW | Issue/return/lost/overdue SMS/fine/print slip must prove mutation or disabled reason. |
| Storekeeper | Dedicated storekeeper workspace and inventory module exist. | PARTIAL_WORKFLOW | Stock issue/approval/stock take/print/movement history need action contracts. |
| Boarding Master | Shared boarding workspace uses queued status for parent alerts. | PARTIAL_WORKFLOW | Roll call, exeat, sick referral, print roll call need contracts. |
| Security Officer | Dedicated security and visitor module files exist. | PARTIAL_WORKFLOW | Check-in/out, visitor pass, urgent alert, inside-board must be store/API-backed. |
| Transport Manager | Dedicated transport manager and transport module exist. | PARTIAL_WORKFLOW | Route assignment, trip attendance, delay SMS, fuel, maintenance, print route list need contracts. |
| Laboratory Technician | Dedicated lab command center plus shared lab workspace. | PARTIAL_WORKFLOW | Practical prep approval, hazard hold, teacher alert, stock safety checks need contracts. |
| Admissions Officer | Registrar/admissions module exists. | PARTIAL_WORKFLOW | Application, document verification, admit student, class assignment, admission letter need contracts. |
| Parent | `portal-pages.tsx` is child-scoped for academic reports; `parent-command-center.tsx` still hardcodes child/action copy. | PARTIAL_WORKFLOW | Use linked-child context everywhere; remove fake opened notices; only show published academic data. |
| Student | `portal-pages.tsx` blocks academic reports from student exam flow, but student dashboard still has fake opened action copy. | PARTIAL_WORKFLOW | Keep student out of exam publishing; replace quick actions with real routes or disabled reasons. |
| Super Admin | Superadmin data/shell quick actions exist but no scanned action contract. | PARTIAL_WORKFLOW | Invite/configure/suspend/log/export actions must call real APIs or disable with reason. |
| System Monitor | Support/system health tests exist; no complete monitor action contract found in scan. | PARTIAL_WORKFLOW | Retry jobs, failed SMS, callback details, queue health, log export need real endpoints or disabled reasons. |

## Highest Priority Amendments

1. Finish and verify Principal Attendance as the reference implementation.
2. Add a reusable `DashboardActionContract` safety test so enabled actions cannot be fake feedback only.
3. Remove parent/student publishing copy from staff exams screens; keep publishing parent-portal only.
4. Replace parent/student portal fake quick-action notices with route navigation, real print/download, or disabled reason.
5. Convert shared operational command-center SMS/email/print/export/status language to result-based wording.
6. Add disabled reasons for missing SMS provider, missing parent contacts, empty records, missing export support, and missing permission.
7. Split later: `role-operational-command-center.tsx` is too large for safe role-by-role hardening, but splitting is secondary to action truth.

## First Batch Recommendation

Proceed in this order:

1. Principal Attendance regression and safety tests.
2. Exams parent-only publishing wording and tests.
3. Parent/student portal fake quick-action removal.
4. Shared operational command-center fake success phrase cleanup.
5. Super Admin/System Monitor action-contract inventory and disabled reasons.

Do not claim every dashboard is production-ready until each role has contracts and passing tests.
