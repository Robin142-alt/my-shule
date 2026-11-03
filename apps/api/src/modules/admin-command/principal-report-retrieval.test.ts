import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { AdminCommandOperationsService } from "./admin-command-operations.service";
import { createCsvReportArtifact } from "../../common/reports/report-csv-artifact";
import { createXlsxReportArtifact } from "../../common/reports/report-excel-artifact";
import PDFDocument from "pdfkit";

test("older immutable reports recover their existing private file by tenant, module, report and checksum", async () => {
  const content = Buffer.from("%PDF-1.4 saved report");
  const checksum = createHash("sha256").update(content).digest("hex");
  const snapshot = {
    snapshot_id: "snapshot",
    report_id: "exam-results",
    title: "Exam results",
    format: "pdf",
    artifact: {
      checksum_sha256: checksum,
      content_type: "application/pdf",
      filename: "results.pdf",
    },
  };
  let reads = 0;
  let restored = true;
  const service = new AdminCommandOperationsService(
    {
      query: async (sql: string, params: unknown[]) => {
        assert.equal(params[0], "school-a");
        if (sql.includes("FROM report_snapshots")) return { rows: [snapshot] };
        assert.match(sql, /FROM file_objects/);
        assert.ok(params.includes(checksum));
        assert.ok(params.includes("exams"));
        assert.ok(params.includes("exam-results"));
        return {
          rows: restored
            ? [
                {
                  storage_path: "tenant/school-a/reports/exams/results.pdf",
                  size_bytes: content.length,
                },
              ]
            : [],
        };
      },
    } as never,
    {
      readForTenant: async (input: Record<string, unknown>) => {
        assert.equal(input.tenantId, "school-a");
        reads++;
        return { content, size_bytes: content.length };
      },
    } as never,
  );
  const file = await service.readReportArtifact(
    "school-a",
    "exams",
    "snapshot",
  );
  assert.deepEqual(file.content, content);
  assert.equal(reads, 1);
  restored = false;
  await assert.rejects(
    () => service.readReportArtifact("school-a", "exams", "snapshot"),
    /no accessible file/i,
  );
  assert.equal(reads, 1);
});

for (const format of ["csv", "xlsx"] as const)
  test(`historical ${format} previews use the verified original cells, without querying current results`, async (t) => {
    const input = {
      reportId: "historic",
      title: "Historic results",
      filename: `historic.${format}`,
      headers: ["Admission", "Result"],
      rows: [
        ["0017", "67, recorded"],
        ["0021", "Line one\nLine two"],
      ],
    };
    const content =
      format === "csv"
        ? Buffer.from(createCsvReportArtifact(input).csv)
        : (await createXlsxReportArtifact(input)).content;
    const snapshot = {
      snapshot_id: "snapshot",
      report_id: "historic",
      title: input.title,
      format,
      created_at: "2026-06-01T08:00:00Z",
      manifest: {},
      artifact: {
        content_base64: content.toString("base64"),
        byte_length: content.length,
        checksum_sha256: createHash("sha256").update(content).digest("hex"),
      },
    };
    const service = new AdminCommandOperationsService({
      query: async (sql: string, params: unknown[]) => {
        assert.match(sql, /FROM report_snapshots/);
        assert.equal(params[0], "school-a");
        return { rows: [snapshot] };
      },
    } as never);
    const originalText = PDFDocument.prototype.text;
    const printed: string[] = [];
    t.mock.method(
      PDFDocument.prototype,
      "text",
      function (this: PDFKit.PDFDocument, ...args: any[]) {
        printed.push(String(args[0]));
        return originalText.apply(this, args as never);
      },
    );
    const preview = await service.readReportArtifact(
      "school-a",
      "exams",
      "snapshot",
      true,
    );
    assert.equal(preview.contentType, "application/pdf");
    assert.ok(
      printed.some((value) => value.includes("0017")),
      "Leading zeroes must survive preview conversion",
    );
    assert.ok(
      printed.some((value) => value.includes("67, recorded")),
      "Quoted CSV cells must stay intact",
    );
    assert.ok(printed.some((value) => value.includes("Line one")));
  });
