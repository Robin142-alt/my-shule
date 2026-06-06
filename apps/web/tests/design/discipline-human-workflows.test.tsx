import fs from "node:fs";
import path from "node:path";

test("discipline workspace avoids internal record-id copy", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/discipline/discipline-workspace.tsx"),
    "utf8",
  );

  expect(source).not.toMatch(/Student record ID|Class record ID|Academic term ID|Academic year ID/);
  expect(source).not.toMatch(/student_id\.slice\(0,\s*8\)/);
  expect(source).toMatch(/Search learner by name or admission number/i);
});

test("discipline status actions require review confirmation before mutation", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/discipline/discipline-workspace.tsx"),
    "utf8",
  );

  expect(source).toMatch(/Confirm status change/i);
  expect(source).toMatch(/This will update the source discipline case record/i);
  expect(source).toMatch(/setPendingStatusChange\(\{ incident, status \}\)/);
  expect(source).not.toMatch(/onClick=\{\(\) => void changeStatus\(row\.id,\s*"resolved"\)\}/);
  expect(source).not.toMatch(/onClick=\{\(\) => void onChangeStatus\(incident\.id,\s*status\)\}/);
});
