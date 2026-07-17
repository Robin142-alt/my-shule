import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("Deputy timetable management", () => {
  const workspace = source(
    "src",
    "components",
    "school",
    "deputy-principal",
    "timetable-management-workspace.tsx",
  );

  it("renders the real timetable builder from the Deputy command center", () => {
    const commandCenter = source(
      "src",
      "components",
      "school",
      "deputy-principal-command-center.tsx",
    );

    expect(commandCenter).toContain("DeputyTimetableManagementWorkspace");
    expect(commandCenter).toMatch(/case "timetable"/);
    expect(commandCenter).toMatch(/<DeputyTimetableManagementWorkspace/);
  });

  it("uses school-created academic records instead of free-text identifiers", () => {
    expect(workspace).toContain("/api/academics/academic-years");
    expect(workspace).toContain("/api/academics/academic-terms");
    expect(workspace).toContain("/api/academics/class-sections");
    expect(workspace).toContain("/api/academics/subjects");
    expect(workspace).toContain("/api/academics/teachers");
    expect(workspace).toContain("/api/academics/teacher-assignments?limit=300");
    expect(workspace).not.toMatch(/Teacher User ID|Class section UUID|Subject UUID/);
  });

  it("wires draft CRUD, conflict-safe publication, revisions, export, and print", () => {
    expect(workspace).toContain("/api/timetable/planner");
    expect(workspace).toContain("/api/timetable/slots");
    expect(workspace).toContain("/api/timetable/versions/publish");
    expect(workspace).toContain("/api/timetable/versions/revise");
    expect(workspace).toMatch(/useSchoolMutation<TimetableSlot, SlotPayload>[\s\S]*"PATCH"/);
    expect(workspace).toMatch(/useSchoolMutation<TimetableSlot, \{ id: string \}>[\s\S]*"DELETE"/);
    expect(workspace).toContain("window.print()");
    expect(workspace).toContain("text/csv;charset=utf-8");
  });

  it("keeps published schedules immutable and preserves the real relief workflow", () => {
    expect(workspace).toMatch(/Create revision/);
    expect(workspace).toMatch(/published and locked/);
    expect(workspace).toContain("DeputyTimetableReliefWorkspace");
    expect(workspace).toMatch(/Open Academic Setup/);
  });
});
