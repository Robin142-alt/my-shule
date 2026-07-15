import fs from "node:fs";
import path from "node:path";

describe("admissions dependent workspace empty states", () => {
  const read = (fileName: string) =>
    fs.readFileSync(path.join(process.cwd(), "src/components/school/admissions", fileName), "utf8");
  const readDashboard = (fileName: string) =>
    fs.readFileSync(path.join(process.cwd(), "src/components/school/admissions-dashboard", fileName), "utf8");

  it("routes empty admissions workspaces back to the next real workflow", () => {
    const placement = read("class-placement-workspace.tsx");
    const documents = read("documents-workspace.tsx");
    const interviews = read("interviews-workspace.tsx");
    const parentLinking = read("parent-linking-workspace.tsx");
    const reports = read("reports-workspace.tsx");
    const applications = read("applications-workspace.tsx");

    for (const source of [placement, documents, interviews, parentLinking]) {
      expect(source).toMatch(/\/school\/admissions\/applications\?action=start-admission/);
      expect(source).toMatch(/Start student admission|Open applications|Review applications/);
    }

    expect(applications).toMatch(/\/school\/admissions\/applications\?action=start-admission/);
    expect(applications).toMatch(/Start student admission/);
    expect(applications).not.toMatch(/No applications found/);
    expect(reports).toMatch(/No admissions reports yet/);
    expect(reports).not.toMatch(/No school-scoped records are loaded for this workspace yet/);
  });

  it("keeps routed admissions-dashboard empty states actionable", () => {
    const startAdmissionWorkspaces = [
      "applicant-profiles-workspace.tsx",
      "documents-workspace.tsx",
      "enquiries-workspace.tsx",
      "imports-workspace.tsx",
    ];
    const reviewApplicationWorkspaces = [
      "appointments-workspace.tsx",
      "communication-workspace.tsx",
      "enrolment-workspace.tsx",
      "fee-clearance-workspace.tsx",
      "interviews-workspace.tsx",
      "parents-workspace.tsx",
      "placement-workspace.tsx",
      "reports-workspace.tsx",
      "selection-workspace.tsx",
      "tasks-workspace.tsx",
      "templates-workspace.tsx",
      "transfers-workspace.tsx",
    ];

    for (const fileName of startAdmissionWorkspaces) {
      const source = readDashboard(fileName);

      expect(source).toMatch(/AdmissionsEmptyStateCell/);
      expect(source).toMatch(/START_ADMISSION_HREF/);
      expect(source).not.toMatch(/No records found/);
    }

    for (const fileName of reviewApplicationWorkspaces) {
      const source = readDashboard(fileName);

      expect(source).toMatch(/AdmissionsEmptyStateCell/);
      expect(source).toMatch(/APPLICATIONS_HREF/);
      expect(source).not.toMatch(/No records found/);
    }
  });
});
