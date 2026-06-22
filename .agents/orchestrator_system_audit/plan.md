# Audit Plan - MyShule Platform

## Objective
Conduct a comprehensive system audit of MyShule platform to locate gaps in:
1. Tenant Isolation
2. Event-Driven Architecture
3. UI Completeness and Workflows

Cross-reference all gaps with the MyShule AGENTS.md constitution. Deliver a detailed Optimization Report at `c:\Users\user\Desktop\PROJECTS\Shule hub\myshule_optimization_audit.md`.

## Detailed Steps

### Step 1: Database & Backend Tenant Isolation Audit
- Locate missing tenant fields in database schema (`prisma/schema.prisma`).
- Locate missing database indexes on tenant fields.
- Analyze how queries verify `school_id` / `tenant_id` at the service layer.
- Identify specific files and lines violating AGENTS.md Section 6 & 9.
- *Verification*: List of tables, file paths, line numbers.

### Step 2: Event-Driven Architecture Audit
- Check if event bus is initialized and active.
- Verify if state mutations emit event payloads.
- Verify if events conform to AGENTS.md Section 8 format rules.
- Check backend endpoints for missing event hooks.
- *Verification*: Code references showing event emission or lack thereof.

### Step 3: Frontend Workflows & UI Completeness Audit
- Identify missing workspaces, mock screens, dead buttons, empty state gaps.
- Map the route prefix mismatch pattern between React routes and NestJS controllers.
- Check forms and button states (loading, disabled double-submit).
- Cross-reference rules in AGENTS.md Section 11, 12, 13, 25.
- *Verification*: Components/files list.

### Step 4: Report Synthesis & Writing
- Write `myshule_optimization_audit.md` at workspace root.
- Ensure sections cover: Tenant Isolation, Event Architecture, and UI Completeness.
- Format with precise line numbers, file paths, and AGENTS.md rule references.

### Step 5: Final Review & Handoff
- Verify report format and completeness.
- Report completion to Sentinel.
