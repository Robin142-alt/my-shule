## 2026-06-19T05:05:27Z
Implement the missing NestJS controllers and services for the 16 administrative roles (e.g., storekeeper, nurse, transport-manager, class-teacher, etc.) that the frontend React workspaces call via `/api/admin-command/...` (which proxies to NestJS `/admin-command/...`).

Here are the 16 roles and their respective sub-paths under `/admin-command`:
1. storekeeper (admin-command/storekeeper)
2. nurse (admin-command/nurse)
3. transport-manager (admin-command/transport-manager)
4. boarding-master (admin-command/boarding-master)
5. class-teacher (admin-command/class-teacher)
6. dean-academics (admin-command/dean-academics)
7. exams-manager (admin-command/exams-manager)
8. guidance-counselling (admin-command/guidance-counselling)
9. hod (admin-command/hod)
10. ict-manager (admin-command/ict-manager)
11. laboratory-technician (admin-command/laboratory-technician)
12. librarian (admin-command/librarian)
13. procurement-officer (admin-command/procurement-officer)
14. secretary (admin-command/secretary)
15. security-officer (admin-command/security-officer)
16. teacher (admin-command/teacher)
17. student (admin-command/student)
18. parent (admin-command/parent)
19. accountant (admin-command/accountant)

For each role:
1. Create separate controller and service files under `apps/api/src/modules/admin-command/` (e.g. `storekeeper-command.controller.ts`, `storekeeper-command.service.ts`).
2. Map the endpoints defined for each role's dashboard/workspace (see Explorer 2 analysis report in C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_2\analysis.md for exact endpoints).
3. Use class/method decorators like `@Controller(...)`, `@Permissions(...)`, and `@RequiresModule(...)` where appropriate.
4. Extract `tenantId` from `RequestContextService` using `this.requestContext.getStore()?.tenant_id` to enforce strict tenant isolation (school_id).
5. Query the database using the injected `PrismaService` (via raw SQL query execution `this.prisma.query` or `$queryRawUnsafe`, or Prisma Client).
6. Wrap database calls in try-catch blocks to return clean mock/dynamic fallbacks if tables or columns don't exist yet in the database, ensuring compile/run-time safety.
7. Register all new controllers and services in `apps/api/src/modules/admin-command/admin-command.module.ts`.
8. Verify everything compiles cleanly by running `npm run typecheck` and `npm run build` in the workspace root. Ensure both backend and frontend build successfully.

## 2026-06-19T11:47:02Z
Implement the remaining facade stubs with real database logic and restore test integrity in 'apps/api/src/modules/exams/exams.test.ts'.

Target controllers and stubs to remediate:
1. 'apps/api/src/modules/exams/exams.controller.ts':
   - GET 'configuration', 'draft', 'alignment', 'review', 'lifecycle': Query the 'exam_series' custom SQL table via examsRepository/raw SQL and filter by tenant ID.
   - POST 'draft', 'alignment', 'review', 'lifecycle': Insert/update the 'exam_series' custom SQL table using SQL.
2. 'apps/api/src/modules/billing/billing.controller.ts':
   - GET 'waivers': Query 'FeeWaiver' model filtering by schoolId = tenantId.
3. 'apps/api/src/modules/clinic/clinic.controller.ts':
   - GET 'parent/students/me/history': Query 'MedicalVisit' including 'student' filtering by schoolId = tenantId.
   - GET 'medicines/stock': Query 'MedicineInventory' filtering by schoolId = tenantId.
4. 'apps/api/src/modules/boarding/boarding.controller.ts':
   - GET 'roll-calls': Query 'BoardingAttendance' filtering by schoolId = tenantId.
   - GET/POST 'exeats': Use 'WorkflowTask' table.
     - GET: Query WorkflowTasks where schoolId = tenantId and title starts with 'Exeat:'. Map description JSON to ExeatRequestRecord.
     - POST: Handle actions 'add_request', 'approve_request', 'forward_request'. Create/update WorkflowTask records with tenantId.
5. 'apps/api/src/modules/timetable/timetable.controller.ts':
   - GET 'dashboard': Query 'ClassTimetableEntry' where schoolId = tenantId. Count totalSlots and unique classes, map entries to the expected shape (including class_name, subject, teacher_name, status, etc.).
6. 'apps/api/src/modules/transport/transport.controller.ts':
   - GET 'vehicles': Query 'TransportVehicle' model filtering by schoolId = tenantId.
   - GET 'trips': Query 'TransportTrips' model filtering by tenant_id = tenantId.
7. 'apps/api/src/modules/communication/communication.controller.ts':
   - GET 'summary': Query 'CommunicationBroadcast' where schoolId = tenantId, count broadcasts and map metrics.
   - GET 'messages': Query 'CommunicationBroadcast' filtering by schoolId = tenantId.

Test restoration requirement:
8. 'apps/api/src/modules/exams/exams.test.ts':
   - Locate test 'ExamsService handles HOD Review workflow for returning submitted marks'.
   - Rewrite it to instantiate 'ExamsService' using mocks and call the actual 'moderateMarks' service method with action = 'return_for_correction', verifying that the mocked repository is called correctly, rather than relying on a standalone dummy string array push.

Verification requirements:
- Ensure 'npm run build' inside apps/api succeeds without any TypeScript errors.
- Run the exams test file to verify all tests pass: 'node --test apps/api/src/modules/exams/exams.test.ts' (or run the appropriate workspace test runner).
