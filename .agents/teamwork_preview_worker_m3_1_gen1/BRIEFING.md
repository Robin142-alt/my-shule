# BRIEFING — 2026-06-22T06:32:00Z

## Mission
Implement Milestone 3.1: Unified IndexedDB Store, providing standardized OfflineSyncRecord, strict schoolId validation, schema migrations, and comprehensive Jest tests.

## 🔒 My Identity
- Archetype: Offline Database Implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen1
- Original parent: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Milestone: Milestone 3.1: Unified IndexedDB Store

## 🔒 Key Constraints
- CODE_ONLY network mode
- Tenant isolation: schoolId must be non-empty, non-whitespace string, throw "Tenant Isolation Violation: A valid schoolId is required"
- Use zod for validation in enqueue
- IndexedDB version 2, delete and recreate 'sync_queue' store with a compound index 'by-school-status' on ['schoolId', 'status']

## Current Parent
- Conversation ID: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Updated: yes

## Task Summary
- **What to build**: Standardized OfflineSyncRecord, migrate IndexedDB to version 2, validate schoolId, and write/run tests.
- **Success criteria**: All tests pass, zero tenant isolation leaks, database version matches, validation functions raise errors on invalid schoolId.
- **Interface contracts**: apps/web/src/lib/offline/sync-queue.ts
- **Code layout**: apps/web/src/lib/offline, apps/web/tests

## Change Tracker
- **Files modified**:
  - `apps/web/src/lib/offline/sync-queue.ts`: Added validation wrapper `putRecord` and schoolId checks on all database actions.
  - `apps/web/src/lib/offline/use-offline-mutation.ts`: Enforce schoolId validation at hook rendering and execution.
  - `apps/web/tests/design/offline-validation.test.tsx`: New test file verifying tenant validation in queue and hook.
- **Build status**: PASS
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (all 7 offline validation tests passed)
- **Lint status**: PASS (ESLint clean)
- **Tests added/modified**: `apps/web/tests/design/offline-validation.test.tsx` (7 tests)

## Loaded Skills
- None

## Key Decisions Made
- Added validation for `schoolId` at both hook instantiation and mutation processing levels to prevent any possible leakage/missing scope.
- Mocked `useAuth` in tests to decouple from browser session/routing logic.
- Included `structuredClone` polyfill in tests due to Node/jsdom version limitations.

## Artifact Index
- None
