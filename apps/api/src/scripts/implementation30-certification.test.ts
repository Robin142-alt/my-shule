import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation30CertificationMarkdown,
  runImplementation30Certification,
} from './implementation30-certification';

const passingSources: Record<string, string> = {
  'apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts': 'assertCallbackCanChangePaymentState signature_verified provider_verified payment state changes raw_payload_encrypted_ref retrieveForProcessing parseCallbackPayload',
  'apps/api/src/modules/payments/services/mpesa-callback-trust.service.ts': 'edge_signed daraja_direct manual_review_only requiresEdgeSignature',
  'apps/api/src/modules/payments/services/mpesa-callback-channel.service.ts': 'buildCallbackUrls stk_callback_url c2b_validation_url c2b_confirmation_url hashSecretRef sha256 rotateChannelSecret callback_secret_hash is_current = FALSE accepts_until',
  'apps/api/src/modules/payments/services/mpesa-transaction-status.service.ts': 'verifyStkPushStatus /mpesa/stkpushquery/v1/query provider_verified verifyC2bTransactionStatus /mpesa/transactionstatus/v1/query TransactionStatusQuery provider_verified',
  'apps/api/src/modules/payments/services/mpesa-verification-processor.service.ts': 'verifyStkPushStatus markProviderVerified enqueuePayment processC2bVerificationJob verifyC2bTransactionStatus markProviderVerified c2b_payment_status payment_queue_job_id: null',
  'apps/api/src/modules/payments/services/mpesa-c2b.service.ts': 'provider_verification_required manual_fee_payment_id: null ledger_transaction_id: null markVerificationRequested createForC2bConfirmation c2b_payment_id mpesa_receipt_number enqueueMpesaVerification raw_payload: payloadVaultRecord.redacted_payload redactMpesaOperationalPayload maskMpesaPhoneNumber(parsed.phone_number) maskMpesaName(parsed.payer_name) listC2bPayments redactC2bPaymentForResponse maskedPhoneNumber createManualFeePayment phone_number: maskedPhoneNumber',
  'apps/api/src/modules/payments/services/mpesa-payload-vault.service.ts': 'redactMpesaOperationalPayload PHONE_KEYS NAME_KEYS retrieveForSupport payments:mpesa_payload:read ticket id and reason access_expires_at mpesa_payload_support_access_logs retrieveForSupportExport redacted_payload mpesa_payload_support_access_logs redactMpesaOperationalPayload retrieveForProcessing',
  'apps/api/src/modules/payments/repositories/mpesa-verification-jobs.repository.ts': 'createForStkCallback createForC2bConfirmation c2b_payment_id last_provider_response_encrypted encrypt',
  'apps/api/src/modules/payments/queue/payments-queue.processor.ts': 'PAYMENTS_VERIFY_MPESA_JOB processMpesaVerification',
  'apps/api/src/modules/payments/payments-schema.service.ts': 'mpesa_payload_vault encrypted_payload payload_sha256 raw_payload_encrypted_ref mpesa_verification_jobs payment_intent_id uuid checkout_request_id text c2b_payment_id uuid mpesa_receipt_number text transaction_status text NOT NULL DEFAULT \'pending\' last_provider_response_encrypted FORCE ROW LEVEL SECURITY ck_mpesa_c2b_payments_status received_unverified verification_requested verified_matched verified_unmatched callback_trust_status provider_verified_at provider_result_code provider_result_desc uq_payment_intents_tenant_checkout_request_id uq_mpesa_transactions_tenant_checkout_request_id ux_mpesa_transactions_tenant_receipt_number uq_mpesa_c2b_payments_tenant_trans_id mpesa_reconciliation_batches reconciliation_state provider_received system_received verified_matched verified_unmatched amount_mismatch duplicate_provider_receipt missing_provider_record reversed manual_review_required mpesa_reconciliation_discrepancies finance_close_periods finance_approval_requests app.ensure_finance_period_open FORCE ROW LEVEL SECURITY',
  'apps/api/src/modules/payments/services/mpesa-reconciliation.service.ts': 'generateDailyReport generateDateRangeReport runDailyProcessor reconciliation_state provider_received system_received amount_mismatch duplicate_provider_receipt missing_provider_record verified_unmatched manual_review_required INSERT INTO mpesa_reconciliation_batches INSERT INTO mpesa_reconciliation_discrepancies listAccountantReviewItems redactReviewEvidence requestFinanceApproval approveFinanceApproval reversal write_off move_payment post_after_mismatch pending_second_approval distinct approver resolveFinanceApprovalSubject resolution_status = \'resolved\'',
  'apps/api/src/modules/payments/controllers/payments.controller.ts': 'reconciliation/range billing:read generateDateRangeReport reconciliation/daily/run billing:update runDailyProcessor reconciliation/review reconciliation/approval-requests reconciliation/approval-requests/:requestId/approve billing:read billing:update',
  'apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts': 'callback/:channelId/:secretRef resolveCallbackChannel handleCallbackInternal(request, null, callbackChannel) requiresEdgeSignature inspection.signature signature_verified: signatureVerified signatureError && requiresEdgeSignature !signatureVerified createForStkCallback checkout_request_id: parsedCallback.checkout_request_id return Object.assign redactMpesaOperationalPayload(request.body',
  'apps/api/src/modules/payments/controllers/mpesa-c2b.controller.ts': 'validation/:channelId/:secretRef confirmation/:channelId/:secretRef resolveCallbackChannel requires_edge_signature verifyCallbackRequired requiresEdgeSignature() return; verifyCallback',
  'apps/api/src/modules/integrations/daraja-integration.service.ts': 'TenantFinanceConfigService resolveCanonicalCallbackUrl upsertMpesaConfig MPESA callback URL must use HTTPS',
  'apps/api/src/modules/integrations/integrations.module.ts': 'TenantFinanceModule',
  'apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts': 'tenant_mpesa_configs tenant_payment_channels mpesa_callback_channels channel_id uuid NOT NULL callback_secret_hash text NOT NULL allowed_source_cidrs cidr[] requires_edge_signature requires_transaction_status FORCE ROW LEVEL SECURITY ux_tenant_mpesa_configs_active_tenant_environment_channel COALESCE(paybill_number, \'\') COALESCE(till_number, \'\') WHERE status = \'active\' mpesa_config_audit_logs old_values new_values FORCE ROW LEVEL SECURITY',
  'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts': 'insertMpesaConfigAuditLog consumer_secret_masked passkey_masked rotateMpesaCredentials callback_secret_hash callback_secret_masked credential_version validateMpesaGoLive credentials_present callback_registered sandbox_smoke_test production_credentials reconciliation_permissions ledger_accounts',
  'apps/api/src/modules/tenant-finance/tenant-finance-config.repository.ts': 'mpesa_setup_state production_ready sandbox_ready awaiting_safaricom_registration suspended not_configured',
  'apps/api/src/modules/tenant-finance/tenant-finance.controller.ts': 'mpesa-config/go-live billing:read validateMpesaGoLive mpesa-config/:configId/rotate-credentials billing:update rotateMpesaCredentials',
  'apps/api/src/config/env.validation.ts': 'APP_TRUSTED_TENANT_HEADER_SECRET REPORT_CARD_DOWNLOAD_SIGNING_SECRET validateProductionEnv MPESA_CALLBACK_URL must be an HTTPS URL APP_CORS_ORIGINS must not include wildcard origins in production MPESA_CALLBACK_TRUST_MODE edge_signed daraja_direct manual_review_only MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL validateProductionSecret MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL DATABASE_SSL must be true REDIS_URL must use rediss:// APP_TRUSTED_PROXY_CIDRS AUTH_COOKIE_SECURE AUTH_COOKIE_SAME_SITE DATABASE_RLS_AUDIT_ENABLED MPESA_PAYLOAD_VAULT_ENABLED UPLOAD_OBJECT_STORAGE_ENABLED SECURITY_PII_ENCRYPTION_KEY SECURITY_KMS_PROVIDER SECURITY_KMS_KEY_ID base64-encoded 32-byte key',
  'apps/api/src/config/env.validation.test.ts': 'requires production object storage, proxy, secure-cookie, RLS audit, and M-Pesa vault controls rejects external production Postgres and Redis without encrypted transport rejects weak production PII keys and partial KMS configuration configuration maps production transport and security hardening flags',
  'apps/api/src/config/configuration.ts': 'transactionStatusSecurityCredential MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL trustedProxyCidrs cookieSecure cookieSameSite ssl rlsAuditEnabled tlsEnabled kmsProvider kmsKeyId payloadVaultEnabled',
  'apps/api/src/database/database.module.ts': 'buildDatabasePoolOptions database.ssl sslmode=require rejectUnauthorized',
  'apps/api/src/infrastructure/redis/redis.options.ts': 'redis.tlsEnabled rediss requiresRedisTls tls: useTls ? {} : undefined',
  'apps/api/src/infrastructure/redis/redis.options.test.ts': 'buildRedisClientOptions enables TLS from explicit production Redis flag',
  'deploy/nginx/nginx.conf': 'location /payments/mpesa/callback limit_req zone=mpesa_limit location /payments/mpesa/c2b limit_req zone=mpesa_limit',
  'apps/api/src/modules/exams/exams.service.ts': 'generateReportCard loadReportCardData buildReportCardPayload createParentReportCardDownload findReportCardForGuardian signParentReportCardDownloadToken findAssessmentScopeForMark Score exceeds assessment maximum score assertGradeBoundaryForMark findGradeBoundaryForScore outside configured grade boundaries multiple grade boundaries bulkUploadMarks preview_token bulk_grade.updated findPublishedReportCardsForMark Published report-card corrections require dual approval createMarkVersion markReportCardsRegenerationRequired regeneration_required',
  'apps/api/src/modules/exams/exams-schema.service.ts': 'exam_grading_policies exam_grading_policy_boundaries exam_subject_weightings exam_competency_outcomes exam_assessment_components exam_mark_versions report_card_generation_batches report_card_artifacts draft_requested draft_generated under_review approved published withdrawn regeneration_required FORCE ROW LEVEL SECURITY',
  'apps/api/src/modules/exams/services/report-card-generation.service.ts': 'ReportCardGenerationService generateStudentReportCard createPdfReportArtifact renderHtml recordReportCardArtifact verification_code generateReportCardBatch getReportCardBatchStatus verifyPrintedReportCard',
  'apps/api/src/modules/exams/services/report-card-template.service.ts': 'ReportCardTemplateService buildPayload renderHtml buildPdfInput template_fields school_name learner_name principal_comment next_term_opening_date',
  'apps/api/src/modules/exams/exams.controller.ts': 'marks/bulk-template marks/bulk-upload exams:enter-marks report-cards/generate exams:write report-cards/:reportCardId/transition series/:id/publish report-cards/regenerate report-cards/batches report-cards/batches/:batchId exams:read report-cards/verify/:verificationCode report-cards/:reportCardId/parent-download portal:read_own_children report-cards/download/:token mark-sheets/:markSheetId/lock exams:enter-marks lockMarkSheet',
  'apps/api/src/modules/exams/repositories/exams.repository.ts': 'upsertMark ON CONFLICT (tenant_id, assessment_id, student_id) exam_marks.exam_series_id = EXCLUDED.exam_series_id exam_marks.academic_term_id = EXCLUDED.academic_term_id exam_marks.class_section_id = EXCLUDED.class_section_id exam_marks.subject_id = EXCLUDED.subject_id findGradeBoundaryForScore exam_grade_boundaries configured_count match_count BETWEEN min_score AND max_score createReportCardSnapshot current_card card.is_current = TRUE current_card.status <> \'published\' revision_number supersedes_report_card_id Published report cards are immutable; generate a controlled revision instead loadReportCardData exam_marks exam_grade_boundaries students findReportCardForGuardian student_guardians guardian.user_id = $3::uuid guardian.status = \'active\' createMarkVersion INSERT INTO exam_mark_versions findPublishedReportCardsForMark markReportCardsRegenerationRequired regeneration_required recordReportCardArtifact INSERT INTO report_card_artifacts createReportCardGenerationBatch updateReportCardGenerationBatch getReportCardGenerationBatch findReportCardArtifactByVerificationCode',
  'apps/web/src/app/api/exams/[...path]/route.ts': 'proxySchoolApiRequest /exams export async function GET export async function POST export async function PATCH',
  'apps/web/src/lib/modules/exams-client.ts': 'fetchExamsWorkspaceLive enterExamMarkLive bulkUploadExamMarksLive lockExamMarkSheetLive correctLockedExamMarkLive generateReportCardLive generateReportCardBatchLive fetchReportCardBatchStatusLive publishReportCardLive buildParentReportCardDownloadPath createParentReportCardDownloadLive',
  'apps/web/src/components/modules/exams/exams-module-screen.tsx': 'LiveExamsOperationsPanel ReportCardArtifactPreview BatchProgressCard refetchInterval: activeBatchId ? 3000 : false role === "teacher" principalMode Mark saved to live exams ledger Report-card batch generation started Report card published to the parent portal',
  'apps/web/tests/design/exams-workspace.test.tsx': 'blocks the exams workspace when the tenant module is disabled saves live marks, previews uploads, and locks assigned teacher mark sheets generates report-card previews, polls batch progress, and publishes as principal',
  'apps/web/tests/design/module-live-adapters.test.ts': 'maps live exams mark sheets and generated artifacts into the exams workspace builds parent report-card download paths without accepting caller supplied student ids',
  'apps/api/src/tenant/tenant.service.ts': 'trustedTenantHeaderSecret createHmac(\'sha256\'',
  'apps/api/src/tenant/tenant-trust-boundary.service.ts': 'TenantTrustBoundaryService resolveTenantContext signed_header custom_domain tenant_domains verified_at IS NOT NULL isTrustedForwardedTenantId',
  'apps/api/src/middleware/tenant.middleware.ts': 'x-tenant-signature',
  'apps/api/src/tenant/tenant.service.test.ts': 'ignores unsigned forwarded tenant ids resolves verified custom domains tenant domain bindings with forced RLS',
  'apps/api/src/modules/platform/platform-onboarding.schema.ts': 'tenant_domains domain text NOT NULL verified_at timestamptz uq_tenant_domains_domain ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY',
  'implementation30.md': 'Implementation 30 Kenyan Schools Production Readiness',
  '.env.example': 'APP_TRUSTED_TENANT_HEADER_SECRET=replace-with-a-long-random-tenant-header-secret REPORT_CARD_DOWNLOAD_SIGNING_SECRET=replace-with-a-long-random-report-card-download-secret MPESA_CALLBACK_TRUST_MODE=edge_signed MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL=replace-with-daraja-transaction-status-security-credential',
  '.env.production.example': 'APP_TRUSTED_TENANT_HEADER_SECRET=replace-with-a-long-random-tenant-header-secret REPORT_CARD_DOWNLOAD_SIGNING_SECRET=replace-with-a-long-random-report-card-download-secret MPESA_CALLBACK_TRUST_MODE=edge_signed MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL=replace-with-daraja-transaction-status-security-credential',
  '.env.vercel.production': 'APP_TRUSTED_TENANT_HEADER_SECRET="" REPORT_CARD_DOWNLOAD_SIGNING_SECRET="" MPESA_CALLBACK_TRUST_MODE="edge_signed" MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL="" VERCEL_OIDC_TOKEN=""',
  'docs/runbooks/secret-rotation.md': 'M-Pesa secret rotation MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL Platform secret rotation never print secrets',
  '.github/workflows/production-operability.yml': 'npm run implementation30:certify npm run implementation30:rollout-gate docs/validation/implementation30-certification.md docs/validation/implementation30-rollout-gate.md module-access:certify docs/validation/module-access-certification.md Backup restore verification npm run dr:backup-restore > production-backup-restore.txt production-backup-restore.txt',
  'apps/api/src/modules/payments/payments.test.ts': 'provider_verification_required exports only redacted payloads redacts C2B API payment responses for legacy raw rows assert.notEqual creates callback channels with hashed secrets builds high-entropy STK and C2B callback URLs high-entropy channel-secret routes creates M-PESA verification jobs verificationJobInput duplicate M-PESA identifiers MpesaTransactionStatusService verifies STK callback status classifies verified C2B payments without ledger enqueue accepts unsigned direct Daraja callbacks rejects unsigned callbacks in edge-signed mode accepts unsigned validation callbacks in direct Daraja mode PaymentsSchemaService creates reconciliation batches MpesaReconciliationService reports missing callbacks, duplicates, amount mismatches, wrong references, and late provider status runs daily reconciliation for every active tenant payment channel generates on-demand date-range reports lists accountant review items without raw M-PESA payload leakage requires two distinct approvers before resolving reversal requests exposes accountant review and finance approval endpoints',
  'apps/api/src/modules/exams/exams.test.ts': 'already-published report cards mark upsert conflicts generates report-card payloads parent report-card downloads withdrawn report-card downloads ForbiddenException ExamsSchemaService creates grading policy mark version report-card workflow batch tables ExamsService enforces assessment maximum score before mark entry outside configured grade boundaries bulk mark uploads ExamsService requires dual approval and marks report-card regeneration after published corrections ReportCardGenerationService generates HTML and PDF artifacts with a verification code starts class report-card batches verifies printed report cards',
  'apps/api/src/modules/security/data-classification-registry.service.ts': 'DataClassificationRegistryService sensitive_child_data sensitive_health_data sensitive_biometric_data payment_data students.primary_guardian_phone biometric_attendance medical_processing exams_report_cards mpesa_payload_vault raw_payload_days',
  'apps/api/src/modules/security/pii-leak-scanner.service.ts': 'PiiLeakScannerService RAW_KENYAN_PHONE_PATTERN ADMISSION_NUMBER_PATTERN PAYER_NAME_PATTERN raw_kenyan_phone_number raw_admission_number raw_parent_or_payer_name',
  'apps/api/src/modules/security/rate-limit.service.ts': 'mpesa-callback security.mpesaCallbackRateLimitMaxRequests /payments/mpesa/c2b /mpesa/c2b',
  'apps/api/src/modules/security/security.test.ts': 'DataClassificationRegistryService covers child-data categories encryption policy consent DPIA retention rules PiiLeakScannerService flags raw Kenyan phone numbers and payer names leak-prone artifacts RateLimitService treats MPESA callback aliases as provider callback traffic /mpesa/c2b/confirmation',
  'apps/api/src/modules/compliance/compliance-schema.service.ts': 'data_subject_requests access_request correction_request deletion_anonymization_request export_request objection_request data_retention_schedules child_data_dpia_records students payments sync_offline breach_response_reports FORCE ROW LEVEL SECURITY',
  'apps/api/src/modules/compliance/compliance.service.ts': 'submitDataSubjectRequest verifyDataSubjectRequestIdentity reviewDataSubjectRequest completeDataSubjectRequest anonymizeDataSubject data_subject_request.completed days_remaining breach_response_report.exported',
  'apps/api/src/modules/compliance/compliance.controller.ts': 'data-subject-requests identity-verification review complete breach-response-reports/:reportId/export compliance:write compliance:read',
  'docs/runbooks/data-breach-response.md': 'Data Breach Response Runbook Containment Notification Evidence Export security:pii-scan breach-response-reports/:reportId/export',
  'apps/api/src/scripts/pii-leak-ci-scan.ts': 'runPiiLeakCiScan logs snapshots_exports api_responses frontend_fixtures PiiLeakScannerService docs/security/pii-leak-ci-scan.md',
  '.github/workflows/security-audit.yml': 'security:pii-scan docs/security/pii-leak-ci-scan.md',
  'apps/api/src/modules/compliance/compliance.test.ts': 'ComplianceSchemaService creates consent, data-subject, retention, DPIA, and breach evidence tables with tenant RLS runs data subject request workflow with SLA countdown exports breach response reports with redacted evidence',
  'apps/api/src/scripts/pii-leak-ci-scan.test.ts': 'fails raw PII in generated logs, API responses, and frontend fixtures passes when artifact evidence is masked',
  'apps/api/src/scripts/module-access-certification.ts': 'runModuleAccessCertification registry-permission-alignment backend-route-module-guards frontend-route-module-guards background-job-module-guards report-export-module-guards dashboard-widget-module-guards package-trial-expiry-behavior disabled modules',
  'apps/api/src/scripts/module-access-certification.test.ts': 'fails when a backend module route lacks RequiresModule evidence fails when frontend route guard mapping omits a module section',
  'apps/api/src/scripts/tenant-isolation-audit.ts': 'runTenantIsolationAudit support-ticket-rls integration-daraja-rls FORCE ROW LEVEL SECURITY all-tenant-tables-forced-rls findTenantTablesWithoutForcedRls critical',
  'apps/api/src/scripts/implementation30-load-profile.ts': 'IMPLEMENTATION30_LOAD_PROFILE school_count: 1000 students_per_school: 500 validateParallelTenantPerformanceBudgets parallel-tenant-performance-budgets IMPLEMENTATION30_PARALLEL_TENANT_PERFORMANCE_TESTS report-card-generation mpesa-reconciliation-parallel-tenants runImplementation30LoadProfile',
  'docs/validation/implementation30-load-profile.md': 'Status: pass Parallel-tenant report-card generation and M-Pesa reconciliation simulations meet P95 budgets student-search report-card-generation mpesa-reconciliation-parallel-tenants',
  'apps/api/src/scripts/implementation30-rollout-gate.ts': 'runImplementation30RolloutGate PHASE_GATES live-evidence-present zero-unverified-mpesa-postings callback-ack-rate thirty-day-slo-evidence sanitizeEvidenceRefs',
  'apps/api/src/scripts/implementation30-rollout-gate.test.ts': 'blocks live phases without pilot evidence zero critical incidents payment or callback safety regressions without leaking secrets',
  'apps/api/src/modules/observability/production-observability.catalog.ts': 'PRODUCTION_OBSERVABILITY_DASHBOARDS api-latency-by-module mpesa-callbacks mpesa-reconciliation-mismatches report-card-generation-queue-lag security-and-tenant-isolation PRODUCTION_ALERT_POLICIES callback-failures-above-threshold failed-rls-setting raw-pii-support-access-spike PRODUCTION_SYNTHETIC_CHECKS login-page tenant-switch-modules stk-sandbox-readiness c2b-sandbox-registration parent-report-card-download principal-dashboard-load validateProductionObservabilityCatalog',
  'apps/api/src/modules/observability/observability.test.ts': 'production observability catalog covers Kenyan school operating dashboards, alerts, runbooks, and synthetics',
  'apps/api/src/scripts/synthetic-journey-monitor.ts': 'login-smoke kenyan-school-critical-flows tenant-switch-modules stk-sandbox-readiness c2b-sandbox-registration parent-report-card-download principal-dashboard-load',
  'apps/api/src/scripts/synthetic-journey-monitor.test.ts': 'tenant-switch-modules stk-sandbox-readiness c2b-sandbox-registration parent-report-card-download principal-dashboard-load login-smoke',
  'docs/runbooks/mpesa-callbacks-failing.md': 'M-Pesa Callbacks Failing signature/provider verification mpesa.verification.queue_lag',
  'docs/runbooks/mpesa-reconciliation-mismatch.md': 'M-Pesa Reconciliation Mismatch verified_unmatched accountant review',
  'docs/runbooks/report-cards-stuck.md': 'Report Cards Stuck report-card generation batch progress',
  'docs/runbooks/tenant-isolation-incident.md': 'Tenant Isolation Incident RLS cross-tenant',
  'docs/runbooks/database-saturation.md': 'Database Saturation PgBouncer database pool saturation',
  'docs/runbooks/sms-campaign-failure.md': 'SMS Campaign Failure provider latency delivery',
  'docs/runbooks/backup-restore.md': 'Backup Restore Verification production-backup-restore.txt npm run dr:backup-restore',
  'docs/runbooks/backup-restore-drill.md': 'Full schema restore Tenant-scoped restore point-in-time restore checksum_sha256 object_storage_key',
  'docs/validation/backup-restore-evidence.md': 'Encrypted database backup verification Encrypted object-storage metadata verification Automated restore test Full schema restore tenant-scoped restore point-in-time restore RTO/RPO',
  'apps/api/src/modules/platform/platform-onboarding.service.ts': 'exportTenantOffboardingPackage contract_offboarding retention_policy anonymizeTenantForLegalOffboarding legal_offboarding_anonymized platform.school.offboarding_exported platform.school.legal_offboarding_anonymized',
  'apps/api/src/modules/platform/platform-onboarding.controller.ts': 'offboarding/export offboarding/anonymize exportTenantOffboardingPackage anonymizeTenantForLegalOffboarding',
  'apps/api/src/modules/platform/platform-onboarding.service.test.ts': 'exports a tenant offboarding manifest before contract closeout anonymizes tenant shell metadata for legal offboarding retention_policy legal_offboarding_anonymized_at',
  'apps/web/src/components/school/accountant/m-pesa-reconciliation-workspace.tsx': 'MpesaC2bReviewPanel /api/payments/mpesa/c2b/payments?status=pending_review unwrapApiData getApiResponseMessage Reconcile',
  'apps/web/tests/design/experience-actions.test.tsx': 'lets accountants reconcile unmatched MPESA Paybill deposits from live envelope responses',
  'package.json': 'implementation30:rollout-gate module-access:certify dist/apps/api/src/scripts/implementation30-rollout-gate.test.js dist/apps/api/src/scripts/module-access-certification.test.js dist/apps/api/src/infrastructure/redis/redis.options.test.js',
};

