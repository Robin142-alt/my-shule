# Teacher API Endpoints Implementation Gap

## Summary
The requested Teacher API endpoints could not be fully implemented because the underlying database schemas are missing in `schema.sql`. According to the implementation rules, we must not implement the endpoints if the schema is missing. Instead, we have documented the gaps below and blocked the actions in the frontend.

## Missing Schemas / Models
1. **Attendance**: No table for class/lesson attendance records (`attendance`).
2. **Marks**: No table for exam marks/grades (`marks`).
3. **Assignments**: No table for class assignments (`assignments`).
4. **Homework/Resources**: No table for homework or learning resources (`resources` / `homework`).
5. **Communication/SMS**: No table for SMS records/logs (`sms_logs` / `messages`). The `communication` module itself is also completely absent from `apps/api/src/modules`.
6. **Finance Tasks**: No table for financial tasks (`finance_tasks` / `tasks`). The `POST /api/finance/tasks` endpoint cannot be implemented.
7. **Finance Receipts**: No explicit table for standalone receipts (`receipts`) other than standard fee payment records. The `POST /api/finance/receipts` endpoint was not implemented since it has no matching schema.
8. **Operations**: The operations module and schemas (e.g. `emergency`, `alert`, `report`) are completely missing from `apps/api/src/modules/` and `database/schema.sql`. The `POST /api/operations/emergency`, `/api/operations/alert`, `/api/operations/report` endpoints cannot be implemented.

## Implemented Endpoints
1. **Discipline Incidents**: The schema `discipline_incidents` exists in `discipline-schema.service.ts` and the endpoint `POST /api/discipline/incidents` is already fully implemented in `discipline.controller.ts` with proper tenant scoping.
2. **Finance Payment**: The schema `manual_fee_payments` exists in `schema.sql`. The endpoint `POST /api/finance/payment` is fully implemented in `finance.controller.ts` with proper tenant scoping and audit logging.
3. **Exams**: The schemas `exam_series` and `exam_assessments` exist in `exams-schema.service.ts`. Added missing endpoints `POST /api/exams/configuration`, `/api/exams/draft`, `/api/exams/alignment`, `/api/exams/review`, `/api/exams/lifecycle` to `exams.controller.ts` and tested them in `exams.test.ts`. `POST /api/exams/marks` was already implemented.
4. **Inventory Requisitions**: The schema exists in `inventory-schema.service.ts`. Added `POST /api/inventory/requisitions` to `inventory.controller.ts` and tested it in `inventory.test.ts`.

## Frontend Changes
- Edited `apps/web/src/components/school/teacher-command-center.tsx` to visibly block these actions. The submit handlers for attendance, marks, assignments, resources, and SMS now immediately abort and display a UI notice that the action is blocked due to missing database schema.
- Edited `apps/web/src/components/school/accountant-command-center.tsx` to explicitly block the "task" action since the `tasks` schema is missing.
- Blocked Nurse, Security, and Operations dashboards from making operations/emergency/alert/report mutations.
