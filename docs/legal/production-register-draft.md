# MyShule Production Register

**Document ID:** production-register-draft-2026-10-09

**Version:** 0.1 DRAFT — not approved, not incorporated into a school contract

**Prepared:** 9 October 2026, Africa/Nairobi

**Provider:** Orbitlane Technologies · orbitlanetechnology@gmail.com · Kenya

## Approval boundary

The user confirmed that this register, the Retention and Exit Schedule, and release evidence have not been approved. DPA acceptance remains inactive in `shared/legal/release.ts`. This draft does not authorise an international transfer, confirm compliance, or establish that a vendor agreement has been executed. Provider registered legal name, registration number, business address and contracting capacity remain to be verified against institutional service contracts.

## Evidence and method

Read-only Railway project status and a whitelist of production API configuration were inspected on 9 October 2026. PostgreSQL inspection used a read-only transaction against system catalogues only: server version, connection encryption, runtime-role privileges and table security flags. No student, parent, staff, payment, medical or message records were read. Credentials were used in process memory and are excluded from evidence outputs. See [sanitised evidence](production-evidence-2026-10-09.json).

Cloudflare Wrangler could not authenticate in the noninteractive environment. Cloudflare account settings, R2 bucket location, lifecycle, WAF, access controls, log retention and current Worker deployment are **unverified**. Repository configuration establishes intended configuration, not successful production activation.

## Services and data processing

| Provider / service | Purpose and data categories | Location evidence | Observed safeguards | Approval / evidence required |
|---|---|---|---|---|
| Railway Corporation — API, PostgreSQL, Redis and background services | School records, account/session data, financial records, reports; queues and job payloads; application logs | Live API `us-west2`; PostgreSQL, Redis, payments worker, reports-interactive, reports-bulk, SMS relay and malware-scanner show `sfo` region metadata. API `us-west2` maps to California, USA. Precise `sfo` facility, support-access and backup countries require vendor confirmation. | PostgreSQL 18.6; inspected school tables have enabled and forced RLS; `shule_hub_runtime` is neither superuser nor BYPASSRLS. API uses private PostgreSQL/Redis hostnames. | Pending executed DPA/subprocessor terms, country and backup inventory, transfer assessment, support-access rules and restore evidence. PostgreSQL SSL is disabled; inspected connection reports `ssl=false`. Redis URL uses `redis:`. Private routing is not proof of transport encryption. |
| Cloudflare, Inc. — Worker frontend, DNS/edge, image binding | Public website and authenticated application delivery; request/session and network metadata; image processing as configured | Repo Worker routes: `myshule.online/*` and `*.myshule.online/*`. Location of execution, logs and image processing unverified. | Repo uses asset and image bindings; no D1, KV or R2 binding declared in web Wrangler config. Logging config enables query redaction and sampling. | Pending current deployment, TLS/origin/WAF settings, token scopes, cache isolation, retention, contract and transfer evidence. Edge presence in Kenya would not alone demonstrate a Kenyan serving copy. |
| Cloudflare, Inc. — R2 report storage | Generated report PDFs and related school identifiers/metadata | Production API report endpoint is under `r2.cloudflarestorage.com`; region value `auto`. Actual bucket jurisdiction/location is unverified. | Code scopes keys by tenant, records checksums, supports expiring signed retrieval and report-specific cleanup. | Pending bucket jurisdiction, lifecycle/versioning, access policies, contract, countries and deletion/restore verification. `auto` is not a country. |
| Railway object storage — bucket `my-shule-production-uploads` | Uploaded school documents and attachments; exact enabled-module coverage requires inventory | Live Railway bucket present; production uploads endpoint `t3.storageapi.dev`. Location and underlying storage subprocessors unverified. | Upload object storage enabled. Code validates metadata, tenant paths, checksums and production malware-scan requirements. | Pending bucket location, private-access policy, lifecycle, malware-service configuration/test, provider-chain and contractual evidence. |
| Resend — transactional email (contracting entity unverified) | Account invitations, verification/recovery communications; recipient addresses and message content | Production `EMAIL_PROVIDER=resend`, API credential configured. Processing, support and retention locations unverified. | Provider integration exists; credential presence is not evidence of current delivery or sender verification. | Obtain correct legal entity, executed terms/DPA, subprocessor locations, message retention and transfer safeguards. |
| Safaricom — M-Pesa (contracting entity and role per contract to verify) | Payment initiation/callbacks, transaction references, phone numbers, school financial reconciliation | Production API endpoint `api.safaricom.co.ke`; payments worker deployed. This establishes endpoint configuration, not the location of every processing operation. | Code has callback authentication/replay handling and a payload vault; vault enabled in production configuration. | Verify active school/provider contracts, production credential scope, callback trust configuration, reconciliation evidence and retention. Determine independent-controller versus processor responsibilities per operation. |
| SMS relay and downstream carrier/provider — legal entities unverified | SMS recipient phone numbers, school notices and delivery metadata | Railway SMS relay service present in `sfo` metadata. Downstream provider and countries not established by this review. | Communication outbox, retry and provider-dispatch code exists. | Inspect approved provider settings without exposing credentials; verify carrier contract, country list, delivery and deletion evidence. |
| GitHub Actions (contracting entity and organisation agreement unverified) | Build/deployment workflows and, where configured, operational backup/restore artifacts | Repository workflow evidence only; runner/artifact region not verified | Production-operability workflow declares artifact retention of 14 days. This is a workflow setting, not database backup retention. | Verify access permissions, actual artifact contents, latest successful restore run, geographical scope, contract and retention enforcement. |

Neon appears in historical migration documentation. Current production configuration points to Railway PostgreSQL. Confirm whether historical Neon databases, replicas, exports or credentials still retain school data before removing Neon from a final subprocessor/data-location inventory.

## Kenyan hosting and transfer release requirement

Regulation 26 covers specified strategic-interest processing, including administering a basic education institution: it provides for processing through a Kenyan server/data centre or a serving copy stored in a Kenyan data centre. The observed infrastructure does not establish either condition. Obtain a reviewed applicability assessment and verified architecture with a Kenyan serving copy where required; test replication, access controls, recovery and deletion. A static website edge cache is insufficient evidence. See [ODPC General Regulations, regulation 26](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-GENERAL-REGULATIONS-2021-1.pdf).

The DPA additionally requires documented countries and safeguards for international processing. Do not infer permission to transfer from a user's Privacy acknowledgement or school checkbox.

## Source references

- Live sanitized evidence: [production-evidence-2026-10-09.json](production-evidence-2026-10-09.json).
- Repo: `apps/web/wrangler.jsonc`; `apps/api/src/database/database-security.service.ts`; `apps/api/src/common/uploads/{database-file-storage,s3-object-storage,upload-malware-scan}.service.ts`; `apps/api/src/modules/payments`; `apps/api/src/modules/exams/services/report-retention.service.ts`; `.github/workflows/production-operability.yml`.
- Provider legal identity reference, not proof of execution: [Railway DPA](https://railway.com/legal/dpa), [Cloudflare customer DPA](https://www.cloudflare.com/cloudflare-customer-dpa/).
- Region mapping: [Railway regions](https://docs.railway.com/deployments/regions).

## Approval record (unfilled)

Owner/reviewer, approval date, evidence references, legal provider identity and service-contract linkage: **pending**. Before approval, replace unknowns with verified facts, resolve release findings, identify any explicitly accepted residual risks, freeze an immutable version and calculate its SHA-256. Every later subprocessor change requires the applicable DPA notification and objection process, including its 14-calendar-day notice requirement unless the contract's urgency exception applies.