test('Implementation 30 certification passes when P0 source evidence is present', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  assert.equal(result.ok, true);
  assert.equal(result.areas.every((area) => area.status === 'pass'), true);
  assert.match(result.areas[0]?.evidence_id ?? '', /^IMPLEMENTATION30-001-/);
});

test('Implementation 30 certification fails without M-Pesa verified-state evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'verified-before-state-change' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without production observability and synthetic journey evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/observability/production-observability.catalog.ts': '',
      'apps/api/src/scripts/synthetic-journey-monitor.ts': '',
    },
  });

  const checks = result.areas.find((area) => area.id === 'production-observability')?.checks ?? [];

  assert.equal(result.ok, false);
  assert.equal(checks.some((check) => check.id === 'production-observability-catalog' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'critical-synthetic-journeys' && check.status === 'fail'), true);
});

test('Implementation 30 certification fails without backup restore and tenant offboarding evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'docs/validation/backup-restore-evidence.md': '',
      'apps/api/src/modules/platform/platform-onboarding.service.ts': '',
    },
  });

  const checks = result.areas.find((area) => area.id === 'backup-restore-and-lifecycle')?.checks ?? [];

  assert.equal(result.ok, false);
  assert.equal(checks.some((check) => check.id === 'backup-restore-evidence' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'tenant-offboarding-workflows' && check.status === 'fail'), true);
});

