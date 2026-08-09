import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(webRoot, "../..");

function readWeb(relativePath: string) {
  return fs.readFileSync(path.join(webRoot, relativePath), "utf8");
}

function readRepo(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Teacher laboratory practical requisitions", () => {
  it("wires a real teacher sidebar route to the active command center", () => {
    const commandCenter = readWeb(
      "src/components/school/teacher-command-center.tsx",
    );
    const nav = readWeb(
      "src/components/school/teacher-dashboard/nav-config.ts",
    );
    const views = readWeb("src/components/school/teacher-dashboard/types.ts");
    const routes = readWeb("src/lib/routing/experience-routes.ts");
    const schoolPages = readWeb("src/components/school/school-pages.tsx");
    const schoolData = readWeb("src/lib/experiences/school-data.ts");

    for (const source of [nav, views, routes, schoolPages, schoolData]) {
      expect(source).toContain("practical-requisitions");
    }
    expect(nav).toContain('label: "Practical Requisitions"');
    expect(commandCenter).toContain("PracticalRequisitionsWorkspace");
    expect(commandCenter).toContain('activeView === "practical-requisitions"');
  });

  it("submits the complete school lesson request to the governed labs API", () => {
    const workspace = readWeb(
      "src/components/school/teacher-dashboard/practical-requisitions-workspace.tsx",
    );
    const controller = readRepo("apps/api/src/modules/labs/labs.controller.ts");
    const service = readRepo("apps/api/src/modules/labs/labs.service.ts");

    expect(workspace).toContain('path: "/labs/practical-requests"');
    for (const field of [
      "subject",
      "class_name",
      "practical_date",
      "lesson_time",
      "practical_title",
      "learner_groups",
      "teacher_notes",
      "requested_quantity",
      "teacher_id",
      "teacher_name",
    ]) {
      expect(workspace).toContain(field);
    }
    expect(workspace).toContain("Send Practical Request");
    expect(workspace).toContain("Requesting as {teacherName}");
    expect(controller).toContain("@Post('practical-requests')");
    expect(controller).toContain("@Permissions('labs:request')");
    expect(service).toContain("lab.request.submitted");
  });

  it("keeps ordinary teacher entry simple, mobile friendly, and retry safe", () => {
    const workspace = readWeb(
      "src/components/school/teacher-dashboard/practical-requisitions-workspace.tsx",
    );

    expect(workspace).toContain("DD/MM/YYYY");
    expect(workspace).toContain("Add Another Item");
    expect(workspace).toContain("Number of Learners or Groups");
    expect(workspace).toContain("localStorage");
    expect(workspace).toContain("isPendingSync");
    expect(workspace).toContain("submission_id: draft.submission_id");
    expect(workspace).toContain("grid gap-3 md:grid-cols-2");
    expect(workspace).toContain("sticky bottom-0");
    expect(workspace).toContain('inputMode="decimal"');
    expect(workspace).not.toContain("is_assessment");
    expect(workspace).not.toContain("authorized_roles");
    expect(workspace).not.toContain("Batch Number");
    expect(workspace).not.toContain("Supplier");
    expect(workspace).not.toContain("Unit Cost");
  });
});
