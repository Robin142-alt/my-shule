# Verified school collection ingress

## Contract

External collections follow one path: provider adapter → durable school/environment inbox → asynchronous settlement evidence → `CollectionPaymentsService.recognizeVerified` → existing fee payment, ledger, allocation, credit, receipt, reconciliation and reversal services. There is no public API accepting a caller's claim that a transaction is verified. Adapters never write fee or ledger tables.

Safaricom is the only installed automatic collection adapter. Equity, KCB, Co-operative Bank and Other Bank remain **statement review only**. Adding a bank requires its actual onboarding/authentication, parser, destination identity and settlement verifier, registering that adapter and its capability in the provider catalog. It does not require another fee-accounting implementation. A bank Paybill is not implicitly a Safaricom merchant API belonging to the school.

## Public configuration and URLs

Set on the API and payments worker:

```text
PAYMENT_CALLBACK_BASE_URL=https://my-shule-api-production.up.railway.app/payments/ingress
```

The base is explicit; a proxy prefix is preserved exactly. Never derive it from a browser origin or remove `/api` heuristically. For each approved revision the application generates a random encrypted 256-bit callback token. Super Admin → School payment integrations → **Callback URLs** displays the exact values; **Check connection** registers those same values. Do not guess a shared global URL or put a real token in documentation/logs.

```text
POST {base}/c2b/{sandbox|production}/{school-hex}/{revision}/{token}/confirmation
POST {base}/c2b/{sandbox|production}/{school-hex}/{revision}/{token}/validation
POST {base}/check/{school-hex}/{request-id}/{one-time-token}/result
POST {base}/check/{school-hex}/{request-id}/{one-time-token}/timeout
```

