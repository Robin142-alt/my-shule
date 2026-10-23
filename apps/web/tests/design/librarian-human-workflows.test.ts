import fs from "node:fs";
import path from "node:path";

describe("librarian human workflow controls", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/librarian-command-center.tsx"),
    "utf8",
  );

  it("uses tenant-scoped circulation options instead of raw borrower, catalogue, or staff IDs", () => {
    const shared = fs.readFileSync(path.join(process.cwd(), "src/components/library/smart-library-shared.tsx"), "utf8");
    const workspaces = fs.readFileSync(path.join(process.cwd(), "src/components/library/smart-library-workspaces.tsx"), "utf8");
    const catalogue = fs.readFileSync(path.join(process.cwd(), "src/components/library/smart-library-catalogue.tsx"), "utf8");
    expect(source).toMatch(/admin-command\/librarian\/circulation-options/);
    expect(shared).toMatch(/borrowers\?search=/);
    expect(shared).toMatch(/Find a borrower/);
    expect(shared).toMatch(/onClick=\{\(\)=>onSelect\(p\)\}/);
    expect(workspaces).toMatch(/subject_id:borrower\?\.subject_id/);
    expect(workspaces).toMatch(/export \{ SmartCatalogue \} from "\.\/smart-library-catalogue"/);
    expect(catalogue).toMatch(/Find an existing title/);
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
