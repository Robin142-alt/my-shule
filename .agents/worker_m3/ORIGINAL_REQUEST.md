## 2026-06-20T18:18:11Z

Your task is to implement Milestone 3: Proxy Routes Alignment & Event Architecture.
Read `myshule_optimization_audit.md` Section 2 and Section 3.7 for details.

Specifically:
1. Align Next.js proxy route mappings in `apps/web/src/app/api/[...path]/route.ts` (or where rewrite proxy paths are configured) with the NestJS backend controllers:
   - Resolve `/api/student/dashboard` 404 proxy mismatches.
   - Resolve `/api/parent/dashboard` 404 proxy mismatches.
   - Align `/api/academics` plural/singular path mismatches with NestJS `/academic` endpoints.
   - Align Secretary front-office command endpoints (e.g. singular vs plural actions for visitors/appointments, mail/dispatch route alignment).
2. Refactor the Event Outbox structure in `EventPublisherService` (or where outbox messages are structured/inserted):
   - Ensure the event structure uses `school_id` consistently (do not mix `tenant_id` and `school_id` in a confusing way).
   - Move `actor_user_id` and `actor_role` to top-level fields in the schema/insertion rather than nested inside `headers` JSON block.
   - Add `source_dashboard` and `correlation_id` fields to the event structure.
3. Implement missing event outbox emissions:
   - Marks Submission in `apps/api/src/modules/exams/exams.service.ts` (`persistValidatedMark`) and `apps/api/src/modules/class-teacher/class-teacher.service.ts` (`saveMarks`), utilizing `publishExamSubmitted`.
   - Report Card Publishing in `apps/api/src/modules/exams/exams.service.ts` (`publishReportCard` - emit `report_card.published` event).
   - Staff Management in `apps/api/src/modules/hr/hr.service.ts` (emit `staff.invited`, `staff.activated`, `staff.role_updated`).
   - Counselling Session & Referrals in `apps/api/src/modules/counselling/counselling.service.ts` (emit events on session creation, referral acceptance, etc.).
   - Boarding & Assets Simple CRUD operations in `apps/api/src/modules/implementation100/simple-operations.ts` (emit events for boarding roll call, incidents, bed assignments, etc.).
   - Procurement workflows in `apps/api/src/modules/procurement/procurement.service.ts` (emit `procurement.request.submitted` on creations).

Your working directory is `.agents/worker_m3/`. You must write all coordination/progress updates to `.agents/worker_m3/progress.md`.
Document your changes in `.agents/worker_m3/handoff.md` when done.

## 2026-06-20T19:06:50Z

Your task is to complete the remaining items for Milestone 3: Proxy Routes Alignment & Event Architecture.
Specifically:
1. Refactor Event Outbox structure in EventPublisherService if needed, and verify mixed scoping IDs are fixed.
2. Implement missing event outbox emissions:
   - Marks Submission (exams.service.ts and class-teacher.service.ts)
   - Report Card Publishing (exams.service.ts)
   - Staff Management (hr.service.ts)
   - Counselling Session & Referrals (counselling.service.ts)
   - Boarding & Assets Simple CRUD (simple-operations.ts)
   - Procurement workflows (procurement.service.ts)
3. Run backend build/tests and verify changes.
4. Write a final handoff report ('handoff.md') in your directory.