test('Implementation 30 certification fails without scale, RLS, and C2B Nest rate-limit evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/scripts/implementation30-load-profile.ts': '',
      'apps/api/src/scripts/tenant-isolation-audit.ts': '',
      'apps/api/src/modules/security/rate-limit.service.ts': '',
    },
  });

  const checks = result.areas.find((area) => area.id === 'scale-isolation-and-rate-limits')?.checks ?? [];

  assert.equal(result.ok, false);
  assert.equal(checks.some((check) => check.id === 'implementation30-load-profile-budgets' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'tenant-isolation-audit-rls' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'nest-c2b-rate-limit' && check.status === 'fail'), true);
});

test('Implementation 30 certification fails without pilot rollout gate evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/scripts/implementation30-rollout-gate.ts': '',
      'apps/api/src/scripts/implementation30-rollout-gate.test.ts': '',
    },
  });

  const checks = result.areas.find((area) => area.id === 'pilot-rollout-gate')?.checks ?? [];

  assert.equal(result.ok, false);
  assert.equal(checks.some((check) => check.id === 'rollout-gate-script' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'rollout-gate-tests' && check.status === 'fail'), true);
});

test('Implementation 30 certification fails without M-Pesa callback trust-mode evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/services/mpesa-callback-trust.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'callback-trust-service-modes' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without M-PESA transaction-status credential evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/config/env.validation.ts': 'APP_TRUSTED_TENANT_HEADER_SECRET REPORT_CARD_DOWNLOAD_SIGNING_SECRET validateProductionEnv MPESA_CALLBACK_URL must be an HTTPS URL APP_CORS_ORIGINS must not include wildcard origins in production MPESA_CALLBACK_TRUST_MODE edge_signed daraja_direct manual_review_only',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mpesa-transaction-status-env-validation' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without callback-channel schema evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts': 'tenant_mpesa_configs tenant_payment_channels FORCE ROW LEVEL SECURITY ux_tenant_mpesa_configs_active_tenant_environment_channel COALESCE(paybill_number, \'\') COALESCE(till_number, \'\') WHERE status = \'active\' mpesa_config_audit_logs old_values new_values FORCE ROW LEVEL SECURITY',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'callback-channel-schema' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without M-PESA verification-job evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/payments-schema.service.ts': 'mpesa_payload_vault encrypted_payload payload_sha256 raw_payload_encrypted_ref callback_trust_status provider_verified_at provider_result_code provider_result_desc',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'verification-jobs-schema' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without C2B verified-state schema evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/payments-schema.service.ts': 'mpesa_payload_vault encrypted_payload payload_sha256 raw_payload_encrypted_ref mpesa_verification_jobs payment_intent_id uuid checkout_request_id text c2b_payment_id uuid mpesa_receipt_number text transaction_status text NOT NULL DEFAULT \'pending\' last_provider_response_encrypted FORCE ROW LEVEL SECURITY callback_trust_status provider_verified_at provider_result_code provider_result_desc uq_payment_intents_tenant_checkout_request_id uq_mpesa_transactions_tenant_checkout_request_id ux_mpesa_transactions_tenant_receipt_number uq_mpesa_c2b_payments_tenant_trans_id',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'c2b-verified-state-schema' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without C2B verification processor evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/services/mpesa-verification-processor.service.ts': 'verifyStkPushStatus markProviderVerified enqueuePayment',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'c2b-verification-processor-classification' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without redacted support export evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/services/mpesa-payload-vault.service.ts': 'redactMpesaOperationalPayload PHONE_KEYS NAME_KEYS retrieveForSupport payments:mpesa_payload:read ticket id and reason access_expires_at mpesa_payload_support_access_logs retrieveForProcessing',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'support-redacted-payload-export' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without secret-rotation runbook evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'docs/runbooks/secret-rotation.md': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'secret-rotation-runbook' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without canonical Daraja config evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/integrations/daraja-integration.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'daraja-canonical-config' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without M-PESA go-live validation evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mpesa-go-live-validation' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without masked M-PESA config audit evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts': 'rotateMpesaCredentials callback_secret_hash callback_secret_masked credential_version validateMpesaGoLive credentials_present callback_registered sandbox_smoke_test production_credentials reconciliation_permissions ledger_accounts',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mpesa-config-audit-masking' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without M-PESA credential rotation evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts': 'insertMpesaConfigAuditLog consumer_secret_masked passkey_masked validateMpesaGoLive credentials_present callback_registered sandbox_smoke_test production_credentials reconciliation_permissions ledger_accounts',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mpesa-credential-rotation' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without C2B nginx rate-limit evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'deploy/nginx/nginx.conf': 'location /payments/mpesa/callback limit_req zone=mpesa_limit',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'nginx-c2b-rate-limit' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without generated report-card evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/exams.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'report-card-generator' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without report-card artifact generation service evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/services/report-card-generation.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'report-card-generation-service' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without guardian-scoped report-card access evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/exams.service.ts': 'generateReportCard loadReportCardData buildReportCardPayload',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'guardian-report-card-access' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without scoped mark upsert evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/repositories/exams.repository.ts': 'createReportCardSnapshot WHERE student_report_cards.status <> \'published\' loadReportCardData exam_marks exam_grade_boundaries students findReportCardForGuardian student_guardians guardian.user_id = $3::uuid guardian.status = \'active\'',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mark-upsert-scope-guard' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without M-Pesa reconciliation and finance-close evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/services/mpesa-reconciliation.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mpesa-reconciliation-processor' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without accountant review and dual approval evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/payments/services/mpesa-reconciliation.service.ts': 'generateDailyReport generateDateRangeReport runDailyProcessor reconciliation_state provider_received system_received amount_mismatch duplicate_provider_receipt missing_provider_record verified_unmatched manual_review_required INSERT INTO mpesa_reconciliation_batches INSERT INTO mpesa_reconciliation_discrepancies',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'mpesa-accountant-review-and-dual-approval' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without the accountant unmatched-payment review screen evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/web/src/components/school/accountant/m-pesa-reconciliation-workspace.tsx': '',
      'apps/web/tests/design/experience-actions.test.tsx': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas
      .find((area) => area.id === 'mpesa-reconciliation-finance-close')
      ?.checks.some((check) => check.id === 'mpesa-accountant-review-screen' && check.status === 'fail'),
    true,
  );
  assert.equal(
    result.areas
      .find((area) => area.id === 'mpesa-reconciliation-finance-close')
      ?.checks.some((check) => check.id === 'mpesa-accountant-review-design-test' && check.status === 'fail'),
    true,
  );
});

