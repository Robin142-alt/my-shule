# Review Report - R1 Database Schema Validation & Compile-Safety

## Review Summary

**Verdict**: REQUEST_CHANGES

The database schema changes introduced in `prisma/schema.prisma` are syntactically correct and conform to Prisma validation rules. However, the changes are not compile-safe and break the TypeScript build process. The introduction of new fields (specifically the non-nullable `school_id` in the `OutboxEvents` model) and strict-null checks have caused compile-time type mismatches in events tests, `exams.service.ts`, and `hr.service.ts`.

---

## Findings

### [Major] Finding 1: TypeScript compilation errors in Event Consumer and System tests
- **What**: Mock domain event objects in tests are missing required properties (`school_id`, `actor_user_id`, `actor_role`, `source_dashboard`, `correlation_id`).
- **Where**:
  - `apps/api/src/modules/events/consumers/operational-workflow-completed.consumer.test.ts:33`
  - `apps/api/src/modules/events/consumers/operational-workflow-dispatched.consumer.test.ts:82`
  - `apps/api/src/modules/events/consumers/operational-workflow-execution.consumer.test.ts:87`
  - `apps/api/src/modules/events/events.test.ts` (lines 498, 590, 654, 715, 771, 874, 1010, 1163)
- **Why**: The Prisma client generated type `OutboxEvents` maps to `DomainEvent` which now enforces a required, non-nullable `school_id: string` property. The test files use mock objects that do not include this field, causing `TS2739` compile errors.
- **Suggestion**: Update the mock-building helper functions (such as `buildWorkflowCompletedEvent`) and inline test objects to populate `school_id` and the other added properties (actor_user_id, actor_role, etc.).

### [Major] Finding 2: Unhandled Optional Dependency (`eventPublisher`) in ExamsService
- **What**: Property `eventPublisher` is used without safe navigation checks (`?.`), causing strict null check compilation errors.
- **Where**:
  - `apps/api/src/modules/exams/exams.service.ts` (lines 390 and 887)
- **Why**: The constructor of `ExamsService` declares `@Optional() private readonly eventPublisher?: EventPublisherService`. Direct invocation like `await this.eventPublisher.publish...` triggers `TS2532: Object is possibly 'undefined'`.
- **Suggestion**: Access the optional service using safe navigation: `await this.eventPublisher?.publish...`

### [Major] Finding 3: Nullability Type Mismatches in HrService
- **What**: Return type of `getActorUserId()` is `string | null` but it is assigned to event payloads expecting non-nullable `string`. Additionally, optional `dto.job_title_id` (type `string | undefined`) is assigned to the `role` property (type `string`).
- **Where**:
  - `apps/api/src/modules/hr/hr.service.ts` (lines 72, 16 activation_by, 200 activation_by, 551 role, 552 updated_by)
- **Why**: Strictly checked TypeScript properties refuse assignment of nullable/undefined types to string.
- **Suggestion**: Provide default fallback strings (e.g. `this.getActorUserId() || ''`) or assert non-nullability, and handle the optional nature of `dto.job_title_id`.

---

## Verified Claims

- **Correctness of schema syntax** → verified via running `npx prisma validate` → **PASS** (Prisma validates the schema file successfully).
- **RolePermission Mapping** → verified via inspecting `prisma/schema.prisma`. It defines relation `school` referencing `School` model, maps `schoolId` to `tenant_id` database column, sets cascade deletion, and updates the unique index. → **PASS**
- **schoolId indexes on Academics models** → verified via inspecting `prisma/schema.prisma`. `StudentClassAssignment`, `StudentNote`, `ParentMeeting`, `ClassRequest`, `AcademicAuditLog`, `AcademicAssignment`, `AcademicResource`, `LessonLog`, `ClassTeacherAssignment`, and `ReportCardSetting` all correctly have `@@index([schoolId])` added. → **PASS**
- **tenant_id/school_id indexes on legacy models** → verified via inspecting `prisma/schema.prisma`. All target legacy tables now have `@@index([tenant_id])` and `@@index([school_id])` added. → **PASS**
- **TypeScript compilation-safety (typecheck)** → verified via running `npm run typecheck` → **FAIL** (TypeScript compilation errors found in multiple test files, exams service, and HR service).

---

## Coverage Gaps

- None. The schema validation and the codebase-wide typecheck commands cover all prisma and TypeScript files.

---

## Unverified Items

- None. All requested verification items were completed.
