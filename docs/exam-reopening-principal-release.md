# Exam reopening and Principal release

The Exams Manager can reopen mark entry for a teacher, class, or everyone in a
locked or published exam. The existing school-scoped management permission,
future deadline validation, active teaching assignments and stream boundaries
still apply. Draft setup and archived exams cannot be reopened by this action.

Reopening a protected exam removes the series lock inside the existing
transaction, closes old windows and clears old deadline extensions, then grants
only the requested access. Selected finalized marks return to draft with their
scores preserved. Teacher-specific reopening preserves another teacher's mark
ownership. Mark audits record the previous state and actor. Affected learners'
current report cards require regeneration; historic revisions remain intact.
Window changes, mark and card audits, and the school event commit together.

Teachers resubmit corrections; the Dean still reviews and locks marks. The card
workflow is now **Generate cards → Principal release → Published**. Generation
notifies the Principal. There is no additional Exams Manager submission or Dean
card approval action in the UI. Existing generated, submitted and approved cards
can be released without migrating their stored status, provided the snapshot,
comments, finalized marks and source-version checks pass. Only the Principal's
existing publication authority can release them to parent/student portals.

The individual, scoped bulk, whole-series and Principal queue queries share the
same release eligibility rules. Whole-series publication takes the exam lock
before checking readiness so it cannot race reopening into releasing old cards.
The obsolete approval API rejects the action with an explanation. Legacy submit
and recall requests remain supported, but submission is not a release prerequisite.

Regression coverage is in `teacher-exam-visibility.integration-spec.ts`,
`report-card-scope.integration-spec.ts`, the exams unit suite, and the report-card,
workflow-tracker and marks-entry component suites. Database tests use disposable
local PostgreSQL with school-scoped fixtures; no production records are changed.

## Verification (14 October 2026)

- Disposable PostgreSQL: 44 integration tests passed across teacher exam visibility
  and report-card scope workflows, including actual correction saves, direct release,
  school/teacher boundaries, audit records and event-failure rollback.
- Frontend: 54 tests passed across six workflow, marks-entry, report-card and Dean
  review suites. Slow-machine execution used a 60-second test timeout; assertions
  and business checks were retained.
- Compiled API unit tests: all 166 exams and report-card scope tests passed.
- Browser: actual workflow and entry components passed at 320, 390, 768 and 1440 px
  using isolated QA data, with seven stages, Principal handoff, exact reopen payload,
  East Africa Time conversion, no horizontal overflow and no page errors.
- API TypeScript build and frontend TypeScript checks passed. Deployment is
  tracked separately in the production release evidence.
