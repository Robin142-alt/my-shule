# Exams Backend Schema and Frontend Analytics Integration Analysis

## Overview
This report provides a read-only investigation and analysis of the existing exams backend schema and frontend components. It defines the raw SQL aggregation queries required to generate analytics data and outlines a frontend integration plan to wire up these live metrics to the `AnalyticsPanel` in `exams-module-screen.tsx`.

---

## 1. Located Files

The relevant backend and frontend files for the exams module are located at:
- **NestJS Module**: `apps/api/src/modules/exams/exams.module.ts`
- **NestJS Controller**: `apps/api/src/modules/exams/exams.controller.ts`
- **NestJS Service**: `apps/api/src/modules/exams/exams.service.ts`
- **NestJS Repository**: `apps/api/src/modules/exams/repositories/exams.repository.ts`
- **Database Schema/Bootstrap Service**: `apps/api/src/modules/exams/exams-schema.service.ts`
- **Prisma Schema File**: `prisma/schema.prisma`
- **Frontend Screen Component**: `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- **Frontend API Client**: `apps/web/src/lib/modules/exams-client.ts`

---

## 2. Database Schema & RLS Isolation

The exams schema is defined in `exams-schema.service.ts` and uses Row Level Security (RLS) policies to enforce multi-tenant isolation.
- **Tenant Scope Key**: `tenant_id`
- **Row Level Security**: Enabled and forced on all tables.
- **Example Policy**:
  ```sql
  CREATE POLICY exam_series_tenant_policy ON exam_series
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  ```

### Primary Tables
1. **`exam_series`**: Defines the exam blocks (e.g. "Term 1 CAT 1").
   - Columns: `id` (uuid), `tenant_id` (text), `academic_term_id` (uuid), `name` (text), `starts_on` (date), `ends_on` (date), `status` (text: `'draft'`, `'submitted'`, `'reviewed'`, `'locked'`, `'published'`), `locked_at` (timestamptz), `published_at` (timestamptz).
2. **`exam_assessments`**: Defines subject-specific assessments within a series.
   - Columns: `id` (uuid), `tenant_id` (text), `exam_series_id` (uuid), `subject_id` (uuid), `name` (text), `max_score` (numeric), `weight` (numeric).
3. **`exam_marks`**: Stores student scores.
   - Columns: `id` (uuid), `tenant_id` (text), `exam_series_id` (uuid), `assessment_id` (uuid), `academic_term_id` (uuid), `class_section_id` (uuid), `subject_id` (uuid), `student_id` (uuid), `score` (numeric), `status` (text: `'draft'`, `'submitted'`, `'reviewed'`, `'locked'`, `'published'`).
4. **`exam_mark_entry_windows`**: Defines open/closed entry periods for teachers.
   - Columns: `id` (uuid), `tenant_id` (text), `exam_series_id` (uuid), `subject_id` (uuid), `class_section_id` (uuid), `status` (text: `'open'`, `'closed'`).
5. **`exam_grade_boundaries`**: maps scores to grade labels (e.g., A, B, C or EE, ME, AE, BE).
   - Columns: `id` (uuid), `tenant_id` (text), `exam_series_id` (uuid), `label` (text), `min_score` (numeric), `max_score` (numeric).

---

## 3. Raw SQL Aggregation Queries

All queries are parameterized and strictly scoped by `tenant_id = $1` to ensure absolute tenant isolation.

### A. Summary KPIs
Calculates school average, pending reviews, missing marks alerts, and active exams.
```sql
SELECT
  -- School Average
  (
    SELECT COALESCE(ROUND(AVG(score), 2), 0)::numeric 
    FROM exam_marks 
    WHERE tenant_id = $1
  ) AS school_average,
  -- Pending Reviews (Marks submitted but not reviewed/locked)
  (
    SELECT COUNT(*)::int 
    FROM exam_marks 
    WHERE tenant_id = $1 AND status = 'submitted'
  ) AS pending_reviews,
  -- Missing Marks Alerts
  -- Expected mark entries derived from open mark entry windows and active students
  (
    SELECT COUNT(*)::int
    FROM (
      SELECT s.id AS student_id, ew.exam_series_id, ea.id AS assessment_id
      FROM students s
      JOIN exam_mark_entry_windows ew ON ew.tenant_id = s.tenant_id 
        AND NULLIF(s.metadata->>'class_section_id', '')::uuid = ew.class_section_id
      JOIN exam_assessments ea ON ea.tenant_id = ew.tenant_id 
        AND ea.exam_series_id = ew.exam_series_id 
        AND ea.subject_id = ew.subject_id
      WHERE s.tenant_id = $1 
        AND s.status = 'active'
        AND ew.status = 'open'
    ) expected
    LEFT JOIN exam_marks m ON m.tenant_id = $1
      AND m.exam_series_id = expected.exam_series_id
      AND m.assessment_id = expected.assessment_id
      AND m.student_id = expected.student_id
    WHERE m.score IS NULL
  ) AS missing_marks_alerts,
  -- Active Exams (Exams currently in progress and not locked/published)
  (
    SELECT COUNT(*)::int 
    FROM exam_series 
    WHERE tenant_id = $1 
      AND status NOT IN ('locked', 'published')
  ) AS active_exams;
