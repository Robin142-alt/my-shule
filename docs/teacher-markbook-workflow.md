# Teacher markbooks

The teacher Exams & Marks workspace starts with a searchable list grouped by exam, subject, class and paper. Assigned streams are displayed with each class. To do includes unfinished and unavailable sheets; Saved drafts contains persisted, unsubmitted work; Submitted contains read-only reference copies with print and CSV actions.

Draft scores are saved through the existing transactional, tenant-scoped marks service and remain editable. Unsaved changes stay separate for each window and assessment when switching papers. Closing or reloading the browser warns about unsaved changes. Saved drafts survive signing out and returning. Clearing a previously saved score persists an incomplete draft instead of retaining the old score.

Successful submission moves only that paper out of To do and opens the work list. Errors preserve the current scores and sheet. Submitted scores cannot be edited until the existing governed moderation workflow returns them to draft. The UI uses the same database marks that feed the exams manager's teacher-progress list.

`GET /class-teacher/pending-marks` retains its default outstanding-only behavior. The workspace requests `includeUnavailable=true&includeSubmitted=true` to display history and actionable closed/scheduled states. Every assessment is returned, with a unique `sheetId`, saved count, submission time and assigned stream names. The underlying window `id` is unchanged for existing clients.

`POST /class-teacher/marks` accepts `assessmentId` and validates it against the assigned exam window and subject. Older clients may omit it only for a subject with one paper. Authentication, teacher permissions, active/effective assignment, school boundaries, open windows, score validation, atomic persistence, audits and submission events remain enforced.

`GET /exams/marks?view=submitted` returns submitted rows for the authenticated teacher's assigned classes and streams, including after the entry window closes. It does not change write permissions or moderation states.

Validation covers independent papers and subjects, save/edit/reopen, clearing scores, failure recovery, submitted history, tenant/teacher isolation, existing audit/events, legacy database schemas, routing and responsive layouts at 320, 390, 768 and 1440 pixels. Browser fixtures are local test records only. No database migration or production school data changes are needed.
