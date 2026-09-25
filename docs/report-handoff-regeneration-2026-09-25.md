# Report handoff: latest exam and bulk regeneration

Report Card Handoff starts with the latest exam by exam date, using creation date to break ties. It waits for the school-scoped exam list before requesting reports, counts or class groups. Explicit older-exam and All exams selections survive refreshes.

The new Regenerate all section previews every current report in the selected exam and class, stream or learner scope, across all table pages. One exam and a correction reason are required. The server validates the fresh preview token, Exams Manager permission and school context before storing the confirmed targets in a durable bulk job.

Drafts, reports requiring regeneration and withdrawn reports can be refreshed. Submitted, approved and published reports remain protected by their existing recall/withdrawal workflow. Unchanged reports are reused. New snapshots require all enrolled subject marks to be locked; the transaction checks that the confirmed report has not changed. Existing snapshot, artifact, audit and event persistence remains atomic.

The worker checkpoints every 25 targets, retries transient failures and records partial results. A distinct job kind prevents older workers from mistaking regeneration for initial class generation during deployment. Failed-task retries reset the cursor safely and reuse completed cards. Progress, per-learner errors and saved results are available from the handoff desk and Recent report tasks.

Validation: 178 API unit tests, 42 PostgreSQL integration tests and 37 frontend tests passed. API build, frontend typecheck and changed-file ESLint passed (two pre-existing unused-helper warnings). Integration tests use disposable local PostgreSQL and cover tenant isolation, protected states, changed previews, locked marks, atomic persistence, job continuation, retry and permission revocation. No production reports were regenerated as part of validation.
