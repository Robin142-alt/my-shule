import fs from "node:fs";
import path from "node:path";

describe("procurement human workflow contracts", () => {
  it("uses supplier and approved request dropdowns instead of raw UUID fields", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/procurement-officer-command-center.tsx"),
      "utf8",
    );

    expect(source).toMatch(/admin-command\/procurement-officer\/suppliers/);
    expect(source).toMatch(/admin-command\/procurement-officer\/purchase-requests/);
    expect(source).toMatch(/<select[\s\S]+name="supplier_id"/);
    expect(source).toMatch(/<select[\s\S]+name="request_id"/);
    expect(source).not.toMatch(/Supplier ID|Existing supplier UUID|Approved request ID|Optional procurement request UUID|Choose an existing supplier ID/);
  });
});