```

### B. Trends over Time
Calculates average scores per exam series over time.
```sql
SELECT 
  es.id AS exam_series_id,
  es.name AS exam_series_name,
  es.starts_on AS starts_on,
  COALESCE(ROUND(AVG(em.score), 2), 0)::numeric AS average_score
FROM exam_series es
LEFT JOIN exam_marks em ON em.tenant_id = es.tenant_id AND em.exam_series_id = es.id
WHERE es.tenant_id = $1
GROUP BY es.id, es.name, es.starts_on
ORDER BY es.starts_on ASC;
```

### C. Subject Performance
Calculates mean score, pass rate, and CBC competency grade distribution (EE, ME, AE, BE counts) per subject.
```sql
SELECT 
  sub.id AS subject_id,
  sub.name AS subject_name,
  COALESCE(ROUND(AVG(em.score), 2), 0)::numeric AS mean_score,
  COALESCE(ROUND(100.0 * COUNT(CASE WHEN em.score >= ea.max_score * 0.5 THEN 1 END) / NULLIF(COUNT(em.id), 0), 2), 0)::numeric AS pass_rate,
  -- CBC Competency Distributions
  COUNT(CASE WHEN gb.label = 'EE' OR gb.label ILIKE '%exceed%' THEN 1 END)::int AS ee_count,
  COUNT(CASE WHEN gb.label = 'ME' OR gb.label ILIKE '%meet%' THEN 1 END)::int AS me_count,
  COUNT(CASE WHEN gb.label = 'AE' OR gb.label ILIKE '%approach%' THEN 1 END)::int AS ae_count,
  COUNT(CASE WHEN gb.label = 'BE' OR gb.label ILIKE '%below%' THEN 1 END)::int AS be_count
FROM subjects sub
JOIN exam_assessments ea ON ea.tenant_id = sub.tenant_id AND ea.subject_id = sub.id
JOIN exam_marks em ON em.tenant_id = ea.tenant_id AND em.assessment_id = ea.id
LEFT JOIN exam_grade_boundaries gb ON gb.tenant_id = em.tenant_id
  AND gb.exam_series_id = em.exam_series_id
  AND em.score BETWEEN gb.min_score AND gb.max_score
WHERE sub.tenant_id = $1
GROUP BY sub.id, sub.name
ORDER BY sub.name ASC;
```

### D. Student Progress
Calculates top performers, top improvers, and at-risk students.

#### Top Performers (Top 10):
```sql
SELECT 
  s.id AS student_id,
  concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
  s.admission_number,
  ROUND(AVG((em.score / ea.max_score) * 100.0), 2) AS average_percentage,
  COUNT(em.id) AS assessments_taken
