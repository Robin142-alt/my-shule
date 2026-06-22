# Plan - Exams & Analytics Upgrade to Zeraki Capabilities

This plan decomposes the upgrade of the exams and analytics module into sequential, verifiable milestones, following the MyShule Agent constitution and governance rules.

## Milestones

| # | Name | Scope | Status |
|---|---|---|---|
| M1 | Decompose & Investigate | Analyze exams database models, controller APIs, and locate frontend dashboard hooks and requirements. Define analytics features to implement. | PLANNED |
| M2 | Implement Backend Aggregations | Add NestJS controller endpoints, services, and repository logic to aggregate exam marks into trends, grade distributions, subject performance, and student progress summaries. Scope by tenant. | PLANNED |
| M3 | Implement Rich Frontend Visualizations | Replace frontend mock data in the Exams tab's AnalyticsPanel with live charts (Tailwind/HTML/CSS-based dashboards, progress bars, grids, trends) that fetch from backend analytics. | PLANNED |
| M4 | Write Automated Programmatic Tests | Write native node tests in `exams.test.ts` or `exams-analytics.test.ts` to assert mathematical accuracy, multi-tenant safety, and edge-case handling of backend aggregations. | PLANNED |
| M5 | Review, Harden & Audit | Verify E2E flows, run compliance scans, ensure Forensic Auditor cleanliness, verify builds, and compile final report. | PLANNED |

## Feature Selection for Analytics Upgrade (Zeraki Level)
1. **School Mean & Subject Mean Trends**: Track averages of the school and specific subjects over multiple exam series to visualize academic trajectories.
2. **Grade Distribution (Grade Spread)**: Calculate grade counts (EE, ME, AE, BE or traditional grades) across classes and subjects to see pass/fail curves.
3. **Subject Comparison Metrics**: Compare subjects side-by-side using subject mean scores, pass percentages, and teacher performance indices.
4. **Student Progress & Risk Signals**: Identify top-improving students, top performing students, and at-risk students (e.g. failing multiple subjects) for targeted interventions.
