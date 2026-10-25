# Student progression release

## Behaviour

- Academic calendars drive the current year/term and annual transitions. A year ends only after its entire final local day. Progression never closes a year or infers outcomes from marks.
- The existing API process checks active tenants every minute in bounded pages. School transactions, advisory locks, renewable run leases and per-student journals support retries and interrupted batches.
- Calendar dates and existing pathway configurations supply ordinary destinations. Continuing learners retain stream names and valid subject choices; destination-grade configurations supply subjects and eligible teaching assignments.
- Form 4 and Grade 12 complete at year end. Explicit primary/junior institution boundaries or curriculum endpoints support stage completion. Missing/ambiguous classes, subjects, dates or admissions become visible exceptions.
- Dean, Deputy Principal and Principal share the Student Progression & Transitions workspace. It supports holds, repeats, release, individual/bulk manual promotion, placement corrections, subject changes, exits, reinstatement and reversal with reasons and optimistic conflict checks.
- Expulsion requires a separate Principal decision. Existing applicable school approval rules remain effective. Policies requiring multiple approval stages, attachments or another approver are blocked in this workspace and must use the existing specialised governance workflow.
- Old calendar years that ended before the automation activation date require one audited Run / retry to adopt them. This prevents deployment from silently processing historical backlogs.

## Data and release safety

Production onboarding uses `tenants.tenant_id`. Scheduler discovery reads only active tenant identifiers using the existing platform registry permission; every school operation restores its own tenant context. Legacy `schools` aliases remain supported for settings and approval rules.

Six new tables force tenant row-level security. The additive schema also links annual enrollments to canonical year IDs. Current student, placement, enrollment, subject, timetable and allocation projections update together. Immutable transition snapshots, audit rows and outbox events record the changes. Student IDs, admission numbers, historical financial, attendance, examination and library records are retained.

The read-only production preflight found that some schools have missing next-year terms or overlapping draft years. The release does not invent their dates or silently correct their calendars. Those schools receive configuration guidance and affected promotions remain blocked.

## Verification

- PostgreSQL scenarios cover normal and terminal progression, mixed pathways and streams, timezones, holds/repeats, reversal/release, exceptions, retries, events rolling back with failed transactions, concurrent/stale actions, approvals, canonical tenant discovery and school isolation.
- Browser checks exercise the real progression components at 1440, 768, 390 and 320 pixels, including subject changes, reasons, group holds and overflow/error detection.
- `production-preflight.cjs` only reads schema metadata and tenant-scoped aggregates; it prints no student names, contacts or credentials.
- `check-production-schema.cjs` restores a schema-only snapshot to the disposable localhost harness and applies the migration twice. No production student records are copied.

Final test counts and deployed revisions are recorded after verification in the checklist and release report.

## Recovery

Set `STUDENT_PROGRESSION_AUTOMATION_ENABLED=false` on the existing API service and redeploy to pause the scheduler. The workspace truthfully shows the pause; authorised individual commands and Run / retry remain available.

Application rollback uses the existing Railway/Cloudflare release mechanism. Keep the additive tables and journals: rolling back application code must not delete transition history. Completed transitions are corrected through audited reversal/placement actions, never by deleting history or restoring an entire school database over subsequent activity.
