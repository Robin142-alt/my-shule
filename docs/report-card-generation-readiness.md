# Report-card generation readiness

The report-card selector previously inferred readiness from the first page of existing mark sheets. A class with one locked mark and 49 missing marks could appear **Ready**, while the generation service correctly rejected it. Older exams could also disappear when their sheets fell outside that page.

`GET /exams/report-cards/generation-scopes` now returns every configured exam/class scope for the authenticated school. It uses the same SQL readiness calculation as the batch generation preflight. Only learners actively enrolled in the selected class and exam subjects are counted; marks from other exams, classes, or schools cannot satisfy those requirements. Entered papers awaiting submission/review/locking prevent readiness even when another paper in the subject is finalized.

Incomplete exams remain selectable for diagnosis. The page shows finalized/expected counts and a subject breakdown of missing marks, drafts awaiting submission, submissions awaiting Dean review, and reviewed marks awaiting locking. Staff can open Marks Entry Hub and refresh readiness after corrections. A failed generation attempt refreshes readiness, and changing exams clears the previous batch's feedback.

Generation still requires complete finalized marks. This change does not fabricate missing results, change school records, publish cards, or bypass approval. It does not alter the existing active-enrollment policy for historical exams.

The command center now shares this readiness calculation too. Previously, it could show 28/28 finalized and advance to generation because it counted only saved rows. It now shows finalized marks against the expected enrollment count and keeps incomplete exams at mark entry. If a missing learner/subject has finalized marks under another exam in the same school, the report-card page identifies that exam and the matching learner count. These are diagnostic hints, not proof that the exams should be combined; results remain attached to their original exam.

Regression coverage:

- The existing exam suite covers report generation, approvals, artifacts, audits, permissions and tenant scoping.
- 7 PostgreSQL integration tests cover the 49-missing-marks case, independent exams/classes/schools, moderation stages, duplicate enrollment rows, more than 50 scopes, stream filtering and authorization.
- Report-card UI tests cover readiness, other-exam hints, report actions and curriculum rendering.
- CI runs the PostgreSQL readiness tests and the report-card UI suites alongside the existing build, lint, permissions and workflow checks.
- Browser verification uses the real component and styles with local test fixtures; it does not generate cards in a real school.

The API and web changes are released together. Existing report generation, moderation, approval and publication rules remain enforced.
