import fs from "node:fs";
import path from "node:path";

describe("storekeeper human workflow contracts", () => {
  it("uses inventory item dropdowns for stock receive and issue workflows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/storekeeper-command-center.tsx"),
      "utf8",
    );

    expect(source).toMatch(/admin-command\/storekeeper\/items/);
    expect(source).toMatch(/<select[\s\S]+name="item_id"/);
    expect(source).toMatch(/Add the first inventory item before receiving stock/);
    expect(source).toMatch(/Add the first inventory item before issuing stock/);
    expect(source).not.toMatch(/Item ID|Inventory item UUID|Select or paste the inventory item ID/);
  });
});
