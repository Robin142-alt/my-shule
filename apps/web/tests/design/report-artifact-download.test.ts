import { readFileSync } from "node:fs";
import { join } from "node:path";

import { downloadBase64File } from "@/lib/dashboard/export";

describe("stored report artifact downloads", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("decodes the backend base64 bytes into the declared binary artifact", () => {
    const createObjectURL = jest.fn((_artifact: Blob) => "blob:report-artifact");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    downloadBase64File({
      filename: "security-operations.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from("%PDF", "ascii").toString("base64"),
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const artifact = createObjectURL.mock.calls[0][0] as Blob;
    expect(artifact).toBeInstanceOf(Blob);
    expect(artifact.type).toBe("application/pdf");
    expect(artifact.size).toBe(4);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report-artifact");
  });

  it("rejects malformed or missing artifact content instead of claiming success", () => {
    expect(() => downloadBase64File({ filename: "report.pdf", contentBase64: "" })).toThrow(
      /does not contain downloadable content/i,
    );
    expect(() => downloadBase64File({ filename: "report.pdf", contentBase64: "%%%" })).toThrow(
      /not valid base64/i,
    );
  });

  it("keeps ICT and Security report workspaces on real PDF generation and binary download paths", () => {
    const sources = [
      "src/components/school/ict-manager/reports-workspace.tsx",
      "src/components/school/security-officer/reports-workspace.tsx",
    ].map((path) => readFileSync(join(process.cwd(), path), "utf8"));

    for (const source of sources) {
      expect(source).toContain("downloadBase64File");
      expect(source).toContain("content_base64");
      expect(source).toContain("format: 'pdf'");
      expect(source).not.toContain("JSON.stringify(report.manifest");
    }
  });
});
