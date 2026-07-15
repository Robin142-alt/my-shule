import fs from "node:fs";
import path from "node:path";

describe("librarian human workflow controls", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/librarian-command-center.tsx"),
    "utf8",
  );

  it("uses tenant-scoped circulation options instead of raw borrower, catalogue, or staff IDs", () => {
    expect(source).toMatch(/admin-command\/librarian\/circulation-options/);
    expect(source).toMatch(/<select name="borrower_id"/);
    expect(source).toMatch(/<select name="catalog_item_id"/);
    expect(source).toMatch(/<select name="staff_identifier"/);

    expect(source).not.toMatch(/Borrower ID/);
    expect(source).not.toMatch(/Catalogue item ID/);
    expect(source).not.toMatch(/Student borrower UUID/);
    expect(source).not.toMatch(/Book catalogue UUID/);
    expect(source).not.toMatch(/Staff UUID/);
    expect(source).not.toMatch(/user UUID/);
  });
});
