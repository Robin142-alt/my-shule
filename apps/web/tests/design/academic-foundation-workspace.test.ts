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
  const policyBuildersSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/academic-policy-builders.tsx"),
    "utf8",
  );
  const curriculumBuilderSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/academic-curriculum-builder.tsx"),
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
    expect(workspaceSource).toContain("Assign subjects to class and term");
    expect(workspaceSource).toContain("Select Subjects to Assign");
    expect(workspaceSource).toContain("Add Calendar Period");
    expect(workspaceSource).toContain("Save HOD");
    expect(workspaceSource).toContain("Assign Class Teacher");
    expect(workspaceSource).toContain("Assign Subject Teacher");
    expect(workspaceSource).toContain("Assign academic leadership role");
    expect(workspaceSource).toContain("Create curriculum version");
    expect(workspaceSource).toContain("Grade bands and assessment rules");
  });

  it("uses guided policy builders instead of exposing JSON configuration to school staff", () => {
    for (const label of [
      "Guided school policy setup",
      "8-4-4",
      "CBC",
      "Morning register",
      "Class teacher comment",
      "Signature lines",
    ]) {
      expect(`${workspaceSource}\n${policyBuildersSource}`).toContain(label);
    }

    expect(workspaceSource).toContain('type: "grade-bands"');
    expect(workspaceSource).toContain('type: "attendance-policy"');
    expect(workspaceSource).toContain('type: "report-card-policy"');
    expect(managerSource).toContain("<AcademicGradeBandsEditor");
    expect(managerSource).toContain("<AcademicAttendancePolicyEditor");
    expect(managerSource).toContain("<AcademicReportCardPolicyEditor");
    expect(workspaceSource).not.toContain("Grade bands and assessment rules (JSON array)");
    expect(workspaceSource).not.toContain("Register configuration (JSON)");
    expect(workspaceSource).not.toContain("Template, comments, and signatures (JSON)");
  });

  it("uses one guided curriculum builder for create and manage workflows", () => {
    for (const label of [
      "School levels and stages",
      "Pathways and programmes",
      "Tracks and specialisations",
      "Curriculum and exam frameworks",
      "Assessment and learner promotion",
      "Load {model || \"model\"} starter",
    ]) {
      expect(curriculumBuilderSource).toContain(label);
    }

    expect(workspaceSource).toContain("<AcademicCurriculumConfigurationEditor");
    expect(workspaceSource).toContain('type: "curriculum-configuration"');
    expect(managerSource).toContain("<AcademicCurriculumConfigurationEditor");
    expect(managerSource).toContain("validateAcademicCurriculumConfiguration");
    expect(workspaceSource).not.toContain("Structure (JSON)");
    expect(workspaceSource).not.toContain("Curriculum structure (JSON)");
  });

  it("wires forms to tenant-scoped academic API contracts and refreshes saved state", () => {
    expect(workspaceSource).toContain('useSchoolQuery<AcademicFoundationResponse>("/academics/foundation", {');
    expect(workspaceSource).toContain("tenantId,");
    expect(workspaceSource).toContain('refetchOnMount: "always"');
    expect(workspaceSource).toContain("refetchOnWindowFocus: true");
    expect(workspaceSource).toContain("if (result.error) throw result.error");
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
    expect(workspaceSource).toContain("bulk-dependencies");
    expect(workspaceSource).toContain("bulk-lifecycle");
    expect(workspaceSource).toContain("timeoutMs: 30_000");
    expect(workspaceSource).toContain("timeoutMs: 60_000");
    expect(workspaceSource).toContain('"/academics/class-subjects/bulk"');
    expect(workspaceSource).toContain("subject_ids: subjectIds");
    expect(workspaceSource).toContain("Select all");
    expect(workspaceSource).toContain("Clear");
    expect(workspaceSource).toContain('const assignmentType = value(data, "assignment_type") || "primary"');
    expect(workspaceSource).toContain('is_primary: assignmentType !== "supporting"');
    expect(workspaceSource).toContain('name="assignment_type" defaultValue="primary"');
    expect(workspaceSource).toContain('<option value="supporting">Supporting</option>');
    expect(workspaceSource).not.toContain('name="is_primary"');
    expect(workspaceSource).toContain("Review impact");
    expect(workspaceSource).toContain("Most recently changed");
    expect(workspaceSource).not.toMatch(/Kisumu Boys|demo data/i);
  });

  it("routes each Principal academic section to its dedicated live contract and keeps Deputy on the shared foundation", () => {
    for (const [section, component] of [
      ["academic-setup", "PrincipalAcademicSetupWorkspace"],
      ["classes-streams", "PrincipalClassesStreamsWorkspace"],
      ["subjects-departments", "PrincipalSubjectsDepartmentsWorkspace"],
      ["academics", "PrincipalAcademicsWorkspace"],
    ]) {
      expect(principalSource).toContain(`activeWorkspace === "${section}"`);
      expect(principalSource).toContain(`<${component} />`);
    }

    for (const [file, endpoint] of [
      ["academic-setup-workspace.tsx", "/admin-command/principal/academic-setup"],
      ["classes-streams-workspace.tsx", "/admin-command/principal/classes"],
      ["subjects-departments-workspace.tsx", "/admin-command/principal/subjects"],
      ["academics-workspace.tsx", "/admin-command/principal/academics"],
    ]) {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/components/school/principal-dashboard", file),
        "utf8",
      );
      expect(source).toContain(`useSchoolQuery`);
      expect(source).toContain(endpoint);
    }

    expect(deputySource).toContain('<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName={schoolName} tenantId={schoolId} />');
    expect(deputySource).toContain('label: "Academic Foundation"');
  });
});
