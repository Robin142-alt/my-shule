# Implementation 100 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the enforceable foundation for Implementation 100: system theme tokens, full module catalog coverage, and a no-half-working-modules certification gate.

**Architecture:** Keep existing Next.js and NestJS patterns. Add web design tests for the navy/orange/off-white theme, add source-level API tests for a new Implementation 100 certification script, update design tokens in `globals.css`, and expose a separately runnable `implementation100:certify` script that writes validation evidence without being added to `ci:full` until all modules pass.

**Tech Stack:** TypeScript, Next.js App Router, TailwindCSS tokens, NestJS script conventions, Node test runner, Jest design tests.

---

### Task 1: Theme Token Contract

**Files:**
- Create: `apps/web/tests/design/implementation100-theme.test.ts`
- Modify: `apps/web/src/app/globals.css`

- [x] **Step 1: Write the failing theme-token test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Implementation 100 theme tokens", () => {
  const globalsCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

  it("uses the required navy, orange, off-white, and dark text blue palette", () => {
    expect(globalsCss).toContain("--background: #f3f4f6;");
    expect(globalsCss).toContain("--foreground: #0f2345;");
    expect(globalsCss).toContain("--primary: #071d49;");
    expect(globalsCss).toContain("--primary-hover: #0b234f;");
    expect(globalsCss).toContain("--accent: #ff7a1a;");
    expect(globalsCss).toContain("--accent-hover: #e8660d;");
  });

  it("does not keep emerald as the global accent color", () => {
    expect(globalsCss).not.toContain("--accent: #059669;");
    expect(globalsCss).not.toContain("--accent-soft: #d1fae5;");
  });

  it("maps primary tokens into Tailwind theme variables", () => {
    expect(globalsCss).toContain("--color-primary: var(--primary);");
    expect(globalsCss).toContain("--color-primary-hover: var(--primary-hover);");
    expect(globalsCss).toContain("--color-primary-soft: var(--primary-soft);");
  });
});
```

- [x] **Step 2: Run the failing theme-token test**

Run: `npm --prefix apps/web run test:design -- implementation100-theme`

Expected: FAIL because the current global accent is still emerald and primary Tailwind theme variables do not exist.

- [x] **Step 3: Update global theme tokens**

Set `apps/web/src/app/globals.css` root tokens to the Implementation 100 palette:

```css
--background: #f3f4f6;
--foreground: #0f2345;
--primary: #071d49;
--primary-hover: #0b234f;
--primary-soft: rgba(7, 29, 73, 0.08);
--primary-muted: rgba(7, 29, 73, 0.14);
--accent: #ff7a1a;
--accent-hover: #e8660d;
--accent-soft: rgba(255, 122, 26, 0.12);
--accent-ghost: rgba(255, 122, 26, 0.08);
--accent-muted: rgba(255, 122, 26, 0.2);
```

Add matching `@theme inline` mappings for `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, and `--color-primary-muted`.

- [x] **Step 4: Run the theme-token test**

Run: `npm --prefix apps/web run test:design -- implementation100-theme`

Expected: PASS.

### Task 2: Full Module Catalog Contract

**Files:**
- Create: `apps/web/tests/design/implementation100-modules.test.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`

- [x] **Step 1: Write the failing module-catalog test**

```ts
import {
  defaultOnboardingModuleCodes,
  fallbackModuleCatalog,
  implementation100ModuleCodes,
} from "@/lib/module-access/module-access-map";

describe("Implementation 100 module catalog", () => {
  it("contains every required production module exactly once", () => {
    const catalogCodes = fallbackModuleCatalog.map((item) => item.code);
    expect(catalogCodes).toEqual(implementation100ModuleCodes);
    expect(new Set(catalogCodes).size).toBe(27);
  });

  it("does not enable every module by default during onboarding", () => {
    expect(defaultOnboardingModuleCodes).toEqual([
      "students",
      "admissions",
      "academics",
      "finance",
      "exams",
      "discipline",
      "communication_sms",
      "reports",
      "staff",
      "timetable",
      "admin_command_centers",
      "principal_dashboard",
    ]);
  });
});
```

