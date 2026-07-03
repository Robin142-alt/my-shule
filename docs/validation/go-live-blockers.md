# Go-Live Blockers

Generated at: 2026-07-03T06:35:30Z

Current go-live readiness estimate: 90%

Final verdict: NOT READY

## Blocking Evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Full API test suite | pass | `npm test` passed 1020/1020 API tests and 9/9 production-auth-smoke unit tests; output written to `docs/validation/api-test-output.txt`. |
| Full web design/role workflow gate | pass | `npm run web:test:design` passed 82/82 suites, 590/590 tests, and 2/2 snapshots; output written to `docs/validation/web-design-test-output.txt`. |
| Typecheck | pass | `npm run typecheck` passed after Prisma client generation; output written to `docs/validation/typecheck-output.txt`. |
| Root build | pass | `npm run build` passed after Prisma client generation; output written to `docs/validation/build-output.txt`. |
| Web production build | pass | `npm run web:build` passed; Next.js compiled 84 static pages and listed `/api/support/public/system-status` in the production route manifest. Output written to `docs/validation/web-build-output.txt`. |
| Lint | pass with warnings | `npm run lint` exited 0 with 1673 warnings and 0 errors; output written to `docs/validation/web-lint-output.txt`. |
| Release readiness gate | pass | `npm run release:readiness` passed 16/16 checks. |
| Production env audit | fail | `npm run env:production:audit` now finds 2 invalid production runtime settings and wrote `docs/validation/production-env-audit.json`; app-owned CORS, cookie, callback URL, JWT, tenant-header, report download, M-Pesa callback, and lockdown secrets are fixed in `.env.production.local`. |
| PII scan | pass | `npm run security:pii-scan` passed and wrote `docs/security/pii-leak-ci-scan.md`; command output written to `docs/validation/pii-scan-output.txt`. |
| Dependency audit | pass | `npm run security:deps` found 0 high production vulnerabilities; output written to `docs/validation/dependency-audit-output.txt`. |
| Production scorecard | fail | `npm run scorecard:production` wrote a 90/95 scorecard but failed because live provider smoke, production env audit, and hosted production auth smoke are red. |
| Provider smoke | pass | `npm run smoke:providers` passed 6 checks, failed 0, and skipped 2 optional checks; output written to `docs/validation/provider-credential-smoke-output.txt`. |
| Live provider smoke | fail | `SUPPORT_PROVIDER_SMOKE_LIVE=true npm run smoke:providers` records 6/11 passing checks in `docs/validation/provider-credential-smoke-live.json`; Resend live auth returns HTTP 401, object storage is disabled, and Redis live ping reports connection closed. |
| Hosted production auth smoke | fail | `npm run smoke:production-auth` wrote `docs/validation/production-auth-smoke.json` with 3/6 passing checks; API readiness is HTTP 503 `api_bootstrap_failed`, web auth proxy returns CSRF 403, and public system status returns 404. |
| Production auth smoke unit contract | pass | `node --test scripts/production-auth-smoke.test.mjs` passed 9/9 checks; output written to `docs/validation/production-auth-smoke-unit-output.txt`. |
| Public support status route contract | pass | `npm --prefix apps/web run test:design -- auth-route-contract --runInBand` passed 1/1 suite and 3/3 tests; output written to `docs/validation/auth-route-contract-output.txt`. |
| Production-pilot E2E | pass | `npm --prefix apps/web run test:e2e:production-pilot` passed 5/5 browser tests for secure login pages, support status, auth redirect, and password recovery safety; output written to `docs/validation/production-pilot-e2e-output.txt`. |
| Local production API startup | fail | `NODE_ENV=production node dist/apps/api/src/main.js` fails env validation only on `UPLOAD_OBJECT_STORAGE_ENABLED` and `MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL`; output written to `docs/validation/production-api-startup-output.txt`. |

## Required Before Go-Live

1. Replace or redeploy `RESEND_API_KEY` with the full active key for the account that owns the `EMAIL_FROM` sender domain; the current live smoke still gets HTTP 401 from Resend.
2. Verify the `EMAIL_FROM` domain in Resend and enable production sending for that domain.
3. Set `UPLOAD_OBJECT_STORAGE_ENABLED=true` in the real production runtime and provide working R2/S3 endpoint, bucket, region, access key, and secret. Current object-storage endpoint/access/secret values are placeholders, so this remains blocked by provider setup.
4. Set a working TLS Redis/Upstash URL for queues/cache and keep `REDIS_TLS_ENABLED=true` for external Redis; the current live ping reports `Connection is closed`.
5. Deploy the local app-owned production overrides: explicit HTTPS CORS origin, public HTTPS M-Pesa callback URL, `AUTH_COOKIE_SECURE=true`, `AUTH_COOKIE_SAME_SITE=lax`, and strong app-owned secrets.
6. Replace the Daraja `MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL` placeholder with the real encrypted production credential from Safaricom/Daraja.
7. Redeploy the API after env updates, then rerun:
   - `npm run smoke:providers`
   - `npm run env:production:audit`
   - `SUPPORT_PROVIDER_SMOKE_LIVE=true npm run smoke:providers`
   - `npm run smoke:production-auth`
   - `npm run scorecard:production`

Do not mark the system GO LIVE READY until the live provider smoke, hosted readiness endpoint, production auth smoke, and production scorecard all pass.
