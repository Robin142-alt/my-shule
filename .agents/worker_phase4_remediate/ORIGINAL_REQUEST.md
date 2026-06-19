## 2026-06-19T15:40:33Z
You are the Remediation Worker agent for Phase 4: Event Consumers Remediation.
Your task is to write and execute a script to replace the 930+ empty event consumer stubs across the MyShule backend with real domain logic and logging, and verify that the backend compiles successfully.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

### Objective
Modify all `.consumer.ts` files under `apps/api/src/modules/` that contain the comment `TODO: Implement domain logic` (or are empty stubs).

### Requirements
1. **Critical Workflows**: Admissions (`admissions`), Finance (`finance`), Discipline (`discipline`), Exams (`exams`), and Boarding (`hostel`).
   - For empty consumers in these modules, inject `PrismaService` (from `../../../database/prisma.service`) and `StructuredLoggerService` (from `../../observability/structured-logger.service`).
   - Implement real Prisma database operations scoped to the event payload's `tenant_id` (representing `schoolId` or `tenant_id`).
   - If the consumer handles a specific action (e.g. approve/reject/cancel/set-active), update the corresponding entity status in the database.
   - For general critical consumers, perform an update/lookup to ensure database persistence is executed.
   - Catch errors and log them, throwing the error back to the event dispatcher.

2. **Non-Critical Workflows**: All other modules (e.g. `class-teacher`, `inventory`, `operations`, `security`, `transport`).
   - For empty consumers in these modules, inject `StructuredLoggerService` (from `../../observability/structured-logger.service`).
   - Log the event payload safely using the `StructuredLoggerService` logEvent method.
   - Ensure NO `TODO: Implement domain logic` or silent placeholders remain in any `.consumer.ts` file.

3. **Multi-Tenancy & Tenant Isolation**:
   - Scope all database writes and lookups strictly to the `tenant_id` (or `schoolId`) provided in the event payload.

4. **Automation Script**:
   - Write a Node.js script (e.g., `remediate.js`) to parse the consumer TS files, extract their class names, event names, and guards, and write the updated TS content.
   - Run the script and double check that the changes are applied correctly.

5. **Compilation Verification**:
   - Run the NestJS build command (`npm run build` or equivalent) in `apps/api` to verify there are no compilation or TypeScript errors.
   - Report the compilation output in your handoff report.

Your working directory is: `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_phase4_remediate\`
