# MyShule Frontend Dashboard Scan - 2026-06-06

## Scope

Scanned the current MyShule frontend dashboard system for practical readiness across school, portal, module, and role dashboards.

Primary files inspected:

- `apps/web/src/lib/experiences/school-data.ts`
- `apps/web/src/lib/module-access/module-access-map.ts`
- `apps/web/src/lib/features/module-readiness.ts`
- `apps/web/src/components/school/school-pages.tsx`
- `apps/web/src/components/school/role-operational-command-center.tsx`
- `apps/web/src/components/school/*command-center.tsx`
- `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- `apps/web/src/components/portal/portal-pages.tsx`
- `apps/web/src/components/portal/parent-command-center.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/data-table.tsx`
- `apps/web/tests/design/academic-parent-portal-upgrade.test.tsx`
- `apps/web/tests/design/exams-workspace.test.tsx`
- `apps/web/tests/design/role-dashboard-structure.test.tsx`

## Current Verification

Command run:

```bash
npm --prefix apps/web run test:design -- academic-parent-portal-upgrade.test.tsx exams-workspace.test.tsx role-dashboard-structure.test.tsx
```

Result:

- 2 suites passed.
- 1 suite failed.
- 34 tests passed.
- 1 test failed.

Failure:

- `tests/design/role-dashboard-structure.test.tsx` fails in the principal command-center practical action test.
- The test expects: `Send Absence SMS sent to workflow queue from Attendance`.
- The rendered UI does not show that expected workflow-queue message after clicking `Send Absence SMS`.
- This indicates a likely copy/action-contract regression in the principal operational command center.

## Executive Findings

### P0 - The frontend looks broad, but many dashboards are not yet truly operational

There are strong role-specific dashboard shells and many role workspaces, but several actions still behave like UI demos: they set a local notice such as "opened", "ready", "queued", or "saved" without always proving a backend command, event, queue write, or durable audit state.

Examples:

- `apps/web/src/components/portal/parent-command-center.tsx` has many actions that only call `setNotice(...)`.
- `apps/web/src/components/school/teacher-command-center.tsx` has several high-frequency actions that open local forms or save to local school records.
- `apps/web/src/components/school/role-operational-command-center.tsx` uses `readSchoolData` and `addSchoolRecord` heavily for cross-role operational data.

Practical fix:

- Classify every button as one of: backend command, local draft, export/print, navigation, or disabled.
- For backend work, require CSRF, tenant ID, API response handling, loading state, error state, and audit/event ID display.
- For local draft work, label it honestly as a draft and avoid words like "sent", "completed", or "queued" unless a real queue/event was confirmed.

### P0 - Parent portal has two competing experiences

The parent academics page in `portal-pages.tsx` is closer to the requested learner-facing academic portal. It has published reports, child switcher, acknowledgement, CBC/8-4-4 report viewer, targets, comments, and published results.

The parent dashboard in `parent-command-center.tsx` is visually rich, but it is still heavily demo-specific:

- It hardcodes `Brian Otieno` and `Aisha Wanjiku` in many places.
- It includes fixed fee, health, transport, discipline, assignment, and AI insight content.
- Many quick actions only update local notice text.

Practical fix:

- Make `portal-pages.tsx` the source of truth for parent academic portal behavior.
- Refactor `ParentCommandCenter` to consume the same child/report/result/target model instead of hardcoded learner names.
- Move the child switcher to the top of the parent dashboard on mobile and desktop.
- Hide or disable any parent action until the backing module and linked-child data exist.

### P0 - Exam publishing copy still mentions student portals

The requested direction is no separate student dashboard for the exam/report-card flow. However `apps/web/src/components/modules/exams/exams-module-screen.tsx` still contains parent/student publishing wording:

- `Approved for parent/student publishing.`
- `Published to permitted parent and student portals.`
- `Parent/student report notification queued after publication.`
- `Parent/student portal preview is empty until at least one report is published.`

Practical fix:

- Change exam/report-card publishing language to parent portal only.
- Keep the student portal unenhanced for this exam flow.
- Add a regression test that fails on `parent/student` in exam report-card release copy.

### P1 - Role navigation mostly respects the academic-chain scope, but student still has learning items

The school role navigation gives `exams` to the expected academic chain:

- Principal: `Academic Oversight`
- Deputy Principal: `Exams`
- Teacher: `Exams`
- Dean of Academics: `Pending Reviews`
- Exams Manager: `Exam Builder`, `Marks Entry Hub`, `Grade Processing`, `Data Validation`
- HOD: `Exams & Performance`
- Class Teacher: `Exams`
- Grade/Form Master: `Grade/Form Results`

Operational roles such as security, transport, lab technician, storekeeper, nurse, librarian, boarding master, counsellor, discipline master, and admissions do not receive `exams`.

Student navigation does not show `exams`, but it still exposes `academics`, `lms`, `cbt`, `reports`, and `communication`. That may be acceptable as a general student learning portal, but it must remain outside this exam/report-card flow.

Practical fix:

- Keep the current no-`exams` student rule.
- Add a stricter test that student routes cannot render parent-style report cards, acknowledgements, moderation, or published exam report history.
- Rename student `reports` copy if it could be mistaken for exam report cards.

### P1 - The command-center architecture is too concentrated

`role-operational-command-center.tsx` is about 419 KB and handles many unrelated operations: clinic, library, finance, secretary, boarding, transport, labs, discipline, counselling, and more.

Risk:

- Real-school changes will become hard to verify.
- It is easy to break one dashboard while changing another.
- Role-specific policy, button behavior, and data contracts are difficult to audit.

Practical fix:

- Split by domain workspace without changing the visible dashboard shell:
  - `clinic-workspace`
  - `library-workspace`
  - `finance-workspace`
  - `boarding-workspace`
  - `transport-workspace`
  - `labs-workspace`
  - `discipline-workspace`
  - `counselling-workspace`
- Keep shared shell/navigation fixed.
- Move button execution contracts into reusable action helpers.

### P1 - DataTable is mobile-aware but not yet strong enough for serious school work

`DataTable` already renders desktop tables and mobile cards. That is good. But practical school tables still need:

- Search
- Column filters
- Export action slots per row/table
- Sticky first column for marksheets and learner lists
- Row selection
- Bulk actions
- Empty/degraded/locked states
- Permission-aware actions
- Clear disabled reasons

Practical fix:

- Keep the existing `DataTable`, but add optional `toolbar`, `selection`, `rowActions`, `disabledReason`, and `density` props.
- Use the mobile card rendering for parents and teachers, but keep high-density desktop tables for school operators.

### P1 - Button component supports disabled state visually, but not disabled reasons

`Button` has disabled styling, but there is no standard way to explain why an action is disabled.

Practical fix:

- Add a shared disabled-reason pattern:
  - `disabledReason?: string`
  - visible helper text near the button group
  - `title` and `aria-describedby`
- Use it for exam submit, report generation, publish, SMS, approval, and finance actions.

### P1 - Module access exists, but dashboard readiness is over-trusting

`module-access-map.ts` maps sections to module codes and `school-pages.tsx` verifies modules before opening sections. This is a good base.

Risk:

- `module-readiness.ts` marks many modules as production-ready even when the frontend behavior is still partially local/demo-like.
- This can make the product appear ready before workflows are truly backed by live tenant APIs.

Practical fix:

- Split readiness into:
  - `visible_in_demo`
  - `ui_complete`
  - `live_api_connected`
  - `tenant_safe`
  - `production_ready`
- Only show "configured live", "sent", "queued", "completed", or "synced" when the current readiness level supports that claim.

### P1 - Exams module is the strongest academic workflow, but should be split into reusable components

`exams-module-screen.tsx` includes many useful pieces:

- Teacher assignment guard
- My Exam Entry
- Marksheet grid
- Report-card generation
- Curriculum-aware filters
- Live API hooks for marks, uploads, locks, report generation, batch polling, and publishing
- Tests for teacher/principal assignment behavior and invalid marks

Risk:

- The component is too large and mixes teacher entry, principal approval, report-card configuration, report preview, live API actions, and fallback data.

Practical fix:

- Extract the reusable exam components requested in the AGENTS instructions:
  - `MyExamEntryCard`
  - `MarksheetTable`
  - `ExamStatusBadge`
  - `MissingMarksTable`
  - `ModerationQueueTable`
  - `ReportGenerationTable`
  - `ParentReportViewer`
  - `ParentAcknowledgementPanel`
- Keep the existing shell and visible UX; change internals incrementally.

### P2 - Several dashboards use excellent visual polish but not enough workflow friction

Many dashboards look polished, but real school work needs stronger friction around risky actions:

- Confirm before publishing reports, deleting users, reversing payments, sending bulk SMS, locking mark sheets, or marking learners absent.
- Show who will be notified before sending.
- Show counts before bulk actions.
- Require reason fields for reopen/return/correction/reversal.
- Display audit IDs or event references after backend-confirmed mutations.

Practical fix:

- Standardize confirmation modals and post-action receipts.
- Show "Pending backend confirmation" until the API returns.
- Save failed action attempts as visible degraded states, not success notices.

## Dashboard-by-Dashboard Recommendations

### Principal

Current strengths:

- Strong operational command-center concept.
- Academic oversight exists through `exams`.
- Approval/report-card publishing exists in the exams module.

Needs:

- Fix failing action-contract test around `Send Absence SMS`.
- Make workflow messages truthful and backed by event/queue IDs.
- Separate principal-as-teacher mark entry from principal-as-approver everywhere.
- Keep academic approval/publishing focused on parent portal only.

### Deputy Principal

Current strengths:

- Broad operational review and follow-up UI.
- Exams route exists.

Needs:

- Reduce general operational clutter in academic review context.
- Add clear moderation queue, grade/form readiness, and teacher follow-up actions tied to live APIs.
- Avoid "ready/saved" messages without backend confirmation.

### Exams Manager

Current strengths:

- Most complete exam lifecycle UI.
- Command center, setup, entry windows, mark monitor, missing marks, moderation, reports, templates, audit log concepts are present.

Needs:

- Convert setup and lifecycle actions into durable backend workflows.
- Show open/close/reopen locks with exact user, role, time, term, and school.
- Add import template download with real file generation.
- Replace demo rows with live tenant data by default.

### Teacher

Current strengths:

- Teacher command center has daily workflow sections.
- Exam module has stronger My Exam Entry and marksheet validation.

Needs:

- Teacher dashboard should use assigned teaching data, not generic marks shortcuts.
- Marks entry should be the primary real workflow with autosave, validation, correction state, and audit history.
- Parent SMS, attendance, assignment, and report actions need clearer backend confirmation.

### Class Teacher

Current strengths:

- Has class-follow-up orientation.
- Parent communication and class notes exist.

Needs:

- Add stronger class results, report readiness, learner progress, and class teacher comment workflows.
- Comment submission should lock after submission unless reopened.
- Escalation to grade/form master should create a real workflow record.

### Grade/Form Master

Current strengths:

- Grade/Form Results navigation exists.
- Grade master command center has stream/grade style review.

Needs:

- Stream comparison and report readiness should use shared exam result data.
- Grade/Form comments need draft/submit/reopen states.
- Approve readiness should require all class teacher/subject teacher prerequisites.

### HOD

Current strengths:

- Department command center and exams/performance route exist.

Needs:

- HOD review should work from submitted teacher marksheets.
- Return-for-correction must require reason and correction deadline.
- Department analytics should be tied to the same exam series and school term selectors.

### Dean of Academics

Current strengths:

- Review-focused command center exists.

Needs:

- Moderation and intervention queues should be connected to HOD/class/grade readiness.
- Add clear workflow state: pending, returned, approved forward, blocked.
- Intervention assignments should create responsible owner and due date.

### Parent

Current strengths:

- Parent academics page has the right direction: published-only report cards, results, child switcher, acknowledgement, comments, targets, and report viewer.
- Mobile-first portal shell exists.

Needs:

- Remove hardcoded learner assumptions from dashboard and fee pages.
- Make selected child drive all parent dashboard sections.
- Do not expose discipline/fee/health unless school policy and module connection allow it.
- Put report cards/results/acknowledgement above decorative dashboard content.

### Student

Current strengths:

- Student route does not expose the parent academic report-card flow in the tests.

Needs:

- Keep student exam/report-card flow out of scope.
- Ensure student `reports` and `academics` cannot surface parent-published reports or acknowledgements.

### Operational Roles

Current strengths:

- Operational roles do not appear to receive the `exams` nav item.
- Many operational command centers are visually complete.

Needs:

- Leave exam clutter out.
- Strengthen real workflow execution in each operational role before labeling modules production-ready.
- Avoid general admin mappings for operational roles becoming accidental access expansion.

## Highest-Value Implementation Order

1. Fix the failing principal workflow-queue test.
2. Remove all parent/student report-publishing copy from exams.
3. Make parent selected-child state drive `ParentCommandCenter`, `PortalFeesPage`, and `PortalAcademicsPage`.
4. Add disabled reasons to `Button` usage for every critical action.
5. Split module readiness into demo/UI/live/tenant-safe/production levels.
6. Extract exam reusable components from `exams-module-screen.tsx`.
7. Split `role-operational-command-center.tsx` by domain while preserving the existing shell.
8. Build a shared action execution receipt: loading, success with event ID, failed, degraded, locked.
9. Add tests for no fake success across command centers, not only exams.
10. Add mobile acceptance tests for parent report viewing, teacher marksheet entry, and school operator tables.

## Practical Definition of Ready for Real School Work

A dashboard section should not be marked production-ready until it has:

- Real tenant-scoped data source.
- Role and module entitlement guard.
- Working create/update action or honest read-only state.
- Loading, empty, failed, degraded, and locked states.
- Clear disabled reasons for unavailable actions.
- Backend-confirmed success messages with event/audit reference.
- No cross-school data leakage path.
- Mobile layout verified for the primary user.
- Tests for unauthorized access, invalid input, and failed backend response.

## Final Assessment

MyShule has a strong visual and structural foundation. The biggest frontend gap is not layout; it is operational truth. The dashboards need fewer demo-style local confirmations and more governed, tenant-scoped, backend-confirmed workflows with clear failure and disabled states.

The exam and parent academic work is directionally strong, but it still needs cleanup around student-portal wording, parent child-scoping, reusable exam components, and backend-confirmed lifecycle actions before it can honestly feel ready for daily real school operations.
