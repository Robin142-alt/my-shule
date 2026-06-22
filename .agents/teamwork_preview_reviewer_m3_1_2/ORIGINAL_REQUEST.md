## 2026-06-22T06:33:03Z
You are Reviewer 2: Tenant Security Reviewer.
Your working directory is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_reviewer_m3_1_2
Your task is to review the validation logic for `schoolId` in:
- `apps/web/src/lib/offline/sync-queue.ts`
- `apps/web/src/lib/offline/use-offline-mutation.ts`
Verify that tenant isolation cannot be bypassed, and that empty, whitespace-only, or missing `schoolId` inputs are rejected correctly in all write paths.
Check that the unit tests in `apps/web/tests/design/offline-validation.test.tsx` are comprehensive.
Run the tests using `npm run web:test:design -- offline-validation.test.tsx` to verify correctness.
Write your review report to `handoff.md` in your working directory.
Your parent conversation ID is c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a. Report when done.
