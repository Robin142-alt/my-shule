## 2026-06-20T16:54:48Z

You are the Frontend Worker (teamwork_preview_worker) tasked with completing Milestone 3: Implement Frontend Dashboard.

### Objective
Upgrade the frontend exams module dashboard to retrieve and render live academic analytics from the NestJS backend '/exams/analytics' endpoint.

### Scope and Context
- Backend endpoints were implemented in Milestone 2. The endpoint GET `/exams/analytics` returns:
  - `kpis`: `{ school_average: number, pending_reviews: number, missing_marks_alerts: number, active_exams: number }`
  - `trends`: Array of `{ exam_series_id: string, exam_series_name: string, starts_on: string, average_score: number }`
  - `subjectPerformance`: Array of `{ subject_id: string, subject_name: string, mean_score: number, pass_rate: number, ee_count: number, me_count: number, ae_count: number, be_count: number }`
  - `studentProgress`: `{ topPerformers: [...], topImprovers: [...], atRiskStudents: [...] }`
- Working Directory: `.agents/worker_exams_analytics_frontend/`
- Files to modify:
  - `apps/web/src/lib/modules/exams-client.ts`
  - `apps/web/src/components/modules/exams/exams-module-screen.tsx`
