import fs from "node:fs";
import path from "node:path";

describe("Exams manager command center", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/exams-manager-command-center.tsx"),
    "utf8",
  );
  const handoffSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/school/exams-manager/publishing-workspace.tsx"),
    "utf8",
  );

  it("does not mount the legacy DashboardEngine inside the new command center", () => {
    expect(source).not.toContain("@/components/dashboard/dashboard-engine");
    expect(source).not.toContain("<DashboardEngine");
  });

  it("does not ship seeded exam data or old frontend-only exam mutations", () => {
    expect(source).not.toMatch(/value="(?:12|94%|6|78%|20%)"/);
    expect(source).not.toMatch(/Form 4 Mock Series|Form 2 Endterm|Class 7 CAT|Mathematics Form 4 North/);
    expect(source).not.toMatch(/useSchoolMutation\("\/api\/exams\//);
    expect(source).not.toMatch(/\/api\/exams\/(?:configuration|draft|alignment|marks|review|lifecycle)/);
  });

  it("routes every exams manager sidebar section into backend-backed workspaces", () => {
    for (const workspace of [
      "OverviewWorkspace",
      "ExamSetupWorkspace",
      "ExamTimetableWorkspace",
      "MarksEntryWorkspace",
      "ModerationWorkspace",
      "AnalysisWorkspace",
      "ReportCardsWorkspace",
      "PublishingWorkspace",
      "ReportsWorkspace",
    ]) {
      expect(source).toContain(workspace);
    }

    expect(source).toContain("canonicalizeExamsManagerView");
    expect(source).toContain('"marks-entry"');
    expect(source).toContain('"exam-setup"');
    expect(source).toContain('"exam-timetable"');
  });

  it("hands report cards to the dean without granting publication authority", () => {
    expect(source).toContain("Report Card Handoff");
    expect(handoffSource).toMatch(/only the Principal can publish approved results/);
    expect(handoffSource).toMatch(/Submit to Dean/);
    expect(handoffSource).not.toMatch(/Publish to parents|Unpublish report cards/);
  });
});
