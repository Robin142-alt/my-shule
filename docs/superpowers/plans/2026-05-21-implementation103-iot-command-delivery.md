# Implementation 103 IoT Command Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated IoT devices poll queued commands and acknowledge outcomes.

**Architecture:** Reuse the Implementation 102 gateway credential model. Extract shared gateway authentication in `IotGatewayService`, add command polling and acknowledgement repository methods, expose public controller endpoints, and certify the command delivery loop.

**Tech Stack:** NestJS, Postgres, node:test, Next.js React UI, Jest design tests.

---

### Task 1: Red Tests

**Files:**
- Modify: `apps/api/src/modules/iot/iot.test.ts`
- Create: `apps/api/src/scripts/implementation103-certification.test.ts`
- Modify: `apps/web/tests/design/iot-module.test.tsx`

- [ ] Add tests proving public gateway command poll and acknowledgement endpoints exist.
- [ ] Add tests proving polling authenticates the device, marks queued commands as sent, and audits the poll.
- [ ] Add tests proving acknowledgement stores status and result metadata.
- [ ] Add certification tests for Implementation 103.

### Task 2: Backend Command Delivery

**Files:**
- Modify: `apps/api/src/modules/iot/dto/iot.dto.ts`
- Modify: `apps/api/src/modules/iot/iot-gateway.controller.ts`
- Modify: `apps/api/src/modules/iot/iot-gateway.service.ts`
- Modify: `apps/api/src/modules/iot/repositories/iot.repository.ts`

- [ ] Add DTOs for command polling and command acknowledgement.
- [ ] Extract shared gateway device authentication.
- [ ] Add repository methods for polling and acknowledging commands.
- [ ] Add service methods for command polling and acknowledgement.
- [ ] Add public controller routes.

### Task 3: UI And Certification

**Files:**
- Modify: `apps/web/src/components/modules/iot/iot-module-screen.tsx`
- Create: `apps/api/src/scripts/implementation103-certification.ts`
- Modify: `package.json`

- [ ] Add always-visible Command delivery signal to the IoT gateway UI.
- [ ] Add Implementation 103 certification script and npm commands.

### Task 4: Verification

**Files:**
- Read generated artifacts under `docs/validation/`

- [ ] Run `npm run test:implementation103`.
- [ ] Run `npm run implementation103:certify`.
- [ ] Run `npm --prefix apps/web run test:design -- iot-module`.
- [ ] Run `npm run test`.
- [ ] Run `npm --prefix apps/web run lint`.
- [ ] Run `npm --prefix apps/web run build`.
- [ ] Run `git diff --check`.