FROM students s
JOIN exam_marks em ON em.tenant_id = s.tenant_id AND em.student_id = s.id
JOIN exam_assessments ea ON ea.tenant_id = em.tenant_id AND ea.id = em.assessment_id
WHERE s.tenant_id = $1 AND s.status = 'active'
GROUP BY s.id, s.first_name, s.middle_name, s.last_name, s.admission_number
ORDER BY average_percentage DESC
LIMIT 10;
```

#### Top Improvers (Top 10):
Compares a student's latest exam series average percentage to their previous series average percentage.
```sql
WITH student_series_averages AS (
  SELECT 
    em.student_id,
    em.exam_series_id,
    es.name AS exam_series_name,
    es.starts_on AS exam_series_date,
    AVG((em.score / ea.max_score) * 100.0) AS avg_percentage
  FROM exam_marks em
  JOIN exam_assessments ea ON ea.tenant_id = em.tenant_id AND ea.id = em.assessment_id
  JOIN exam_series es ON es.tenant_id = em.tenant_id AND es.id = em.exam_series_id
  WHERE em.tenant_id = $1
  GROUP BY em.student_id, em.exam_series_id, es.name, es.starts_on
),
ranked_student_averages AS (
  SELECT 
    student_id,
    exam_series_id,
    exam_series_name,
    exam_series_date,
    avg_percentage,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY exam_series_date DESC) AS rn
  FROM student_series_averages
)
SELECT 
  s.id AS student_id,
  concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
  s.admission_number,
  latest.exam_series_name AS latest_exam_series,
  ROUND(latest.avg_percentage::numeric, 2) AS latest_average,
  prev.exam_series_name AS previous_exam_series,
  ROUND(prev.avg_percentage::numeric, 2) AS previous_average,
  ROUND((latest.avg_percentage - prev.avg_percentage)::numeric, 2) AS improvement
FROM ranked_student_averages latest
JOIN ranked_student_averages prev ON prev.student_id = latest.student_id AND prev.rn = latest.rn + 1
JOIN students s ON s.tenant_id = $1 AND s.id = latest.student_id
WHERE latest.rn = 1 AND s.status = 'active'
ORDER BY improvement DESC
LIMIT 10;
```

#### At-Risk Students (Top 10 with average score < 50%):
```sql
SELECT 
  s.id AS student_id,
  concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
  s.admission_number,
  ROUND(AVG((em.score / ea.max_score) * 100.0), 2) AS average_percentage,
  COUNT(em.id) AS assessments_taken
FROM students s
JOIN exam_marks em ON em.tenant_id = s.tenant_id AND em.student_id = s.id
JOIN exam_assessments ea ON ea.tenant_id = em.tenant_id AND ea.id = em.assessment_id
WHERE s.tenant_id = $1 AND s.status = 'active'
GROUP BY s.id, s.first_name, s.middle_name, s.last_name, s.admission_number
HAVING AVG((em.score / ea.max_score) * 100.0) < 50.0
ORDER BY average_percentage ASC
LIMIT 10;
```

---

## 4. Frontend Integration Plan

We will add a new live query to fetch these analytics on demand and supply them directly to the `AnalyticsPanel` Component.

### Step 1: Update API Client (`apps/web/src/lib/modules/exams-client.ts`)
Add the following interfaces and query function:
```typescript
export interface LiveExamAnalytics {
  kpis: {
    school_average: number;
    pending_reviews: number;
    missing_marks_alerts: number;
    active_exams: number;
  };
  trends: Array<{
    exam_series_id: string;
    exam_series_name: string;
    starts_on: string;
    average_score: number;
  }>;
  subjectPerformance: Array<{
    subject_id: string;
    subject_name: string;
    mean_score: number;
    pass_rate: number;
    ee_count: number;
    me_count: number;
    ae_count: number;
    be_count: number;
  }>;
  studentProgress: {
    topPerformers: Array<{
      student_id: string;
      student_name: string;
      admission_number: string;
      average_percentage: number;
      assessments_taken: number;
    }>;
    topImprovers: Array<{
      student_id: string;
      student_name: string;
      admission_number: string;
      latest_exam_series: string;
      latest_average: number;
      previous_exam_series: string;
      previous_average: number;
      improvement: number;
    }>;
    atRiskStudents: Array<{
      student_id: string;
      student_name: string;
      admission_number: string;
      average_percentage: number;
      assessments_taken: number;
    }>;
  };
}

