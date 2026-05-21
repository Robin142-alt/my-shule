# Implementation 102 IoT Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production device gateway layer to IoT and Smart Campus.

**Architecture:** Keep staff workflows in `IotController` and add a separate public `IotGatewayController` for hardware/device traffic. Use tenant-scoped hashed device credentials, idempotency records, forced RLS, and focused certification evidence.

**Tech Stack:** NestJS, Postgres, Node crypto, Next.js React UI, node:test, Jest design tests.

---

### Task 1: Gateway Tests

**Files:**
- Modify: `apps/api/src/modules/iot/iot.test.ts`
- Create: `apps/api/src/scripts/implementation102-certification.test.ts`
- Modify: `apps/web/tests/design/iot-module.test.tsx`

- [ ] Add failing tests for gateway schema tables, public gateway route metadata, credential issuance, valid ingestion, invalid token rejection, and idempotent duplicate handling.
- [ ] Add failing certification tests for Implementation 102 evidence.
- [ ] Add a failing design test for Gateway credentials UI.
- [ ] Run `npm run build` and confirm missing gateway implementation failures.

### Task 2: Backend Gateway

**Files:**
- Modify: `apps/api/src/modules/iot/dto/iot.dto.ts`
- Create: `apps/api/src/modules/iot/iot-gateway-auth.ts`
- Create: `apps/api/src/modules/iot/iot-gateway.controller.ts`
- Create: `apps/api/src/modules/iot/iot-gateway.service.ts`
- Modify: `apps/api/src/modules/iot/iot.controller.ts`
- Modify: `apps/api/src/modules/iot/iot.module.ts`
- Modify: `apps/api/src/modules/iot/iot-schema.service.ts`
- Modify: `apps/api/src/modules/iot/repositories/iot.repository.ts`

- [ ] Add DTOs for credential issuance and gateway telemetry.
- [ ] Add credential hashing and constant-time comparison helpers.
- [ ] Add gateway credential and ingestion tables with forced RLS.
- [ ] Add repository methods for credential issuance, credential lookup, idempotency lookup, and batch gateway ingestion.
- [ ] Add service methods for staff-issued credentials and public gateway ingestion.
- [ ] Add controllers with `@Permissions('iot:write')` for staff credential creation and `@Public()` for gateway telemetry.
- [ ] Run focused backend tests until green.

### Task 3: Frontend And Certification

**Files:**
- Modify: `apps/web/src/components/modules/iot/iot-module-screen.tsx`
- Create: `apps/api/src/scripts/implementation102-certification.ts`
- Modify: `package.json`

- [ ] Add Gateway credentials action to the IoT workspace.
- [ ] Show gateway credential and ingestion counts in the dashboard.
- [ ] Add Implementation 102 certification script and npm scripts.
- [ ] Run web design tests and certification until green.

### Task 4: Verification

**Files:**
- Read generated artifacts under `docs/validation/`

- [ ] Run `npm run test:implementation102`.
- [ ] Run `npm run implementation102:certify`.
- [ ] Run `npm --prefix apps/web run test:design -- iot-module`.
- [ ] Run `npm run test`.
- [ ] Run `npm --prefix apps/web run lint`.
- [ ] Run `npm --prefix apps/web run build`.
- [ ] Run `git diff --check`.
