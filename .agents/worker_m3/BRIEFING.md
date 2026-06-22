# BRIEFING — 2026-06-20T18:18:11Z

## Mission
Implement Milestone 3: Proxy Routes Alignment & Event Architecture by aligning Next.js API proxy routes, refactoring the Event Outbox structure, and implementing missing event outbox emissions.

## 🔒 My Identity
- Archetype: worker_m3
- Roles: implementer, qa, specialist
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m3
- Original parent: 5203301d-a581-4c32-8119-a5b8a84b516d
- Milestone: Milestone 3

## 🔒 Key Constraints
- CODE_ONLY mode (no external network access).
- Strictly adhere to AGENTS.md rules (Tenant Isolation, Event-Driven Architecture, Shared School Data).
- No hardcoded test results, expected outputs, or dummy implementations.

## Current Parent
- Conversation ID: 5203301d-a581-4c32-8119-a5b8a84b516d
- Updated: not yet

## Task Summary
- **What to build**: 
  1. Next.js proxy route alignment matching NestJS backend controllers.
  2. Refactored Event Outbox structure in EventPublisherService.
  3. Missing event outbox emissions for marks submission, report card publishing, HR staff management, counselling sessions, boarding simple operations, and procurement.
- **Success criteria**:
  - Proxy routes map correctly, no 404s.
  - Event outbox uses school_id, top-level actor_user_id and actor_role, plus source_dashboard and correlation_id.
  - All requested mutations write correct records to the outbox database table.
- **Interface contracts**: c:\Users\user\Desktop\PROJECTS\Shule hub\myshule_optimization_audit.md
- **Code layout**: apps/web and apps/api directories

## Key Decisions Made
- Use NestJS controllers' existing routing paths to align Next.js API proxy handlers.
- Standardize the Outbox Event schema to support `school_id`, `actor_user_id`, `actor_role`, `source_dashboard`, and `correlation_id` as top-level fields.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m3\ORIGINAL_REQUEST.md — Original request description

## Change Tracker
- **Files modified**: None yet
- **Build status**: TBD
- **Pending issues**: None

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: None yet

## Loaded Skills
- None yet
