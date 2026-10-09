# Legal release evidence and unresolved requirements

Status: implemented locally with focused verification passed; **DPA acceptance inactive; production release not certified**. This is an engineering review, not a regulatory certification or legal opinion. No production deployment or infrastructure mutation was performed for this task.

The global legal guard sits after authentication and before dashboard/module guards. SSE streams revalidate authenticated sessions and current legal status before emitting each message. Existing public callbacks retain their own provider authentication; they are not human dashboard sessions. Existing signed object-storage downloads remain valid for their issued short lifetime; previously downloaded files cannot be recalled by a new acceptance requirement. Do not represent receipt of a legal update as retroactively revoking exported copies.

## Document provenance and publication

Privacy Policy 1.0 and Terms of Use 1.0 are copied verbatim from the supplied text files, including the **proposed** effective date of 9 October 2026. DPA 2.0 comes from the supplied eight-page PDF. The original PDF is retained, and its source hash accompanies the readable transcription's hash. `shared/legal/documents.ts` preserves versions. Confirm the proposed dates before release; the implementation does not silently change approved wording.

## Policy statements compared with observed behaviour

| Statement / requirement | Evidence and conclusion | Release action |
|---|---|---|
| Individual agreement, school authority and parental authority are distinct | New personal, school and guardian acceptance scopes; backend derives identity; independent authority evidence; exact versions, server times, transactional audit/outbox | Verify school representatives and guardian records through operational practice. A role, phone match, invitation or child's checkbox is not sufficient evidence. |
| Privacy 8–10 / children's data and restricted disclosure | Student age comes from school records; unknown age requires guardian authorisation for portal access; revoked guardian links and authorisation stop later requests | This only covers **portal access**. It does not establish consent/lawful authority for earlier admission collection or every sensitive module. Complete child-data DPIAs and school consent/notice procedures. |
| Privacy 14 / appropriate security and encryption | Live inspected tables enforce RLS; runtime role cannot bypass RLS; PII/JWT keys configured. Database SSL is false and inspected PostgreSQL connection is unencrypted; Redis URL is not TLS | Resolve transport protection with tested certificates, client verification, rollout and rollback. Test public database exposure restrictions. Do not claim encryption in transit universally. No live TLS toggle was made because it can disconnect production services. |
| Privacy 15–17 / approved providers, countries and transfers | Railway regions and selected service endpoints verified; other countries/contracts incomplete | Approve the Production Register, Kenyan-hosting assessment, executed processor contracts and transfer safeguards. Vendor marketing or a public DPA URL is not proof of execution. |
| Privacy 18 / cookies and optional tracking | Legal consent adds no analytics or marketing cookies; existing session/CSRF cookies remain essential | Review all existing optional tracking and service-worker/offline storage before making a platform-wide statement. |
| Privacy 19–21 / retention, exit and rights | Retention metadata, report cleanup and data-subject workflows exist. Complete institution-wide export/disposal, backup expiry and final schedules unverified | Approve Retention and Exit Schedule; test full export, verified requester, holds, secure disposal, backup restoration and provider deletion. Append-only legal records need an approved controlled expiry process. |
| Privacy 22 / breach response; DPA notification commitments | Breach reporting schema and support/monitoring code exist | Evidence a staffed response process, escalation contacts, incident clock and tested 48/72-hour notification handling. Code fields do not establish organisational readiness. |
| Privacy 23 / privacy by design and DPIAs | Compliance schema supports child-data DPIA records | Verify completed applicable DPIAs, especially health, biometric, welfare and children's data. Do not infer approval from a database row type. |
| Material legal updates and notices | Exact document versions + acceptance generations, archived URLs and current server checks; a new generation requires renewed acceptance | Publish an approved change notice and any advance notification required by contract/law. Nonmaterial versions must retain their generation. A release note alone is not proof that affected schools received notices. |
| DPA institution/provider identity and incorporated schedules | Institutional acceptance remains disabled; current API rejects DPA selections. Future acceptance snapshots include approval and schedule versions/hashes/content | Verify full contracting identities, service-contract linkage, authority, schedules and every release condition. Operational drafts must never be represented as approved schedules. |
| Terms commercial promises, licensing, support, suspension and liability | Terms are published intact; existing subscription/module controls remain in place | Review actual subscription/service orders, fees/refunds/support commitments and authority to contract. Implementation does not create a new commercial entitlement or override school contracts. |

