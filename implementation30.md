# Implementation 30 Kenyan Schools Production Readiness, M-Pesa, Exams, Report Cards, Security, and Scale Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `codex-security:security-scan` before implementing security-sensitive items and `superpowers:subagent-driven-development` or `superpowers:executing-plans` when executing this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Scan date:** 2026-05-19  
**Target deployment:** 1000+ Kenyan schools with about 500+ learners per school, multi-tenant, low-latency, no data leaks, and production-safe M-Pesa fee workflows.  
**Verdict:** The platform has strong foundations, but it is not yet production-ready for 1000+ schools until the P0/P1 work in this document is complete. The strongest baseline areas are tenant isolation/RLS, module access guards, M-Pesa ledger/idempotency, report snapshot infrastructure, and production operability scripts. The highest-risk gaps are Daraja callback trust, raw payment payload retention, duplicate M-Pesa configuration models, exams report-card generation, static exams frontend data, data-protection controls for children, and scale hardening for high-volume school operations.

---

## 0. Scan Evidence

### Commands Run

```bash
npm run build
npm run security:scan
npm run maintainability:scan
npm audit --omit=dev --audit-level=high
node --test dist/apps/api/src/modules/exams/exams.test.js dist/apps/api/src/modules/payments/payments.test.js
npm --prefix apps/web run test:design -- exams-workspace module-live-adapters module-readiness production-module-proxies
```

### Results

- TypeScript build passed.
- Security scan passed and refreshed `docs/security/implementation10-security-scan.md`.
- Maintainability scan passed and refreshed `docs/validation/implementation11-maintainability-scan.md`.
- Production dependency audit reported 0 high-or-higher vulnerabilities.
- Exams and payments targeted backend tests passed: 22/22.
- Exams/module frontend design tests passed: 29/29.

### Kenya-Specific Source Checks

- Safaricom Developer Portal lists Daraja 3.0 as the platform for Safaricom and M-Pesa API access: <https://developer.safaricom.co.ke/apis>
- Safaricom M-PESA API page describes open interfaces for M-Pesa payment integration: <https://www.safaricom.co.ke/main-mpesa/m-pesa-services/do-more-with-m-pesa/m-pesa-api>
- Safaricom's M-PESA integration material describes C2B Register URL, validation URL, confirmation URL, and HTTPS production requirements: <https://www.safaricom.co.ke/images/Downloads/Tender_Documents/EOI_Safaricom_M-PESA_Integration_V1_002.pdf>
- ODPC rights page confirms data-subject rights, minor/guardian exercise of rights, minimization, retention, accuracy, and transfer safeguards: <https://www.odpc.go.ke/rights-of-a-data-subject/>
- ODPC children's data guidance requires heightened safeguards, parental/guardian controls, data minimization, retention/deletion, DPIA thinking, and security controls for children's personal data: <https://www.odpc.go.ke/wp-content/uploads/2025/11/ODPC-%E2%80%93-Guidance-Note-for-Processing-Childrens-Data.pdf>
- ODPC compliance page confirms compliance oversight, DPIA coordination, inspections, and periodic audits: <https://www.odpc.go.ke/data-protection-compliance/>

**Implementation inference:** The current custom M-Pesa HMAC callback signature is safe only if a trusted edge/proxy that the platform controls adds it before the Nest app. Direct Daraja callbacks should not be assumed to include `x-mpesa-signature`; production trust must be based on Daraja-compatible controls such as registered HTTPS callback URLs, provider/network validation, replay/idempotency, and transaction-status/reconciliation verification before irreversible ledger posting.

---

## 1. Non-Negotiables

- Every school is tenant-isolated by authentication, RBAC/ABAC, module access, and PostgreSQL RLS.
- No browser-controlled tenant header may switch a user into another school.
- M-Pesa money is never posted permanently to the ledger from a spoofable callback alone.
- STK and C2B callbacks return quickly, enqueue work, and are processed idempotently.
- Raw M-Pesa payloads, phone numbers, payer names, guardian contacts, learner data, medical data, biometric data, discipline notes, and report cards are encrypted or redacted by default.
- Exams must generate complete report cards from marks, grading policies, attendance, teacher comments, and school templates.
- Published report cards are immutable snapshots with audit logs and signed parent/guardian access.
- Disabled modules expose no routes, frontend screens, widgets, reports, exports, background jobs, or notifications.
- Every module must have route permission tests, RLS tests, module-access tests, and at least one production readiness check.
- Reports, exports, SMS bursts, reconciliation, and heavy analytics run asynchronously through durable queues.
- The system must tolerate at least 500k active learners, millions of guardian records, and high school-day concurrency without table scans or long request transactions.

---

## 2. What Is Already Strong

