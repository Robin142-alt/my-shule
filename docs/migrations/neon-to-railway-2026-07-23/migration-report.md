# MyShule Neon to Railway Production Migration Report

Date: 2026-07-23

## Verdict

**MIGRATION SUCCESSFUL - VERIFIED AND PRODUCTION READY**

MyShule production PostgreSQL was migrated from Neon PostgreSQL 17.10 to the
dedicated Railway PostgreSQL 18.4 service. The Railway API is healthy and is the
sole application writer. Neon remains intact as the rollback source.

This verdict is based on database catalog comparison, exact data and tenant
fingerprints, application workflow tests, full CI, authenticated production
smoke tests, and post-cutover readiness checks. It is not based only on a
successful restore command.

## Production State

| Item | Verified state |
| --- | --- |
| Application database | Railway `myshule_final` |
| Runtime connection | Railway private network |
| Production API | `my-shule-api`, healthy |
| Web application | API client; no direct database connection found |
| Separate database workers | Not deployed |
| API queue runtime | Redis and BullMQ configured |
| GitHub production database secret | Updated during cutover |
| Neon application sessions | None observed |
| Rollback source | Neon retained and re-verified |

## Method and Timeline

The source had 2,717 rows across 444 tables. A controlled logical migration was
safer and simpler than logical replication.

| Event | UTC timestamp |
| --- | --- |
| Effective write freeze and authoritative dump start | 2026-07-23 04:27:54 |
| Authoritative dump complete | 2026-07-23 04:30:32 |
| Railway API variable update | 2026-07-23 04:50:11 |
| Healthy Railway deployment | 2026-07-23 04:52:55 |
| Final independent health check | 2026-07-23 06:19:11 |

The effective maintenance interval was approximately 25 minutes. The final
archive was restored atomically into `myshule_final` and followed by `ANALYZE`.

## Protected Recovery Artifacts

Artifacts are outside the repository under:

`C:\Users\user\Documents\MyShule-Database-Backups\neon-to-railway-final-20260723T034108Z`

| Artifact | Evidence |
| --- | --- |
| `neon-source-cutover2.dir` | 445 files, 2,296,465 bytes, per-file checksum manifest and TOC |
| `neon-source-cutover2-inserts.sql` | 1,925,673 bytes, SHA-256 `1b8f96ad9530d44b89023ed6ed2ce6ab30000dca7e6a126c8bce18f097dc85ca` |
| `neon-source-final-complete.dump` | 1,916,403 bytes, SHA-256 `ee445ffdd67a9ef36d2b550c5fd7c9007c4916496d3a71e627a976953d4489b7` |
| `structural-comparison-final.json` | Final source/target catalog comparison, verified |

The authoritative archive was also restored into a disposable database before
the production restore. Archive listing, checksums, restore logs, and zero-byte
error logs were retained with the artifacts.

## Structural Verification

The final automated comparator passed.

| Catalog | Source | Railway | Result |
| --- | ---: | ---: | --- |
| User tables | 444 | 444 | Exact |
| Columns | 5,621 | 5,621 | Exact |
| Indexes | 1,327 | 1,327 | Exact |
| Non-null column constraints | 1,072 | 1,072 | Exact |
| Enum labels | 475 | 475 | Exact |
| Views | 1 | 1 | Exact |
| Application functions | 31 | 31 | Exact |
| User triggers | 139 | 139 | Exact |
| RLS policies | 328 | 328 | Exact |
| Sequences and ownership | 3 | 3 | Exact |

Additional results:

- Application-function fingerprint:
  `6e8149564c7216ef724bf81a7bc3694d2b0c9d8adbb424b99107d0ec3237f9a2`
- No invalid indexes.
- No tables without primary keys.
- No foreign-key violations on either side.
- No duplicate groups detected for protected keys.
- Exact sequence values and ownership match.
- The 11 pre-existing unvalidated constraints and two pre-existing orphan
  sequences were preserved rather than silently altered.
- There was no migration-history table on either side.

PostgreSQL 18 represents some `NOT NULL` metadata differently in
`pg_constraint`. The comparator therefore uses exact column `attnotnull`
metadata and excludes PostgreSQL 18's additional `contype='n'` catalog rows
from cross-version constraint comparison. This is a catalog compatibility
normalization, not a weakened validation.

