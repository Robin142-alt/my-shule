# Exams Manager assisted marks entry

In **Exams Manager → Marks Entry**, select the exam, class/grade, subject and assigned teacher, then open the paper in the existing marks-entry interface. Save a draft or submit through the normal moderation workflow. Submitted sheets remain read-only until returned or explicitly reopened. Existing deadlines, teacher-specific extensions, locking, publishing and report-card regeneration rules apply.

Teachers keep their existing routes and permissions. An assisted draft stays editable by its assigned teacher. Teaching assignments determine the class, stream, subject and term scope; an Exams Manager does not need a personal teaching assignment for the selected class.

## Authorization and accountability

- Assisted endpoints require an authenticated school context, an Exams Manager role and both `exams:write` and `exams:enter-marks`. The exams module must be enabled.
- The actor and school always come from the authenticated request. Selecting a teacher never changes that identity.
- `exam_marks.entered_by_user_id` preserves the original editor; `updated_by_user_id` records the latest editor. The additive `assigned_teacher_user_id` column identifies the teacher responsible for assisted marks. Existing rows fall back to their original owner.
- Mark audits include the actor, selected teacher, prior/new score and evidence status, window and source. Marks, audits and the school event commit together. Event failure rolls everything back.
- Assisted saves notify the assigned teacher; submissions retain the existing Dean notification. Progress, moderation and reopening use the assigned teacher while preserving editor history.

## API and schema

- `GET /exams/assisted-marks-entry/assignments`
- `GET /exams/assisted-marks-entry/markbooks?teacherUserId=<uuid>`
- `POST /exams/assisted-marks-entry` with the existing mark-sheet payload plus `teacherUserId`
- Existing `/exams/marks` roster reads accept the selected teacher filter only for authorized exam officers.

The existing Next.js exams proxy forwards these endpoints. `ExamsSchemaService` adds the nullable teacher column on startup, without rewriting existing marks. Deploy the API/schema before the frontend.

The shared mark-window lookup also now passes the school ID first to the tenant-aware SQL helper, preventing an exam-window UUID from being mistaken for the tenant context.

Keep the additive column and all mark/audit records if reverting application code. Once assisted marks exist, a rollback must retain the assigned-teacher ownership checks so teachers can still edit their assisted drafts. Prefer fixing forward; do not rewrite the original editor or restore a database backup over newer school activity.

## Verification

Coverage includes normal teacher regression tests; manager creation, editing and submission; original/latest editor attribution; teacher continuation and reopening; school and stream isolation; role and permission denials; score bounds; locked, published and archived exams; and transactional rollback on event failure. Browser QA exercises selection, drafts, missing-score reasons, submission and read-only history at 320, 390, 768 and 1440 pixels using isolated fixtures.

Run the database suite only through `apps/api/test/support/run-integration-with-local-postgres.ts`. Browser QA: `node apps/web/tests/design/teacher-marks-browser.mjs --assisted`.