Audited against [Daraja C2B documentation](https://developer.safaricom.co.ke/apis/CustomerToBusiness) on 2026-10-01: registration uses `/mpesa/c2b/v2/registerurl` on the fixed sandbox or production host. Callback URLs use HTTPS, a public domain, and no credentials, query or fragment. Safaricom rejects URLs containing terms such as `safaricom`, `mpesa`, `exe`, `exec`, `cmd`, `sql` or `query`, including variants, and public URL testers. Generation validates the entire URL before contacting Daraja. The school slug is UTF-8 hex, decoded only at the callback boundary; stored school, environment, revision and constant-time capability checks remain unchanged. Previously registered `/safaricom/...` and `/verification/...` routes remain supported. STK callback routes are unchanged.

Failed checks retain bounded `ResponseCode`/`ResponseDescription` (or Daraja `errorCode`/`errorMessage`) and HTTP status in the existing dashboard follow-up workflow. Credentials, authorization values and callback URLs/tokens are redacted before persistence, audit or notification. Sandbox registrations may be overwritten by an explicit check. Production URLs already registered may require the school's authorized operator to remove them through Daraja Self Services URL Management before re-registering; MyShule never deletes them automatically.

The channel requires Consumer Key, Consumer Secret, school Paybill, status Initiator and environment-specific encrypted SecurityCredential. The existing STK channel also requires its Lipa na M-PESA passkey. Obtain all from the school's authorized Daraja application; do not substitute global platform credentials. Global `MPESA_*` settings remain for explicitly platform-owned billing/historical gateway callbacks, not new school C2B registrations. Existing legacy mutation endpoints remain denied.

`daraja_direct` is the default for a new approved revision. Safaricom needs no MyShule HMAC headers: the private revision URL authenticates channel delivery; separate status-query evidence is required before posting. `edge_signed` additionally requires the authenticated gateway to sign raw bodies with the configured `MPESA_CALLBACK_SECRET` and `x-mpesa-signature`/`x-mpesa-timestamp`. Both modes require settlement verification, including one-time result capability, expiry, conversation, receipt, amount, credited destination and completed status. Query acceptance is never settlement. Tokens are redacted in application request logs; infrastructure access-log retention must also protect these capability URLs.

The canonical base supplies a school/revision-scoped STK callback URL as well. Existing intent, STK verification and accounting behavior is retained; new channel callbacks always require provider status verification even when gateway-signed. Legacy sandbox school configs cannot initiate payments into live fee accounts.

Safaricom requirements remain external: C2B and status API entitlement, correct environment/shortcode, initiator permissions and SecurityCredential, Paybill validation activation and production URL-registration/change permissions. A successful OAuth/URL-registration check alone does not certify settlement verification. See [C2B](https://developer.safaricom.co.ke/apis/CustomerToBusiness) and [Transaction Status](https://developer.safaricom.co.ke/apis/TransactionStatus).

## Matching, duplicates and review

- Match a unique invoice number/ID/external reference first, scoped to the school and a real student. Otherwise match a unique active admission number in that school. Ambiguous invoice/admission references do not auto-credit.
- The durable inbox claims provider + environment + school/destination + transaction identity. Production also has a cross-school uniqueness constraint. Existing collection and historical-receipt deduplication remains authoritative for financial effects.
- A different amount/reference for the same identity is conflicting evidence, not a second payment. Unverified/conflicting callbacks cannot post or be manually marked verified.
- Verified unmatched production money uses the existing suspense/reconciliation workflow. The Accountant matches it in Collections. Unverified or suspicious entries appear in the verification inbox; retries request provider verification, not a manual trust override. Independent bank/provider evidence may use the existing statement/Principal approval process.
- Posting, inbox linking, audit and event/notification writes share the database transaction. The payment worker leases SQL inbox rows and retries independently of Redis dispatch. New inbox terminal identities and financial links are immutable.

## First sandbox test

For Daraja automatic C2B collections in either sandbox or production, Super Admin supplies the consumer key, consumer secret, transaction-status initiator and security credential. **Lipa na M-PESA passkey is optional for C2B.** Supply it when the school uses M-PESA Express (STK prompts); STK initiation and status queries require it. Existing STK configurations keep their passkey and password generation behavior. Saving without a passkey does not bypass Principal approval, connection testing, callback registration or provider transaction verification.

An absent passkey is stored as an empty value in the existing finance configuration column; supplied passkeys remain encrypted. No schema migration is required. Blank optional passkeys are omitted from the encrypted revision credentials, and configuration reads and credential rotation support C2B-only setups.

1. Accountant requests a **separate sandbox Paybill setup**, Principal approves, Super Admin connects it with the Daraja sandbox credentials and `daraja_direct`.
2. Check connection, inspect the exact Callback URLs, then activate the sandbox channel. Do not replace a production revision with a sandbox revision.
3. Choose **Simulate sandbox payment**, enter an existing school invoice/admission reference, KES 1 and the Daraja test MSISDN assigned to the application.
4. The application reserves the shared test shortcode for 15 minutes, registers this revision's URLs and sends a randomized school-specific provider reference. Concurrent schools must wait for that window. Late deliveries routed to another school cannot match its students. Do not manually re-register a shared shortcode outside the coordinated simulator.
5. In Accountant → Collections → Provider verification inbox, refresh until `sandbox_verified`; check the expected student. Sandbox deliberately creates **no live payment, ledger, receipt or balance change**. Missing/mismatched provider evidence stays in review. Some sandbox capabilities may not return settlement evidence for simulated receipts; never bypass verification to get a green result.
6. Repeat delivery of the same receipt in a disposable integration test and verify one inbox record. Use the disposable PostgreSQL regression suite for full accounting/portal balance and duplicate-credit tests. A real production canary requires an approved school's own production credentials and an explicitly authorized small payment; confirm one receipt and the corresponding fee balance change, then replay only the callback and confirm no second credit.

## Deployment and recovery

Deploy the same release to API, payments worker (`node dist/apps/api/src/payments-worker.js`) and web. The worker needs the same database, Redis and encryption configuration as the API; secrets should use Railway service-variable references. The existing schema bootstrap adds inbox/verification/test tables with forced RLS and replaces active-destination uniqueness with separate production and tenant-scoped sandbox indexes. It does not change existing accounting table history.

Run `scripts/payment-ingress-status.cjs` using a server-side database environment for read-only table/channel diagnostics. Do not print environment variables or callback tokens. Public invalid-token callbacks must fail; authenticated bank channels remain statement-only. Watch delayed verification/provider-exception counts in payment integration health, worker failures and accountant review queues.

Rollback: suspend affected channels and stop the new worker first; preserve every inbox/evidence row. Restore previous API/web release only after ensuring it will not recreate the old global sandbox-unique index with multiple active shared sandbox revisions. Keep the new schema compatible; never delete financial rows or reverse fees just to roll back software. Re-register provider URLs only through an explicit approved change. Undelivered callbacks require provider reconciliation after recovery.
