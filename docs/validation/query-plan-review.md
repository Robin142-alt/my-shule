# Query Plan Review

Generated at: 2026-06-28T04:40:46.999Z

Status: pass

## Reviewed Plans

| Review | Description | Node Types | Warnings |
| --- | --- | --- | --- |
| students-directory-search | Student directory search should use the student full-text index. | Limit, Sort, Bitmap Heap Scan, Bitmap Index Scan | clear |
| admissions-application-search | Admissions application search should use the admissions full-text index. | Limit, Index Scan | clear |
| inventory-item-search | Inventory item search should use the inventory item full-text index. | Limit, Index Scan | clear |
| academics-teacher-assignment-lookup | Teacher assignment lookup should use the academic assignment tenant/teacher index. | Limit, Index Scan | clear |
| exam-marks-student-series | Exam mark lookup should use the student/report-card indexes. | Limit, Index Scan | clear |
| student-fee-allocation-history | Student fee allocation history should use the tenant/student allocation index. | Limit, Index Scan | clear |
| support-status-subscription-queue | Status subscribers should be listed from the active subscription queue index. | Limit, Index Scan | clear |
| hr-staff-profile-directory | Hidden HR staff directory read path remains tenant scoped. | Limit, Index Scan | clear |
| library-catalog-search | Hidden library catalog lookup remains tenant scoped. | Limit, Sort, Bitmap Heap Scan, Bitmap Index Scan | clear |
| timetable-slot-lookup | Hidden timetable slot lookup should use the conflict lookup index shape. | Limit, Index Scan | clear |
| support-ticket-search | Support ticket search should use the support ticket full-text index. | Limit, Sort, Bitmap Heap Scan, Bitmap Index Scan | clear |
| discipline-incident-queue | Discipline incident queue should use tenant/status/severity indexes. | Limit, Index Scan | clear |
| counselling-session-schedule | Counselling schedule should use counsellor and scheduled date indexes. | Limit, Index Scan | clear |

