# Handoff Report: Event-Driven Architecture (EDA) Audit

## 1. Observation

Direct observations from the MyShule codebase audit:
- **Event Bus Initialization**: Located in `apps/api/src/modules/events/events-schema.service.ts` (lines 35-250) where database tables `outbox_events` and `event_consumer_runs` and the PL/pgSQL function `app.claim_outbox_events` are bootstrapped on startup.
- **Event Publication Service**: Located in `apps/api/src/modules/events/event-publisher.service.ts` (lines 28-63) utilizing the `OutboxEventsRepository` to save events to `outbox_events`.
- **State-Changing Mutation 1: Student Admissions**:
  - `StudentsService.createStudent` in `apps/api/src/modules/students/students.service.ts` (line 89):
    ```typescript
    await this.studentEventsService.publishStudentCreated({
      tenant_id: tenantId,
      student_id: student.id,
      ...
    });
    ```
- **State-Changing Mutation 2: Submitting Marks**:
  - In `ExamsService.persistValidatedMark` (`apps/api/src/modules/exams/exams.service.ts:830-858`), only database upsert and local database audit logging are done. No domain events are published.
  - The `publishExamSubmitted` wrapper in `EventPublisherService` (line 87) has zero references across the codebase.
- **State-Changing Mutation 3: Logging Health Visits**:
  - In `ClinicService.recordVisit` (`apps/api/src/modules/clinic/clinic.service.ts:120-147`), generic operational logging is done:
    ```typescript
    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: visit?.id,
        type: 'clinic.visit_recorded',
        ...
    ```
- **State-Changing Mutation 4: Processing Payments**:
  - `MpesaCallbackProcessorService.publishPaymentCompletedEvent` in `apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts` (line 393):
    ```typescript
    await this.eventPublisher.publishPaymentCompleted({
      tenant_id: paymentIntent.tenant_id,
      payment_intent_id: paymentIntent.id,
      ...
    ```
- **Metadata Fields**:
  - Top-level database column names in `outbox_events` are: `id`, `tenant_id`, `event_key`, `event_name`, `aggregate_type`, `aggregate_id`, `payload`, `headers`, `status`, `attempt_count`, `available_at`, `published_at`, `last_error`, `created_at`, `updated_at`.
  - Nested header fields inside JSONB `headers` column are: `request_id`, `trace_id`, `span_id`, `parent_span_id`, `user_id`, `role`, `session_id`.
  - There are no definitions or occurrences of `source_dashboard` or `correlation_id` (other than standard request/trace IDs).
- **Missing Event Publishers**:
  - `publishReportCard` in `EventPublisherService` (line 169) is not called in `ExamsService.publishReportCard` (line 357).
  - Services extending `SimpleOperationsService` (like `BoardingService` in `apps/api/src/modules/boarding/boarding.service.ts:9`) only record local audit log entries and generic operational logs (e.g. `boarding.late_return`), but fail to emit specific domain events like `boarding.request.submitted` despite these events having registered consumers.
  - `ProcurementService` (`apps/api/src/modules/procurement/procurement.service.ts`) has no integration with the event bus at all.

---

## 2. Logic Chain

1. **Rule Section 8 (Event-Driven Architecture Rules)** of `AGENTS.md` states: *"Every meaningful state-changing action must emit an event... Events must include: event_id, event_type, school_id, actor_user_id, actor_role, entity_type, entity_id, timestamp, payload, source_dashboard, correlation_id."*
2. **Event Bus Initialization**: Tracing the code in `events-schema.service.ts` and `outbox-events.repository.ts` shows that the application uses a database-backed Custom Transactional Outbox Pattern to enqueue and process events.
3. **Metadata Mapping**: Mappings from Section 8 rules to the actual table columns and payload/headers in `EventPublisherService.publish` reveal that:
   - `school_id` is named `tenant_id` (which violates the constraint in Section 6 to keep them separated and not mix them).
   - `actor_user_id` and `actor_role` are stored nested inside the JSONB `headers` object as `user_id` and `role`.
   - `source_dashboard` is completely missing.
   - `correlation_id` is missing (mapped to `headers.request_id` or `trace_id` but not standardized).
4. **Mutation & Publisher Gaps**:
   - Tracing `ExamsService` and `ClassTeacherService` operations confirms that mark submission and report card publishing mutations mutate database state without publishing their corresponding domain events (`exam.submitted` or `report.card.published`).
   - Generic CRUD operations in modules extending `SimpleOperationsService` (such as `BoardingService` and `AssetsService`) bypass the domain event bus entirely, causing defined events like `boarding.request.submitted` to never be published.
   - `ProcurementService` has no dependency or integration with the event bus.

---

## 3. Caveats

- We did not execute the full runtime test suite against a live database instance since our task is strictly read-only auditing under code-only restrictions.
- We assumed that the local outbox consumer worker is fully functional for all successfully enqueued events.

---

## 4. Conclusion

The MyShule Event-Driven Architecture operates via a custom transactional outbox pattern. While key processes like student admissions and payment processing correctly emit domain events (`student.created` and `payment.completed`), major gaps exist in the **Exams**, **HR**, **Counselling**, **Boarding**, **Assets**, and **Procurement** modules where state mutations do not trigger domain events. Furthermore, the enqueued event structures fail to meet the required metadata naming conventions from `AGENTS.md` Section 8, notably lacking `source_dashboard`, `correlation_id`, and top-level `actor_user_id` / `actor_role` properties, and naming `school_id` as `tenant_id`.

---

## 5. Verification Method

To verify the audit findings:
1. **Event Bus Logic Unit Test**:
   Run the events module unit tests:
   ```bash
   npm run build && node --test dist/apps/api/src/modules/events/events.test.ts
   ```
2. **Code Inspection**:
   Inspect the following target files to verify missing publishers:
   - `apps/api/src/modules/exams/exams.service.ts` around line 357 (`publishReportCard`) and line 823 (`persistValidatedMark`).
   - `apps/api/src/modules/hr/hr.service.ts` to confirm `EventPublisherService` is injected but never invoked.
   - `apps/api/src/modules/events/event-publisher.service.ts` (lines 48-60) to inspect the headers structure.
