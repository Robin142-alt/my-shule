import fs from "node:fs";
import path from "node:path";

describe("exams manager human workflow contracts", () => {
  it("uses human dropdowns instead of raw term and subject IDs in setup surfaces", () => {
    const setupSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-setup-workspace.tsx"),
      "utf8",
    );
    const classesSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-classes-workspace.tsx"),
      "utf8",
    );
    const timetableSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-timetable-workspace.tsx"),
      "utf8",
    );

    expect(setupSource).toMatch(/admin-command\/exams-manager\/options/);
    expect(setupSource).toMatch(/<select[\s\S]+name="academic_term_id"/);
    expect(setupSource).not.toMatch(/Term ID|Term UUID/);
    expect(classesSource).not.toMatch(/Subject ID/);
    expect(classesSource).toMatch(/Subject reference/);
    expect(timetableSource).toMatch(/admin-command\/exams-manager\/options/);
    expect(timetableSource).toMatch(/<select[\s\S]+name="staff_user_id"/);
    expect(timetableSource).not.toMatch(/Staff User ID|Staff user UUID/);
  });

  it("keeps active exams-manager empty states connected to the next workflow action", () => {
    const activeSetupSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager/exam-setup-workspace.tsx"),
      "utf8",
    );
    const activeMarksSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager/marks-entry-workspace.tsx"),
      "utf8",
    );

    expect(activeSetupSource).toMatch(/Create first exam cycle/);
    expect(activeSetupSource).toMatch(/onClick=\{openCreateForm\}/);
    expect(activeMarksSource).toMatch(/\/school\/exams-manager\/exam-setup/);
    expect(activeMarksSource).toMatch(/Open exam setup/);
    expect(activeMarksSource).not.toMatch(/No records found/);
  });

  it("gives exams class and subject setup an actionable fresh-school empty state", () => {
    const classesSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-classes-workspace.tsx"),
      "utf8",
    );

    expect(classesSource).toMatch(/No exam classes have been configured yet/);
    expect(classesSource).toMatch(/Create class and subject setup/);
    expect(classesSource).toMatch(/Open exam settings/);
    expect(classesSource).toMatch(/routeTo\("exam-setup"\)/);
    expect(classesSource).toMatch(/routeTo\("exam-settings"\)/);
    expect(classesSource).not.toMatch(/No classes or subjects configured yet\./);
  });

  it("wires active exam setup configuration to backend persistence", () => {
    const activeSetupSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager/exam-setup-workspace.tsx"),
      "utf8",
    );
    const apiClientSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager/api-client.ts"),
      "utf8",
    );

    expect(apiClientSource).toMatch(/exam-setup\/\$\{examId\}\/configure/);
    expect(activeSetupSource).toMatch(/configureExam/);
    expect(activeSetupSource).toMatch(/Configure exam cycle/);
    expect(activeSetupSource).toMatch(/form="exam-setup-configure-form"/);
    expect(activeSetupSource).toMatch(/onSubmit=\{handleConfigure\}/);
  });

  it("wires active exam timetable slot creation to a human form and durable API payload", () => {
    const activeTimetableSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager/exam-timetable-workspace.tsx"),
      "utf8",
    );
    const apiClientSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager/api-client.ts"),
      "utf8",
    );

    expect(apiClientSource).toMatch(/admin-command\/exams-manager\/exam-timetable/);
    expect(activeTimetableSource).toMatch(/admin-command\/exams-manager\/options/);
    expect(activeTimetableSource).toMatch(/openCreateForm/);
    expect(activeTimetableSource).toMatch(/onSubmit=\{handleAddSlot\}/);
    expect(activeTimetableSource).toMatch(/form="exam-timetable-create-form"/);
    expect(activeTimetableSource).toMatch(/name="exam_series_id"/);
    expect(activeTimetableSource).toMatch(/name="assessment_id"/);
    expect(activeTimetableSource).toMatch(/name="date"/);
    expect(activeTimetableSource).toMatch(/name="start_time"/);
    expect(activeTimetableSource).toMatch(/name="end_time"/);
    expect(activeTimetableSource).toMatch(/name="room_name"/);
    expect(activeTimetableSource).toMatch(/name="staff_user_id"/);
    expect(activeTimetableSource).toMatch(/createTimetableSlot\(\{/);
    expect(activeTimetableSource).not.toMatch(/createTimetableSlot\(\{\}\)/);
  });

  it("routes active import and export actions to real marks workflows", () => {
    const commandCenterSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/exams-manager-command-center.tsx"),
      "utf8",
    );

    expect(commandCenterSource).toMatch(/ImportsTemplatesWorkspace/);
    expect(commandCenterSource).toMatch(/setActiveView\("imports-templates"\)/);
    expect(commandCenterSource).toMatch(/openExternalImportWorkspace/);
    expect(commandCenterSource).toMatch(/requestDashboardApi(?:<[^>]+>)?\("\/admin-command\/exams-manager\/marks-entry"/);
    expect(commandCenterSource).toMatch(/downloadCsvFile/);
    expect(commandCenterSource).not.toMatch(/requestDashboardApi\("\/admin-command\/exams-manager\/import-marks"/);
    expect(commandCenterSource).not.toMatch(/requestDashboardApi\("\/admin-command\/exams-manager\/export-marks"/);
    expect(commandCenterSource).not.toMatch(/requestDashboardApi\("\/admin-command\/exams-manager\/zeraki-sync"/);
    expect(commandCenterSource).not.toMatch(/Zeraki sync requested/);
  });
});
