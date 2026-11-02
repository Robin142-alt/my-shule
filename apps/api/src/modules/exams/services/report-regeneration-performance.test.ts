import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { ReportCardGenerationService } from "./report-card-generation.service";
import { hydrateReportCardLogoForRendering } from "./report-card-logo-hydration";

test("regeneration bounds parallel work, shares chunk reads, and reports monotonic saved counts", async () => {
  const handlers = new Map<string, any>();
  const service = new ReportCardGenerationService(
    {} as never,
    {} as never,
    undefined,
    undefined,
    {
      register: (kind: string, handler: any) => handlers.set(kind, handler),
    } as never,
  );
  service.onModuleInit();
  let active = 0,
    peak = 0;
  const caches = new Set();
  service.generateStudentReportCard = async (input) => {
    active++;
    peak = Math.max(peak, active);
    caches.add(input.read_cache);
    await delay(20);
    active--;
    return { id: input.student_id };
  };
  const updates: number[] = [];
  const start = performance.now();
  const result = await handlers.get("generate_regeneration_scope")(
    {
      id: "job",
      tenant_id: "school",
      actor_user_id: "actor",
      input: {
        targets: Array.from({ length: 24 }, (_, i) => ({
          id: String(i),
          student_id: String(i),
        })),
      },
    },
    async (value: any) => {
      updates.push(value.completed_students);
    },
  );
  console.log(
    JSON.stringify({
      benchmark: "24 regeneration tasks, 20ms controlled I/O each",
      duration_ms: Math.round(performance.now() - start),
      peak,
    }),
  );
  assert.equal(result.completed_students, 24);
  assert.equal(result.failed_students, 0);
  assert.equal(peak, 4);
  assert.equal(caches.size, 1);
  assert.ok(!caches.has(undefined));
  assert.deepEqual(
    updates,
    [...updates].sort((a, b) => a - b),
  );
});

test("concurrent image hydration coalesces tenant-scoped reads within one batch", async () => {
  let reads = 0;
  const path = "tenant/school/logo.png";
  const storage = {
    readForTenant: async () => {
      reads++;
      await delay(10);
      return {
        stored_path: path,
        mime_type: "image/png",
        content: Buffer.from("image"),
      };
    },
  };
  const cache = new Map();
  await Promise.all(
    Array.from({ length: 24 }, () =>
      hydrateReportCardLogoForRendering(
        { template_fields: { school_logo_ref: path } } as never,
        "school",
        storage as never,
        true,
        cache,
      ),
    ),
  );
  assert.equal(reads, 1);
  await assert.rejects(
    hydrateReportCardLogoForRendering(
      { template_fields: { school_logo_ref: path } } as never,
      "other-school",
      storage as never,
      true,
      cache,
    ),
  );
});
