# Password validation

Password creation now uses the browser-safe contract in `apps/api/src/auth/password-policy.ts` for invitation acceptance, password reset/change, and guardian-verified parent/student setup. The API applies it before hashing or consuming a reset/invitation token. DTO length limits reference the same constants.

The policy is 10–128 Unicode code points, with an ASCII uppercase letter, lowercase letter and number. Symbols and whitespace remain supported and optional; passwords are never trimmed, rewritten or silently truncated by these forms. Reset and invitation previously checked composition only in the frontend; those requirements are now also enforced by the API. Login validation, token verification, tenant ownership and session invalidation are unchanged. Account settings already direct password changes through the recovery flow.

`NewPasswordFields` displays each requirement, corrective feedback, a local strength estimate, and live confirmation matching. Strength reflects length and variety only; it is advisory and performs no breach lookup, sends no typing telemetry, and imposes no extra acceptance rule. The existing password visibility control, autocomplete and Caps Lock warning remain available. Screen readers receive field descriptions and polite updates; status icons supplement color.

Focused checks:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/auth/password-policy.test.ts apps/api/src/auth/auth-invitation.service.test.ts apps/api/src/auth/auth-recovery.service.test.ts apps/api/src/modules/integrations/integrations.test.ts
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/password-validation.test.tsx tests/design/auth-recovery-experience.test.tsx tests/design/invitation-acceptance.test.tsx tests/design/auth.test.tsx tests/design/auth-feedback.test.tsx
npm --prefix apps/web run test:design:e2e -- password-validation.spec.ts --workers=1
```

Browser checks cover public reset aliases and invitation creation at mobile and desktop widths. Test responses are intercepted for the reset submission/retry check; no real account password is changed.

Release preparation also updates Next.js and its ESLint configuration to 16.3.8, Wrangler to 4.149.0, and the transitive source-map-js package. OpenNext for Cloudflare 1.20.9 includes the cache-key compatibility fix required by the patched Next.js release, preserving prerendered image responses. These resolve the production dependency audit findings encountered before deployment; the root and web production audits report zero vulnerabilities. The release starts from production revision `c7121246` and excludes unrelated local report-card edits.
