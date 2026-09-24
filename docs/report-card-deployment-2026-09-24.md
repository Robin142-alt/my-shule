# Report infrastructure deployment — 24 September 2026

Status: the API, both dedicated report workers and the promoted Vercel frontend are live. Report infrastructure was published to `main` in commit `c2b33dba4ef062179aac3539907ff2f8dd9d73fd`; all three Railway services are connected to that repository branch.

## Release targets

- Railway project: `striking-energy`, production environment.
- API deployment from `main`: `13384113-bf00-4e59-8c2a-e81da3b5ceed`.
- Interactive worker: service `93622f5e-8b1c-44fb-b6bb-d0076fcde185`, deployment `c551cdef-8049-4b97-82c0-5382bc75dab6`.
- Bulk worker: service `5abe2f0c-7bbd-476a-b77c-959937a09e36`, deployment `659915c3-8fc2-4f6f-965a-8bafafa196f8`.
- Vercel project: `my-shule-erp-web-clean`; initial promoted deployment `dpl_5r4yd8TNE5EsQicUWn6wz75geF8H`, followed by successful Git build `dpl_3sJieKCfYEcCtAnYedx1gAHyYSwd` from `main`.
- Website: https://www.myshule.online.

The release uses the tested working tree, including new report files, without uploading local environment credentials, caches, temporary outputs or the unrelated old web project configuration. Local manifests and deployment logs are under `tmp/report-*` and are not production source inputs.

## Configuration applied

The school upload provider remains Railway object storage. Dedicated `REPORT_OBJECT_STORAGE_*` credentials route new academic and temporary report paths to R2, preserving existing `UPLOAD_OBJECT_STORAGE_*` paths and credentials. The user configured the R2 variables on the API; both workers reference that service's variables rather than copying secrets into source files.

Each worker has one replica, one concurrent job, its own lane, and a maximum of two connections per database pool. The API preserves its existing five-connection pool configuration. Report workers disable unrelated event/SMS consumers; existing API event dispatch remains enabled. Both lanes use the existing private Redis connection and queue prefix.

Railway's live API rejects `railway.json`/`railway.toml` configuration paths as deprecated. The first worker deployments consequently used the Docker image's API default. This was corrected through explicit service settings: `node dist/apps/api/src/reports-worker.js`, restart `ALWAYS`, 60-second draining, five-second overlap, and no HTTP health check. Worker logs now confirm only `ReportsWorkerModule` starts. The API has explicit `node dist/apps/api/src/main.js` and `/health/ready` readiness settings. The repository JSON examples are reference values, not an automatic configuration guarantee on the current platform. See [Railway's migration guidance](https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code).

Worker bootstrap now writes logs directly. Buffering without installing the HTTP logger would otherwise retain background logs indefinitely.

Read-only preflight found PostgreSQL 18.6, a 500-connection limit and 10 active connections. Redis uses `noeviction`, RDB snapshots (`60 1`), and approximately 5 MiB of memory; AOF is disabled and no explicit maximum memory is configured. PostgreSQL remains the durable report-job authority. Monitor Redis memory and set a measured platform budget as usage grows.

## Backup and rollback

Railway rejected the volume snapshot request as `Not Authorized`. PostgreSQL custom-format logical backups were created in the current operator's private local application-data directory, with filesystem access restricted to that account and SYSTEM. The first archive contained the old default database `myshule`, not the application's active `myshule_final` database. This mismatch was discovered after the additive schema deployment. **It is not a pre-release backup of the active school database.** The corrected `myshule_final` backup completed at 06:03:07 UTC, after deployment. Both archives are readable by `pg_restore`; no restore was attempted against production.

- Active-database backup: `%LOCALAPPDATA%/MyShule/deployment-backups/report-infrastructure-20260924-myshule-final.dump`.
- Size: 3,005,483 bytes; 4,601 archive entries.
- SHA-256: `8f1d5f2dceef9ba82bcaf3a94b6b907a8ded2d4f9eeb50ca6cfa4dfea6ee3836`.
- Previous API deployment: `893b3a0b-6121-4c10-bd4e-5d56526c04de`.
- Previous Vercel deployment: `dpl_AxPSqdW5spm9d3zseFHok596Rrr2`.

Rollback requires a compatible API/UI pair and stopping the new worker consumers first. Preserve additive report tables, source triggers, objects and audit records. Do not automatically restore this backup over newer school records. The first API upload failed with a TLS `BadRecordMac` transport error before a build was created; retry produced the API deployment recorded above.

During runtime-setting verification, `serviceInstanceRedeploy` started a build from the older remote Git branch instead of reusing the uploaded API release. Cancelling it left no active API deployment. The exact tested image was restored with `deploymentRedeploy(..., usePreviousImageTag: true)`. A public health check observed a 502 during restoration and confirmed 200 again at 05:55:56 UTC. No school data restoration or rollback was performed. Future rollback/restart operations must verify the exact image/commit and preserve the active healthy deployment.

## Release checks

- Backend build and 58 targeted storage/configuration tests passed after introducing dedicated report storage; earlier report integration and frontend results are in [the engineering report](report-card-infrastructure.md).
- Vercel production build completed successfully without initially changing domain aliases.
- Live R2 PUT/GET checks passed with matching bytes, including a 5 MiB streamed file upload.
- Signed GET returned 200; unsigned S3 access returned 400; altered-tenant and expired signatures returned 403. Every connectivity object and local spool was deleted after its check.
- Account-side R2 public development URL/custom-domain settings: user confirmed both disabled before frontend promotion.
- API readiness returned 200 with PostgreSQL/Redis up and no production configuration errors; unauthenticated report-job access returned 401. The public web page returned 200.
- Worker startup logs confirm the report-only application, database/Redis connectivity, and periodic successful bulk retention sweeps. All four report tables exist in `myshule_final` with RLS enabled and forced; 31 report-source triggers are installed. A read-only runtime-role check for an unrelated tenant returned no jobs (the production job table was empty at this check).
- GitHub CodeQL passed for the infrastructure commit. Its broader CI run exposed a pre-existing dropdown focus race; a deterministic regression reproduced delayed focus moving to a hidden menu item. The follow-up cancels/guards opening focus after dismissal. The new durable report integration and worker tests are also wired into CI after installing Redis.
- Authenticated production generation/export and production-scale load tests: not yet run. No real school marks, approvals or reports were edited for these connectivity checks.

This rollout does not certify ten million new report cards per day. Real tenant acceptance, peak-load measurement, alert routing, long-term backup storage and restore drills remain operational acceptance work.
