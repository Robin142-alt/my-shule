import fs from "node:fs";
import path from "node:path";

describe("Exams manager command center", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/exams-manager-command-center.tsx"),
    "utf8",
  );

  it("does not mount the legacy DashboardEngine inside the new command center", () => {
    expect(source).not.toContain("@/components/dashboard/dashboard-engine");
    expect(source).not.toContain("<DashboardEngine");
  });
});