- [x] **Step 2: Run the failing module-catalog test**

Run: `npm --prefix apps/web run test:design -- implementation100-modules`

Expected: FAIL because `implementation100ModuleCodes` is not exported yet.

- [x] **Step 3: Export the canonical module code list**

Add `implementation100ModuleCodes` to `apps/web/src/lib/module-access/module-access-map.ts` with the 27 module codes already represented by `SchoolModuleCode`, in the same order as `fallbackModuleCatalog`.

- [x] **Step 4: Run the module-catalog test**

Run: `npm --prefix apps/web run test:design -- implementation100-modules`

Expected: PASS.

### Task 3: No-Half-Working Modules Certification

**Files:**
- Create: `apps/api/src/scripts/implementation100-certification.ts`
- Create: `apps/api/src/scripts/implementation100-certification.test.ts`
- Modify: `package.json`

- [x] **Step 1: Write the failing certification tests**

Create tests that import `runImplementation100Certification` and verify:

```ts
assert.equal(result.module_count, 27);
assert.equal(result.ok, true);
assert.match(markdown, /No-half-working-modules certification/);
```

Also verify a missing frontend evidence file makes the matching module fail:

```ts
sourceOverrides: { ...passingSources, "apps/web/src/app/api/transport/[...path]/route.ts": "" }
```

Expected failed check id: `transport-frontend-api-proxy`.

- [x] **Step 2: Run the failing certification tests**

Run: `npm run build && node --test dist/apps/api/src/scripts/implementation100-certification.test.js`

Expected: FAIL because the certification script does not exist.

- [x] **Step 3: Implement the certification script**

Implement `implementation100-certification.ts` using the same source-level evidence pattern as `implementation30-certification.ts`:

- Export `IMPLEMENTATION100_MODULES`.
- Export `runImplementation100Certification`.
- Export `renderImplementation100CertificationMarkdown`.
- Export `writeImplementation100CertificationArtifact`.
- Export `runAndWriteImplementation100Certification`.
- Include module checks for live UI, frontend API proxy or route, backend controller, schema/persistence, tests, and report/export evidence when applicable.
- Include a `main()` function that writes `docs/validation/implementation100-certification.md` and exits non-zero when any enabled module lacks evidence.

- [x] **Step 4: Add npm script**

Add:

```json
"implementation100:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/implementation100-certification.ts"
```

Do not add it to `ci:full` until missing modules are fully implemented.

- [x] **Step 5: Run certification tests**

Run: `npm run build && node --test dist/apps/api/src/scripts/implementation100-certification.test.js`

Expected: PASS.

- [x] **Step 6: Run the live certification script**

Run: `npm run implementation100:certify`

Expected: FAIL until every Implementation 100 module has live evidence. The generated artifact must clearly list passing and failing modules.

Observed: FAIL with `ok: false` and `module_count: 27`; the artifact lists the modules that still lack live evidence.

### Task 4: Verification

**Files:**
- Modified files from Tasks 1-3.

- [x] **Step 1: Run focused web design tests**

Run: `npm --prefix apps/web run test:design -- implementation100-theme implementation100-modules module-readiness`

Expected: PASS.

- [x] **Step 2: Run focused API build and certification tests**

Run: `npm run build && node --test dist/apps/api/src/scripts/implementation100-certification.test.js`

Expected: PASS.

- [x] **Step 3: Inspect git diff**

Run: `git diff -- implementation100.md docs/superpowers/plans/2026-05-21-implementation100-foundation.md apps/web/tests/design/implementation100-theme.test.ts apps/web/tests/design/implementation100-modules.test.ts apps/web/src/app/globals.css apps/web/src/lib/module-access/module-access-map.ts apps/api/src/scripts/implementation100-certification.ts apps/api/src/scripts/implementation100-certification.test.ts package.json`

Expected: Only Implementation 100 foundation changes are present.
