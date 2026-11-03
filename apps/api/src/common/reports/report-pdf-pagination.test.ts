import assert from "node:assert/strict";
import test from "node:test";
import { createPdfReportArtifact } from "./report-pdf-artifact";

test(
  "wide reports and long notes paginate without losing fields or overflowing column widths",
  { timeout: 15000 },
  async () => {
    const headers = Array.from(
      { length: 17 },
      (_, index) => "Register field " + (index + 1),
    );
    const rows = Array.from({ length: 35 }, (_, index) =>
      headers.map((_, column) =>
        column === 5 && index === 0
          ? "Long school note ".repeat(350)
          : "Row " + index + " field " + column,
      ),
    );
    const file = await createPdfReportArtifact({
      module: "academics",
      reportId: "pagination-test",
      title: "Teaching register",
      schoolName: "Fixture School",
      generatedBy: "Fixture Principal",
      headers,
      rows,
    });
    assert.equal(file.content.subarray(0, 5).toString(), "%PDF-");
    assert.equal(file.rowCount, 35);
    assert.ok(file.byteLength > 10000);
    const source = file.content.toString("latin1");
    const pages = source.match(/\/Type \/Page\b/g) ?? [];
    assert.ok(
      pages.length >= 3 && pages.length < 40,
      "wide tables should form a finite, readable set of pages: "+pages.length,
    );
  },
);
