import fs from "node:fs";
import path from "node:path";

describe("principal staff role human workflow controls", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/principal-dashboard/staff-roles-workspace.tsx"),
    "utf8",
  );

  it("uses tenant-scoped teacher options instead of raw teacher UUID entry", () => {
    expect(source).toMatch(/\/academics\/teachers/);
    expect(source).toMatch(/<select name="teacher_user_id"/);
    expect(source).toMatch(/Teacher:/);

    expect(source).not.toMatch(/Teacher ID:/);
    expect(source).not.toMatch(/Teacher User ID \(UUID\)/);
    expect(source).not.toMatch(/123e4567-e89b-12d3-a456-426614174000/);
  });
});
