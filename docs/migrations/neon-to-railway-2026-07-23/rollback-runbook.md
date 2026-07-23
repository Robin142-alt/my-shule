# Neon to Railway PostgreSQL Rollback Runbook

Date prepared: 2026-07-23

## Current Recovery Boundary

Railway PostgreSQL is the sole production database writer. Neon remains intact
as a rollback source, but it must not be made writable by the production
application while Railway is also accepting writes.

The replacement Neon URL is stored only in an ACL-protected local rollback
secret outside the repository:

`C:\Users\user\Documents\MyShule-Database-Backups\neon-to-railway-20260722T235451Z\rollback-neon-database-url.secret`

The authoritative final archive is:

`C:\Users\user\Documents\MyShule-Database-Backups\neon-to-railway-final-20260723T034108Z\neon-source-cutover2.dir`

The portable SQL recovery artifact is:

`C:\Users\user\Documents\MyShule-Database-Backups\neon-to-railway-final-20260723T034108Z\neon-source-cutover2-inserts.sql`

Never print, commit, paste, or transmit the rollback URL. Verify the protected
file ACL before using it.

## Rollback Decision

Use a forward fix when Railway is healthy and the fault is application-only.
Use rollback only for a database-level production incident that cannot be
repaired within the approved recovery window.

Before any rollback:

1. Name the incident owner and record the decision timestamp.
2. Capture the current Railway deployment and health evidence.
3. Freeze all application writers by scaling `my-shule-api` to zero.
4. Confirm no separate payments or events worker is deployed.
5. Confirm Railway has no active application writes.
6. Preserve Railway exactly as-is for reconciliation and audit.

## Path A: No Post-Cutover Writes

This path is valid only when evidence proves Railway accepted no production
writes after cutover.

1. Keep `my-shule-api` scaled to zero.
2. Read the protected Neon URL without displaying it.
3. Update Railway API `DATABASE_URL` and GitHub `PROD_DATABASE_URL` to Neon.
4. Set the corresponding SSL mode required by Neon.
5. Deploy exactly one API replica.
6. Verify `/health` and `/health/ready`.
7. Verify authentication, tenant resolution, school identity, admissions
   class sharing, and a read-only school workflow.
8. Confirm Neon is the sole application database and Railway has no writer.
9. Record the rollback completion timestamp and evidence.

No data reconciliation is required only when the no-write condition is proven.

## Path B: Railway Has Accepted Writes

Do not point the application directly back to the old Neon state.

1. Scale `my-shule-api` to zero immediately.
2. Record the last known good timestamp and the write-freeze timestamp.
3. Preserve Railway without reset, drop, truncate, cleanup, or migration.
4. Export Railway post-cutover changes into a protected review location.
5. Compare those changes against the final Neon fingerprint and archive.
6. Choose one reviewed recovery option:
   - forward-fix Railway and retain all accepted writes; or
   - reconcile Railway post-cutover writes into a recovered Neon database.
7. Re-run structural comparison, exact row counts, sequence values,
   foreign-key validation, duplicate checks, business hashes, school/tenant
   fingerprints, and authenticated workflow tests.
8. Resume exactly one database writer after review and approval.
9. Retain the non-active database and incident artifacts for audit.

## Recovery Verification

Required evidence:

- API replica count and deployment ID
- database provider identity from server-side readiness
- final archive timestamp, size, and SHA-256
- exact row-count and business-content fingerprints
- sequence-value comparison
- school and tenant ownership fingerprints
- foreign-key and duplicate-key checks
- write-freeze and recovery timestamps
- list of post-cutover writes or proof that there were none
- authentication and tenant-isolation smoke results
- health/readiness results

Known baseline fingerprints:

| Verification | Expected value |
| --- | --- |
| Total rows | 2,717 |
| Tables | 444 |
| Exact row-count fingerprint | `5c207aa8606a53f58e941c5c1ac5a9e4cdfdfc39188c2fcfddde5b47771084a0` |
| Business-content fingerprint | `4f2a33fa2d2e6c0a880582dd68310dab911de754be6c204e74d33ae94e77d1b5` |
| School-scope fingerprint | `dffdbb7671de78d94e461ac229a34a8f55adf9192d082afb1537e17934c9f4ce` |
| Tenant-scope fingerprint | `5746842f744d9d607034a1fd68d9750d867f21af2191223657ac2ab163fb3834` |

## Credential Incident Note

A legacy tracked diagnostic script contained a Neon credential. The file was
removed and the exposed Neon role credential was rotated. The old value remains
in public Git history but no longer authenticates. Do not restore or reuse the
old credential. A repository history rewrite requires separate approval and
coordination because it changes public commit history.

## Prohibited Actions

- Do not delete, suspend, reset, or empty Neon.
- Do not reset, drop, truncate, or clean Railway.
- Do not run destructive seed or migration commands.
- Do not expose connection strings in logs, commits, reports, or screenshots.
- Do not allow Neon and Railway to act as independent production writers.
- Do not use an old email, screenshot, shell history entry, or Git revision as a credential source.