- `apps/api/src/app.module.ts` registers global auth, RBAC, ABAC, and module-access guards.
- Most tenant tables enforce `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- `apps/api/src/modules/module-access` gives the platform a real module entitlement layer.
- `apps/api/src/modules/payments` already has payment intents, idempotency, callback logs, M-Pesa transactions, C2B payments, replay protection, and reconciliation concepts.
- `apps/api/src/modules/tenant-finance` supports tenant-owned M-Pesa configs with HTTPS callback URL checks.
- `apps/api/src/common/reports` has snapshot, artifact, CSV/XLSX/PDF, and checksum foundations.
- `docker-compose.production.yml` includes multiple API replicas, workers, PgBouncer, Redis, Postgres, and observability services.
- `.github/workflows/production-operability.yml` already runs production-oriented checks.
- Existing exams tests cover subject-scoped mark entry, locks, corrections, and report-card snapshot linkage.
- Existing payments tests cover signatures, STK payloads, callbacks, C2B matching, idempotency, and allocation behavior.

---

## 3. Critical Findings

### P0. M-Pesa Callback Trust Is Not Daraja-Compatible Enough

**Evidence:**
- `apps/api/src/modules/payments/payments.constants.ts` defines `x-mpesa-signature`.
- `apps/api/src/modules/payments/services/mpesa-signature.service.ts` requires custom HMAC headers.
- `apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts` and `mpesa-c2b.controller.ts` enforce that verification.

**Risk:** Direct Safaricom Daraja callbacks may not include these custom headers. If callback signing remains mandatory without an edge signer, real payments may fail. If signing is disabled to make callbacks work, spoofed callbacks could post fee payments.

**Required direction:** Introduce a Daraja-compatible callback trust model: registered HTTPS URLs, high-entropy channel secrets in callback path or query, edge/network allowlist where supported, replay protection, provider transaction-status verification, and reconciliation before irreversible ledger posting.

### P0. M-Pesa Raw Payloads Can Leak Personal and Payment Data

**Evidence:**
- `callback_logs.raw_payload`, `mpesa_transactions.raw_payload`, and `mpesa_c2b_payments.raw_payload` store JSON payloads.
- C2B stores phone number and payer name as searchable operational fields.

**Risk:** M-Pesa callbacks can contain phone numbers, payer names, references, receipt numbers, and metadata. Raw JSON in ordinary tables increases breach blast radius and makes exports/support queries dangerous.

**Required direction:** Move raw payloads to encrypted vault columns or object storage with strict access, keep only masked/indexable fields in operational tables, and redact all logs/exports.

### P0. Exams Do Not Yet Generate Real Report Cards

**Evidence:**
- `apps/api/src/modules/exams/exams.service.ts` publishes a caller-supplied `report_snapshot_id`.
- `student_report_cards` stores metadata and snapshot linkage, not generated academic content.
- `apps/api/src/common/reports/report-pdf-artifact.ts` is a generic report renderer, not a school report-card renderer.
- `apps/web/src/components/modules/exams/exams-module-screen.tsx` presents report-card UI concepts but relies on static module data.

**Risk:** Schools cannot reliably produce complete CBC/8-4-4 report cards, parent-safe downloads, class batches, or immutable academic records.

**Required direction:** Add a full report-card generation pipeline with grading policies, term/class templates, comments, attendance, approval, signatures, generated PDF/HTML artifacts, immutable snapshots, and parent/guardian access.

### P0. Tenant Switching Must Not Depend On User-Controlled Headers

**Evidence:**
- Tenant context uses `x-tenant-id` as part of request tenant resolution.

**Risk:** If membership enforcement or trusted proxy assumptions ever regress, a tenant header becomes a cross-school data leak vector.

**Required direction:** Bind tenant to authenticated membership plus trusted host/subdomain or signed internal proxy headers. Add tests proving untrusted `x-tenant-id` cannot override membership.

### P1. Duplicate M-Pesa Config Models Can Drift

**Evidence:**
- `tenant-finance` has tenant-owned M-Pesa configs used by payments.
- `integrations/daraja` has a separate integration config and a relative callback URL pattern.

**Risk:** Schools may configure one Daraja source while the payment engine uses another, causing wrong shortcode, wrong credentials, wrong callback, or failed reconciliation.

**Required direction:** Make `tenant-finance` the canonical payment-channel model and migrate/deprecate `integrations/daraja` or make it a view/wizard over the same source of truth.

### P1. Report Export Worker Is Not Durable Across Replicas

**Evidence:**
- `apps/api/src/common/reports/report-export.worker.ts` uses an in-memory `Map` for completed export dedupe.

**Risk:** With multiple workers and restarts, duplicate report generation and inconsistent export state will occur.

**Required direction:** Use BullMQ plus database-backed job idempotency and artifact status.

### P1. Scale Path Needs Query Budgets And Partition Discipline

**Evidence:**
- Partitioning foundations exist, but module queries still need systematic EXPLAIN budgets and heavy-table lifecycle policies.
- Some repositories use broad selects and offset-style patterns.
- Request-scoped database transactions can be expensive under high read traffic.

**Risk:** 1000 schools with school-day bursts will create slow dashboards, report generation delays, and worker starvation unless heavy flows are asynchronous and indexed.

**Required direction:** Add per-module query budgets, cursor pagination, table partitions for high-volume logs, materialized summaries, and load tests that model Kenyan school routines.

---

## 4. Module Scan Matrix

| Module | Current baseline | Production amendment |
| --- | --- | --- |
| Academics | Classes, subjects, academic foundations exist. | Add term/year promotion workflows, CBC curriculum mapping, subject allocation validation, class capacity checks, and academic calendar locks. |
| Admissions | Admission workflows exist. | Add guardian consent capture, duplicate learner detection, transfer-in/out workflow, document retention policy, and admission number uniqueness per school. |
| Admin Command | Principal/deputy/secretary command center exists. | Add only provider-driven widgets from enabled modules, no static or disabled-module data, and PII redaction by role. |
| Billing | Fee structures and manual fee payment allocation exist. | Tie billing to verified M-Pesa payment state, arrears snapshots, per-term fee versioning, and accountant approval for reversals. |
| Biometric Attendance | Device sync and attendance logic exist. | Add biometric consent, device attestation, offline replay defense, key rotation, and biometric data minimization. |
| Clinic/Health | Clinic module and health access exist from prior work. | Treat health data as sensitive: encrypt confidential notes, add parent-safe views, retention, incident access audit, and emergency override logs. |
| Compliance | Compliance scaffolding exists. | Add ODPC registration checklist, DPIA records, data-subject request workflow, child data processing register, breach notification workflow, and evidence export. |
| Discipline | Discipline and counselling flows exist. | Encrypt confidential notes, add safeguarding escalation workflow, parent-safe summaries, and strict audit for principal access. |
| Events | Events module exists. | Add capacity, permissioned publishing, consent-aware media rules, SMS throttling, and calendar conflict checks. |
| Exams | Marks, locks, audit, and snapshot linkage exist. | Build full report-card generation, grading policies, class batch publishing, parent portal downloads, corrections approval, and immutable published artifacts. |
| Finance | Ledger/idempotency/accounting foundations exist. | Add verified-only posting, reconciliation dashboards, immutable audit, close-period locks, and accountant dual approval for reversals/write-offs. |
| HR | Staff module exists. | Encrypt staff PII, enforce role-specific access, add contract/document retention, payroll export controls, and staff audit trails. |
| Integrations | SMS/Daraja integration scaffolding exists. | Consolidate Daraja config, add provider health checks, delivery receipts, callback trust, provider rate limits, and failure runbooks. |
| Inventory | Inventory stock flows exist. | Add approvals, procurement budgets, stock counts, expiry checks, supplier records, and segregation of duties. |
| Labs | Labs module exists. | Add chemical/equipment safety logs, incident reporting, stock expiry, teacher checkout workflow, and lab access rules. |
| Library | Library circulation exists. | Add barcode/offline support, lost/damaged workflows, fines link to billing, inventory counts, and parent-safe notices. |
| Module Access | Entitlement guard exists. | Certify every route and frontend route against module code, add disabled-job prevention, and add package/trial/expiry enforcement. |
| Observability | Health/readiness concepts exist. | Add per-school SLO dashboards, audit event anomaly detection, payment callback dashboards, report queue lag, and synthetic parent/payment checks. |
| Payments | Strong STK/C2B/idempotency/reconciliation baseline. | Fix Daraja-compatible trust, payload vaulting, canonical config, verified settlement state, C2B nginx limits, and daily reconciliation. |
| Platform | Multi-tenant platform baseline exists. | Add tenant provisioning hardening, tenant domain binding, data residency controls, per-tenant key management, and onboarding certification. |
| Security | Rate limit/security services exist. | Add secrets rotation, PII leak tests, signed internal headers, SIEM export, break-glass audit, and red-team scripts. |
| Seeder | Seed scripts exist. | Add production-safe anonymized fixtures and prevent real PII in seed data. |
| Students | Learner/guardian model with RLS exists. | Add consent, student data lifecycle, guardian verification, transfer/export controls, search throttling, and PII masking. |
| Support | Support/status endpoints exist. | Add tenant-safe support impersonation, redacted ticket attachments, support access audit, and least-privilege tooling. |
| Sync | Offline sync exists. | Add conflict resolution under school-day load, payload encryption, replay protection, and device revocation. |
| Tenant Finance | Canonical tenant payment configs exist. | Make this the only M-Pesa source of truth, add go-live checklist, callback channel secrets, key rotation, and per-school payment channel status. |
| Timetable | Timetable versions and slots exist. | Add conflict solver, teacher availability, room capacity, substitution workflow, and principal approval before publish. |

---

## 5. Target Architecture For 1000+ Schools

### Capacity Baseline

- 1000 schools x 500 learners = 500,000 active learners.
- Assume 1-2 guardians per learner: 500,000 to 1,000,000 guardian links.
- Assume 50-100 staff per school: 50,000 to 100,000 staff users.
- High-volume tables: attendance, exam marks, audit logs, SMS logs, payment callbacks, sync logs, report snapshots, support/audit evidence.
- Normal school-day bursts: morning attendance, fee payments after reminders, exam mark entry windows, end-term report generation, SMS campaigns, parent portal logins after report publishing.

### SLO Targets

- Authenticated read APIs: p95 under 300 ms for normal list/detail views.
- Writes: p95 under 800 ms excluding queued provider work.
- M-Pesa callback acknowledgement: p95 under 500 ms with durable enqueue.
- Payment verification and allocation: p95 under 30 seconds when provider is healthy.
- Report-card generation: async, class batch visible within 5 minutes for normal class sizes.
- Parent portal report download: p95 under 1 second once artifact is generated.
- RPO: 15 minutes or better.
- RTO: 1 hour for primary service restoration.

### Production Pattern

- API replicas are stateless.
- Workers handle M-Pesa verification, reconciliation, reports, SMS, exports, sync compaction, and analytics.
- PostgreSQL uses PgBouncer, RLS, partitioning, indexed summaries, and point-in-time recovery.
- Redis/BullMQ is durable enough for queue operation and backed by database idempotency.
- Report artifacts are stored outside the database with checksums, signed URLs, and tenant-scoped access.
- Every high-volume module exposes operational metrics: queue lag, failed jobs, p95 latency, error rate, and tenant-specific anomalies.

---

## 6. Files To Create

### M-Pesa And Payments

- `apps/api/src/modules/payments/services/mpesa-callback-trust.service.ts`
- `apps/api/src/modules/payments/services/mpesa-transaction-status.service.ts`
- `apps/api/src/modules/payments/services/mpesa-payload-vault.service.ts`
- `apps/api/src/modules/payments/services/mpesa-go-live-certification.service.ts`
- `apps/api/src/modules/payments/services/mpesa-payment-state-machine.service.ts`
- `apps/api/src/modules/payments/processors/mpesa-verification.processor.ts`
- `apps/api/src/modules/payments/processors/mpesa-reconciliation.processor.ts`
- `apps/api/src/modules/payments/repositories/mpesa-callback-channels.repository.ts`
- `apps/api/src/modules/payments/repositories/mpesa-verification-jobs.repository.ts`
- `apps/api/src/modules/payments/dto/mpesa-go-live.dto.ts`
- `apps/api/src/modules/payments/payments-production-readiness.test.ts`

### Exams And Report Cards

- `apps/api/src/modules/exams/services/report-card-generation.service.ts`
- `apps/api/src/modules/exams/services/report-card-template.service.ts`
- `apps/api/src/modules/exams/services/exam-grading-policy.service.ts`
- `apps/api/src/modules/exams/services/report-card-publish-workflow.service.ts`
- `apps/api/src/modules/exams/processors/report-card-generation.processor.ts`
- `apps/api/src/modules/exams/repositories/report-card-generation.repository.ts`
- `apps/api/src/modules/exams/dto/report-card.dto.ts`
- `apps/api/src/modules/exams/exams-report-card-generation.test.ts`
- `apps/web/src/app/api/exams/[...path]/route.ts`
- `apps/web/src/lib/modules/exams-client.ts`
- `apps/web/src/lib/modules/exams-types.ts`
- `apps/web/src/components/modules/exams/report-card-preview.tsx`
- `apps/web/src/components/modules/exams/report-card-batch-panel.tsx`
- `apps/web/tests/design/exams-report-cards-live.test.ts`

### Security, Scale, And Certification

- `apps/api/src/modules/security/pii-classification.service.ts`
- `apps/api/src/modules/security/redaction.service.ts`
- `apps/api/src/modules/security/tenant-trust-boundary.service.ts`
- `apps/api/src/modules/compliance/data-protection-impact-assessment.service.ts`
- `apps/api/src/scripts/implementation30-certification.ts`
- `apps/api/src/scripts/implementation30-load-profile.ts`
- `apps/api/src/scripts/implementation30-pii-leak-scan.ts`
- `docs/validation/implementation30-certification.md`
- `docs/runbooks/mpesa-production-runbook.md`
- `docs/runbooks/exams-report-card-runbook.md`
- `docs/runbooks/data-breach-response-runbook.md`

---

## 7. Files To Modify

### Backend

- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/config/env.validation.ts`
- `apps/api/src/database/database.service.ts`
- `apps/api/src/tenant/tenant.service.ts`
- `apps/api/src/middleware/rate-limit.middleware.ts`
- `apps/api/src/modules/security/rate-limit.service.ts`
- `apps/api/src/modules/payments/payments.module.ts`
- `apps/api/src/modules/payments/payments-schema.service.ts`
- `apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts`
- `apps/api/src/modules/payments/controllers/mpesa-c2b.controller.ts`
- `apps/api/src/modules/payments/services/mpesa.service.ts`
- `apps/api/src/modules/payments/services/mpesa-c2b.service.ts`
- `apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts`
- `apps/api/src/modules/payments/services/mpesa-reconciliation.service.ts`
- `apps/api/src/modules/payments/repositories/callback-logs.repository.ts`
- `apps/api/src/modules/payments/repositories/mpesa-transactions.repository.ts`
- `apps/api/src/modules/payments/repositories/mpesa-c2b-payments.repository.ts`
- `apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts`
- `apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts`
- `apps/api/src/modules/tenant-finance/tenant-finance-config.repository.ts`
- `apps/api/src/modules/integrations/daraja-integration.service.ts`
- `apps/api/src/modules/integrations/daraja-integration.repository.ts`
- `apps/api/src/modules/exams/exams-schema.service.ts`
- `apps/api/src/modules/exams/exams.service.ts`
- `apps/api/src/modules/exams/exams.controller.ts`
- `apps/api/src/modules/exams/repositories/exams.repository.ts`
- `apps/api/src/common/reports/report-export.worker.ts`
- `apps/api/src/common/reports/report-pdf-artifact.ts`
- `apps/api/src/common/reports/report-artifact-storage.service.ts`
- `apps/api/src/common/reports/report-snapshot.repository.ts`
- `apps/api/src/app-route-permissions.test.ts`
- `apps/api/src/scripts/release-readiness-gate.ts`
- `package.json`