test('Implementation 30 certification fails without exams grading and post-publish correction evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/exams-schema.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'exams-grading-policy-schema' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without grade-boundary and bulk mark upload evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/exams/exams.service.ts': 'findAssessmentScopeForMark Score exceeds assessment maximum score findPublishedReportCardsForMark Published report-card corrections require dual approval createMarkVersion markReportCardsRegenerationRequired regeneration_required',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'exams-grade-boundary-and-bulk-upload' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without exams frontend live integration evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/web/src/app/api/exams/[...path]/route.ts': '',
      'apps/web/src/lib/modules/exams-client.ts': '',
      'apps/web/src/components/modules/exams/exams-module-screen.tsx': '',
      'apps/web/tests/design/exams-workspace.test.tsx': '',
      'apps/web/tests/design/module-live-adapters.test.ts': '',
    },
  });

  const checks = result.areas.find((area) => area.id === 'exams-frontend-live')?.checks ?? [];

  assert.equal(result.ok, false);
  assert.equal(checks.some((check) => check.id === 'exams-frontend-proxy' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'exams-live-client' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'exams-live-screen' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'exams-live-design-tests' && check.status === 'fail'), true);
  assert.equal(checks.some((check) => check.id === 'exams-live-adapter-tests' && check.status === 'fail'), true);
});

