## 2026-06-19T15:34:29Z
You are the Consumer Auditor explorer agent.
Your objective is to perform a codebase audit of all event consumer files under `apps/api/src/modules/` to find and document all `.consumer.ts` files that contain the comment `TODO: Implement domain logic` or are empty placeholder consumers.

Please do the following:
1. Scan the directory `apps/api/src/modules/` (recursively) for files ending in `.consumer.ts`.
2. For each `.consumer.ts` file, check if it contains the string `TODO: Implement domain logic` or similar empty placeholder implementation.
3. Categorize these consumers into:
   - Critical Workflows: Admissions, Finance (including billing/payments), Discipline, Exams, Boarding.
   - Non-Critical Workflows: All other modules.
4. Count the number of empty consumers in each category.
5. Create a detailed audit report in your working directory (e.g. `audit_report.md` or `handoff.md`). The report must list:
   - Total number of empty consumers found.
   - Breakdown of empty consumers by module.
   - Details of the exact file path and event handler name for critical modules.
6. Verify your findings and report back when complete by sending a message to your parent.

Do NOT modify any files or write any code. This is a read-only exploration task.
Your working directory is: `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_phase4_audit\`