### Frontend

- `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- `apps/web/src/lib/modules/exams-data.ts`
- `apps/web/src/lib/features/module-readiness.ts`
- `apps/web/tests/design/module-live-adapters.test.ts`
- `apps/web/tests/design/production-module-proxies.test.ts`
- `apps/web/tests/design/module-readiness.test.ts`

### Infrastructure

- `deploy/nginx/nginx.conf`
- `docker-compose.production.yml`
- `.github/workflows/production-operability.yml`
- `.env.example`

---

## 8. Task 1: M-Pesa Callback Trust And Verification

**Priority:** P0  
**Goal:** No M-Pesa callback can create a paid ledger state unless it is tenant-bound, idempotent, replay-safe, and verified.

- [x] Add `MpesaCallbackTrustService` with these trust modes:
  - `edge_signed`: callback arrives through a platform-controlled edge/proxy that adds the existing HMAC headers.
  - `daraja_direct`: callback is accepted from registered HTTPS Daraja URLs using callback channel secret, replay protection, provider/network checks, idempotency, and transaction-status verification before posting.
  - `manual_review_only`: callback is stored as unverified and cannot post ledger entries.
- [x] Add `mpesa_callback_channels` table:
  - `tenant_id`
  - `channel_id`
  - `shortcode`
  - `environment`
  - `callback_secret_hash`
  - `allowed_source_cidrs`
  - `requires_edge_signature`
  - `requires_transaction_status`
  - `secret_version`
  - `is_current`
  - `accepts_until`
  - `created_at`
  - `rotated_at`
  - `disabled_at`
- [x] Add high-entropy callback URLs:
  - STK: `https://api.example.com/payments/mpesa/callback/:channelId/:secretRef`
  - C2B validation: `https://api.example.com/payments/mpesa/c2b/validation/:channelId/:secretRef`
  - C2B confirmation: `https://api.example.com/payments/mpesa/c2b/confirmation/:channelId/:secretRef`
