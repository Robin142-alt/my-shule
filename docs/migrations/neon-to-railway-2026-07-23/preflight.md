# Neon to Railway PostgreSQL Migration Preflight and Completion Record

Date: 2026-07-23

## Final Status

- Migration decision: GO, completed.
- Production writer: Railway PostgreSQL database `myshule_final`.
- Production API: Railway `my-shule-api`, connected through Railway private networking.
- Neon state: intact as the rollback source and no longer used by the application.
- Verification result: structural, row, tenant-scope, application, and CI gates passed.
- Dual-writer state: not permitted and not observed.

No reset, drop, truncate, destructive seed, force-reset migration, or destructive
source-data operation was run. The only source-side administrative change was
rotating an exposed Neon role credential after the cutover. The database schema
and application data were not changed by that rotation.

## Production Writer and Dependency Map

| Component | Deployment | Database behavior | Completed state |
| --- | --- | --- | --- |
| NestJS API | Railway `my-shule-api` | Primary application reader/writer through Prisma and `pg` | Online on Railway PostgreSQL |
| Web application | Vercel/Next.js | Calls the API; no direct production PostgreSQL client found | No database variable found during the topology check |
| Payments worker | Repository and CI contract | Database reader/writer plus Redis/BullMQ | Not deployed as a separate Railway service |
| Events worker | Repository and CI contract | Outbox/event reader/writer | Not deployed as a separate Railway service |
| API background queues | Railway API process | BullMQ/Redis-backed work | Configured and ready |
| SMS relay | Railway | No PostgreSQL dependency found | Online |
| Malware scanner | Railway | No PostgreSQL dependency found | Online |
| Production operability workflow | GitHub Actions | Uses `PROD_DATABASE_URL` | Updated to Railway during cutover |
| Disaster recovery workflow | GitHub Actions | Uses optional `DR_DATABASE_URL` | No secret configured; Neon rollback remains protected outside Git |

The production database does not contain `_prisma_migrations` or
`schema_migrations`. Schema verification therefore compares the live database
catalog directly instead of inferring correctness from migration metadata.

## Neon Source Inventory

| Check | Measured result |
| --- | --- |
| PostgreSQL version | 17.10 |
| Database | `neondb` |
| Encoding | UTF8 |
| Collation / ctype | `C.UTF-8` / `C.UTF-8` |
| User tables | 444 |
| Exact rows across all tables | 2,717 |
| Non-empty tables | 27 |
| Actual indexes | 1,327 |
| User triggers | 139 |
| All functions / application functions | 98 / 31 |
| Enum types | 107 |
| Sequences | 3 |
| Views / materialized views | 1 / 0 |
| Large objects / foreign tables / partitions | 0 / 0 / 0 |
| Tables without primary keys / invalid indexes | 0 / 0 |
| Unvalidated constraints | 11, pre-existing |
| Orphan sequences | 2, pre-existing |
| RLS enabled / forced tables | 322 / 326 |
| RLS policies | 328 |
| Exact row-count fingerprint | `5c207aa8606a53f58e941c5c1ac5a9e4cdfdfc39188c2fcfddde5b47771084a0` |
| Business-content fingerprint | `4f2a33fa2d2e6c0a880582dd68310dab911de754be6c204e74d33ae94e77d1b5` |
| School-scope fingerprint | `dffdbb7671de78d94e461ac229a34a8f55adf9192d082afb1537e17934c9f4ce` |
| Tenant-scope fingerprint | `5746842f744d9d607034a1fd68d9750d867f21af2191223657ac2ab163fb3834` |

The source inventory used a database-enforced read-only session. A direct Neon
endpoint was used for consistent dumps while the application continued to use
the pooled endpoint before the write freeze. Credentials were never written to
repository reports or migration scripts.

## Railway Target Assessment

| Check | Measured result |
| --- | --- |
| Service | Dedicated Railway `Postgres` service |
| PostgreSQL version | 18.4 |
| Restored database | `myshule_final` |
| Persistent volume | Ready, 5,000 MB |
| Required extensions | `pgcrypto`, `pg_trgm` |
| Source-compatible locale | `C.utf8` |
| Maximum connections | 100 |
| Runtime network | Railway private network |
| Public TCP use | Administrative migration and verification only |
| Initial target state | Empty and isolated |

PostgreSQL 18 client tools were used for the PostgreSQL 17 logical dump and
restore. The target uses `C.utf8` to preserve source-compatible text behavior.
The only extension-version difference is `pgcrypto` 1.3 on Neon versus 1.4 on
Railway; `pg_trgm` matches and no application incompatibility was found.

## Selected Strategy

The source contained only 2,717 rows across 444 tables, so logical replication
would have added risk without a useful downtime benefit. The selected strategy
was:

1. Read-only source inventory and dependency discovery.
2. Initial custom/directory archives and isolated disposable restore.
3. Automated structural, data, sequence, RLS, and tenant-scope comparison.
4. Full application build, targeted workflow tests, tenant-isolation tests, and
   `ci:full`.
5. Effective write freeze followed by a fresh directory archive.
6. Portable SQL generation and checksum verification.
7. Atomic restore into `myshule_final`, followed by `ANALYZE`.
8. Final database comparison and authenticated application smoke tests.
9. Single-writer cutover of the API and GitHub production secret.
10. Production health/readiness validation while retaining Neon for rollback.

The measured maintenance interval was approximately 25 minutes.

## Completed Gates

- [x] All production PostgreSQL readers and writers identified.
- [x] Source and target versions, extensions, locale, storage, and connectivity checked.
- [x] Source archives created outside Git with SHA-256 evidence.
- [x] Archive contents listed and restored into a disposable target.
- [x] Final write freeze established before the authoritative dump.
- [x] Final archive restored atomically into `myshule_final`.
- [x] Tables, columns, nullability, defaults, constraints, indexes, enums, views,
      functions, triggers, sequences, extensions, and RLS compared.
- [x] Exact row counts, sequence values, business-content hashes, and tenant
      ownership fingerprints compared.
- [x] Foreign-key violations and duplicate-key groups checked.
- [x] Tenant-isolation and critical application workflow tests passed.
- [x] `npm run ci:full` passed.
- [x] Production API and GitHub `PROD_DATABASE_URL` cut over together.
- [x] Health, readiness, production environment, and authenticated smoke tests passed.
- [x] Neon preserved and verified as the rollback source.
- [x] Temporary Railway SSH key and local private-key files removed.
- [x] Exposed legacy Neon credential revoked and its tracked source file removed.

## Operational Notes

Railway managed backup and point-in-time-recovery status was not exposed by the
available CLI inspection. The migration therefore does not claim that provider
PITR is enabled. Verified recovery layers are the protected final logical
archive and the intact Neon source. Provider-managed retention should be
confirmed in the Railway project settings as a separate operational control.

The readiness endpoint reported the API, PostgreSQL, Redis, BullMQ, email,
object storage, malware scanning, and production environment as ready. The sync
SLO subsystem had no current observations and therefore reported `unknown`;
there were no active or critical alerts.
