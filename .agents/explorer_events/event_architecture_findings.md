# Event-Driven Architecture (EDA) Audit Report

## 1. Event Bus Initialization & Mechanism

MyShule implements a **custom Transactional Outbox Pattern** to achieve event-driven architecture rather than relying on external libraries like `EventEmitter2`, Redis PubSub, or message brokers (RabbitMQ).

### Mechanism Details:
- **Database Schema**: The outbox tables are initialized directly via raw SQL inside `apps/api/src/modules/events/events-schema.service.ts` during application startup (`onModuleInit()`).
- **Outbox Table**: Events are persisted transactionally in the `outbox_events` table (with columns: `id`, `tenant_id`, `event_key`, `event_name`, `aggregate_type`, `aggregate_id`, `payload`, `headers`, `status`, `attempt_count`, `available_at`, `published_at`, `last_error`, `created_at`, `updated_at`).
- **Consumer Runs Table**: The `event_consumer_runs` table tracks the execution status and retry attempts of individual registered event consumers to ensure idempotency.
- **Transactional Stored Function**: A custom PL/pgSQL database function `app.claim_outbox_events` is used to claim pending events for asynchronous processing, preventing race conditions via `FOR UPDATE SKIP LOCKED`.
- **Dispatcher/Worker**: `EventConsumerService` (powered by `EventsConsumerWorker`) claims batches, wraps their execution inside NestJS `RequestContextService` contexts, invokes corresponding consumers registered via `EventConsumerRegistryService`, and marks events as `published` or `failed`.

---

## 2. Assessment of State-Changing Mutations

The following is an assessment of the four mutations specifically requested for audit:

### 1. Admitting a Student (Admissions/Students Modules)
- **Status**: **Correctly Emitted**.
- **Execution Details**:
  - `AdmissionsService.registerApplication` calls `StudentsService.createStudent` (`apps/api/src/modules/students/students.service.ts`).
  - `StudentsService.createStudent` (lines 89-98) calls `StudentEventsService.publishStudentCreated(...)` which publishes the `student.created` event.
  - Furthermore, `AdmissionsService.registerApplication` (line 460) directly calls `publishAcademicEnrollmentCreated`, which emits a `student.academic_enrollment.created` event.
- **Code Snippet** (`students.service.ts:89-98`):
  ```typescript
  await this.studentEventsService.publishStudentCreated({
    tenant_id: tenantId,
    student_id: student.id,
    created_at: student.created_at.toISOString(),
    created_by_user_id: student.created_by_user_id,
    admission_number: student.admission_number,
    first_name: student.first_name,
    last_name: student.last_name,
    metadata: student.metadata,
  });
  ```

### 2. Submitting Marks (Exams Module)
- **Status**: **Completely Missing**.
- **Execution Details**:
  - In `ExamsService.persistValidatedMark` (`apps/api/src/modules/exams/exams.service.ts:823`), marks are upserted into the repository and recorded in a local database audit log (`appendMarkAuditLog`), but **no domain event is published**.
  - In `ClassTeacherService.saveMarks` (`apps/api/src/modules/class-teacher/class-teacher.service.ts:671`), marks are updated or inserted, but no event is emitted.
  - Interestingly, `EventPublisherService` defines a `publishExamSubmitted` wrapper method (lines 87-95), but it has **zero callers** across the entire codebase.

### 3. Logging Health Visits (Clinic Module)
- **Status**: **Emitted via Generic Operational Event**.
- **Execution Details**:
  - In `ClinicService.recordVisit` (`apps/api/src/modules/clinic/clinic.service.ts:107`), logging a visit calls `schoolEvents.recordSchoolOperation`.
  - This records a generic `school.operation.recorded` event, which is then published to the outbox. No specialized clinic domain event is published.
- **Code Snippet** (`clinic.service.ts:120-131`):
  ```typescript
  await this.schoolEvents?.recordSchoolOperation({
    event: {
      id: visit?.id,
      type: 'clinic.visit_recorded',
      module: 'clinic',
      actorRole: this.requestContext.requireStore().role || 'staff',
      title: 'Clinic Visit Recorded',
      body: `Clinic visit recorded for student ${dto.student_id}`,
      entityId: visit?.id,
      severity: 'info',
      payload: { student_id: dto.student_id },
    },
    ...
  });
  ```

### 4. Processing Payments (Payments Module)
- **Status**: **Correctly Emitted**.
- **Execution Details**:
  - In `MpesaCallbackProcessorService.processLockedPayment` (`apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts:410`), processing the Mpesa callback invokes `publishPaymentCompletedEvent`.
  - `publishPaymentCompletedEvent` (lines 387-408) calls `eventPublisher.publishPaymentCompleted(...)` to record a `payment.completed` event.
