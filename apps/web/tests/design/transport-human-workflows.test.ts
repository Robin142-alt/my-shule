import fs from "node:fs";
import path from "node:path";

describe("transport manager human workflow contracts", () => {
  it("uses school-scoped dropdowns for allocation and maintenance workflows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"),
      "utf8",
    );

    expect(source).toMatch(/admin-command\/transport-manager\/assignment-options/);
    expect(source).toMatch(/<select[\s\S]+name="route_id"/);
    expect(source).toMatch(/<select[\s\S]+name="student_id"/);
    expect(source).toMatch(/<select[\s\S]+name="pickup_stop_id"/);
    expect(source).toMatch(/<select[\s\S]+name="dropoff_stop_id"/);
    expect(source).toMatch(/<select[\s\S]+name="vehicle_id"/);
    expect(source).not.toMatch(/Transport Manifest ID|Route manifest UUID|Student ID|Student UUID|Pickup Stop ID|Drop-off Stop ID|Optional pickup stop UUID|Optional drop-off stop UUID|Vehicle UUID/);
  });
});
