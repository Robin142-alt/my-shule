import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../../..");

const guardedFiles = [
  "apps/web/src/components/operational/operational-action-button.tsx",
  "apps/web/src/components/operational/operational-form-shell.tsx",
  "apps/web/src/components/operational/operational-queue.tsx",
  "apps/web/src/components/operational/operational-table.tsx",
  "apps/web/src/lib/school/school-operational-store.ts",
];

describe("false success copy guard", () => {
  it("does not claim records were sent, saved, or updated before connected workflows respond", () => {
    const source = guardedFiles
      .map((file) => readFileSync(path.join(repoRoot, file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/sent\. Related school records refreshed/i);
    expect(source).not.toMatch(/Form submitted\. Related records are being updated/i);
    expect(source).not.toMatch(/Related records have been updated/i);
    expect(source).not.toMatch(/SMS queued and related records updated/i);
    expect(source).not.toMatch(/SMS queued\. Related records/i);
  });

  it("keeps provider-dependent SMS records queued until delivery is confirmed elsewhere", () => {
    const source = readFileSync(
      path.join(repoRoot, "apps/web/src/lib/school/school-operational-store.ts"),
      "utf8",
    );

    expect(source).toMatch(/status:\s*"Queued"/);
    expect(source).not.toMatch(/status:\s*"Sent"/);
  });
});