The [ODPC 2025 children's-data guidance](https://www.odpc.go.ke/wp-content/uploads/2025/11/ODPC-%E2%80%93-Guidance-Note-for-Processing-Childrens-Data.pdf) reinforces parental authority verification and separation of parental safeguards from the underlying lawful basis. School-owned source data may already predate portal access; portal authorisation must not be presented as retroactive approval of all processing.

## Release gates

1. Approve Privacy/Terms effective dates and verify preserved source hashes. Deploy API/schema before the matching web bundle; run acceptance/authentication smoke tests using synthetic school accounts.
2. Validate real invitation acceptance, first-password setup, parent/student setup, MFA, refresh, role switching and return routing on staging. Keep recovery and sign-out available when agreements are pending.
3. Review institution and guardian verification evidence procedures. The platform owner confirms school authority; independently verified school representatives can confirm existing guardian relationships. Do not auto-approve a principal title or imported guardian phone number.
4. Resolve Kenyan serving-copy and transfer requirements, transport encryption, vendor contracts, retention/exit and incident-process evidence. Verify ODPC controller/processor registration obligations and actual registrations. Record formal ownership of residual risks.
5. Keep `DPA_RELEASE.approval` null until the approved schedules, legal provider identity and evidence references exist. Publish reviewed immutable content and hashes, validate startup integrity and test the activation in staging. A configuration toggle is not approval.
6. After authorised release, verify pending/accepted/guardian-waiting flows on desktop and phone, cross-school denials, audit/outbox records, no-store responses and current-session enforcement. Observe failure rates without logging document submissions, credentials or children's details.

## Safe operation and rollback

Schema changes are additive. Do not mutate or delete acceptance evidence to roll back. Roll back web/API binaries together if needed while preserving legal tables; document that older binaries do not enforce the gate. Do not silently exempt existing accounts or copy another user's acceptance. Invalid/unavailable verification fails closed with a retry and sign-in path. DPA inactivity affects institutional contracting only: individual Terms/Privacy and applicable guardian safeguards remain active.

Live evidence in this folder covers a selected metadata/configuration inspection, not a penetration test of the entire ERP. Browser workflow tests use synthetic responses; PostgreSQL integration tests exercise real persistence, guards and sessions in disposable databases. Neither substitutes for staging and authorised production rollout verification.

## Verification record — 9 October 2026

| Check | Observed result and scope |
|---|---|
| API build and TypeScript | Passed `npm run build` and a subsequent API `tsc --noEmit`. |
| Web production build | Passed `npm run build` in `apps/web`, including TypeScript and all 102 static pages. Next reports its existing middleware-to-proxy migration warning. |
| Cloudflare production bundle | Passed `npm run build:cloudflare`: webpack compilation, TypeScript, 102 static pages and OpenNext Worker generation completed with exit code 0. Build warnings mention Windows support, the middleware convention and a Next.js internal `process.cwd` Edge Runtime import. The generated Worker still requires staging runtime validation; no deployment was made. |
| PostgreSQL legal integration | **10 passed** using the disposable local PostgreSQL runner. Real authenticated school, parent/student and platform sessions; immutable receipts; concurrent retries; audit/outbox rollback; verified authority; guardian withdrawal/reverification; active-DPA test fixture; material updates; personal acceptance across schools; tenant isolation and membership revocation. The synthetic DPA approval exists only inside the disposable test and is restored to inactive. |
| Legal policy, streams and mutation events | **9 passed**. Exact document/PDF hashes, required affirmative selections, age boundaries, material generations, revalidation of open streams and prevention of duplicate generic mutation events. |
| Focused web regression | **48 passed across 5 suites**: legal acceptance, server gate, persistent login, server authentication client and recovery experience. |
| Responsive browser workflows | **4 passed** in Chromium, including 320, 390 and 1280 px layouts; unchecked defaults, no horizontal overflow, scrollable viewer, Escape/focus restoration, failed-save retry, exact submitted selections, verified destination and public document/PDF access. The 390 px acceptance and viewer screenshots were also visually inspected. |
| Scoped ESLint | Passed with no warnings for the new legal components, routes, client/server helpers, affected authentication routing, legal tests and browser configuration. |
| Source preservation | Privacy and Terms contents compared directly with the supplied UTF-8 attachments: exact matches. Original DPA bytes match the catalogue source SHA-256. |
| PWA cache review | Existing service worker caches public static assets and the offline page only; it does not cache protected navigation responses or API results. Module-specific IndexedDB/device drafts still need the separate retention/shared-device review listed in the schedule. |

The wider web design suite was attempted and stopped after failures and long-running timeouts; it is **not a passing full regression run**. Outstanding failures included finance/admission actions, school invitation-role expectations, printable previews, a stream source-code assertion, bulk billing, mobile module rendering, report-card scopes and academic-foundation visibility. They have not all been established against a clean baseline. The Super Admin logout assertion affected by this change was corrected to require backend session revocation and passes in the focused suite. Preserve and triage the remaining failures before declaring a platform-wide release ready.

Release still needs staging journeys with real invitations, password setup and provider configuration, a full regression triage, and the contractual/production evidence listed above. Build and focused test success must not be used as approval of those requirements.
