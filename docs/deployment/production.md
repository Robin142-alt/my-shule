# Production Deployment

## Runtime layout

- Cloudflare `myshule-web`: Next.js web/BFF candidate, OpenNext and Workers Static Assets; Workers Paid approved and purchased by the owner on 2026-09-29 after Free CPU testing. Production cutover remains gated by the [migration acceptance record](cloudflare-migration.md).
- Railway `my-shule-api`: NestJS HTTP API; the observed production service currently also enables event dispatch and consumption.
- Railway `reports-interactive` and `reports-bulk`: existing independent report lanes.
- Railway PostgreSQL: primary system of record.
- Railway Redis: durable sessions, BullMQ transport and distributed coordination.
- Existing SMS relay, malware scanner and private R2 report storage remain in use.

Dedicated event/payment worker entrypoints below are supported scaling configurations. Do not switch off embedded consumers or create duplicate consumers until the replacement topology has been validated. The audit observed one API, PostgreSQL and Redis instance; this is not a high-availability or million-user capacity certification.

## Cloudflare web deployment

From `apps/web`, install with `npm ci`, build with `npm run build:cloudflare`, then validate the compiled runtime with `npm run preview:cloudflare` and `node cloudflare/smoke.mjs` in a second terminal. Use the public settings in `.env.example`; API/database/provider secrets stay on Railway.

`npm run deploy:cloudflare` publishes the compiled Worker and its static assets using `CLOUDFLARE_API_TOKEN`. Use the scoped deployment credential, never a global API key. The candidate is `https://myshule-web.ondurobinson.workers.dev`; setting `CLOUDFLARE_SMOKE_URL` runs the same smoke checks against it. Keep production host routes absent until the migration acceptance gates pass.

Retain the optimized build on Workers Paid. Static files bypass Worker execution where appropriate; private API/HTML/RSC and cookie-bearing responses are never shared-cacheable. Monitor CPU, requests, failures and usage; a successful deployment does not establish production capacity or a spending cap.

Set the same random server-only `GATEWAY_IDENTITY_SECRET` (at least 32 characters) on the Railway API and the encrypted GitHub `production-cloudflare` environment. CI verifies positive and negative signatures against API liveness before deploying the key with the new Worker version. Deploy API verification before signed Worker traffic. The signature authenticates browser IP metadata across proxy hops; JWT, tenant, capability and CSRF checks remain independent. Never expose this secret through `NEXT_PUBLIC_*`, committed files, logs or browser responses. For rotation, coordinate both runtimes; mismatched keys reject signed requests rather than trusting their metadata. Local preview may copy `.dev.vars.example` to ignored `.dev.vars`; its fixed example key must never be used in production.

## Environment files

1. Copy [the backend environment template](../../.env.production.example) to `.env.production`.
2. Fill in real values for:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET` or both JWT token secrets
   - `SECURITY_PII_ENCRYPTION_KEY`
   - MPESA credentials and callback settings

## Docker

Build the production image:

```bash
docker build -t my-shule:latest .
```

Run the API container:

```bash
docker run --rm -p 3000:3000 --env-file .env.production my-shule:latest
```

Run the workers from the same image:

```bash
docker run --rm --env-file .env.production my-shule:latest node dist/apps/api/src/payments-worker.js
docker run --rm --env-file .env.production my-shule:latest node dist/apps/api/src/events-worker.js
```

## Docker Compose

For a full local production-style stack:

```bash
cp .env.production.example .env.production
docker compose up --build
```

Services:

- API: `http://localhost:3000`
- Liveness: `GET /health`
- Readiness: `GET /health/ready`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Railway

Preserve the existing Railway Git/main integrations for `my-shule-api`, `reports-interactive` and `reports-bulk`. Both report lanes use `deploy/railway/reports-worker.railway.json` with their existing lane-specific variables. Preserve the separately deployed SMS relay and scanner.

For a new installation or a separately validated consumer extraction, these service configurations are available:

1. `api`
2. `payments-worker`
3. `events-worker`
4. `sms-relay`
5. `malware-scanner`

Attach the repository and correct service config to each new service. Validate queue ownership, event delivery and report processing before switching any existing process off.

### API service

- Config file: `/deploy/railway/api.railway.json`
- Build command: `npm run build`
- Start command: `node dist/apps/api/src/main.js`
- Healthcheck path: `/health/ready`

### Payments worker service

- Config file: `/deploy/railway/payments-worker.railway.json`
- Build command: `npm run build`
- Start command: `node dist/apps/api/src/payments-worker.js`

### Events worker service

- Config file: `/deploy/railway/events-worker.railway.json`
- Build command: `npm run build`
- Start command: `node dist/apps/api/src/events-worker.js`

### SMS relay service

- Config file: `/deploy/railway/sms-relay.railway.json`
- Build command: `npm run build:sms-relay`
- Start command: `node dist/server.js`
- Healthcheck path: `/health`
- Required variables:
  - `SMS_RELAY_AUTH_TOKEN`
  - `SMS_PROVIDER=africastalking`
  - `SMS_PROVIDER_API_URL`
  - `SMS_PROVIDER_API_KEY`
  - `SMS_PROVIDER_USERNAME`
  - `SMS_PROVIDER_SENDER_ID`
  - `SMS_DRY_RUN=false`

### Malware scanner service

