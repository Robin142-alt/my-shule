# Handoff Report: Exams Analytics Investigation

## 1. Observation
We observed and analyzed the files and databases configuration of the exams module. Specifically:
- **Database Schema**: `apps/api/src/modules/exams/exams-schema.service.ts` contains the SQL schema definitions for tables like `exam_series` (line 38), `exam_assessments` (line 57), `exam_marks` (line 177), and `exam_grade_boundaries` (line 92).
- **Controller/Endpoints**: `apps/api/src/modules/exams/exams.controller.ts` includes routes like `@Get('dashboard-stats')` (line 320).
- **Service/Repository**: `apps/api/src/modules/exams/exams.service.ts` (line 1397) and `apps/api/src/modules/exams/repositories/exams.repository.ts` (line 1476) handle queries using a parameterized `executeSql` helper that takes `tenant_id` as parameter `$1`.
- **Frontend Screen**: `apps/web/src/components/modules/exams/exams-module-screen.tsx` contains `AnalyticsPanel` (line 2340) which currently renders mock `analysis` and `history` objects from `buildExamsModuleData`.
- **API Client**: `apps/web/src/lib/modules/exams-client.ts` contains functions to make API requests via proxy (e.g., `fetchExamsWorkspaceLive` at line 256).

---

## 2. Logic Chain
1. To make the exams analytics live and fully isolated per school, we need robust SQL aggregation queries that process metrics across students, exam series, and marks.
2. The `tenant_id` column is a mandatory RLS scoping key in all tables (`exam_series`, `exam_marks`, `students`, etc.) as verified by the database schema (e.g. `CONSTRAINT uq_exam_marks_tenant_id_id UNIQUE (tenant_id, id)`). Therefore, all raw SQL queries must filter by `tenant_id = $1`.
3. An active student is identified by `status = 'active'` in the `students` table, and their assigned class section is derived from `NULLIF(students.metadata->>'class_section_id', '')::uuid`.
4. We can count missing marks by generating the Cartesian product of active students and open mark entry windows (`exam_mark_entry_windows`) and left-joining `exam_marks` where `score` is null.
5. In the frontend, the `AnalyticsPanel` component can be augmented to take `liveAnalytics` as props, fetch the live endpoints using a React Query hook inside `ExamsModuleScreen`, and render the live subject performance and student performance tables side-by-side with the KPI cards.

---

## 3. Caveats
- The calculation for missing marks assumes that every student in a class section is enrolled in every subject for which a mark entry window is open. If a school has optional subjects where students only take specific courses, this query will count the optional subjects as missing. A separate student-subject mapping table (`student_subject_assignments` or similar) would be required to filter subject-specific enrollments if they exist in the database.
- Historical trends and top improver calculations assume that the `exam_series` table contains chronological date ranges under `starts_on`. If a series has invalid or overlapping dates, the row numbers might not reflect the actual order.

---

## 4. Conclusion
We have successfully located all NestJS, database schema, and frontend component files. We formulated raw SQL aggregation queries for:
- Summary KPIs (school average, pending reviews, missing marks alerts, active exams count).
- Trends (average scores over chronological series).
- Subject Performance (pass rates, means, and CBC grade distribution).
- Student Progress (top performers, top improvers, and at-risk students).

These queries are fully scoped by `tenant_id = $1`. We designed a step-by-step frontend integration plan to load this live data into the `AnalyticsPanel` when in live mode.

---

## 5. Verification Method
- **Test Command**: Run `npm run build && node --test dist/apps/api/src/modules/exams/exams.test.js` to ensure the exams module compiling and passing its unit tests.
- **Inspect Files**: Confirm that `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_exams_analytics\analysis.md` exists and contains the full text of all queries.
- **Invalidation Condition**: If the schema changes the mapping of student class sections (e.g., from `metadata->>'class_section_id'` to a column), the KPI query must be updated to reference the new column.
