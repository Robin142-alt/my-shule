import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { AdminCommandOperationsService } from "./admin-command-operations.service";
import { ExamsManagerCommandService } from "./exams-manager-command.service";

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
  const service = new ExamsManagerCommandService(
    { getStore: () => ({ tenant_id: "school-a", user_id: "actor" }) } as never,
    {} as never,
    {} as never,
    undefined,
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
