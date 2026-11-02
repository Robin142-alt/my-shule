import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AdminCommandOperationsService } from "./admin-command-operations.service";
import { ExamsManagerCommandService } from "./exams-manager-command.service";
import { ExamsService } from "../exams/exams.service";

test("saved report access preserves legacy PDF bytes, checks integrity and scopes school and module", async () => {
  const content = Buffer.from("%PDF-1.7 saved report");
  let row: any = {
    snapshot_id: "snapshot",
    format: "pdf",
    artifact: {
      filename: "report.pdf",
      content_type: "application/pdf",
      content_base64: content.toString("base64"),
      byte_length: content.length,
      checksum_sha256: createHash("sha256").update(content).digest("hex"),
    },
  };
  const service = new AdminCommandOperationsService({
    query: async (sql: string, params: unknown[]) => {
      assert.match(sql, /tenant_id\s*=\s*\$1/);
      assert.match(sql, /module\s*=\s*\$2/);
      assert.deepEqual(params, [
        "school-a",
        "exams-manager-command",
        "snapshot",
      ]);
      return { rows: row ? [row] : [] };
    },
  } as never);
  const file = await service.readReportArtifact(
    "school-a",
    "exams-manager-command",
    "snapshot",
  );
  assert.deepEqual(file.content, content);
  row.artifact.content_base64 = Buffer.from("corrupt").toString("base64");
  await assert.rejects(
    service.readReportArtifact("school-a", "exams-manager-command", "snapshot"),
    ConflictException,
  );
  row = null;
  await assert.rejects(
    service.readReportArtifact("school-a", "exams-manager-command", "snapshot"),
    NotFoundException,
  );
});

test("operations generation enqueues once without compiling data on the request thread", async () => {
  const submissions: any[] = [];
  const context = { getStore: () => ({ tenant_id: "school-a", user_id: "actor", role: "exams_manager", permissions: ["exams:read", "exams:write"] }) };
  const service = new ExamsManagerCommandService(
    context as never,
    {} as never,
    {} as never,
    new ExamsService(context as never, {} as never),
    undefined,
    {
      submit: async (...args: any[]) => {
        submissions.push(args);
        return { job_id: "job", state: "queued" };
      },
    } as never,
  );
  assert.deepEqual(
    await service.generateReport({
      title: "Operations",
      format: "pdf",
      request_id: "d348e0ae-6bf7-4467-8b82-7455624cb4aa",
    }),
    { job_id: "job", state: "queued" },
  );
  assert.equal(submissions[0][0], "generate_operations");
});

test("school-wide operations reports reject subject-only readers before reading files or queuing work", async () => {
  const context = { getStore: () => ({ tenant_id: "school-a", user_id: "teacher", role: "teacher", permissions: ["exams:read", "exams:write"] }) };
  let touched = false;
  let handler: any;
  const operations = {
    readReportArtifact: async () => { touched = true; return {}; },
    recordAudit: async () => {},
    listReportSnapshots: async () => { touched = true; return []; },
    findReportSnapshot: async () => { touched = true; return { snapshot_id: "saved" }; },
  };
  const service = new ExamsManagerCommandService(context as never, {} as never, operations as never,
    new ExamsService(context as never, {} as never), undefined, {
      submit: async () => { touched = true; return {}; },
      register: (_kind: string, callback: any) => { handler = callback; },
    } as never);
  await assert.rejects(service.readReport("saved", true), ForbiddenException);
  await assert.rejects(service.getReports(), ForbiddenException);
  await assert.rejects(service.generateReport({}), ForbiddenException);
  service.onModuleInit();
  await assert.rejects(handler({ tenant_id: "school-a", id: "saved" }, async () => {}), ForbiddenException);
  assert.equal(touched, false);
});

test("retrying a saved snapshot resumes its completion notification without rendering another file", async () => {
  const saved = { snapshot_id: "saved", title: "Operations", format: "pdf", artifact: { checksum_sha256: "checksum" }, manifest: { sections: {} } };
  const operations = new AdminCommandOperationsService({ query: async () => ({ rows: [saved] }) } as never);
  const notifications: any[] = [];
  operations.notifyRoles = async (_tenant, notification) => { notifications.push(notification); };
  const result = await operations.generateReportSnapshot({ tenantId: "school-a", module: "exams-manager-command",
    snapshotId: "saved", title: "Operations", sections: {}, targetRoles: ["exams_manager"] });
  assert.equal(result.snapshotId, "saved");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].key, "exams-manager-command-report-saved");
  assert.equal(result.artifact, saved.artifact);
});
