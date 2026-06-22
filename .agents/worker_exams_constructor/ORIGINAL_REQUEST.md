## 2026-06-20T20:44:04Z
You are a Specialist Worker under the Project Orchestrator.
Your task is to fix the constructor parameter order in `apps/api/src/modules/exams/exams.service.ts` to preserve backwards compatibility for tests, then run verification tests.

Instructions:
1. In `apps/api/src/modules/exams/exams.service.ts`, locate the constructor of the `ExamsService` class.
2. Change the constructor signature so that the `eventPublisher` parameter is moved to the END of the constructor parameter list:
   - `@Optional() private readonly configService?: ConfigService,`
   - `@Optional() private readonly reportCardGenerationService?: ReportCardGenerationService,`
   - `@Optional() private readonly schoolEvents?: SchoolOperationalEventsService,`
   - `@Optional() private readonly eventPublisher?: EventPublisherService,`
3. Run `npm run build` and `npm run test` in workspace root.
4. Confirm that all tests (including `ExamsService` tests) compile and pass successfully.
5. Verify layout and conformance to AGENTS.md.
6. Return a structured handoff.md in your working directory and report status to the orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-06-20T20:51:26Z
You are a Specialist Worker under the Project Orchestrator.
Your task is to fix the constructor parameter order in `apps/api/src/modules/exams/exams.service.ts` to preserve backwards compatibility for tests, then run verification tests.

Instructions:
1. In `apps/api/src/modules/exams/exams.service.ts`, locate the constructor of the `ExamsService` class.
2. Change the constructor signature so that the `eventPublisher` parameter is moved to the END of the constructor parameter list:
   - `@Optional() private readonly configService?: ConfigService,`
   - `@Optional() private readonly reportCardGenerationService?: ReportCardGenerationService,`
   - `@Optional() private readonly schoolEvents?: SchoolOperationalEventsService,`
   - `@Optional() private readonly eventPublisher?: EventPublisherService,`
3. Run `npm run build` and `npm run test` in workspace root.
4. Confirm that all tests (including `ExamsService` tests) compile and pass successfully.
5. Verify layout and conformance to AGENTS.md.
6. Return a structured handoff.md in your working directory and report status to the orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
