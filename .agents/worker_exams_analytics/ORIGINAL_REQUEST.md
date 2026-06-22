## 2026-06-20T13:17:22Z
Implement backend NestJS controller, service, and repository endpoints for exams analytics.
Working Directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_exams_analytics\

Instructions:
1. Add an endpoint `GET /exams/analytics` to `apps/api/src/modules/exams/exams.controller.ts` with permission guard `@Permissions('exams:read')`.
2. Add `getAnalytics()` method to `apps/api/src/modules/exams/exams.service.ts`.
3. Add `getAnalytics(tenantId: string)` method to `apps/api/src/modules/exams/repositories/exams.repository.ts`.
4. The repository method must execute the SQL queries defined in `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_exams_analytics\analysis.md`:
   - KPIs summary (school_average, pending_reviews, missing_marks_alerts, active_exams).
   - Trends over time (average score per exam series).
   - Subject Performance (mean_score, pass_rate, ee_count, me_count, ae_count, be_count for subjects).
   - Student Progress (topPerformers, topImprovers, and atRiskStudents).
   - All queries must bind `tenant_id = $1` to enforce multi-tenant isolation.
   - Use try-catch or `.catch(() => ...)` to return safe default structures if any table is missing/empty.
5. MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.
6. Run `npm run build` in `apps/api` to verify typescript compilation.
7. Save detailed findings to `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_exams_analytics\handoff.md` and send a message back to the orchestrator (conversation ID: 566ffd4b-981d-495d-bce2-b5f22e778b4d) when complete.
