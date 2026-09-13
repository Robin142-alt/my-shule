# Exams manager: teacher mark entry

The examination overview and Marks Entry Hub use `GET /admin-command/exams-manager/teacher-mark-progress`. The route requires the Exams module and `exams:write`; the service requires verified tenant context. It is a read-only view over the existing academic and exam records, with no new tables or seeded school data.

Each row identifies a teacher, exam, subject, assessment paper, class and stream. Counts start from active student class membership and subject enrollment, including students with no mark row. Teacher assignments must be active, effective today, applicable to the exam term (or continuous), allow mark entry, and cover that stream. Unassigned students remain visible. Every join is tenant-scoped.

`entered` counts actual scores (including zero). `recorded` additionally counts explicit absence and other resolved score outcomes. Missing or `incomplete` records require attention. `submitted` counts resolved entries in submitted/reviewed/approved/locked/published states. A fully populated draft is **Awaiting submission**. Completion requires all expected students in that paper and stream to be submitted. Closed windows with unfinished work remain outstanding. Draft and scheduled sheets are available through All sheets but excluded from the default follow-up list. Completed sheets are never flagged overdue solely because their deadline passed.

The list supports exam filtering, teacher/class/stream/subject search, pagination, expandable details, manual refresh and a 60-second refresh interval. Existing school-scoped query keys and event-driven invalidation apply. Dates display in Africa/Nairobi. The CSV export uses the same source and protects formula-like cell values. Locking in the Marks Entry Hub uses the existing audited/event-emitting window action, with confirmation that it affects all teachers and papers in that subject/class window.

Verification:

- `apps/api/test/teacher-mark-progress.integration-spec.ts`: disposable PostgreSQL fixtures for zero entries, stream ownership, tenant isolation, distinct papers, saved drafts, missing/incomplete outcomes, absence/zero scores, deadlines, unassigned students, duplicate assignments, locked work and authorization metadata.
- `apps/web/tests/design/exams-manager-teacher-progress.test.tsx`: filters, teacher identity counts, pagination, empty/loading/error states, setup navigation and window-lock behavior.
- `apps/web/tests/design/exams-manager-browser.mjs`: actual components and styles with isolated browser fixtures at 320, 390, 768 and 1440 pixels; checks layout, search, details, filters, CSV download, error recovery and setup navigation. Screenshots are written to `output/exams-manager-ui` and contain only QA data.

Both API and web changes must be released together. No production school was modified by this work.