export function fetchExamsAnalyticsLive(session: LiveAuthSession) {
  return withSession<LiveExamAnalytics>(session, "/exams/analytics");
}
```

### Step 2: Update Main Screen Component (`exams-module-screen.tsx`)
1. Import `fetchExamsAnalyticsLive` from `@/lib/modules/exams-client`.
2. Add a `useQuery` hook inside `ExamsModuleScreen` for analytics:
   ```typescript
   const liveAnalyticsQuery = useQuery({
     queryKey: ["exams-analytics", liveSession.session?.tenantId],
     queryFn: () => fetchExamsAnalyticsLive(liveSession.session!),
     enabled: Boolean(liveSession.session),
   });
   const liveAnalytics = liveAnalyticsQuery.data;
   ```
3. Map live data to the structure required by `AnalyticsPanel`:
   ```typescript
   function mapLiveAnalysis(liveAnalytics: LiveExamAnalytics): ExamAnalysisItem[] {
     const atRiskCount = liveAnalytics.studentProgress.atRiskStudents.length;
     const missingAlerts = liveAnalytics.kpis.missing_marks_alerts;
     
     return [
       {
         id: "mean-movement",
         label: "Mean score",
         value: `${liveAnalytics.kpis.school_average}`,
         helper: "Average across all exam records",
         tone: "ok",
       },
       {
         id: "grade-spread",
         label: "Active exam series",
         value: `${liveAnalytics.kpis.active_exams}`,
         helper: "Currently active exam series in progress",
         tone: "ok",
       },
       {
         id: "risk-indicator",
         label: "Risk indicators",
         value: `${atRiskCount} learners`,
         helper: "Students with average score < 50%",
         tone: atRiskCount > 0 ? "warning" : "ok",
       },
       {
         id: "missing-marks-alerts",
         label: "Missing marks alerts",
         value: `${missingAlerts}`,
         helper: "Unentered marks in open windows",
         tone: missingAlerts > 0 ? "warning" : "ok",
       },
     ];
   }

   function mapLiveHistory(trends: LiveExamAnalytics["trends"]): HistoricalResult[] {
     return trends.map((item, idx) => ({
       id: item.exam_series_id || `trend-${idx}`,
       exam: item.exam_series_name,
       mean: `${item.average_score}`,
       topSubject: "See subjects tab",
       riskSignal: "Healthy",
     }));
   }
   ```
4. Pass live mapped values and the raw `liveAnalytics` object down:
   ```typescript
             id: "analytics",
             label: "Analytics",
             panel: (
               <AnalyticsPanel
                 analysis={isLiveMode && liveAnalytics ? mapLiveAnalysis(liveAnalytics) : data.analysis}
                 history={isLiveMode && liveAnalytics ? mapLiveHistory(liveAnalytics.trends) : data.history}
                 liveAnalytics={liveAnalytics}
                 isLiveMode={isLiveMode}
                 isLoading={liveAnalyticsQuery.isLoading}
               />
             ),
   ```

### Step 3: Upgrade `AnalyticsPanel` rendering
Modify `AnalyticsPanel` to display additional live tables when `isLiveMode` is true:
```typescript
function AnalyticsPanel({
  analysis,
  history,
  liveAnalytics,
  isLiveMode,
  isLoading,
}: {
  analysis: ExamAnalysisItem[];
  history: HistoricalResult[];
  liveAnalytics?: LiveExamAnalytics | null;
  isLiveMode?: boolean;
  isLoading?: boolean;
}) {
  const historyColumns: DataTableColumn<HistoricalResult>[] = [
    { id: "exam", header: "Exam", render: (row) => <span className="font-semibold">{row.exam}</span> },
    { id: "mean", header: "Mean", render: (row) => row.mean },
    { id: "topSubject", header: "Top subject", render: (row) => row.topSubject },
    { id: "riskSignal", header: "Risk signal", render: (row) => row.riskSignal },
  ];

  if (isLoading) {
    return <div className="p-10 text-center text-muted">Loading live exams analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analysis.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <BarChart3 className="h-5 w-5 text-info" />
              <StatusPill label={item.tone === "ok" ? "Healthy" : "Watch"} tone={item.tone} />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-2 text-[13px] leading-5 text-muted">{item.helper}</p>
          </Card>
        ))}
      </section>

      {/* Historical Results Trend */}
      <DataTable
        title="Historical results"
        subtitle="Simple trend reading across recent exams."
        columns={historyColumns}
        rows={history}
        getRowKey={(row) => row.id}
      />

      {/* Live-Only Subject Performance & Student Progress lists */}
      {isLiveMode && liveAnalytics && (
        <>
          {/* Subject Performance */}
          <DataTable
            title="Subject Performance Analytics"
            subtitle="Mean scores, pass rates, and CBC competency distributions per subject."
            columns={[
              { id: "subject", header: "Subject", render: (row) => <span className="font-semibold">{row.subject_name}</span> },
              { id: "mean", header: "Mean Score", render: (row) => row.mean_score },
              { id: "passRate", header: "Pass Rate", render: (row) => `${row.pass_rate}%` },
              { 
                id: "distribution", 
                header: "Grade Distribution (EE / ME / AE / BE)", 
                render: (row) => (
                  <div className="flex gap-4">
                    <span className="text-green-600 font-semibold">{row.ee_count} EE</span>
                    <span className="text-blue-600 font-semibold">{row.me_count} ME</span>
                    <span className="text-yellow-600 font-semibold">{row.ae_count} AE</span>
                    <span className="text-red-600 font-semibold">{row.be_count} BE</span>
                  </div>
                )
              },
            ]}
            rows={liveAnalytics.subjectPerformance}
            getRowKey={(row) => row.subject_id}
          />

          {/* Student Progress Cards (Top Performers, Top Improvers, At-Risk) */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Top Performers */}
            <DataTable
              title="Top Performers"
              subtitle="Highest average score percentage."
              columns={[
                { id: "name", header: "Student Name", render: (row) => row.student_name },
                { id: "adm", header: "Adm No", render: (row) => row.admission_number },
                { id: "avg", header: "Avg %", render: (row) => `${row.average_percentage}%` },
              ]}
              rows={liveAnalytics.studentProgress.topPerformers}
              getRowKey={(row) => row.student_id}
            />

            {/* Top Improvers */}
            <DataTable
              title="Top Improvers"
              subtitle="Largest increase from previous series."
              columns={[
                { id: "name", header: "Student Name", render: (row) => row.student_name },
                { id: "change", header: "Improvement", render: (row) => `+${row.improvement}%` },
                { id: "avg", header: "Latest Avg", render: (row) => `${row.latest_average}%` },
              ]}
              rows={liveAnalytics.studentProgress.topImprovers}
              getRowKey={(row) => row.student_id}
            />

            {/* At-Risk Students */}
            <DataTable
              title="At-Risk Learners"
              subtitle="Average score percentage below 50%."
              columns={[
                { id: "name", header: "Student Name", render: (row) => row.student_name },
                { id: "adm", header: "Adm No", render: (row) => row.admission_number },
                { id: "avg", header: "Avg %", render: (row) => `${row.average_percentage}%` },
              ]}
              rows={liveAnalytics.studentProgress.atRiskStudents}
              getRowKey={(row) => row.student_id}
            />
          </div>
        </>
      )}
    </div>
  );
}
```
