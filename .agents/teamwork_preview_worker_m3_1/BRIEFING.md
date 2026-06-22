# BRIEFING — 2026-06-22T00:02:25Z

## Mission
Implement Milestone 3.1: Unified IndexedDB Store, providing standardized offline sync queue structure, validation, migration, and test coverage.

## 🔒 My Identity
- Archetype: Offline Database Implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1
- Original parent: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Milestone: Milestone 3.1: Unified IndexedDB Store

## 🔒 Key Constraints
- Do not cheat, bypass validation, or hardcode test results.
- Implement strict client-side validation logic for `schoolId` (non-empty, non-whitespace string, throw Tenant Isolation Violation).
- Use `zod` for parsing and validating.
- Write unit/integration tests to verify this logic.

## Current Parent
- Conversation ID: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Updated: 2026-06-22T00:02:25Z

## Task Summary
- **What to build**: Update IndexedDB version, migration logic, `OfflineSyncRecord` structure, `schoolId` validations in `sync-queue.ts` and `use-offline-mutation.ts`, and write a unit/integration test.
- **Success criteria**: Validations throw appropriate errors on invalid `schoolId`; schema migration succeeds; test suite compiles and passes.
- **Interface contracts**: Standardized `OfflineSyncRecord` structures and hook validation constraints.
- **Code layout**: Source in `apps/web/src/lib/offline/`, tests in `apps/web/tests/offline-validation.test.ts` or similar.

## Key Decisions Made
- [TBD]

## Artifact Index
- None yet.