- Config file: `/deploy/railway/malware-scanner.railway.json`
- Build command: `npm run build:malware-scanner`
- Start command: `node dist/server.js`
- Healthcheck path: `/health`
- Required variables:
  - `MALWARE_SCANNER_AUTH_TOKEN`
  - `MALWARE_SCANNER_MAX_BYTES=10485760`
  - `MALWARE_SCANNER_EICAR_TEST_ENABLED=true`

### Shared Railway variables

Set these on the API and any applicable domain worker services:

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` or both JWT token secrets
- `SECURITY_PII_ENCRYPTION_KEY`
- `MPESA_*`
- `MPESA_LEDGER_DEBIT_ACCOUNT_CODE`
- `MPESA_LEDGER_CREDIT_ACCOUNT_CODE`

The following event/payment settings apply only after dedicated consumers are healthy. They are not instructions to change the currently observed embedded production topology. Preserve existing report-lane variables.

- API:
  - `APP_RUNTIME=server`
  - `EVENTS_DISPATCHER_ENABLED=false`
  - `EVENTS_WORKER_ENABLED=false`
  - `OBSERVABILITY_SLO_BACKGROUND_ENABLED=false`
  - `SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL`
  - `SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL`
  - `SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN`
  - `SUPPORT_NOTIFICATION_SMS_RECIPIENTS`
  - `SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS=true`
  - `SUPPORT_PROVIDER_SMOKE_LIVE=true`
  - `UPLOAD_MALWARE_SCAN_PROVIDER=clamav`
  - `UPLOAD_MALWARE_SCAN_API_URL`
  - `UPLOAD_MALWARE_SCAN_HEALTH_URL`
  - `UPLOAD_MALWARE_SCAN_API_TOKEN`
  - `UPLOAD_MALWARE_SCAN_REQUIRED=true`
  - `UPLOAD_OBJECT_STORAGE_ENABLED=true`
  - `UPLOAD_OBJECT_STORAGE_PROVIDER=r2`
  - `UPLOAD_OBJECT_STORAGE_ENDPOINT`
  - `UPLOAD_OBJECT_STORAGE_BUCKET`
  - `UPLOAD_OBJECT_STORAGE_REGION=auto`
  - `UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID`
  - `UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY`
- Payments worker:
  - `APP_RUNTIME=worker`
  - `EVENTS_DISPATCHER_ENABLED=false`
  - `EVENTS_WORKER_ENABLED=false`
  - `COMMUNICATION_SMS_OUTBOX_WORKER_ENABLED=false`
  - `OBSERVABILITY_SLO_BACKGROUND_ENABLED=false`
- Events worker:
  - `APP_RUNTIME=worker`
  - `EVENTS_DISPATCHER_ENABLED=true`
  - `EVENTS_WORKER_ENABLED=true`
  - `COMMUNICATION_SMS_OUTBOX_WORKER_ENABLED=true`
  - `COMMUNICATION_SMS_OUTBOX_CONCURRENCY=5`
  - `SMS_PROVIDER_REQUEST_TIMEOUT_MS=10000`
  - `SMS_PROVIDER_ALLOWED_HOSTS` when a provider uses an approved non-default host
  - `OBSERVABILITY_SLO_BACKGROUND_ENABLED=false`

## CI/CD

The GitHub Actions workflow in [ci-cd.yml](../../.github/workflows/ci-cd.yml):

- builds on push and pull request
- runs `npm test`
- builds and tests the compiled Cloudflare runtime on pull requests;
- deploys the verified Cloudflare artifact on `main` after quality, build and integration gates, using the `production-cloudflare` environment's encrypted `CLOUDFLARE_API_TOKEN`;
- serializes Cloudflare deployments and skips an obsolete main revision;
- leaves the existing Railway Git/main deployment integrations intact.

The legacy Railway CLI matrix only runs when `DEPLOY_TARGET=railway`. That variable is unset in the audited repository, and the matrix names do not match the live topology. Do not enable it without reconciling the service inventory. Its required secrets are:
  - `RAILWAY_API_TOKEN`
  - `RAILWAY_PROJECT_ID`
  - `RAILWAY_ENVIRONMENT_NAME`

That optional CLI job copies the selected Railway config into a temporary root `railway.json` before calling `railway up`.

## Health verification

API liveness:

```bash
curl http://localhost:3000/health
```

API readiness:

```bash
curl http://localhost:3000/health/ready
```

## Release validation

Before promoting a release, run the local verification suite and the read-safe scale probes:

```bash
npm test
npm run release:readiness
npm run fixture:pilot-school
npm run load:high-volume-workflows
```

`fixture:pilot-school` refuses remote mutation unless `ALLOW_REMOTE_FIXTURE_MUTATION=true`. Keep it pointed at sandbox data unless a release manager explicitly approves a non-production remote target.

Implementation 7 provider validation:

```bash
npm run smoke:providers
npm run monitor:synthetic
npm run load:core-api
npm run perf:query-plan-review
```

Production scheduled monitoring is managed by [production-operability.yml](../../.github/workflows/production-operability.yml). Store production credentials in GitHub or Railway secrets. Use the canonical domain for web monitoring after cutover.

## Queue verification

Enqueue a test payment job:

```bash
npm run queue:payments:enqueue:test
```

Verify worker processing:

```bash
npm run queue:payments:verify:test
```
