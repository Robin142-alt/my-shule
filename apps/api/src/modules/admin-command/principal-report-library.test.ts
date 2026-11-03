import assert from "node:assert/strict";
import test from "node:test";
import { PrincipalReportLibraryService } from "./principal-report-library";

function setup(
  role = "principal",
  permissions = ["principal:read", "reports:read", "exams:read"],
  enabled = ["exams"],
) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let fileReads = 0;
  const service = new PrincipalReportLibraryService(
    {
      requireStore: () => ({
        tenant_id: "school-a",
        user_id: "principal-a",
        role,
        permissions,
        is_authenticated: true,
      }),
    } as never,
    { listCurrentTenantModules: async () => enabled } as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: sql.includes("SELECT module")
            ? [{ module: "exams", count: 1 }]
            : [],
        };
      },
      readReportArtifact: async (
        tenant: string,
        module: string,
        id: string,
      ) => {
        assert.equal(tenant, "school-a");
        assert.equal(module, "exams");
        assert.equal(id, "saved-report");
        fileReads++;
        return { content: Buffer.from("pdf") };
      },
      recordAudit: async () => undefined,
    } as never,
  );
  return { service, queries, reads: () => fileReads };
}
test("report discovery is tenant-bound and includes only enabled sources the Principal may read", async () => {
  const fixture = setup();
  await fixture.service.list({
    q: "report",
    from: "2026-01-01",
    to: "2026-11-03",
  });
  assert.ok(fixture.queries.length >= 1);
  for (const query of fixture.queries) {
    assert.equal(query.params[0], "school-a");
    assert.ok((query.params[1] as string[]).includes("exams"));
    assert.ok(!(query.params[1] as string[]).includes("finance"));
    assert.ok(
      !(query.params[1] as string[]).includes("guidance-counselling-command"),
    );
  }
});
test("report reads recheck source permission and enabled module before retrieving private files", async () => {
  const fixture = setup();
  await fixture.service.file("exams", "saved-report", true);
  assert.equal(fixture.reads(), 1);
  await assert.rejects(
    () => fixture.service.file("finance", "saved-report", true),
    /authorized|permission|available/i,
  );
  assert.equal(fixture.reads(), 1);
  const disabled = setup("owner", ["*:*"], []);
  await assert.rejects(
    () => disabled.service.file("exams", "saved-report", true),
    /authorized|permission|available/i,
  );
  assert.equal(disabled.reads(), 0);
  const teacher = setup("teacher", ["*:*"], ["exams"]);
  await assert.rejects(
    () => teacher.service.list({}),
    /leadership|principal|role/i,
  );
});