- [x] Ensure callback secrets are hashed at rest and can be rotated without breaking in-flight transactions.
- [x] Add `MpesaTransactionStatusService` for Daraja transaction-status verification.
- [x] Add `mpesa_verification_jobs` table:
  - `tenant_id`
  - `payment_intent_id`
  - `checkout_request_id`
  - `mpesa_receipt_number`
  - `transaction_status`
  - `verification_attempts`
  - `last_provider_response_encrypted`
  - `verified_at`
  - `failed_at`
  - `next_retry_at`
- [x] Change STK callback processing:
  - Receive callback.
  - Validate trust envelope.
  - Store redacted operational fields.
  - Store encrypted raw payload in vault.
  - Enqueue verification job.
  - Only post ledger after provider verification or configured reconciliation policy passes.
- [x] Change C2B confirmation processing:
  - Validation endpoint checks reference/admission/invoice format and school payment channel.
  - Confirmation endpoint creates `received_unverified` record first.
  - Verification job confirms provider status.
  - Matching/allocation moves state to `verified_matched` or `verified_unmatched`.
  - Ledger posting happens only from `verified_matched`.
- [x] Add duplicate handling by:
  - `CheckoutRequestID`
  - `MpesaReceiptNumber`
  - C2B `TransID`
  - Tenant/channel/shortcode