- **Code Snippet** (`mpesa-callback-processor.service.ts:387-408`):
  ```typescript
  private async publishPaymentCompletedEvent(
    paymentIntent: PaymentIntentEntity,
    callback: ParsedMpesaCallback,
    mpesaTransactionId: string,
    ledgerTransactionId: string,
  ): Promise<void> {
    await this.eventPublisher.publishPaymentCompleted({
      tenant_id: paymentIntent.tenant_id,
      payment_intent_id: paymentIntent.id,
      mpesa_transaction_id: mpesaTransactionId,
      checkout_request_id: callback.checkout_request_id,
      merchant_request_id: callback.merchant_request_id,
      ledger_transaction_id: ledgerTransactionId,
      amount_minor: callback.amount_minor ?? paymentIntent.amount_minor,
      currency_code: paymentIntent.currency_code,
      account_reference: paymentIntent.account_reference,
      external_reference: paymentIntent.external_reference,
      mpesa_receipt_number: callback.mpesa_receipt_number,
      phone_number: callback.phone_number,
      completed_at: new Date().toISOString(),
    });
  }
  ```

---

## 3. Metadata Completeness Check (AGENTS.md Section 8)

The table below maps the required event metadata fields from **AGENTS.md Section 8** to the actual event structure produced by `EventPublisherService`:

| Required Metadata | Mapped Field in Codebase | Compliance Status | Details |
| :--- | :--- | :--- | :--- |
| `event_id` | `id` | **Compliant** | Present as a top-level UUID column. |
| `event_type` | `event_name` | **Compliant** | E.g. `'student.created'`, `'payment.completed'`. |
| `school_id` | `tenant_id` | **Non-Compliant** | Named `tenant_id` in code, violating Section 6 rules against mixing `tenant_id` and `school_id` carelessly. |
| `actor_user_id` | `headers.user_id` | **Compliant (Nested)** | Populated via request context headers, but not as a top-level field. |
| `actor_role` | `headers.role` | **Compliant (Nested)** | Populated via request context headers, but not as a top-level field. |
| `entity_type` | `aggregate_type` | **Compliant** | Mapped to DDD aggregate type (e.g. `'student'`, `'payment'`). |
| `entity_id` | `aggregate_id` | **Compliant** | Stored as UUID reference to the entity. |
| `timestamp` | `created_at` / `available_at` | **Compliant** | DB timestamps tracking creation and processing delay. |
| `payload` | `payload` | **Compliant** | JSONB payload carrying specific domain event data. |
| `source_dashboard` | — | **MISSING** | Neither `DomainEvent` nor `headers` defines `source_dashboard`. Only a generic `source` or `source_module` header is populated in some custom overrides. |
| `correlation_id` | `headers.request_id` / `headers.trace_id` | **MISSING** | Trace/request IDs exist in headers but are not explicitly named or standardized as `correlation_id`. |

---

## 4. Gaps & Missing Events

The following is a comprehensive list of service files, mutations, or modules where events are completely missing:

### 1. Exams Module (`exams.service.ts` & `class-teacher.service.ts`)
- **Gap 1: Report Card Publishing**
  - **Mutation**: `ExamsService.publishReportCard` (lines 357-388).
  - **Description**: Writes a database snapshot and audit log, but does not publish `report.card.published` event through `EventPublisherService`, even though the event type and wrapper are fully defined.
  - **Rule Reference**: Section 8: `report_card.published` event must be emitted.
- **Gap 2: Mark/Grade Submissions**
  - **Mutation**: `ExamsService.persistValidatedMark`, `ClassTeacherService.saveMarks`.
  - **Description**: Updates database tables but fails to emit any domain event. The wrapper `publishExamSubmitted` is completely unused.
  - **Rule Reference**: Section 8: `marks.submitted` and `exam.submitted` events must be emitted.

### 2. Human Resources Module (`hr.service.ts`)
- **Gap**: Entire HR Module mutations.
- **Description**: `hr.service.ts` imports and injects `EventPublisherService` but never makes a single call to it. Staff setup, invitations, and updates (like `publishStaffUpdated` wrapper) do not trigger events.
- **Rule Reference**: Section 8: `staff.invited`, `staff.activated`, `staff.role_updated` events must be emitted.

### 3. Counselling Module (`counselling.service.ts`)
- **Gap**: Counselling referrals acceptance, declining, and note creations.
- **Description**: `acceptReferral`, `declineReferral`, `createSession`, `createNote`, and `createImprovementPlan` do not emit any events. Only `createReferral` emits an event (`counselling.referral.submitted`).
- **Rule Reference**: Section 8: `discipline.parent_summoned` and related escalation events must be emitted.

### 4. SimpleOperationsService Subclasses (Boarding, Assets, LMS, CBT, Hostels, AI Insights)
- **Gap**: Generic CRUD operations do not emit domain events.
- **Description**: These services inherit from `SimpleOperationsService` (`apps/api/src/modules/implementation100/simple-operations.ts`). While they write to a local audit table, the base class methods (`createRecord`, `updateStatus`) lack event publishing.
- **Consequence**: Specific events defined in types and having consumer handlers (e.g. `'boarding.request.submitted'`, `'asset.request.submitted'`) are **never emitted**.
- **Rule Reference**: Section 8: `boarding.request.submitted`, `asset.request.submitted` events must be emitted.

### 5. Procurement Module (`procurement.service.ts`)
- **Gap**: Supplier creation, request submission, and purchase order generation.
- **Description**: `ProcurementService` lacks any reference to the event bus, meaning no events are published for new procurement workflows.
- **Rule Reference**: Section 8: `procurement.request.submitted` event must be emitted.
