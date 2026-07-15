import fs from "node:fs";
import path from "node:path";

describe("teacher dashboard human workflow contracts", () => {
  it("does not ask teachers to type internal IDs in the active assignment and lesson-log forms", () => {
    const assignmentSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/teacher-dashboard/assignments-workspace.tsx"),
      "utf8",
    );
    const lessonLogSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/teacher-dashboard/lesson-log-workspace.tsx"),
      "utf8",
    );

    expect(assignmentSource).not.toMatch(/Class\/Stream ID|Subject ID|placeholder="UUID"/);
    expect(lessonLogSource).not.toMatch(/Class\/Stream ID|placeholder="e\.g\. uuid"/);
    expect(assignmentSource).toMatch(/<select[\s\S]+assigned class/i);
    expect(lessonLogSource).toMatch(/<select[\s\S]+Select class/i);
  });

  it("does not label a CSV timetable export as PDF in the active teacher timetable workspace", () => {
    const timetableSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/teacher-dashboard/timetable-workspace.tsx"),
      "utf8",
    );

    expect(timetableSource).not.toMatch(/Download PDF/);
    expect(timetableSource).toMatch(/Download CSV/);
    expect(timetableSource).toMatch(/Print timetable/);
  });

  it("lets teachers create store requests from the store requests workspace", () => {
    const storeRequestsSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/teacher-dashboard/store-requests-workspace.tsx"),
      "utf8",
    );

    expect(storeRequestsSource).toMatch(/method:\s*"POST"/);
    expect(storeRequestsSource).toMatch(/admin-command\/teacher\/store-requests/);
    expect(storeRequestsSource).toMatch(/Send store request/);
    expect(storeRequestsSource).toMatch(/name="item"/);
    expect(storeRequestsSource).toMatch(/name="quantity"/);
  });

  it("keeps teacher routed workspaces from rendering passive or blank empty states", () => {
    const dashboardRoot = path.join(process.cwd(), "src/components/school/teacher-dashboard");
    const sources = fs.readdirSync(dashboardRoot)
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => fs.readFileSync(path.join(dashboardRoot, file), "utf8").replace(/\s+/g, " "));
    const combined = sources.join("\n");

    expect(combined).not.toMatch(/emptyState=\{?""\}?/);
    expect(combined).not.toMatch(/No records found\./);
    expect(combined).not.toMatch(/No learners found in your class\./);
    expect(combined).not.toMatch(/No assigned classes found\./);
    expect(combined).not.toMatch(/No assessments currently running\./);
    expect(combined).not.toMatch(/emptyState="No active concerns raised by you\."/);
    expect(combined).not.toMatch(/emptyState="No messages sent recently\."/);
  });
});