- [x] Add tests proving spoofed callbacks cannot post a ledger entry.
- [x] Add tests proving direct Daraja mode can operate without custom HMAC headers but still cannot post until verification succeeds.
- [x] Add tests proving edge-signed mode rejects missing or invalid HMAC headers.

---

## 9. Task 2: Canonical M-Pesa Configuration

**Priority:** P0  
**Goal:** Each school has one canonical payment-channel model.

- [x] Make `tenant_mpesa_configs` and `tenant_payment_channels` the source of truth.
- [x] Convert `DarajaIntegrationService` into a setup wizard over tenant finance configs, or deprecate it.
- [x] Remove relative callback URL creation from `DarajaIntegrationService`.
- [x] Add go-live validation:
  - Consumer key/secret present and encrypted.
  - Shortcode/till/paybill approved.
  - STK enabled where required.
  - C2B validation/confirmation URLs registered.
  - Callback URL is HTTPS and tenant/channel-specific.
  - Sandbox smoke test passed.
  - Production credentials are not sandbox credentials.
  - Reconciliation API permissions are configured.
- [x] Add `mpesa_config_audit_logs` with old/new masked values.
- [x] Add key rotation flow for consumer secret, passkey, callback secret, and initiator credentials.
- [x] Add principal/accountant UI state: `not_configured`, `sandbox_ready`, `awaiting_safaricom_registration`, `production_ready`, `suspended`.
- [x] Add release gate that fails if multiple active M-Pesa configs exist for the same tenant/channel/environment.

---

## 10. Task 3: M-Pesa PII Vault And Redaction

**Priority:** P0  
**Goal:** M-Pesa payloads are useful for reconciliation but not a data leak waiting to happen.

- [x] Add `MpesaPayloadVaultService`.
- [x] Replace operational raw payload use with:
  - `raw_payload_encrypted_ref`
  - `payload_sha256`
  - `masked_msisdn`
  - `receipt_number`
  - `amount`
  - `transaction_date`
  - `account_reference`
  - `provider_result_code`
  - `provider_result_desc_redacted`
- [x] Keep raw callback bodies only in encrypted vault storage with strict permissions.
- [x] Add a redaction helper that masks:
  - phone numbers
  - names
  - admission numbers where not needed
  - receipts in general logs except last 4 chars
  - provider credentials
- [x] Update callback logs, C2B payments, and transaction repositories to never return raw payloads by default.
- [x] Add support-only retrieval requiring:
  - elevated permission
  - ticket id
  - reason
  - audit log
  - time-limited access
- [x] Update tests to assert no raw phone number or payer name appears in API responses, logs, reports, or support exports.

---

## 11. Task 4: M-Pesa Reconciliation And Finance Close

**Priority:** P0  
**Goal:** Finance ledgers are correct even when callbacks are delayed, duplicated, missing, or disputed.

- [x] Add daily reconciliation processor per tenant/payment channel.
- [x] Add on-demand reconciliation for accountant-selected date ranges.
- [x] Add reconciliation states:
  - `provider_received`
  - `system_received`
  - `verified_matched`
  - `verified_unmatched`
  - `amount_mismatch`
  - `duplicate_provider_receipt`
  - `missing_provider_record`
  - `reversed`
  - `manual_review_required`
- [x] Add accountant review screen for unmatched payments.
- [x] Add dual approval for:
  - reversal
  - write-off
  - moving payment between students
  - posting payment after mismatch
- [x] Add finance close periods so end-term accounts cannot be silently modified.
- [x] Add audit evidence linking:
  - provider transaction
  - payment intent
  - fee invoice/allocation
  - ledger transaction
  - approving user
  - reconciliation batch
- [x] Add tests for missing callback, duplicate callback, amount mismatch, wrong account reference, reversal, and late provider status update.

---

## 12. Task 5: Exams Grading Policy And Mark Integrity

**Priority:** P0  
**Goal:** Marks can be trusted before report cards are generated.