## Data and Tenant-Isolation Verification

| Verification | Source | Railway | Result |
| --- | --- | --- | --- |
| Total rows | 2,717 | 2,717 | Exact |
| Non-empty tables | 27 | 27 | Exact |
| Row-count fingerprint | `5c207aa8606a53f58e941c5c1ac5a9e4cdfdfc39188c2fcfddde5b47771084a0` | Same | Exact |
| Business-content fingerprint | `4f2a33fa2d2e6c0a880582dd68310dab911de754be6c204e74d33ae94e77d1b5` | Same | Exact |
| School-scope fingerprint | `dffdbb7671de78d94e461ac229a34a8f55adf9192d082afb1537e17934c9f4ce` | Same | Exact |
| Tenant-scope fingerprint | `5746842f744d9d607034a1fd68d9750d867f21af2191223657ac2ab163fb3834` | Same | Exact |

The raw all-column content fingerprint differs only because application startup
updated operational `updated_at` timestamps in ten reference/auth tables.
Business fields, primary-key sets, row counts, school ownership, and tenant
ownership remain exact with no missing or extra records.

After the Neon credential rotation, the source was re-read with the replacement
credential. It still contained 444 tables, 2,717 rows, and the same business,
row-count, school-scope, and tenant-scope fingerprints.

## Application and CI Verification

- Production build passed.
- Admissions workflow tests passed: 6 of 6.
- Tenant-isolation tests passed: 13 of 13.
- `npm run ci:full` passed with exit code 0.
- Authenticated restored-application smoke passed: 13 of 13.
- Admissions and teacher workflows were included in the authenticated smoke.
- Production `/health` passed.
- Production `/health/ready` passed.
- PostgreSQL, Redis, BullMQ, email, object storage, malware scanning, and
  production environment checks reported ready.
- Environment readiness reported zero missing variables, zero invalid
  variables, and zero issues.
- No active or critical production alerts were reported.

The final deployment used application commit
`ce23dff3` (`fix admissions subject lifecycle queries`) and reached Railway
deployment success before traffic validation.

## Security and Secret Handling

- No database credentials are present in migration scripts or reports.
- A tracked legacy diagnostic script with a hardcoded Neon URL was removed.
- The exposed Neon role password was rotated after cutover.
- Authentication with the old credential now fails.
- The replacement rollback URL is in an ACL-protected file outside Git.
- The temporary Railway migration SSH key was removed from Railway.
- All four temporary local private/public key files were deleted.
- Neon remains available for rollback without being an application writer.

The revoked credential remains in public Git history. It is no longer valid.
History rewriting was intentionally not performed because it is a disruptive
repository operation requiring explicit approval and coordination.

## Compatibility and Operational Warnings

- `pgcrypto` is version 1.3 on the source and 1.4 on Railway. `pg_trgm` matches.
  No function or workflow incompatibility was found.
- Railway managed backup/PITR status could not be confirmed through the
  available CLI. Verified recovery layers are the protected logical archive and
  intact Neon source. Confirm provider-managed retention in the Railway project
  settings.
- The sync SLO subsystem reported `unknown` because there were no current
  observations; the API SLO was healthy, overall health was healthy, and there
  were no active alerts.
- A fresh Vercel CLI environment listing timed out after the earlier topology
  check found no database variable. The repository and deployment architecture
  still show the web application using the API rather than PostgreSQL directly.

## Rollback Readiness

Rollback instructions are in `rollback-runbook.md`. If Railway has accepted no
new writes, the protected Neon URL can be restored after freezing the API. If
Railway has accepted writes, the API must be frozen and those writes reconciled
before changing providers. At no point may both databases act as independent
production writers.

## Final Approval Basis

The migration passed all required go-live gates:

- complete protected source backups
- disposable restore
- atomic final restore
- structural catalog parity
- exact row and tenant-scope parity
- sequence, constraint, index, function, trigger, and RLS verification
- tenant-isolation tests
- application workflow tests
- full CI
- authenticated production smoke
- health/readiness verification
- single-writer cutover
- rollback preservation
- temporary-access cleanup
- exposed-credential revocation

The production application is therefore approved to continue on Railway
PostgreSQL.
