# Exams manager: teacher mark entry

The examination overview and Marks Entry Hub use `GET /admin-command/exams-manager/teacher-mark-progress`. The route requires the Exams module and `exams:write`; the service requires verified tenant context. It is a read-only view over the existing academic and exam records, with no new tables or seeded school data.

Each row identifies a teacher, exam, subject, assessment paper, class and stream. Counts start from active student class membership and subject enrollment, including students with no mark row. Teacher assignments must be active, effective today, applicable to the exam term (or continuous), allow mark entry, and cover that stream. Unassigned students remain visible. Every join is tenant-scoped. Student IDs are compared as text to support both UUID-based records and upgraded school schemas with text IDs.

`entered` counts actual scores (including zero). `recorded` additionally counts explicit absence and other resolved score outcomes. Missing or `incomplete` records require attention. `submitted` counts resolved entries in submitted/reviewed/approved/locked/published states. A fully populated draft is **Awaiting submission**. Completion requires all expected students in that paper and stream to be submitted. Closed windows with unfinished work remain outstanding. Draft and scheduled sheets are available through All sheets but excluded from the default follow-up list. Completed sheets are never flagged overdue solely because their deadline passed.

The list supports exam filtering, teacher/class/stream/subject search, pagination, expandable details, manual refresh and a 60-second refresh interval. Existing school-scoped query keys and event-driven invalidation apply. Dates display in Africa/Nairobi. The CSV export uses the same source and protects formula-like cell values. Locking in the Marks Entry Hub uses the existing audited/event-emitting window action, with confirmation that it affects all teachers and papers in that subject/class window.

Verification:

- `apps/api/test/teacher-mark-progress.integration-spec.ts`: disposable PostgreSQL fixtures for zero entries, stream ownership, tenant isolation, distinct papers, saved drafts, missing/incomplete outcomes, absence/zero scores, deadlines, unassigned students, duplicate assignments, locked work and authorization metadata.
- `apps/web/tests/design/exams-manager-teacher-progress.test.tsx`: filters, teacher identity counts, pagination, empty/loading/error states, setup navigation and window-lock behavior.
- `apps/web/tests/design/exams-manager-browser.mjs`: actual components and styles with isolated browser fixtures at 320, 390, 768 and 1440 pixels; checks layout, search, details, filters, CSV download, error recovery and setup navigation. Screenshots are written to `output/exams-manager-ui` and contain only QA data.

Both API and web changes must be released together. No production school was modified by this work.

## Open mark entry

Marks Entry Hub includes an Open mark entry form. Choose an exam, a particular teacher, a particular class, or everyone in that exam, then set a future deadline in East Africa Time. The form uses the full progress response, independently of the list's filters and pagination.

`POST /admin-command/exams-manager/marks-entry/open` requires an exam-management role, `exams:write`, authenticated actor and verified school context. It validates the scope and deadline, locks the parent exam, and updates only matching school/exam windows. Draft exams must first be opened through Exam Setup; locked, published and archived exams require the existing correction workflow.

Individual access is persisted in `exam_mark_entry_windows.teacher_entry_deadlines`, a JSONB map keyed by teacher user ID. It extends only that teacher's access through their active term/class/subject/stream assignments, including when the shared window is closed or expired. Class and everyone actions set the shared deadline and replace individual extensions for the affected windows. Closing a window clears its extensions. Existing databases receive the column through the exam schema upgrade.

Teacher discovery, progress, roster reads and transactional saves enforce the same access rule. Submitted sheets and reviewed, locked or published marks retain their existing protection. Closing entry does not finalize draft marks or replace Dean review. Access updates, per-window audit records, workflow events and teacher-targeted notifications commit together; an event failure rolls back the opening.

The teacher exam visibility integration suite covers individual, class and everyone access, school/role isolation, expired shared deadlines, locked results and transaction rollback. Component tests exercise all three scopes, selection resets, duplicate submission prevention and error/loading states. The follow-up visual check could not run because the Windows computer-use tool could not verify the browser URL.