test('Implementation 30 certification fails without child-data protection and PII leak-scanner evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/security/data-classification-registry.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'child-data-classification-registry' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without tenant trust-boundary domain evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/tenant/tenant-trust-boundary.service.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'tenant-trust-boundary-service' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without compliance workflow and PII CI evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/modules/compliance/compliance.service.ts': '',
      'apps/api/src/scripts/pii-leak-ci-scan.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'data-subject-request-workflow' && check.status === 'fail'),
    ),
    true,
  );
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'pii-leak-ci-artifact-scan' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification fails without disabled-module route, job, report, and widget certification evidence', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: {
      ...passingSources,
      'apps/api/src/scripts/module-access-certification.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.areas.some((area) =>
      area.checks.some((check) => check.id === 'disabled-module-certification' && check.status === 'fail'),
    ),
    true,
  );
});

test('Implementation 30 certification markdown is artifact-safe', () => {
  const result = runImplementation30Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-19T00:00:00.000Z',
    sourceOverrides: passingSources,
  });

  const markdown = renderImplementation30CertificationMarkdown(result);

  assert.match(markdown, /Implementation 30 Certification/);
  assert.match(markdown, /IMPLEMENTATION30-001-/);
  assert.equal(/consumer_secret|password=/i.test(markdown), false);
});
