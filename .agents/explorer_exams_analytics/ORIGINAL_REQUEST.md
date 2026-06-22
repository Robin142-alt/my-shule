## 2026-06-20T16:12:44+03:00
Analyze the existing exams backend schema and frontend components.
Working Directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_exams_analytics\
Mission:
1. Locate NestJS controller, module, service, and repository files for exams.
2. Locate the DB schema/service for exams.
3. Formulate raw SQL aggregation queries for exams data to calculate:
   - Summary KPIs: school average, pending reviews, missing marks alerts, active exams.
   - Trends: average scores per exam series over time.
   - Subject Performance: mean scores, pass rate, grade distribution (EE, ME, AE, BE counts) per subject.
   - Student Progress: top performers, top improvers, and at-risk students (with <50% average score).
   - Ensure all queries are scoped strictly by tenant_id ($1 parameter).
4. Locate frontend code in `apps/web/src/components/modules/exams/exams-module-screen.tsx` and find the `AnalyticsPanel` rendering logic. Determine how to modify it to fetch from our new endpoints when in live mode.
5. Save detailed findings to `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_exams_analytics\analysis.md`.
6. Save handoff to `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_exams_analytics\handoff.md` and notify the orchestrator (conversation ID: 566ffd4b-981d-495d-bce2-b5f22e778b4d).
