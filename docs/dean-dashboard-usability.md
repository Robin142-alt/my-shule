# Dean academic office

The Dean dashboard opens directly on the selected workspace. A compact school identity, workspace navigation, task/approval/notification controls, and dashboard role switcher replace the repeated welcome banner. Browser Back/Forward restore the selected workspace and navigation starts at the top.

The overview links live mark-review counts, report approvals, recorded lesson-plan coverage, staff teaching allocations, and daily academic work. Coverage and workload consume the existing API fields; no unrecorded syllabus targets or workload limits are inferred.

Assessments starts with searchable teacher submissions and status filters. Report approval and exam progress have separate views. Locking requires a confirmation listing the reviewed marks and groups matching the current filters. Moderation and locking use batches of at most 500 IDs, display server-confirmed counts, and disclose partial failures. Failed reads retain retry controls without enabling stale decisions. Report previews remain available through Academic Reports. Phone layouts render records as labeled cards.

The change uses existing school-scoped queries and governed moderation, locking, report transition, and report preview APIs. It adds no database schema, tenant data, permissions, or provider configuration.

Validation: Dean workflow/usability, role routing and school identity tests; browser fixtures at 1440×900, 1024×768 and 390×844; search/filter, lock confirmation, return reasons, history navigation and empty/loading/error states. Browser QA is isolated from production school data and is run with `node apps/web/tests/design/dean-usability-browser.mjs`. CI includes the new Dean usability regression suite.
