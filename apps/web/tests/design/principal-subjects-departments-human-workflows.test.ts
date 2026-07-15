import fs from "node:fs";
import path from "node:path";

describe("principal subjects and departments human workflow controls", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/principal-dashboard/subjects-departments-workspace.tsx"),
    "utf8",
  );

  it("uses tenant-scoped staff options instead of raw HOD UUID entry", () => {
    expect(source).toMatch(/\/academics\/teachers/);
    expect(source).toMatch(/<select name="head_of_department_user_id"/);
    expect(source).toMatch(/Head of Department/);

    expect(source).not.toMatch(/HOD User ID/);
    expect(source).not.toMatch(/Optional UUID/);
    expect(source).not.toMatch(/123e4567-e89b-12d3-a456-426614174000/);
  });
});
