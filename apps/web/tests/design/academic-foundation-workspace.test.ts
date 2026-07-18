import fs from "node:fs";
import path from "node:path";

describe("principal and deputy academic foundation workspace", () => {
  const workspaceSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/academic-foundation-workspace.tsx"),
    "utf8",
  );
  const managerSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/academic-record-manager.tsx"),
    "utf8",
  );
  const principalSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/principal-command-center.tsx"),
    "utf8",
  );
  const deputySource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/deputy-principal-command-center.tsx"),
    "utf8",
  );

  it("exposes every school academic foundation task requested by the setup checklist", () => {
    for (const label of [
      "Academic year",
      "Current term",
      "Classes/forms/grades",
      "Streams",
      "Subjects/learning areas",
      "Class subject offerings",
      "Departments",
      "Class teachers",
      "HODs",
      "Subject teachers",
      "Curriculum configuration",
    ]) {
      expect(workspaceSource).toContain(label);
    }

    expect(workspaceSource).toContain("Create Academic Year");
    expect(workspaceSource).toContain("Create Term");
    expect(workspaceSource).toContain("Create Class / Form / Grade");
    expect(workspaceSource).toContain("Create Stream");
    expect(workspaceSource).toContain("Create Department");
    expect(workspaceSource).toContain("Create Subject / Learning Area");
    expect(workspaceSource).toContain("Assign Subject to Class");
    expect(workspaceSource).toContain("Add Calendar Period");
    expect(workspaceSource).toContain("Save HOD");
    expect(workspaceSource).toContain("Assign Class Teacher");
    expect(workspaceSource).toContain("Assign Subject Teacher");
    expect(workspaceSource).toContain("Assign academic leadership role");
    expect(workspaceSource).toContain("Create curriculum version");
    expect(workspaceSource).toContain("Grade bands and assessment rules");
  });

  it("wires forms to tenant-scoped academic API contracts and refreshes saved state", () => {
    expect(workspaceSource).toContain('useSchoolQuery<AcademicFoundationResponse>("/academics/foundation")');
    expect(workspaceSource).not.toContain('useSchoolQuery<AcademicYear[]>("/academics/academic-years")');

    for (const endpoint of [
      "/academics/years",
      "/academics/terms",
      "/academics/calendar-periods",
      "/academics/class-sections",
      "/academics/class-streams",
      "/academics/subjects",
      "/academics/class-subjects",
      "/academics/departments",
      "/academics/class-teachers",
      "/academics/teacher-assignments",
    ]) {
      expect(workspaceSource).toContain(endpoint);
    }

    expect(workspaceSource).toContain("await refreshAll()");
    expect(workspaceSource).toContain('method: "PATCH"');
    expect(managerSource).toContain('method: "PATCH"');
    expect(managerSource).toContain("/lifecycle");
    expect(managerSource).toContain("/dependencies");
    expect(managerSource).toContain("/history");
    expect(managerSource).toContain("/merge-preview");
    expect(managerSource).toContain("/reassignment-preview");
    expect(workspaceSource).toContain("bulk-lifecycle");
    expect(workspaceSource).toContain("Review impact");
    expect(workspaceSource).toContain("Most recently changed");
    expect(workspaceSource).not.toMatch(/Kisumu Boys|demo data/i);
  });

  it("renders the shared operational workspace for both leadership routes", () => {
    for (const tab of ["calendar", "classes", "subjects", "allocations"]) {
      expect(principalSource).toContain(`initialTab="${tab}"`);
    }
    expect(deputySource).toContain('<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName={schoolName} />');
    expect(deputySource).toContain('label: "Academic Foundation"');
  });
});
