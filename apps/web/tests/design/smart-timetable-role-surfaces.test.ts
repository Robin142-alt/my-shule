import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("smart timetable role surfaces", () => {
  it("uses the canonical published timetable for staff role views", () => {
    const overview = source("src/components/school/staff-timetable-overview-workspace.tsx");
    const principal = source("src/components/school/principal-command-center.tsx");
    const dean = source("src/components/school/dean-academics-command-center.tsx");
    const hod = source("src/components/school/hod-command-center.tsx");
    const gradeMaster = source("src/components/school/grade-master-command-center.tsx");
    const classTeacher = source("src/lib/data/class-teacher-hooks.ts");
    const teacher = source("src/lib/modules/teacher-live.ts");

    expect(overview).toContain("/api/timetable/views?");
    expect(overview).toContain("/timetable/export/csv?");
    expect(overview).toMatch(/credentials:\s*"include"/);
    expect(overview).toMatch(/No published lessons match this view/);
    expect(principal).toContain("StaffTimetableOverviewWorkspace");
    expect(dean).toContain("StaffTimetableOverviewWorkspace");
    expect(hod).toContain("StaffTimetableOverviewWorkspace");
    expect(hod).toMatch(/timetable:\s*"timetable"/);
    expect(gradeMaster).toContain("StaffTimetableOverviewWorkspace");
    expect(gradeMaster).not.toContain("/api/grade-master/timetable");
    expect(classTeacher).toContain("timetable/views?view=class");
    expect(teacher).toContain("/timetable/my-schedule");
  });

  it("gives parents and students a linked, mobile-first published timetable", () => {
    const portal = source("src/components/school/portal-timetable-workspace.tsx");
    const portalData = source("src/lib/experiences/portal-data.ts");
    const liveRole = source("src/components/school/live-role-command-center.tsx");

    expect(portal).toContain("/api/timetable/portal");
    expect(portal).toMatch(/student_id/);
    expect(portal).toMatch(/Today|Tomorrow/);
    expect(portal).toMatch(/Happening now|Coming next/);
    expect(portal).toMatch(/No cached schedule is being shown/);
    expect(portal).toMatch(/Refresh/);
    expect(portalData).toMatch(/id:\s*"timetable"/);
    expect(liveRole).toMatch(/parent[\s\S]*timetable:\s*PortalTimetableWorkspace/);
    expect(liveRole).toMatch(/student[\s\S]*timetable:\s*PortalTimetableWorkspace/);
  });

  it("exposes role navigation without granting timetable write access", () => {
    const permissions = source("../api/src/auth/auth.constants.ts");
    const schoolData = source("src/lib/experiences/school-data.ts");

    for (const role of ["Teacher", "Class Teacher", "Grade/Form Master", "Dean of Academics"]) {
      const roleBlock = permissions.slice(permissions.indexOf(`'${role}'`));
      expect(roleBlock.slice(0, roleBlock.indexOf("],") + 2)).toContain("timetable:read");
    }
    expect(schoolData).toMatch(/"principal"[\s\S]*Master Timetable/);
    expect(schoolData).toMatch(/"deputy-principal"[\s\S]*Timetable & Relief/);
    expect(schoolData).toMatch(/"dean-academics"[\s\S]*Master Timetable/);
    expect(schoolData).toMatch(/"hod"[\s\S]*Department Timetable/);
    expect(schoolData).toMatch(/"class-teacher"[\s\S]*Class Timetable/);
  });
});
