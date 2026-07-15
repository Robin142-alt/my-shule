import fs from "node:fs";
import path from "node:path";

describe("counsellor human workflow contracts", () => {
  it("uses school-scoped dropdowns instead of raw UUID fields for new counselling cases", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/counsellor-command-center.tsx"),
      "utf8",
    );

    expect(source).toMatch(/admin-command\/guidance-counselling\/referral-options/);
    expect(source).toMatch(/<select[\s\S]+name="student_id"/);
    expect(source).toMatch(/<select[\s\S]+name="class_id"/);
    expect(source).toMatch(/<select[\s\S]+name="academic_term_id"/);
    expect(source).toMatch(/<select[\s\S]+name="academic_year_id"/);
    expect(source).not.toMatch(/Student UUID|Class UUID|Term UUID|Academic year UUID|Optional incident UUID/);
    expect(source).not.toMatch(/Student ID|Class ID|Academic term ID|Academic year ID|Linked incident ID/);
  });
});
