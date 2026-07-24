import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type Implementation30CertificationStatus = 'pass' | 'fail';

interface EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

interface CertificationArea {
  id: string;
  title: string;
  checks: EvidenceCheck[];
}

export interface Implementation30CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export interface Implementation30CertificationResult {
  generated_at: string;
  ok: boolean;
  areas: Array<{
    id: string;
    evidence_id: string;
    title: string;
    status: Implementation30CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation30CertificationStatus;
    }>;
  }>;
}

const CERTIFICATION_AREAS: CertificationArea[] = [
  area('mpesa-callback-integrity', 'M-Pesa callback trust, verification, and allocation safety', [
    check('verified-before-state-change', 'STK callbacks require signature or provider verification before payment state changes', 'apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts', /assertCallbackCanChangePaymentState[\s\S]+signature_verified[\s\S]+provider_verified[\s\S]+payment state changes/),
    check('callback-trust-service-modes', 'M-Pesa callback trust service exposes edge-signed, direct Daraja, and manual-review modes', 'apps/api/src/modules/payments/services/mpesa-callback-trust.service.ts', /edge_signed[\s\S]+daraja_direct[\s\S]+manual_review_only[\s\S]+requiresEdgeSignature/),
    check('callback-channel-schema', 'M-Pesa callback channels store hashed channel secrets, source CIDRs, and per-channel verification flags behind tenant RLS', 'apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts', /mpesa_callback_channels[\s\S]+channel_id uuid NOT NULL[\s\S]+callback_secret_hash text NOT NULL[\s\S]+allowed_source_cidrs cidr\[\][\s\S]+requires_edge_signature[\s\S]+requires_transaction_status[\s\S]+FORCE ROW LEVEL SECURITY/),
    check('high-entropy-callback-url-builder', 'M-Pesa callback channel service builds channel-secret STK and C2B callback URLs and hashes secret refs', 'apps/api/src/modules/payments/services/mpesa-callback-channel.service.ts', /buildCallbackUrls[\s\S]+stk_callback_url[\s\S]+c2b_validation_url[\s\S]+c2b_confirmation_url[\s\S]+hashSecretRef[\s\S]+sha256/),
    check('callback-secret-rotation-overlap', 'M-Pesa callback channel secrets rotate with hashed refs and an overlap window for in-flight callbacks', 'apps/api/src/modules/payments/services/mpesa-callback-channel.service.ts', /(?=.*rotateChannelSecret)(?=.*callback_secret_hash)(?=.*is_current = FALSE)(?=.*accepts_until)/s),
    check('stk-channel-secret-route', 'STK callbacks expose a channel-id and secret-ref route before normal callback processing', 'apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts', /callback\/:channelId\/:secretRef[\s\S]+resolveCallbackChannel[\s\S]+handleCallbackInternal\(request, null, callbackChannel\)/),
    check('c2b-channel-secret-routes', 'C2B validation and confirmation callbacks expose channel-id and secret-ref routes', 'apps/api/src/modules/payments/controllers/mpesa-c2b.controller.ts', /validation\/:channelId\/:secretRef[\s\S]+confirmation\/:channelId\/:secretRef[\s\S]+resolveCallbackChannel[\s\S]+requires_edge_signature/),
    check('transaction-status-service', 'M-Pesa transaction-status service queries Daraja STK status before provider trust is granted', 'apps/api/src/modules/payments/services/mpesa-transaction-status.service.ts', /verifyStkPushStatus[\s\S]+\/mpesa\/stkpushquery\/v1\/query[\s\S]+provider_verified/),
    check('c2b-transaction-status-service', 'M-Pesa transaction-status service queries Daraja C2B transaction status before direct Paybill allocation', 'apps/api/src/modules/payments/services/mpesa-transaction-status.service.ts', /verifyC2bTransactionStatus[\s\S]+\/mpesa\/transactionstatus\/v1\/query[\s\S]+TransactionStatusQuery[\s\S]+provider_verified/),
    check('verification-processor-release', 'M-Pesa verification worker grants provider trust and releases payment processing only after Daraja status succeeds', 'apps/api/src/modules/payments/services/mpesa-verification-processor.service.ts', /verifyStkPushStatus[\s\S]+markProviderVerified[\s\S]+enqueuePayment/),
    check('c2b-verification-processor-classification', 'M-Pesa verification worker classifies C2B payments without posting ledger jobs before accountant allocation', 'apps/api/src/modules/payments/services/mpesa-verification-processor.service.ts', /processC2bVerificationJob[\s\S]+verifyC2bTransactionStatus[\s\S]+markProviderVerified[\s\S]+c2b_payment_status[\s\S]+payment_queue_job_id:\s+null/),
    check('verification-queue-job', 'Payments worker queue has a durable M-Pesa verification job separate from ledger processing', 'apps/api/src/modules/payments/queue/payments-queue.processor.ts', /PAYMENTS_VERIFY_MPESA_JOB[\s\S]+processMpesaVerification/),
    check('verification-jobs-schema', 'M-Pesa verification jobs persist provider status attempts and encrypted provider responses behind tenant RLS', 'apps/api/src/modules/payments/payments-schema.service.ts', /(?=.*mpesa_verification_jobs)(?=.*payment_intent_id uuid)(?=.*checkout_request_id text)(?=.*c2b_payment_id uuid)(?=.*mpesa_receipt_number text)(?=.*transaction_status text NOT NULL DEFAULT 'pending')(?=.*last_provider_response_encrypted)(?=.*FORCE ROW LEVEL SECURITY)/s),
    check('c2b-verified-state-schema', 'C2B payments move through explicit unverified, verification-requested, verified-matched, and verified-unmatched states', 'apps/api/src/modules/payments/payments-schema.service.ts', /ck_mpesa_c2b_payments_status[\s\S]+received_unverified[\s\S]+verification_requested[\s\S]+verified_matched[\s\S]+verified_unmatched/),
    check('callback-provider-trust-columns', 'Callback logs persist provider verification status separately from edge signature status', 'apps/api/src/modules/payments/payments-schema.service.ts', /callback_trust_status[\s\S]+provider_verified_at[\s\S]+provider_result_code[\s\S]+provider_result_desc/),
    check('verification-job-repository', 'M-Pesa verification repository creates STK and C2B verification jobs and encrypts provider responses', 'apps/api/src/modules/payments/repositories/mpesa-verification-jobs.repository.ts', /createForStkCallback[\s\S]+createForC2bConfirmation[\s\S]+c2b_payment_id[\s\S]+last_provider_response_encrypted[\s\S]+encrypt/),
    check('unverified-stk-enqueues-verification', 'Unsigned direct STK callbacks enqueue provider verification instead of payment ledger processing', 'apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts', /!signatureVerified[\s\S]+createForStkCallback[\s\S]+checkout_request_id:\s+parsedCallback\.checkout_request_id[\s\S]+return Object\.assign/),
    check('mpesa-duplicate-guards', 'M-Pesa duplicate identifiers are guarded by checkout, receipt, C2B TransID, and channel uniqueness', 'apps/api/src/modules/payments/payments-schema.service.ts', /(?=.*uq_payment_intents_tenant_checkout_request_id)(?=.*uq_mpesa_transactions_tenant_checkout_request_id)(?=.*ux_mpesa_transactions_tenant_receipt_number)(?=.*uq_mpesa_c2b_payments_tenant_trans_id)/s),
    check('direct-daraja-unsigned-ingress', 'Direct Daraja mode can store unsigned callbacks as unverified work without bypassing later verification', 'apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts', /requiresEdgeSignature[\s\S]+inspection\.signature[\s\S]+signature_verified:\s+signatureVerified[\s\S]+signatureError && requiresEdgeSignature/),
    check('direct-c2b-unsigned-ingress', 'Direct Daraja C2B callbacks can be accepted without custom edge HMAC headers', 'apps/api/src/modules/payments/controllers/mpesa-c2b.controller.ts', /verifyCallbackRequired[\s\S]+requiresEdgeSignature\(\)[\s\S]+return;[\s\S]+verifyCallback/),
    check('callback-channel-tests', 'Payments tests cover callback-channel schema, high-entropy URL generation, and channel routes', 'apps/api/src/modules/payments/payments.test.ts', /(?=.*creates callback channels with hashed secrets)(?=.*builds high-entropy STK and C2B callback URLs)(?=.*high-entropy channel-secret routes)/s),
    check('transaction-status-tests', 'Payments tests cover M-Pesa verification-job schema, direct callback verification enqueue, duplicate guards, and Daraja status query behavior', 'apps/api/src/modules/payments/payments.test.ts', /(?=.*creates M-PESA verification jobs)(?=.*verificationJobInput)(?=.*duplicate M-PESA identifiers)(?=.*MpesaTransactionStatusService verifies STK callback status)(?=.*classifies verified C2B payments without ledger enqueue)/s),
    check('callback-trust-mode-tests', 'Payments tests prove direct Daraja ingress and edge-signed rejection behavior', 'apps/api/src/modules/payments/payments.test.ts', /accepts unsigned direct Daraja callbacks[\s\S]+rejects unsigned callbacks in edge-signed mode[\s\S]+accepts unsigned validation callbacks in direct Daraja mode/),
    check('c2b-verification-before-allocation', 'C2B confirmations are held for provider verification before allocation', 'apps/api/src/modules/payments/services/mpesa-c2b.service.ts', /provider_verification_required[\s\S]+manual_fee_payment_id:\s+null[\s\S]+ledger_transaction_id:\s+null/),
    check('c2b-verification-job', 'Matched C2B confirmations create verification jobs before accountant allocation can post', 'apps/api/src/modules/payments/services/mpesa-c2b.service.ts', /markVerificationRequested[\s\S]+createForC2bConfirmation[\s\S]+c2b_payment_id[\s\S]+mpesa_receipt_number[\s\S]+enqueueMpesaVerification/),
    check('payload-redaction-helper', 'M-Pesa operational payloads are redacted before normal storage', 'apps/api/src/modules/payments/services/mpesa-payload-vault.service.ts', /redactMpesaOperationalPayload[\s\S]+PHONE_KEYS[\s\S]+NAME_KEYS/),
    check('encrypted-payload-vault', 'Raw M-Pesa payloads are encrypted in a vault table with operational hash/ref fields', 'apps/api/src/modules/payments/payments-schema.service.ts', /mpesa_payload_vault[\s\S]+encrypted_payload[\s\S]+payload_sha256[\s\S]+raw_payload_encrypted_ref/),
    check('support-only-payload-retrieval', 'Raw M-Pesa payload retrieval requires elevated support permission, ticket id, reason, time limit, and audit log', 'apps/api/src/modules/payments/services/mpesa-payload-vault.service.ts', /(?=.*retrieveForSupport)(?=.*payments:mpesa_payload:read)(?=.*ticket id and reason)(?=.*access_expires_at)(?=.*mpesa_payload_support_access_logs)/s),
    check('support-redacted-payload-export', 'Support payload exports use redacted vault payloads and never decrypt raw callback bodies', 'apps/api/src/modules/payments/services/mpesa-payload-vault.service.ts', /retrieveForSupportExport[\s\S]+redacted_payload[\s\S]+mpesa_payload_support_access_logs[\s\S]+redactMpesaOperationalPayload/),
    check('processor-vault-payload-read', 'M-Pesa workers read full payloads from the encrypted vault instead of redacted operational JSON', 'apps/api/src/modules/payments/services/mpesa-callback-processor.service.ts', /raw_payload_encrypted_ref[\s\S]+retrieveForProcessing[\s\S]+parseCallbackPayload/),
    check('stk-redacted-storage', 'STK callback logs store redacted operational payload JSON', 'apps/api/src/modules/payments/controllers/mpesa-callback.controller.ts', /redactMpesaOperationalPayload\(request\.body/),
    check('c2b-redacted-storage', 'C2B callback records store redacted operational payload JSON', 'apps/api/src/modules/payments/services/mpesa-c2b.service.ts', /raw_payload:\s+payloadVaultRecord\.redacted_payload[\s\S]+redactMpesaOperationalPayload/),
    check('c2b-operational-pii-masking', 'C2B operational rows store masked phone and payer-name values by default', 'apps/api/src/modules/payments/services/mpesa-c2b.service.ts', /maskMpesaPhoneNumber\(parsed\.phone_number\)[\s\S]+maskMpesaName\(parsed\.payer_name\)/),
    check('c2b-api-response-pii-redaction', 'C2B API responses and reconciliation payloads are redacted even for legacy rows with raw values', 'apps/api/src/modules/payments/services/mpesa-c2b.service.ts', /listC2bPayments[\s\S]+redactC2bPaymentForResponse[\s\S]+maskedPhoneNumber[\s\S]+createManualFeePayment[\s\S]+phone_number:\s+maskedPhoneNumber/),
  ]),
  area('canonical-mpesa-config', 'Canonical school-owned M-Pesa configuration', [
    check('daraja-canonical-config', 'Daraja setup mirrors credentials into tenant finance M-Pesa config', 'apps/api/src/modules/integrations/daraja-integration.service.ts', /TenantFinanceConfigService[\s\S]+resolveCanonicalCallbackUrl[\s\S]+upsertMpesaConfig/),
    check('daraja-https-callback', 'Daraja setup rejects non-HTTPS callback URLs before storing credentials', 'apps/api/src/modules/integrations/daraja-integration.service.ts', /MPESA callback URL must use HTTPS/),
    check('integrations-import-tenant-finance', 'Integrations module wires tenant finance as the M-Pesa source of truth', 'apps/api/src/modules/integrations/integrations.module.ts', /TenantFinanceModule/),
    check('tenant-finance-config-schema', 'Tenant finance schema has canonical M-Pesa config and payment-channel tables', 'apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts', /tenant_mpesa_configs[\s\S]+tenant_payment_channels[\s\S]+FORCE ROW LEVEL SECURITY/),
    check('active-config-uniqueness', 'Tenant finance schema rejects duplicate active M-Pesa configs for the same tenant environment and channel', 'apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts', /ux_tenant_mpesa_configs_active_tenant_environment_channel[\s\S]+COALESCE\(paybill_number, ''\)[\s\S]+COALESCE\(till_number, ''\)[\s\S]+WHERE status = 'active'/),
    check('mpesa-config-audit-schema', 'Tenant finance schema stores masked M-Pesa config change audit evidence behind forced RLS', 'apps/api/src/modules/tenant-finance/tenant-finance-schema.service.ts', /mpesa_config_audit_logs[\s\S]+old_values[\s\S]+new_values[\s\S]+FORCE ROW LEVEL SECURITY/),
    check('mpesa-config-audit-masking', 'Tenant finance records M-Pesa config changes with masked old/new secret values', 'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts', /insertMpesaConfigAuditLog[\s\S]+consumer_secret_masked[\s\S]+passkey_masked/),
    check('mpesa-credential-rotation', 'Tenant finance rotates M-Pesa credentials and callback secrets without raw callback secret storage', 'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts', /rotateMpesaCredentials[\s\S]+callback_secret_hash[\s\S]+callback_secret_masked[\s\S]+credential_version/),
    check('mpesa-credential-rotation-endpoint', 'Tenant finance API exposes credential rotation to billing updaters', 'apps/api/src/modules/tenant-finance/tenant-finance.controller.ts', /mpesa-config\/:configId\/rotate-credentials[\s\S]+billing:update[\s\S]+rotateMpesaCredentials/),
    check('mpesa-go-live-validation', 'Tenant finance validates M-Pesa go-live readiness before production activation', 'apps/api/src/modules/tenant-finance/tenant-finance-config.service.ts', /validateMpesaGoLive[\s\S]+credentials_present[\s\S]+callback_registered[\s\S]+sandbox_smoke_test[\s\S]+production_credentials[\s\S]+reconciliation_permissions[\s\S]+ledger_accounts/),
    check('mpesa-setup-state', 'Tenant finance summary exposes principal/accountant M-Pesa setup state', 'apps/api/src/modules/tenant-finance/tenant-finance-config.repository.ts', /(?=.*mpesa_setup_state)(?=.*production_ready)(?=.*sandbox_ready)(?=.*awaiting_safaricom_registration)(?=.*suspended)(?=.*not_configured)/s),
    check('mpesa-go-live-endpoint', 'Tenant finance API exposes go-live validation to finance readers', 'apps/api/src/modules/tenant-finance/tenant-finance.controller.ts', /mpesa-config\/go-live[\s\S]+billing:read[\s\S]+validateMpesaGoLive/),
  ]),
  area('mpesa-reconciliation-finance-close', 'M-Pesa reconciliation, finance close, and accountant review controls', [
    check('mpesa-reconciliation-schema', 'Payments schema stores reconciliation batches, discrepancy states, finance close periods, and dual approval requests behind tenant RLS', 'apps/api/src/modules/payments/payments-schema.service.ts', /(?=.*mpesa_reconciliation_batches)(?=.*reconciliation_state)(?=.*provider_received)(?=.*system_received)(?=.*verified_matched)(?=.*verified_unmatched)(?=.*amount_mismatch)(?=.*duplicate_provider_receipt)(?=.*missing_provider_record)(?=.*reversed)(?=.*manual_review_required)(?=.*mpesa_reconciliation_discrepancies)(?=.*finance_close_periods)(?=.*finance_approval_requests)(?=.*app\.ensure_finance_period_open)(?=.*FORCE ROW LEVEL SECURITY)/s),
    check('mpesa-reconciliation-processor', 'M-Pesa reconciliation service runs daily and date-range reports, persists batches, and classifies mismatch states', 'apps/api/src/modules/payments/services/mpesa-reconciliation.service.ts', /(?=.*generateDailyReport)(?=.*generateDateRangeReport)(?=.*runDailyProcessor)(?=.*reconciliation_state)(?=.*provider_received)(?=.*amount_mismatch)(?=.*duplicate_provider_receipt)(?=.*missing_provider_record)(?=.*verified_unmatched)(?=.*manual_review_required)(?=.*INSERT INTO mpesa_reconciliation_batches)(?=.*INSERT INTO mpesa_reconciliation_discrepancies)/s),
    check('mpesa-accountant-review-and-dual-approval', 'M-Pesa accountant review queue redacts evidence and reversal/write-off/move/mismatch actions require two distinct approvers before resolution', 'apps/api/src/modules/payments/services/mpesa-reconciliation.service.ts', /(?=.*listAccountantReviewItems)(?=.*redactReviewEvidence)(?=.*requestFinanceApproval)(?=.*approveFinanceApproval)(?=.*reversal)(?=.*write_off)(?=.*move_payment)(?=.*post_after_mismatch)(?=.*pending_second_approval)(?=.*distinct approver)(?=.*resolveFinanceApprovalSubject)(?=.*resolution_status = 'resolved')/s),
    check('mpesa-reconciliation-review-routes', 'Payments API exposes accountant-readable date-range reconciliation and restricted daily processor routes', 'apps/api/src/modules/payments/controllers/payments.controller.ts', /reconciliation\/range[\s\S]+billing:read[\s\S]+generateDateRangeReport[\s\S]+reconciliation\/daily\/run[\s\S]+billing:update[\s\S]+runDailyProcessor/),
    check('mpesa-accountant-review-routes', 'Payments API exposes accountant review queue and finance approval routes', 'apps/api/src/modules/payments/controllers/payments.controller.ts', /(?=.*reconciliation\/review)(?=.*reconciliation\/approval-requests)(?=.*reconciliation\/approval-requests\/:requestId\/approve)(?=.*billing:read)(?=.*billing:update)/s),
    check('mpesa-accountant-review-screen', 'Bursar/accountant UI exposes unmatched M-Pesa Paybill deposits and reconciles API envelope responses', 'apps/web/src/components/school/accountant/m-pesa-reconciliation-workspace.tsx', /(?=.*MpesaC2bReviewPanel)(?=.*\/api\/payments\/mpesa\/c2b\/payments\?status=pending_review)(?=.*unwrapApiData)(?=.*getApiResponseMessage)(?=.*Reconcile)/s),
    check('mpesa-reconciliation-tests', 'Payments tests cover reconciliation schema, missing callbacks, duplicates, amount mismatch, wrong references, late provider status, daily processor, and range reports', 'apps/api/src/modules/payments/payments.test.ts', /(?=.*PaymentsSchemaService creates reconciliation batches)(?=.*MpesaReconciliationService reports missing callbacks, duplicates, amount mismatches, wrong references, and late provider status)(?=.*runs daily reconciliation for every active tenant payment channel)(?=.*generates on-demand date-range reports)/s),
    check('mpesa-accountant-review-tests', 'Payments tests cover accountant review redaction, dual approval reversal, and review routes', 'apps/api/src/modules/payments/payments.test.ts', /(?=.*lists accountant review items without raw M-PESA payload leakage)(?=.*requires two distinct approvers before resolving reversal requests)(?=.*exposes accountant review and finance approval endpoints)/s),
    check('mpesa-accountant-review-design-test', 'Design tests cover reconciling unmatched M-Pesa Paybill deposits from live API envelope responses', 'apps/web/tests/design/experience-actions.test.tsx', /lets accountants reconcile unmatched MPESA Paybill deposits from live envelope responses/),
  ]),
  area('production-config-and-ci', 'Production config, callback edge limits, and CI signoff', [
    check('production-env-validation', 'Startup validation requires tenant/report-card signing secrets and rejects insecure production defaults', 'apps/api/src/config/env.validation.ts', /APP_TRUSTED_TENANT_HEADER_SECRET[\s\S]+REPORT_CARD_DOWNLOAD_SIGNING_SECRET[\s\S]+validateProductionEnv[\s\S]+APP_CORS_ORIGINS must not include wildcard origins in production/),
    check('production-env-transport-and-data-protection', 'Startup validation enforces production TLS/SSL, trusted proxy CIDRs, secure cookies, RLS audit, payload vaulting, object storage, and strong PII/KMS config', 'apps/api/src/config/env.validation.ts', /(?=.*DATABASE_SSL must be true)(?=.*REDIS_URL must use rediss:\/\/)(?=.*APP_TRUSTED_PROXY_CIDRS)(?=.*AUTH_COOKIE_SECURE)(?=.*AUTH_COOKIE_SAME_SITE)(?=.*DATABASE_RLS_AUDIT_ENABLED)(?=.*MPESA_PAYLOAD_VAULT_ENABLED)(?=.*UPLOAD_OBJECT_STORAGE_ENABLED)(?=.*SECURITY_PII_ENCRYPTION_KEY)(?=.*SECURITY_KMS_PROVIDER)(?=.*base64-encoded 32-byte key)/s),
    check('production-env-hardening-tests', 'Env validation tests cover object storage, proxy CIDRs, secure cookies, RLS audit, M-Pesa vaulting, encrypted transports, and KMS key validation', 'apps/api/src/config/env.validation.test.ts', /(?=.*requires production object storage, proxy, secure-cookie, RLS audit, and M-Pesa vault controls)(?=.*rejects external production Postgres and Redis without encrypted transport)(?=.*rejects weak production PII keys and partial KMS configuration)(?=.*configuration maps production transport and security hardening flags)/s),
    check('runtime-config-hardening-flags', 'Runtime configuration exposes production hardening flags to database, Redis, auth cookie, KMS, proxy, and M-Pesa payload-vault consumers', 'apps/api/src/config/configuration.ts', /(?=.*trustedProxyCidrs)(?=.*cookieSecure)(?=.*cookieSameSite)(?=.*ssl)(?=.*rlsAuditEnabled)(?=.*tlsEnabled)(?=.*kmsProvider)(?=.*kmsKeyId)(?=.*payloadVaultEnabled)/s),
    check('database-ssl-runtime', 'PostgreSQL pool honors explicit DATABASE_SSL or sslmode=require for encrypted production transport', 'apps/api/src/database/database.module.ts', /buildDatabasePoolOptions[\s\S]+database\.ssl[\s\S]+sslmode=require[\s\S]+rejectUnauthorized/),
    check('redis-tls-runtime', 'Redis and Bull queue connections honor explicit REDIS_TLS_ENABLED as well as rediss URLs', 'apps/api/src/infrastructure/redis/redis.options.ts', /(?=.*redis\.tlsEnabled)(?=.*requiresRedisTls)(?=.*tls:\s+useTls \? \{\} : undefined)/s),
    check('redis-tls-runtime-test', 'Redis options tests prove explicit TLS flags enable encrypted Redis transport', 'apps/api/src/infrastructure/redis/redis.options.test.ts', /buildRedisClientOptions enables TLS from explicit production Redis flag/),
    check('mpesa-callback-trust-env-validation', 'Startup validation rejects unsupported M-Pesa callback trust modes', 'apps/api/src/config/env.validation.ts', /MPESA_CALLBACK_TRUST_MODE[\s\S]+edge_signed[\s\S]+daraja_direct[\s\S]+manual_review_only/),
    check('mpesa-transaction-status-env-validation', 'Startup validation requires the Daraja transaction-status security credential in production', 'apps/api/src/config/env.validation.ts', /MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL[\s\S]+validateProductionSecret[\s\S]+MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL/),
    check('mpesa-transaction-status-config', 'Runtime configuration exposes the Daraja transaction-status security credential used by verification workers', 'apps/api/src/config/configuration.ts', /transactionStatusSecurityCredential[\s\S]+MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL/),
    check('nginx-stk-rate-limit', 'NGINX applies the M-Pesa rate-limit bucket to STK callbacks', 'deploy/nginx/nginx.conf', /location\s+\/payments\/mpesa\/callback[\s\S]+limit_req\s+zone=mpesa_limit/),
    check('nginx-c2b-rate-limit', 'NGINX applies the M-Pesa rate-limit bucket to C2B validation and confirmation callbacks', 'deploy/nginx/nginx.conf', /location\s+\/payments\/mpesa\/c2b[\s\S]+limit_req\s+zone=mpesa_limit/),
    check('env-example-tenant-secret', 'Default env template includes only a placeholder tenant-header signing secret', '.env.example', /APP_TRUSTED_TENANT_HEADER_SECRET=replace-with-a-long-random-tenant-header-secret/),
    check('production-env-example-tenant-secret', 'Production env template includes only a placeholder tenant-header signing secret', '.env.production.example', /APP_TRUSTED_TENANT_HEADER_SECRET=replace-with-a-long-random-tenant-header-secret/),
    check('env-example-report-card-secret', 'Default env template includes only a placeholder report-card download signing secret', '.env.example', /REPORT_CARD_DOWNLOAD_SIGNING_SECRET=replace-with-a-long-random-report-card-download-secret/),
    check('production-env-example-report-card-secret', 'Production env template includes only a placeholder report-card download signing secret', '.env.production.example', /REPORT_CARD_DOWNLOAD_SIGNING_SECRET=replace-with-a-long-random-report-card-download-secret/),
    check('env-example-callback-trust-mode', 'Default env template documents the M-Pesa callback trust mode', '.env.example', /MPESA_CALLBACK_TRUST_MODE=edge_signed/),
    check('production-env-example-callback-trust-mode', 'Production env template defaults to edge-signed M-Pesa callbacks', '.env.production.example', /MPESA_CALLBACK_TRUST_MODE=edge_signed/),
    check('env-example-transaction-status-credential', 'Default env template documents the Daraja transaction-status security credential placeholder', '.env.example', /MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL=replace-with-daraja-transaction-status-security-credential/),
    check('production-env-example-transaction-status-credential', 'Production env template documents the Daraja transaction-status security credential placeholder', '.env.production.example', /MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL=replace-with-daraja-transaction-status-security-credential/),
    check('vercel-env-report-card-secret', 'Vercel env template requires report-card signing secret injection without checked-in material', '.env.vercel.production', /REPORT_CARD_DOWNLOAD_SIGNING_SECRET=""/),
    check('vercel-env-callback-trust-mode', 'Vercel env template defaults to edge-signed M-Pesa callbacks', '.env.vercel.production', /MPESA_CALLBACK_TRUST_MODE="edge_signed"/),
    check('vercel-env-transaction-status-credential', 'Vercel env template requires transaction-status security credential injection without checked-in material', '.env.vercel.production', /MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL=""/),
    check('vercel-env-no-oidc-token', 'Vercel env template does not retain pulled OIDC token material', '.env.vercel.production', /VERCEL_OIDC_TOKEN=""/),
    check('secret-rotation-runbook', 'Secret rotation runbook covers M-Pesa and platform secrets without printing sensitive values', 'docs/runbooks/secret-rotation.md', /M-Pesa secret rotation[\s\S]+MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL[\s\S]+Platform secret rotation[\s\S]+never print secrets/i),
    check('ci-runs-implementation30', 'Production operability CI runs Implementation 30 certification and uploads its evidence', '.github/workflows/production-operability.yml', /implementation30:certify[\s\S]+implementation30-certification\.md/),
  ]),
  area('production-observability', 'Production observability, alerts, runbooks, and synthetic checks', [
    check('production-observability-catalog', 'Production observability catalog covers Kenyan school operating dashboards, alerts, runbooks, and synthetic checks', 'apps/api/src/modules/observability/production-observability.catalog.ts', /(?=.*PRODUCTION_OBSERVABILITY_DASHBOARDS)(?=.*api-latency-by-module)(?=.*mpesa-callbacks)(?=.*mpesa-reconciliation-mismatches)(?=.*report-card-generation-queue-lag)(?=.*security-and-tenant-isolation)(?=.*PRODUCTION_ALERT_POLICIES)(?=.*callback-failures-above-threshold)(?=.*failed-rls-setting)(?=.*raw-pii-support-access-spike)(?=.*PRODUCTION_SYNTHETIC_CHECKS)(?=.*login-page)(?=.*tenant-switch-modules)(?=.*stk-sandbox-readiness)(?=.*c2b-sandbox-registration)(?=.*parent-report-card-download)(?=.*principal-dashboard-load)(?=.*validateProductionObservabilityCatalog)/s),
    check('production-observability-tests', 'Observability tests prove the production catalog validates dashboards, alerts, runbooks, and synthetics', 'apps/api/src/modules/observability/observability.test.ts', /production observability catalog covers Kenyan school operating dashboards, alerts, runbooks, and synthetics/),
    check('critical-synthetic-journeys', 'Synthetic journey monitor probes login, tenant module switching, M-Pesa readiness, parent report-card download, and principal dashboard load', 'apps/api/src/scripts/synthetic-journey-monitor.ts', /(?=.*login-smoke)(?=.*kenyan-school-critical-flows)(?=.*tenant-switch-modules)(?=.*stk-sandbox-readiness)(?=.*c2b-sandbox-registration)(?=.*parent-report-card-download)(?=.*principal-dashboard-load)/s),
    check('critical-synthetic-journey-tests', 'Synthetic journey tests assert the critical Kenyan school probes are registered', 'apps/api/src/scripts/synthetic-journey-monitor.test.ts', /(?=.*tenant-switch-modules)(?=.*stk-sandbox-readiness)(?=.*c2b-sandbox-registration)(?=.*parent-report-card-download)(?=.*principal-dashboard-load)(?=.*login-smoke)/s),
    check('mpesa-callback-runbook', 'M-Pesa callback incident runbook covers callback failures and provider verification backlog', 'docs/runbooks/mpesa-callbacks-failing.md', /(?=.*M-Pesa Callbacks Failing)(?=.*signature\/provider verification)(?=.*mpesa\.verification\.queue_lag)/s),
    check('mpesa-reconciliation-runbook', 'M-Pesa reconciliation runbook covers accountant review and unmatched deposits', 'docs/runbooks/mpesa-reconciliation-mismatch.md', /(?=.*M-Pesa Reconciliation Mismatch)(?=.*verified_unmatched)(?=.*accountant review)/s),
    check('report-card-runbook', 'Report-card incident runbook covers stuck generation queues', 'docs/runbooks/report-cards-stuck.md', /(?=.*Report Cards Stuck)(?=.*report-card generation)(?=.*batch progress)/s),
    check('tenant-isolation-runbook', 'Tenant isolation incident runbook covers RLS and cross-tenant containment', 'docs/runbooks/tenant-isolation-incident.md', /(?=.*Tenant Isolation Incident)(?=.*RLS)(?=.*cross-tenant)/s),
    check('database-saturation-runbook', 'Database saturation runbook covers PgBouncer and connection pool response', 'docs/runbooks/database-saturation.md', /(?=.*Database Saturation)(?=.*PgBouncer)(?=.*database pool saturation)/s),
    check('sms-campaign-runbook', 'SMS campaign failure runbook covers provider delivery response', 'docs/runbooks/sms-campaign-failure.md', /(?=.*SMS Campaign Failure)(?=.*provider latency)(?=.*delivery)/s),
  ]),
  area('backup-restore-and-lifecycle', 'Backups, restore evidence, and tenant offboarding lifecycle', [
    check('backup-restore-runbook', 'Backup restore runbook defines scheduled production evidence and the DR command artifact', 'docs/runbooks/backup-restore.md', /(?=.*Backup Restore Verification)(?=.*production-backup-restore\.txt)(?=.*npm run dr:backup-restore)/s),
    check('backup-restore-drill-runbook', 'Backup restore drill covers full schema, tenant-scoped, point-in-time, checksum, and object-storage metadata restore', 'docs/runbooks/backup-restore-drill.md', /(?=.*Full schema restore)(?=.*Tenant-scoped restore)(?=.*point-in-time restore)(?=.*checksum_sha256)(?=.*object_storage_key)/s),
    check('backup-restore-evidence', 'Backup restore evidence requires encrypted database and object-storage restore proof with RTO/RPO', 'docs/validation/backup-restore-evidence.md', /(?=.*Encrypted database backup verification)(?=.*Encrypted object-storage metadata verification)(?=.*Automated restore test)(?=.*Full schema restore)(?=.*tenant-scoped restore)(?=.*point-in-time restore)(?=.*RTO\/RPO)/s),
    check('tenant-offboarding-workflows', 'Platform service exports contract offboarding manifests and anonymizes tenant shells with lifecycle audit events and retention policy', 'apps/api/src/modules/platform/platform-onboarding.service.ts', /(?=.*exportTenantOffboardingPackage)(?=.*contract_offboarding)(?=.*retention_policy)(?=.*anonymizeTenantForLegalOffboarding)(?=.*legal_offboarding_anonymized)(?=.*platform\.school\.offboarding_exported)(?=.*platform\.school\.legal_offboarding_anonymized)/s),
    check('tenant-offboarding-routes', 'Platform controller exposes tenant offboarding export and legal anonymization routes', 'apps/api/src/modules/platform/platform-onboarding.controller.ts', /(?=.*offboarding\/export)(?=.*offboarding\/anonymize)(?=.*exportTenantOffboardingPackage)(?=.*anonymizeTenantForLegalOffboarding)/s),
    check('tenant-offboarding-tests', 'Platform tests cover tenant offboarding manifests and legal anonymization metadata', 'apps/api/src/modules/platform/platform-onboarding.service.test.ts', /(?=.*exports a tenant offboarding manifest before contract closeout)(?=.*anonymizes tenant shell metadata for legal offboarding)(?=.*retention_policy)(?=.*legal_offboarding_anonymized_at)/s),
    check('backup-restore-ci', 'Production operability CI runs the backup restore drill and uploads sanitized evidence', '.github/workflows/production-operability.yml', /(?=.*Backup restore verification)(?=.*npm run dr:backup-restore > production-backup-restore\.txt)(?=.*production-backup-restore\.txt)/s),
  ]),
  area('scale-isolation-and-rate-limits', 'Scale budgets, tenant isolation audit, and provider callback rate limits', [
    check('implementation30-load-profile-budgets', 'Implementation 30 load profile models 1000+ schools, report-card generation, and M-Pesa reconciliation budgets', 'apps/api/src/scripts/implementation30-load-profile.ts', /(?=.*IMPLEMENTATION30_LOAD_PROFILE)(?=.*school_count:\s+1000)(?=.*students_per_school:\s+500)(?=.*validateParallelTenantPerformanceBudgets)(?=.*parallel-tenant-performance-budgets)(?=.*IMPLEMENTATION30_PARALLEL_TENANT_PERFORMANCE_TESTS)(?=.*report-card-generation)(?=.*mpesa-reconciliation-parallel-tenants)(?=.*runImplementation30LoadProfile)/s),
    check('implementation30-load-profile-artifact', 'Generated load-profile artifact records passing P95/query/queue budget evidence', 'docs/validation/implementation30-load-profile.md', /(?=.*Status: pass)(?=.*Parallel-tenant report-card generation and M-Pesa reconciliation simulations meet P95 budgets)(?=.*student-search)(?=.*report-card-generation)(?=.*mpesa-reconciliation-parallel-tenants)/s),
    check('tenant-isolation-audit-rls', 'Tenant isolation audit covers critical RLS and statically scans tenant tables for forced row level security', 'apps/api/src/scripts/tenant-isolation-audit.ts', /(?=.*runTenantIsolationAudit)(?=.*support-ticket-rls)(?=.*integration-daraja-rls)(?=.*FORCE ROW LEVEL SECURITY)(?=.*all-tenant-tables-forced-rls)(?=.*findTenantTablesWithoutForcedRls)(?=.*critical)/s),
    check('nest-c2b-rate-limit', 'Nest rate-limit service treats C2B validation and confirmation aliases as M-Pesa provider callback traffic', 'apps/api/src/modules/security/rate-limit.service.ts', /(?=.*mpesa-callback)(?=.*security\.mpesaCallbackRateLimitMaxRequests)(?=.*\/payments\/mpesa\/c2b)(?=.*\/mpesa\/c2b)/s),
    check('nest-c2b-rate-limit-tests', 'Security tests cover M-Pesa callback and C2B alias rate-limit buckets', 'apps/api/src/modules/security/security.test.ts', /(?=.*RateLimitService treats MPESA callback aliases as provider callback traffic)(?=.*\/mpesa\/c2b\/confirmation)/s),
    check('redis-options-test-in-ci', 'Main test script runs the Redis TLS runtime test', 'package.json', /dist\/apps\/api\/src\/infrastructure\/redis\/redis\.options\.test\.js/),
  ]),
  area('pilot-rollout-gate', 'Implementation 30 pilot rollout evidence gate', [
    check('rollout-gate-script', 'Rollout gate blocks unevidenced live phases and enforces zero-incident phase exits', 'apps/api/src/scripts/implementation30-rollout-gate.ts', /(?=.*runImplementation30RolloutGate)(?=.*PHASE_GATES)(?=.*live-evidence-present)(?=.*zero-unverified-mpesa-postings)(?=.*callback-ack-rate)(?=.*thirty-day-slo-evidence)(?=.*sanitizeEvidenceRefs)/s),
    check('rollout-gate-tests', 'Rollout gate tests cover blocked live phases, complete zero-incident evidence, failed payment safety, and secret-safe markdown', 'apps/api/src/scripts/implementation30-rollout-gate.test.ts', /(?=.*blocks live phases without pilot evidence)(?=.*zero critical incidents)(?=.*payment or callback safety regressions)(?=.*without leaking secrets)/s),
    check('rollout-gate-script-entry', 'Package scripts expose the rollout gate and main test suite runs its tests', 'package.json', /(?=.*implementation30:rollout-gate)(?=.*dist\/apps\/api\/src\/scripts\/implementation30-rollout-gate\.test\.js)/s),
    check('rollout-gate-ci', 'Production operability CI runs and uploads the Implementation 30 rollout gate artifact', '.github/workflows/production-operability.yml', /(?=.*implementation30:rollout-gate)(?=.*implementation30-rollout-gate\.md)/s),
  ]),
  area('exams-mark-integrity', 'Exams grading, mark integrity, and post-publish correction controls', [
    check('exams-grading-policy-schema', 'Exams schema stores grading policies, assessment components, mark versions, report-card batches, artifacts, and publish workflow states behind tenant RLS', 'apps/api/src/modules/exams/exams-schema.service.ts', /(?=.*exam_grading_policies)(?=.*exam_grading_policy_boundaries)(?=.*exam_subject_weightings)(?=.*exam_competency_outcomes)(?=.*exam_assessment_components)(?=.*exam_mark_versions)(?=.*report_card_generation_batches)(?=.*report_card_artifacts)(?=.*draft_requested)(?=.*draft_generated)(?=.*under_review)(?=.*approved)(?=.*published)(?=.*withdrawn)(?=.*regeneration_required)(?=.*FORCE ROW LEVEL SECURITY)/s),
    check('exams-mark-entry-maximum-score', 'Exams service validates mark entry against assessment maximum score before persistence', 'apps/api/src/modules/exams/exams.service.ts', /findAssessmentScopeForMark[\s\S]+Score exceeds assessment maximum score/),
    check('exams-grade-boundary-and-bulk-upload', 'Exams service enforces configured grade boundaries and supports preview-before-commit bulk mark upload with audit', 'apps/api/src/modules/exams/exams.service.ts', /(?=.*assertGradeBoundaryForMark)(?=.*findGradeBoundaryForScore)(?=.*outside configured grade boundaries)(?=.*multiple grade boundaries)(?=.*bulkUploadMarks)(?=.*preview_token)(?=.*bulk_grade\.updated)/s),
    check('exams-bulk-upload-endpoints', 'Exams API exposes bulk mark template and preview/commit upload endpoints under mark-entry permission', 'apps/api/src/modules/exams/exams.controller.ts', /(?=.*marks\/bulk-template)(?=.*marks\/bulk-upload)(?=.*exams:enter-marks)/s),
    check('exams-grade-boundary-repository', 'Exams repository resolves grade-boundary coverage and overlapping matches for mark validation', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /(?=.*findGradeBoundaryForScore)(?=.*exam_grade_boundaries)(?=.*configured_count)(?=.*match_count)(?=.*BETWEEN min_score AND max_score)/s),
    check('exams-post-publish-correction-workflow', 'Post-publish mark corrections require dual approval, create mark versions, and flag report cards for regeneration', 'apps/api/src/modules/exams/exams.service.ts', /findPublishedReportCardsForMark[\s\S]+Published report-card corrections require dual approval[\s\S]+createMarkVersion[\s\S]+markReportCardsRegenerationRequired[\s\S]+regeneration_required/),
    check('exams-mark-version-repository', 'Exams repository persists mark versions and marks published report-card snapshots for regeneration', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /createMarkVersion[\s\S]+INSERT INTO exam_mark_versions[\s\S]+findPublishedReportCardsForMark[\s\S]+markReportCardsRegenerationRequired[\s\S]+regeneration_required/),
    check('exams-integrity-tests', 'Exams tests cover grading schema, maximum-score enforcement, grade boundaries, bulk upload, dual approval, and regeneration after published corrections', 'apps/api/src/modules/exams/exams.test.ts', /(?=.*ExamsSchemaService creates grading policy)(?=.*ExamsService enforces assessment maximum score before mark entry)(?=.*outside configured grade boundaries)(?=.*bulk mark uploads)(?=.*ExamsService requires dual approval and marks report-card regeneration after published corrections)/s),
  ]),
  area('exams-report-cards', 'Backend-generated and immutable report cards', [
    check('report-card-generator', 'Exams service generates report-card payloads from backend data', 'apps/api/src/modules/exams/exams.service.ts', /generateReportCard[\s\S]+loadReportCardData[\s\S]+buildReportCardPayload/),
    check('report-card-endpoint', 'Exams API exposes a generation endpoint protected by exams approval', 'apps/api/src/modules/exams/exams.controller.ts', /report-cards\/generate[\s\S]+exams:approve/),
    check('report-card-generation-service', 'Report-card generation service creates tenant-scoped HTML/PDF artifacts with verification codes and batch status', 'apps/api/src/modules/exams/services/report-card-generation.service.ts', /(?=.*ReportCardGenerationService)(?=.*generateStudentReportCard)(?=.*createPdfReportArtifact)(?=.*renderHtml)(?=.*recordReportCardArtifact)(?=.*verification_code)(?=.*generateReportCardBatch)(?=.*getReportCardBatchStatus)(?=.*verifyPrintedReportCard)/s),
    check('report-card-template-service', 'Report-card template service renders school, learner, comments, totals, and next-term fields for HTML/PDF output', 'apps/api/src/modules/exams/services/report-card-template.service.ts', /(?=.*ReportCardTemplateService)(?=.*buildPayload)(?=.*renderHtml)(?=.*buildPdfInput)(?=.*template_fields)(?=.*school_name)(?=.*learner_name)(?=.*principal_comment)(?=.*next_term_opening_date)/s),
    check('report-card-artifact-repository', 'Exams repository persists report-card artifacts, generation batches, and tenant-scoped verification lookup', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /(?=.*recordReportCardArtifact)(?=.*INSERT INTO report_card_artifacts)(?=.*createReportCardGenerationBatch)(?=.*updateReportCardGenerationBatch)(?=.*getReportCardGenerationBatch)(?=.*findReportCardArtifactByVerificationCode)/s),
    check('report-card-batch-and-verification-endpoints', 'Exams API exposes regeneration, class batch, batch status, and printed verification endpoints', 'apps/api/src/modules/exams/exams.controller.ts', /(?=.*report-cards\/regenerate)(?=.*report-cards\/batches)(?=.*report-cards\/batches\/:batchId)(?=.*report-cards\/verify\/:verificationCode)(?=.*exams:approve)(?=.*exams:read)/s),
    check('immutable-published-report-cards', 'Published report cards are not overwritten by conflict updates', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /createReportCardSnapshot[\s\S]+WHERE student_report_cards\.status <> 'published'/),
    check('report-card-data-query', 'Report cards are built from student, exam, subject, mark, and grade data', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /(?=.*loadReportCardData)(?=.*exam_marks)(?=.*exam_grade_boundaries)(?=.*students)/s),
    check('mark-upsert-scope-guard', 'Exam mark conflict updates cannot cross series, term, class, or subject scope', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /upsertMark[\s\S]+ON CONFLICT \(tenant_id, assessment_id, student_id\)[\s\S]+exam_marks\.exam_series_id = EXCLUDED\.exam_series_id[\s\S]+exam_marks\.academic_term_id = EXCLUDED\.academic_term_id[\s\S]+exam_marks\.class_section_id = EXCLUDED\.class_section_id[\s\S]+exam_marks\.subject_id = EXCLUDED\.subject_id/),
    check('guardian-report-card-access', 'Parent report-card downloads are signed, actor-bound, and resolved through guardian links', 'apps/api/src/modules/exams/exams.service.ts', /createParentReportCardDownload[\s\S]+findReportCardForGuardian[\s\S]+signParentReportCardDownloadToken/),
    check('guardian-download-endpoint', 'Exams API exposes parent report-card download endpoints protected by linked-child portal permission', 'apps/api/src/modules/exams/exams.controller.ts', /report-cards\/:reportCardId\/parent-download[\s\S]+portal:read_own_children[\s\S]+report-cards\/download\/:token/),
    check('guardian-linked-query', 'Report-card parent access joins through active student guardian links', 'apps/api/src/modules/exams/repositories/exams.repository.ts', /findReportCardForGuardian[\s\S]+student_guardians[\s\S]+guardian\.user_id = \$3::uuid[\s\S]+guardian\.status = 'active'/),
    check('withdrawn-download-test', 'Tests prove withdrawn report cards cannot be downloaded by linked parents', 'apps/api/src/modules/exams/exams.test.ts', /withdrawn report-card downloads[\s\S]+ForbiddenException/),
    check('report-card-generation-tests', 'Exams tests cover HTML/PDF artifact generation, class batch progress, and printed verification lookup', 'apps/api/src/modules/exams/exams.test.ts', /(?=.*ReportCardGenerationService generates HTML and PDF artifacts with a verification code)(?=.*starts class report-card batches)(?=.*verifies printed report cards)/s),
  ]),
  area('exams-frontend-live', 'Exams frontend live API integration', [
    check('exams-frontend-proxy', 'Next.js exams API proxy forwards GET, POST, and PATCH requests to the school API exams routes', 'apps/web/src/app/api/exams/[...path]/route.ts', /(?=.*proxySchoolApiRequest)(?=.*\/exams)(?=.*export async function GET)(?=.*export async function POST)(?=.*export async function PATCH)/s),
    check('exams-live-client', 'Exams live client fetches mark sheets, writes marks, previews bulk uploads, locks/corrects sheets, generates batches, publishes cards, and uses guardian-scoped download paths', 'apps/web/src/lib/modules/exams-client.ts', /(?=.*fetchExamsWorkspaceLive)(?=.*enterExamMarkLive)(?=.*bulkUploadExamMarksLive)(?=.*lockExamMarkSheetLive)(?=.*correctLockedExamMarkLive)(?=.*generateReportCardLive)(?=.*generateReportCardBatchLive)(?=.*fetchReportCardBatchStatusLive)(?=.*publishReportCardLive)(?=.*buildParentReportCardDownloadPath)(?=.*createParentReportCardDownloadLive)/s),
    check('exams-live-screen', 'Exams module screen renders live mark-sheet operations, generated artifact preview, polling batch progress, and role-scoped teacher/principal actions', 'apps/web/src/components/modules/exams/exams-module-screen.tsx', /(?=.*LiveExamsOperationsPanel)(?=.*ReportCardArtifactPreview)(?=.*BatchProgressCard)(?=.*refetchInterval:\s+activeBatchId \? 3000 : false)(?=.*role === "teacher")(?=.*principalMode)(?=.*Mark saved to live exams ledger)(?=.*Report-card batch generation started)(?=.*Report card published to the parent portal)/s),
    check('exams-live-design-tests', 'Design tests exercise live teacher mark entry, bulk preview, lock, principal generation, batch polling, publish, and disabled-module gating', 'apps/web/tests/design/exams-workspace.test.tsx', /(?=.*blocks the exams workspace when the tenant module is disabled)(?=.*saves live marks, previews uploads, and locks assigned teacher mark sheets)(?=.*generates report-card previews, polls batch progress, and publishes as principal)/s),
    check('exams-live-adapter-tests', 'Live adapter tests map backend mark sheets and report-card artifacts and verify parent downloads are report-card scoped', 'apps/web/tests/design/module-live-adapters.test.ts', /(?=.*maps live exams mark sheets and generated artifacts into the exams workspace)(?=.*builds parent report-card download paths without accepting caller supplied student ids)/s),
    check('exams-lock-mark-sheet-endpoint', 'Backend exams API exposes a teacher-scoped mark-sheet lock endpoint for the live frontend', 'apps/api/src/modules/exams/exams.controller.ts', /mark-sheets\/:markSheetId\/lock[\s\S]+exams:enter-marks[\s\S]+lockMarkSheet/),
  ]),
  area('tenant-trust-boundary', 'Tenant header trust boundary', [
    check('signed-tenant-header', 'Forwarded tenant headers require an HMAC signature', 'apps/api/src/tenant/tenant.service.ts', /trustedTenantHeaderSecret[\s\S]+createHmac\('sha256'/),
    check('tenant-trust-boundary-service', 'Tenant trust boundary service resolves signed proxy headers, subdomains, and verified custom domains without trusting browser x-tenant-id', 'apps/api/src/tenant/tenant-trust-boundary.service.ts', /(?=.*TenantTrustBoundaryService)(?=.*resolveTenantContext)(?=.*signed_header)(?=.*custom_domain)(?=.*tenant_domains)(?=.*verified_at IS NOT NULL)(?=.*isTrustedForwardedTenantId)/s),
    check('tenant-domain-schema', 'Platform onboarding schema stores tenant domain bindings behind forced RLS', 'apps/api/src/modules/platform/platform-onboarding.schema.ts', /(?=.*tenant_domains)(?=.*domain text NOT NULL)(?=.*verified_at timestamptz)(?=.*uq_tenant_domains_domain)(?=.*ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY)/s),
    check('middleware-signature-wiring', 'Tenant middleware passes the trusted signature header into tenant resolution', 'apps/api/src/middleware/tenant.middleware.ts', /x-tenant-signature/),
    check('tenant-boundary-test', 'Tenant tests prove unsigned forwarded tenant headers are ignored and custom domains resolve through verified bindings', 'apps/api/src/tenant/tenant.service.test.ts', /(?=.*ignores unsigned forwarded tenant ids)(?=.*resolves verified custom domains)(?=.*tenant domain bindings with forced RLS)/s),
  ]),
  area('child-data-protection', 'Child-data classification, consent, retention, DPIA, and no-leak controls', [
    check('child-data-classification-registry', 'Security registry classifies child, health, biometric, payment, guardian, M-Pesa, report-card, consent, retention, and DPIA controls', 'apps/api/src/modules/security/data-classification-registry.service.ts', /(?=.*DataClassificationRegistryService)(?=.*sensitive_child_data)(?=.*sensitive_health_data)(?=.*sensitive_biometric_data)(?=.*payment_data)(?=.*students\.primary_guardian_phone)(?=.*biometric_attendance)(?=.*medical_processing)(?=.*exams_report_cards)(?=.*mpesa_payload_vault)(?=.*raw_payload_days)/s),
    check('pii-leak-scanner', 'PII leak scanner detects raw Kenyan phone numbers, admission numbers, and parent or payer names in artifacts', 'apps/api/src/modules/security/pii-leak-scanner.service.ts', /(?=.*PiiLeakScannerService)(?=.*RAW_KENYAN_PHONE_PATTERN)(?=.*ADMISSION_NUMBER_PATTERN)(?=.*PAYER_NAME_PATTERN)(?=.*raw_kenyan_phone_number)(?=.*raw_admission_number)(?=.*raw_parent_or_payer_name)/s),
    check('compliance-evidence-schema', 'Compliance schema stores DSR, retention, child-DPIA, and breach evidence tables behind forced tenant RLS', 'apps/api/src/modules/compliance/compliance-schema.service.ts', /(?=.*data_subject_requests)(?=.*access_request)(?=.*correction_request)(?=.*deletion_anonymization_request)(?=.*export_request)(?=.*objection_request)(?=.*data_retention_schedules)(?=.*child_data_dpia_records)(?=.*students)(?=.*payments)(?=.*sync_offline)(?=.*breach_response_reports)(?=.*FORCE ROW LEVEL SECURITY)/s),
    check('data-subject-request-workflow', 'Compliance service runs audited DSR identity, approval, completion, and anonymization workflow with SLA countdown', 'apps/api/src/modules/compliance/compliance.service.ts', /(?=.*submitDataSubjectRequest)(?=.*verifyDataSubjectRequestIdentity)(?=.*reviewDataSubjectRequest)(?=.*completeDataSubjectRequest)(?=.*anonymizeDataSubject)(?=.*data_subject_request\.completed)(?=.*days_remaining)(?=.*breach_response_report\.exported)/s),
    check('data-subject-request-routes', 'Compliance API exposes protected DSR workflow and breach report export routes', 'apps/api/src/modules/compliance/compliance.controller.ts', /(?=.*data-subject-requests)(?=.*identity-verification)(?=.*review)(?=.*complete)(?=.*breach-response-reports\/:reportId\/export)(?=.*compliance:write)(?=.*compliance:read)/s),
    check('breach-response-runbook', 'Breach response runbook covers containment, notification, sanitized evidence export, and PII scan proof', 'docs/runbooks/data-breach-response.md', /(?=.*Data Breach Response Runbook)(?=.*Containment)(?=.*Notification)(?=.*Evidence Export)(?=.*security:pii-scan)(?=.*breach-response-reports\/:reportId\/export)/s),
    check('pii-leak-ci-artifact-scan', 'PII leak CI scan covers generated logs, snapshots/exports, API responses, and frontend fixtures', 'apps/api/src/scripts/pii-leak-ci-scan.ts', /(?=.*runPiiLeakCiScan)(?=.*logs)(?=.*snapshots_exports)(?=.*api_responses)(?=.*frontend_fixtures)(?=.*PiiLeakScannerService)(?=.*pii-leak-ci-scan\.md)/s),
    check('pii-leak-ci-workflows', 'Security and operability CI run the PII leak artifact scan', '.github/workflows/security-audit.yml', /security:pii-scan[\s\S]+pii-leak-ci-scan\.md/),
    check('child-data-protection-tests', 'Security and compliance tests cover classification registry, PII leak scanning, DSR, retention, DPIA, breach evidence, and RLS', 'apps/api/src/modules/security/security.test.ts', /(?=.*DataClassificationRegistryService covers child-data categories)(?=.*PiiLeakScannerService flags raw Kenyan phone numbers and payer names)/s),
    check('compliance-schema-tests', 'Compliance tests verify data-subject workflow, breach export, retention, DPIA, and tenant RLS', 'apps/api/src/modules/compliance/compliance.test.ts', /(?=.*ComplianceSchemaService creates consent, data-subject, retention, DPIA, and breach evidence tables with tenant RLS)(?=.*runs data subject request workflow with SLA countdown)(?=.*exports breach response reports with redacted evidence)/s),
    check('pii-leak-ci-tests', 'PII leak CI tests prove raw artifact leaks fail and masked artifacts pass', 'apps/api/src/scripts/pii-leak-ci-scan.test.ts', /(?=.*fails raw PII in generated logs, API responses, and frontend fixtures)(?=.*passes when artifact evidence is masked)/s),
  ]),
  area('implementation30-verification', 'Implementation 30 verification artifacts', [
    check('plan-file', 'Implementation 30 production readiness plan exists', 'implementation30.md', /Implementation 30 Kenyan Schools Production Readiness/),
    check('payment-tests', 'Payments tests cover verification-before-allocation and redaction', 'apps/api/src/modules/payments/payments.test.ts', /(?=.*provider_verification_required)(?=.*exports only redacted payloads)(?=.*redacts C2B API payment responses for legacy raw rows)(?=.*assert\.notEqual)/s),
    check('exams-tests', 'Exams tests cover generated, immutable, scoped marks, grading integrity, and guardian-scoped report cards', 'apps/api/src/modules/exams/exams.test.ts', /(?=.*already-published report cards)(?=.*mark upsert conflicts)(?=.*generates report-card payloads)(?=.*parent report-card downloads)(?=.*ExamsService enforces assessment maximum score)(?=.*ExamsService requires dual approval)/s),
    check('disabled-module-certification', 'Module-access certification compares enabled modules against registry, permissions, routes, frontend guards, jobs, reports, dashboard widgets, and package expiry behavior', 'apps/api/src/scripts/module-access-certification.ts', /(?=.*runModuleAccessCertification)(?=.*registry-permission-alignment)(?=.*backend-route-module-guards)(?=.*frontend-route-module-guards)(?=.*background-job-module-guards)(?=.*report-export-module-guards)(?=.*dashboard-widget-module-guards)(?=.*package-trial-expiry-behavior)/s),
    check('disabled-module-certification-tests', 'Module-access certification tests fail when backend or frontend module guard evidence is missing', 'apps/api/src/scripts/module-access-certification.test.ts', /(?=.*fails when a backend module route lacks RequiresModule evidence)(?=.*fails when frontend route guard mapping omits a module section)/s),
    check('disabled-module-certification-ci', 'CI runs module-access certification and uploads its evidence artifact', '.github/workflows/production-operability.yml', /(?=.*module-access:certify)(?=.*module-access-certification\.md)/s),
  ]),
];

export function runImplementation30Certification(
  options: Implementation30CertificationOptions = {},
): Implementation30CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const areas = CERTIFICATION_AREAS.map((definition, index) => {
    const checks = definition.checks.map((item) => {
      const source = readSource(workspaceRoot, item.file, options.sourceOverrides);
      const passed = item.pattern.test(source);

      return {
        id: item.id,
        label: item.label,
        file: item.file,
        status: passed ? 'pass' as const : 'fail' as const,
      };
    });

    return {
      id: definition.id,
      evidence_id: `IMPLEMENTATION30-${String(index + 1).padStart(3, '0')}-${definition.id}`,
      title: definition.title,
      status: checks.every((item) => item.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: areas.every((result) => result.status === 'pass'),
    areas,
  };
}

export function renderImplementation30CertificationMarkdown(
  result: Implementation30CertificationResult,
): string {
  const lines = [
    '# Implementation 30 Certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    '| Evidence ID | Area | Status | Checks |',
    '| --- | --- | --- | --- |',
  ];

  for (const areaResult of result.areas) {
    lines.push(
      `| ${areaResult.evidence_id} | ${escapeTable(areaResult.title)} | ${areaResult.status} | ${escapeTable(areaResult.checks.map((item) => `${item.status}: ${item.label}`).join('; '))} |`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- This certification checks source-level evidence for the Implementation 30 P0 controls implemented in this pass.',
    '- It focuses on M-Pesa callback integrity, canonical tenant payment configuration, reconciliation and finance-close controls, redacted operational payloads, exams grading integrity, generated report cards, child-data protection evidence, production config gates, immutable published report cards, signed tenant-header trust boundaries, and pilot rollout evidence gating.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation30CertificationArtifact(
  result: Implementation30CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation30CertificationMarkdown(result));
}

export function runAndWriteImplementation30Certification(
  workspaceRoot = process.cwd(),
): Implementation30CertificationResult {
  const result = runImplementation30Certification({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'implementation30-certification.md');
  writeImplementation30CertificationArtifact(result, outputPath);
  return result;
}

function area(id: string, title: string, checks: EvidenceCheck[]): CertificationArea {
  return { id, title, checks };
}

function check(id: string, label: string, file: string, pattern: RegExp): EvidenceCheck {
  return { id, label, file, pattern };
}

function readSource(
  workspaceRoot: string,
  relativePath: string,
  sourceOverrides?: Record<string, string>,
): string {
  if (sourceOverrides?.[relativePath] !== undefined) {
    return sourceOverrides[relativePath];
  }

  const filePath = join(workspaceRoot, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function main(): void {
  const result = runAndWriteImplementation30Certification();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
