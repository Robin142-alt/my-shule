# Legal agreements and acceptance

## Scope and release boundary

Implement the requested checkbox-based agreements using authenticated server identities. Keep individual Terms acceptance and Privacy acknowledgement separate from institutional DPA acceptance and guardian authorisation. No role selection, signatures, inferred consent, offline acceptance, or client-stored access authority.

The supplied Privacy Policy and Terms of Use are version 1.0, with a **proposed** effective date of 9 October 2026. Their text is preserved exactly. The subsequently supplied School Data Processing Agreement is version 2.0. Its original PDF and readable transcription are available. The user confirmed that its production register, retention schedule and release evidence are not approved. DPA acceptance stays inactive until verification and approval; this alone does not block existing school users.

## Design and build order

1. Immutable document catalogue, archived version URLs, readable public pages and modal viewers.
2. PostgreSQL evidence records, current membership checks, verified institutional authority, separate guardian authority and authorisation, transactional audit/outbox events.
3. Global API enforcement after authentication; limited exemptions for authentication recovery, legal review/acceptance, and verification administration. Never exempt a whole protected API namespace.
4. Compact acceptance screen and a fail-closed application gate. Recheck on navigation, tab focus and server denial. Acceptance must never be derived from browser storage or a token claim.
5. Abuse-case, persistence, route, component and responsive browser tests; policy/implementation gap assessment.

## Required behaviour

- Exact immutable document ID, version, content hash, acceptance generation and database timestamp recorded with authenticated user and school context.
- Idempotent retries and concurrency; no new evidence for merely opening a document.
- New versions within the same acceptance generation do not force repeat acceptance. Material changes requiring renewed agreement increment the generation; publish a reviewed change notice.
- School DPA acceptance requires a separately verified authority grant and active membership, not merely a role label. A school's agreement is distinct from its representative's individual acceptance.
- Student accounts of unknown age are treated conservatively as requiring guardian authorisation. A child's acknowledgement does not create that authorisation. Guardian authority must be verified against an active school-student-parent link. Revocation takes effect on subsequent requests.
- Verify identity/membership/authority inside the acceptance transaction; rollback evidence if audit or event persistence fails.
- The browser starts all checkboxes unchecked, keeps document viewers keyboard accessible, preserves failures and retry, and redirects only after server confirmation.

## Project contracts

Use NestJS services and guards in `apps/api/src/modules/legal`, existing PostgreSQL request transactions and event outbox, and Next App Router components in `apps/web/src`. Shared legal source lives in `shared/legal`. Follow existing TypeScript conventions and parameterised SQL, for example `database.query('SELECT ... WHERE tenant_id = $1', [tenantId])`.

Always preserve existing authentication, invitation/password setup, role switching and uncommitted user work. Privacy/Terms can be rolled out with the DPA inactive after release review. Do not activate the DPA while its prerequisites remain unresolved. No new external providers or dependencies are required.

## Verification commands

`npm run build`

`node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/modules/legal/legal-policy.test.ts apps/api/src/modules/legal/legal-stream.interceptor.test.ts apps/api/src/interceptors/school-mutation-event.interceptor.test.ts`

`node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/legal-acceptance.integration-spec.ts`

From `apps/web`: `npm run test:design -- --runTestsByPath tests/design/legal-acceptance.test.tsx tests/design/legal-server-gate.test.ts tests/design/persistent-login.test.ts tests/design/server-auth-client.test.ts tests/design/auth-recovery-experience.test.tsx`

From `apps/web`: `npx playwright test -c playwright.legal.config.ts` (isolated local browser; synthetic acceptance responses, real document pages, 320/390/1280-pixel viewports).

From `apps/web`: `npm run build` and `npm run build:cloudflare` (build only; neither deploys).

See the dated [verification record](legal/release-evidence.md) for results and the outstanding wider regression/release work. Tests never require a production database.

## Open requirements

See [production register](legal/production-register-draft.md), [retention and exit schedule](legal/retention-exit-schedule-draft.md), and [release evidence](legal/release-evidence.md). They distinguish live verification, code capabilities and pending approval. Main unresolved requirements include Kenyan serving-copy evidence, database transport encryption, approved retention/exit obligations, processor contracts and transfers, registration/DPIAs, incident procedures, commercial terms and proposed effective dates. The implementation is not evidence that all legal obligations are satisfied.

## Authority and version operations

Users review their agreements at `/legal/accept`; authorised verifiers use `/legal/verification`. Platform owners independently verify a school's representative against existing membership and supporting evidence. Verified school representatives verify a parent's existing child link. Evidence uses a record reference, never uploaded identity documents or signatures. Parents then authorise their child using their own account. A revoked link, revoked authority or withdrawal prevents child access on subsequent requests. Unknown dates of birth conservatively require guardian authorisation.

`legal_documents` preserves exact text/version/hash. Keep old catalogue entries and choose the current document per kind in `currentDocuments`. New nonmaterial versions retain the generation; legally material changes increase it after review and required notices. Never overwrite an existing published ID. Personal acceptance follows the authenticated user across schools; the stored school identifies where it occurred. Institutional and guardian acceptance remain school-scoped. RLS permits only the same person's personal receipts across schools.

For an approved DPA release, populate `DPA_RELEASE.approval` only with reviewed evidence and full immutable schedules. Startup verifies schedule hashes and document integrity. The UI presents incorporated schedules before its school checkbox; receipt evidence snapshots all incorporated content. Advance subprocessor or legal-change notices remain operational release obligations, not implied by publishing code.