- [x] Add grading policy tables:
  - `exam_grading_policies`
  - `exam_grading_policy_boundaries`
  - `exam_subject_weightings`
  - `exam_competency_outcomes`
  - `exam_assessment_components`
- [x] Support both CBC-style competency reporting and traditional numeric/grade reporting.
- [x] Enforce grade boundaries in `enterMark` and report-card generation.
- [x] Add mark version history:
  - original mark
  - correction mark
  - corrected by
  - reason
  - approval state
  - timestamp
- [x] Tighten locked mark corrections:
  - Require assessment/series locked or published before correction workflow.
  - Require reason.
  - Require dual approval for already published report cards.
  - Require report-card regeneration after approved correction.
- [x] Prevent `ON CONFLICT` mark updates from crossing class, subject, academic year, or exam series boundaries.
- [x] Add bulk mark upload backend endpoint with:
  - template download
  - row-level validation
  - duplicate detection
  - preview before commit
  - teacher subject-scope enforcement
  - audit log
- [x] Add tests for invalid grade boundaries, unauthorized subject upload, correction approval, and report-card regeneration.

---

## 13. Task 6: Report Card Generation

**Priority:** P0  
**Goal:** The exams module produces professional, immutable report cards for Kenyan schools.

- [x] Add `ReportCardGenerationService`.
- [x] Add `ReportCardTemplateService`.
- [x] Add class/stream batch generation.
- [x] Add student single-card regeneration.
- [x] Add PDF and HTML artifact output.
- [x] Add report-card template fields:
  - school name/logo/address/contacts
  - learner name, admission number, class/stream
  - academic year, term, exam series
  - subjects and components
  - marks, grade, points, performance descriptors
  - teacher comments
  - class teacher comment
  - principal comment/signature
  - attendance summary
  - conduct/discipline summary when enabled and permitted
  - CBC outcomes/competency statements where configured
  - optional fee balance only for authorized roles and school policy
  - next term opening date
  - generated timestamp and verification code
- [x] Add report-card states:
  - `draft_requested`
  - `draft_generated`
  - `under_review`
  - `approved`
  - `published`
  - `withdrawn`
  - `regeneration_required`
- [x] Add immutable published snapshots using `report_snapshots`.
- [x] Add signed parent/guardian download URL with expiry.
- [x] Add QR/verification code endpoint for printed report cards.
- [x] Add class batch progress tracking and queue status.
- [x] Add tests proving a published report card cannot be modified in place.
- [x] Add tests proving parent access is limited to linked children.
- [x] Add tests proving a withdrawn card cannot be downloaded by a parent.

---

## 14. Task 7: Exams Frontend Live Integration

**Priority:** P1  
**Goal:** The exams UI operates against live APIs, not static module data.

- [x] Create `apps/web/src/app/api/exams/[...path]/route.ts` proxy.
- [x] Create `apps/web/src/lib/modules/exams-client.ts`.
- [x] Replace static report-card actions with live data fetch/mutations.
- [x] Add mark sheet list, mark entry, bulk upload, lock, correction, approval, report generation, and publish flows.
- [x] Add report-card preview component that renders from backend artifact metadata.
- [x] Add batch progress component with polling or server-sent updates.
- [x] Add role-specific UI:
  - teacher: assigned mark sheets only
  - exams officer: locks, corrections, batch generation
  - principal: approval/publish
  - parent: linked child downloads only
- [x] Add design tests for live adapters, disabled exams module, parent isolation, and generated report-card state.

---

## 15. Task 8: Tenant Trust Boundary

**Priority:** P0  
**Goal:** A user cannot choose another school by changing a header.

- [x] Add `TenantTrustBoundaryService`.
- [x] Treat `x-tenant-id` as trusted only when:
  - request came from trusted internal proxy, and
  - proxy signed tenant header, and
  - signature verifies, and
  - user membership includes tenant.
- [x] For browser/client traffic, resolve tenant from:
  - authenticated membership
  - selected tenant in signed session
  - school domain/subdomain binding
- [x] Add tenant domain table:
  - `tenant_id`
  - `domain`
  - `verified_at`
  - `status`
  - `created_at`
- [x] Add tests:
  - untrusted `x-tenant-id` is ignored
  - trusted signed proxy header works
  - user without membership cannot access tenant even with valid-looking header
  - public M-Pesa callback cannot set tenant through arbitrary header
- [x] Add route permission test coverage for every module controller.

---

## 16. Task 9: Child Data Protection And No-Leak Controls

**Priority:** P0  
**Goal:** Align with Kenyan school data-protection expectations for minors and sensitive data.

- [x] Add data classification registry:
  - public
  - internal
  - confidential
  - sensitive child data
  - sensitive health data
  - sensitive biometric data
  - payment data
- [x] Add column-level encryption policy registry for:
  - guardian phone/email
  - health records
  - discipline/counselling notes
  - biometric templates/device identifiers
  - M-Pesa payer information
  - identity documents
  - report-card private comments where applicable
- [x] Add guardian/parent consent records and purpose registry for:
  - portal access
  - SMS/WhatsApp notifications
  - biometric attendance
  - medical processing
  - media/event publishing
  - optional third-party integrations
- [x] Add data subject request workflow:
  - access request
  - correction request
  - deletion/anonymization request where legally allowed
  - export request
  - objection request
- [x] Add retention schedules by data category.
- [x] Add child-data DPIA record for each high-risk module:
  - students
  - clinic
  - biometrics
  - discipline
  - exams/report cards
  - payments
  - sync/offline
- [x] Add breach response runbook and report export.
- [x] Add PII leak scanner in CI checking logs, snapshots, exports, API responses, and frontend fixtures.

---

## 17. Task 10: Scale And Performance Hardening

