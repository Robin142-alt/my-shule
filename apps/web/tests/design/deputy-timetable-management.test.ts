import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("Deputy smart timetable and relief management", () => {
  const workspace = source("src", "components", "school", "deputy-principal", "timetable-management-workspace.tsx");
  const schedule = source("src", "components", "school", "deputy-principal", "timetable-schedule-view.tsx");
  const setup = source("src", "components", "school", "deputy-principal", "timetable-setup-panels.tsx") + source("src", "components", "school", "deputy-principal", "subject-requirements-panel.tsx");
  const dayBuilder = source("src", "components", "school", "deputy-principal", "school-day-builder.ts");
  const relief = source("src", "components", "school", "deputy-principal", "timetable-relief-workspace.tsx");
  const proxy = source("src", "app", "api", "timetable", "[...path]", "route.ts");

  it("renders the real timetable command centre from the Deputy workspace", () => {
    const commandCenter = source("src", "components", "school", "deputy-principal-command-center.tsx");

    expect(commandCenter).toContain("DeputyTimetableManagementWorkspace");
    expect(commandCenter).toMatch(/case "timetable"/);
    expect(commandCenter).toMatch(/<DeputyTimetableManagementWorkspace/);
    expect(workspace).toContain("Timetable command centre");
    expect(workspace).toContain("Generate Timetable");
    expect(workspace).toContain("Publish Timetable");
  });

  it("consumes school academic records and allocations instead of free-text identifiers", () => {
    for (const path of [
      "/api/academics/academic-years",
      "/api/academics/academic-terms",
      "/api/academics/class-sections",
      "/api/academics/subjects",
      "/api/academics/teachers",
      "/api/academics/teacher-assignments?limit=300",
    ]) expect(workspace).toContain(path);

    expect(workspace).toContain("Open Academic Setup for allocations");
    expect(workspace).not.toMatch(/Teacher User ID|Class section UUID|Subject UUID/);
  });

  it("wires readiness, configuration, requirements, availability, and resources to canonical contracts", () => {
    expect(workspace).toContain("/api/timetable/readiness?");
    expect(workspace).toContain("/api/timetable/configuration?");
    expect(workspace).toContain("/api/timetable/requirements?");
    expect(workspace).toContain("/api/timetable/availability?");
    expect(workspace).toContain('useSchoolQuery<ResourcesResponse>("/api/timetable/resources")');
    expect(setup).toContain('"/api/timetable/configuration"');
    expect(setup).toContain('"/api/timetable/requirements"');
    expect(setup).toContain('"/api/timetable/availability"');
    expect(setup).toContain('"/api/timetable/resources"');
    expect(setup).toContain('"PATCH"');
    expect(setup).toMatch(/expected_row_version/);
    expect(setup).toContain("requirements: items.map((item)");
    expect(setup).toContain("expected_row_version: item.row_version");
    expect(setup).toContain("items: items.map(({ row_version, ...item })");
    expect(setup).toContain("Common timetable blocks");
    expect(setup).toContain("target_scope");
    expect(setup).toContain("target_ids");
    expect(setup).toContain("<SchoolDayEditor");
    expect(dayBuilder).toMatch(/break[\s\S]*lunch[\s\S]*assembly[\s\S]*games[\s\S]*clubs[\s\S]*guidance[\s\S]*class_meeting[\s\S]*religious[\s\S]*prep[\s\S]*remedial[\s\S]*activity/);
  });

  it("supports smart generation, review, scoped repair, immutable publishing, and history", () => {
    for (const path of [
      "/api/timetable/generate",
      "/api/timetable/validate",
      "/api/timetable/regenerate",
      "/api/timetable/versions/auto-fix",
      "/api/timetable/versions/copy",
      "/api/timetable/versions/publish",
      "/api/timetable/versions/revise",
      "/api/timetable/versions/history?",
      "/api/timetable/unscheduled?",
    ]) expect(workspace).toContain(path);

    expect(workspace).toContain("preserve_locked: true");
    expect(workspace).toContain('scope: "whole_school"');
    expect(workspace).toContain("confirm_scope: true");
    expect(workspace).toContain("expected_version_row_version");
    expect(workspace).toContain("acknowledge_warnings");
    expect(workspace).toContain("Publishing is blocked by server-validated hard conflicts");
    expect(workspace).toContain("The source remains immutable");
    expect(workspace).toContain("Undo");
    expect(workspace).toContain("Redo");
    expect(workspace).toContain("Save Draft");
  });

  it("uses one canonical timetable for class, teacher, resource, and master views", () => {
    expect(workspace).toContain("/api/timetable/views?");
    expect(workspace).toContain('params.set("include_draft", "true")');
    expect(workspace).not.toContain("/api/timetable/published?");
    expect(workspace).toContain('["class", "teacher", "resource", "master"]');
    expect(workspace).toContain("Previous class");
    expect(workspace).toContain("Next class");
    expect(schedule).toContain("slotDisplayName(slot, view)");
    expect(schedule).toContain("configuredDays.map");
  });

  it("provides touch-first daily cards and a progressively enhanced desktop weekly grid", () => {
    expect(schedule).toContain('className="lg:hidden"');
    expect(schedule).toContain("Previous day");
    expect(schedule).toContain("Next day");
    expect(schedule).toContain("min-h-11");
    expect(schedule).toContain("hidden overflow-x-auto");
    expect(schedule).toContain("draggable={draggable && editable && !slot.locked}");
    expect(workspace).toContain("/api/timetable/valid-slots");
    expect(workspace).toContain("/api/timetable/valid-slots/find-best");
    expect(workspace).toContain("/move");
    expect(workspace).toContain("/lock");
    expect(workspace).toContain("Find Best Slot");
  });

  it("does not report queued offline mutations as confirmed timetable state", () => {
    expect(workspace).toContain("isOfflineQueued(result)");
    expect(workspace).toContain("not yet confirmed by the timetable server");
    expect(workspace).toContain('setSaveState("queued")');
    expect(relief).toContain("Coverage is not confirmed yet");
    expect(setup).toContain("saved on this device and queued for sync");
  });

  it("keeps relief temporary, ranked, and explicitly assigned without free-text or auto-assignment", () => {
    expect(relief).toContain("/api/timetable/relief/affected?");
    expect(relief).toContain("/api/timetable/relief/candidates?");
    expect(relief).toContain('"/api/timetable/relief/assign"');
    expect(relief).toContain("substitute_teacher_id");
    expect(relief).toContain("relief_date: date");
    expect(relief).toContain("selectedLesson.slot_id");
    expect(relief).not.toContain("absent_teacher_id: absentTeacherId");
    expect(relief).toContain('type="radio"');
    expect(relief).toContain("daily_load");
    expect(relief).toContain("weekly_load");
    expect(relief).toContain("subject_qualified");
    expect(relief).toContain("The permanent timetable is never rewritten");
    expect(relief).not.toMatch(/autoAssignRelief|Auto-Assign Relief|Teacher Name[\s\S]*type="text"/);
  });

  it("downloads server-generated CSV and uses the real print preview infrastructure", () => {
    expect(workspace).toContain("/api/timetable/export/csv?");
    expect(workspace).toContain("await response.blob()");
    expect(workspace).toContain("openPrintDocument");
    expect(workspace).toContain("Preview / Print");
    expect(workspace).not.toContain("window.print()");
    expect(workspace).not.toContain("text/csv;charset=utf-8");
  });

  it("proxies PUT as well as timetable query and mutation methods", () => {
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
      expect(proxy).toContain(`export async function ${method}`);
    }
    expect(proxy).toContain('proxySchoolApiRequest(request, context, "/timetable")');
  });
});
