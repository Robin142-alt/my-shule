## 2026-06-18T11:36:17Z

Objective: Perform the backend endpoint audit and database schema verification, cross-referencing them with the frontend expected endpoints, and write the final report.

Steps:
1. Load and read the unique frontend endpoints from the Explorer analyses:
   - `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_1\analysis.md`
   - `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\analysis.md`
   - `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_3\analysis.md`
   Wait, if they wrote scanning scripts (like `scan_api.js` in `explorer_frontend_1` or `scan_endpoints.py` in `explorer_frontend_2`), you can read and run those or examine their outputs to compile a master list of expected endpoints.
2. Programmatically scan the backend codebase in `apps/api/src` to identify all implemented controllers, methods, and NestJS routing decorators (e.g., `@Controller`, `@Get`, `@Post`, `@Patch`, `@Delete`, `@Put`).
   - Extract the path prefixes from `@Controller('...')` and method paths from `@Get('...')`, `@Post('...')`, etc.
   - Map out the complete actual route registry of the backend. Note how the frontend API client handles paths (stripping `/api` prefix, handling path params).
3. Reconcile the expected vs actual routes:
   - List the endpoints that exist and are fully wired (meaning they map to a controller and service method).
   - List the endpoints expected by the frontend but missing in the backend.
4. Programmatically inspect the Prisma database schema in `prisma/schema.prisma` to verify that the required tables and multi-tenant columns (like `school_id`, `tenantId`, `tenant_id`) exist.
   - Cross-reference with the database queries inside the backend services. Find any references to models that do not exist or are missing from the schema.
   - Check if any tables or fields are missing or if there is no tenant isolation on specific tables.
5. Create a draft of the audit report. Note: DO NOT implement or write missing backend code; only report the gaps.
6. Write the final report `C:\Users\user\Desktop\PROJECTS\Shule hub\system_audit_report.md`. Make sure it follows MyShule's constitutional rules (no dead buttons, correct layouts, no placeholders).
7. Write your handoff and send a message back.