**Priority:** P1  
**Goal:** Fast school-day operations at 1000+ school scale.

- [x] Create `implementation30-load-profile.ts` with synthetic school-day load:
  - 1000 tenants
  - 500 learners per tenant
  - morning attendance burst
  - fee payment callbacks
  - parent portal logins
  - exam mark entry
  - report-card batch generation
  - SMS campaign
- [x] Add query budgets:
  - p95 read under 300 ms
  - p95 write under 800 ms
  - no unbounded `SELECT *` in module repositories
  - no unbounded offset pagination on large tables
- [x] Add cursor pagination for high-volume lists.
- [x] Partition heavy tables:
  - audit logs
  - SMS logs
  - payment callbacks
  - M-Pesa transactions
  - attendance records
  - sync operation logs
  - report generation jobs
- [x] Add summary tables/materialized views:
  - daily attendance summary
  - fee arrears summary
  - exam subject/class summary
  - payment reconciliation summary
  - principal dashboard summary
- [x] Move request-scoped transactions away from read-only GETs where safe.
- [x] Ensure workers use bounded concurrency and backpressure.
- [x] Add database connection budgets for API replicas and workers through PgBouncer.
- [x] Add cache invalidation rules per module.
- [x] Add performance tests for report-card generation and M-Pesa reconciliation under parallel tenants.

---

## 18. Task 11: Module Access Production Certification

**Priority:** P1  
**Goal:** Disabled modules are truly disabled everywhere.

- [x] Add certification checks that compare:
  - module registry
  - API controllers
  - frontend routes
  - frontend menus
  - background jobs
  - reports
  - widgets
  - permissions
- [x] Fail certification if a route under a module lacks `@RequiresModule`.
- [x] Fail certification if a frontend route has no module guard mapping.
- [x] Fail certification if a background worker processes disabled module jobs.
- [x] Fail certification if report exports can be requested for disabled modules.
- [x] Fail certification if a dashboard widget comes from a disabled module.
- [x] Add tests for trial/expiry/package behavior.

---

## 19. Task 12: Observability And Incident Response

**Priority:** P1  
**Goal:** Operators can detect, diagnose, and recover quickly.

- [x] Add dashboards for:
  - API p95/p99 latency by module
  - payment callback volume and failure rate
  - M-Pesa verification queue lag
  - reconciliation mismatches
  - report-card generation queue lag
  - SMS provider delivery failures
  - tenant isolation anomalies
  - PII access events
  - login/MFA failures
  - database connection saturation
- [x] Add alerts:
  - callback failures above threshold
  - provider verification backlog
  - report-card generation backlog
  - suspicious cross-tenant access attempt
  - failed RLS setting
  - excessive support/admin access to raw PII
  - queue dead-letter growth
- [x] Add runbooks:
  - M-Pesa callbacks failing
  - M-Pesa reconciliation mismatch
  - report cards stuck
  - suspected data breach
  - tenant isolation incident
  - database saturation
  - SMS campaign failure
- [x] Add synthetic checks:
  - login
  - tenant switch
  - STK sandbox flow
  - C2B sandbox/register check
  - parent report-card download
  - principal dashboard load

---

## 20. Task 13: Backups, Restore, And Data Lifecycle

**Priority:** P1  
**Goal:** Data can be recovered and old sensitive data can be safely removed or anonymized.

- [x] Verify encrypted backups for database and object storage.
- [x] Add automated restore test in a disposable environment.
- [x] Add tenant-level export for school contract offboarding.
- [x] Add tenant-level deletion/anonymization workflow for legal offboarding.
- [x] Add retention policies:
  - payment records: keep as required by finance/legal policy
  - audit logs: keep per compliance policy
  - health/discipline notes: keep with strict school policy and legal review
  - raw provider payloads: minimize and expire encrypted raw payload when no longer needed
  - report-card artifacts: immutable academic record policy
- [x] Add evidence reports for backup success and restore success.

---

## 21. Task 14: Production Configuration And Secrets

**Priority:** P1  
**Goal:** No deployment depends on insecure defaults.

- [x] Update `env.validation.ts` for production-only required values:
  - strong JWT secrets
  - M-Pesa callback trust mode
  - callback base URL
  - encryption keys/KMS config
  - Redis TLS when external
  - Postgres SSL
  - object storage bucket and signing config
  - trusted proxy CIDRs
  - CORS allowlist
  - session cookie secure settings
- [x] Add startup failure if production uses:
  - default secrets
  - localhost callback URL
  - HTTP callback URL
  - wildcard CORS
  - disabled RLS audit
  - disabled encryption vault
- [x] Add secret rotation checklist for M-Pesa and platform secrets.
- [x] Add `.env.example` with safe placeholders only.

---

## 22. Task 15: Implementation 30 Certification

**Priority:** P0  
**Goal:** A single command proves this plan is done enough for production signoff.

- [x] Add script:

```json
"implementation30:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/implementation30-certification.ts"
```

- [x] Certification must check:
  - [x] M-Pesa callbacks cannot post ledger without trust and verification.
  - [x] C2B endpoints are rate limited at Nest and nginx.
  - [x] M-Pesa raw payloads are encrypted/redacted.
  - [x] Only one canonical active M-Pesa config exists per tenant/channel.
  - [x] Exams generate report-card artifacts from backend data.
  - [x] Published report cards are immutable snapshots.
  - [x] Parent report-card access is guardian-scoped.
  - [x] Tenant header cannot override membership.
  - [x] RLS is forced for every tenant table.
  - [x] Disabled modules expose no routes/jobs/reports/widgets.
  - [x] Child-data DPIA and consent workflows exist.
  - [x] Load profile meets query and queue budgets.
  - [x] Backup restore test evidence exists.

- [x] Add CI job in `.github/workflows/production-operability.yml`.
- [x] Add generated evidence to `docs/validation/implementation30-certification.md`.

---

## 23. Execution Order

1. Tenant trust boundary and callback trust model.
2. M-Pesa canonical config and encrypted payload vault.
3. M-Pesa verification, reconciliation, and finance close controls.
4. Exams mark integrity and grading policy.
5. Report-card generation, snapshots, parent downloads, and frontend live adapter.
6. Child-data protection, consent, DPIA, and PII leak scanning.
7. Scale/load profile, query budgets, partition checks, and durable report/payment workers.
8. Module-access production certification.
9. Observability, runbooks, backups, restore, and release gate.
10. Full implementation30 certification, pilot rollout gate, and production pilot.

This order protects money and child data first, then makes report cards genuinely usable, then hardens scale and operations.

---

## 24. Pilot Rollout Plan

- [x] Add `npm run implementation30:rollout-gate` so live pilot phases cannot be marked complete without sanitized school-count, M-Pesa, report-card, SLO, and zero-incident evidence.
- [ ] Phase 1: Sandbox with 3 internal demo schools and anonymized data.
- [ ] Phase 2: 5 real pilot schools with M-Pesa sandbox plus manual finance verification.
- [ ] Phase 3: 10 real pilot schools with production M-Pesa for low-risk fee categories.
- [ ] Phase 4: 50 schools with production M-Pesa, report cards, parent portal, and support runbooks.
- [ ] Phase 5: 250 schools after load and incident drills pass.
- [ ] Phase 6: 1000+ schools after backup restore, reconciliation, and SLO evidence pass for 30 days.

> Technical rollout gates are implemented and certified. These phase checkboxes remain open until real pilot schools complete each phase with incident evidence.

Exit criteria for each phase:

- 0 cross-tenant access incidents.
- 0 unverified M-Pesa ledger postings.
- 0 raw PII leaks in logs/exports.
- 99.9% successful callback acknowledgement.
- Reconciliation mismatch backlog resolved daily.
- Report-card generation SLO met.
- Parent portal access isolation verified.
- Support/admin PII access audited.

---

## 25. Full Verification Suite

Run after implementation:

```bash
npm run build
npm run security:scan
npm run maintainability:scan
npm audit --omit=dev --audit-level=high
node --test dist/apps/api/src/app-route-permissions.test.js
node --test dist/apps/api/src/modules/payments/payments.test.js dist/apps/api/src/modules/payments/payments-production-readiness.test.js
node --test dist/apps/api/src/modules/exams/exams.test.js dist/apps/api/src/modules/exams/exams-report-card-generation.test.js
node --test dist/apps/api/src/modules/module-access/module-access.test.js
npm --prefix apps/web run test:design -- exams-report-cards-live exams-workspace module-live-adapters module-readiness production-module-proxies
npm run implementation30:rollout-gate
npm run implementation30:certify
node dist/apps/api/src/scripts/release-readiness-gate.js
npm test
```

Expected:

- Build passes.
- Security and maintainability scans pass.
- Audit reports 0 high-or-higher production vulnerabilities.
- Route permission tests pass.
- M-Pesa production readiness tests pass.
- Exams report-card generation tests pass.
- Frontend live exams/report-card tests pass.
- Implementation 30 rollout gate writes technical readiness and blocks live phases without phase evidence.
- Implementation 30 certification writes `ok: true`.
- Release readiness gate passes.
- Full test suite has zero failures.

---

## 26. Acceptance Checklist

- [x] Each school can configure M-Pesa safely without duplicate config drift.
- [x] STK and C2B callbacks work with Daraja-compatible production controls.
- [x] Spoofed callbacks cannot mark fees as paid.
- [x] Duplicate callbacks are idempotent.
- [x] Missing callbacks are caught by reconciliation.
- [x] Raw M-Pesa payloads are encrypted and redacted from normal access.
- [x] Accountants can review unmatched payments.
- [x] Finance close periods prevent silent historical mutation.
- [x] Exams generate complete report cards from marks and grading policies.
- [x] Report cards are immutable after publishing.
- [x] Parents/guardians can only access linked learner report cards.
- [x] Corrections after publishing require approval and regeneration.
- [x] Tenant headers cannot cause cross-school access.
- [x] All tenant tables have forced RLS or documented non-tenant exemption.
- [x] All modules are guarded by permissions and module access.
- [x] Disabled modules do not run jobs or expose reports/widgets.
- [x] Child data processing has consent, retention, DPIA, and audit records.
- [x] PII leak scanner passes.
- [x] Load profile meets school-day SLOs.
- [x] Backups and restore tests are proven.
- [x] Runbooks exist for payment, report-card, data breach, and tenant-isolation incidents.
- [ ] Pilot rollout exits with zero critical data or payment incidents.

---

## 27. Final Production Signoff Standard

The system is production-ready for Kenyan schools only when all P0 items and the Implementation 30 certification pass. P1 items may be phased during pilot only if compensating controls exist and are documented. P2 enhancements must not block pilot, but they must not weaken payment integrity, child data protection, or tenant isolation.

No school should be moved to live M-Pesa fee collection until:

- callback trust is Daraja-compatible,
- provider verification and reconciliation are active,
- raw payload vaulting is enabled,
- finance close controls are active,
- support access is audited,
- and rollback/manual review runbooks are rehearsed.

No school should publish report cards to parents until:

- report cards are backend-generated,
- parent access is guardian-scoped,
- published snapshots are immutable,
- corrections require approval,
- and signed artifact downloads are enforced.
