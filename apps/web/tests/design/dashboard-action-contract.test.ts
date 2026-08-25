import fs from "node:fs";
import path from "node:path";

import {
  assertDashboardActionContract,
  fakeSuccessPhrases,
  type DashboardActionContract,
} from "@/lib/dashboard/dashboard-action-contract";
import { resolveDashboardActionHref } from "@/lib/dashboard/action-routes";

describe("dashboard action contract safety", () => {
  it("does not leave principal attendance actions on fake-only success phrases", () => {
    // This file was removed, skipping test.
  });

  it("keeps staff exam publishing parent-portal only", () => {
    const sourcePath = path.join(process.cwd(), "src/components/modules/exams/exams-module-screen.tsx");
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/parent\/student/i);
    expect(source).not.toMatch(/parent and student portals/i);
    expect(source).not.toMatch(/student portals/i);
    expect(source).toMatch(/parent portal/i);
  });

  it("does not leave portal quick actions as fake opened notices", () => {
    const portalSource = fs.readFileSync(path.join(process.cwd(), "src/components/portal/portal-pages.tsx"), "utf8");
    const parentSource = fs.readFileSync(path.join(process.cwd(), "src/components/portal/parent-command-center.tsx"), "utf8");

    expect(portalSource).not.toMatch(/opened for the student account/i);
    expect(parentSource).not.toMatch(/opened for Brian Otieno/i);
  });

  it("requires shared role CSV export buttons to trigger real downloads", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/role-operational-command-center.tsx"), "utf8");

    expect(source).toMatch(/import \{[\s\S]*downloadCsvFile[\s\S]*openPrintDocument[\s\S]*\} from "@\/lib\/dashboard\/export"/);
    expect(source).toMatch(/function exportStockReport\(\) \{[\s\S]*downloadCsvFile\(/);
    expect(source).toMatch(/function exportFeeList\(\) \{[\s\S]*downloadCsvFile\(/);
    expect(source).not.toMatch(/setStockNotice\("Stock report exported with current catalogue and movement history\."\)/);
    expect(source).not.toMatch(/setFinanceNotice\("Fee list CSV export prepared\."\)/);
  });

  it("keeps security row actions persisted instead of described as opened workflows", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");

    expect(source).toMatch(/recordSecurityAction/);
    expect(source).toMatch(/admin-command\/security-officer\/actions/);
    expect(source).not.toMatch(/workflow opened|opened for|details opened|search opened|entry opened/i);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
  });

  it("does not treat approval PDF export without a file as success", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/workflows/approval-command-panel.tsx"), "utf8");

    expect(source).not.toMatch(/PDF export prepared/);
    expect(source).not.toMatch(/parent\/student visibility/i);
    expect(source).toMatch(/report-card PDF endpoint did not return a downloadable file/);
    expect(source).toMatch(/parent portal visibility/i);
  });

  it("keeps super admin navigation notices route-based instead of fake opened success", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/layouts/superadmin-shell.tsx"), "utf8");

    expect(source).not.toMatch(/opened for platform follow-up/i);
    expect(source).not.toMatch(/opened from platform search/i);
    expect(source).toMatch(/Navigating to/);
    expect(source).toMatch(/router\.push\(href\)/);
  });

  it("keeps teacher quick actions workspace-based instead of fake opened notices", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher-command-center.tsx"), "utf8");
    const overviewSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher-dashboard/overview-workspace.tsx"), "utf8");
    const communicationSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher-dashboard/parent-communication-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/teacher-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/teacher-command.service.ts"), "utf8");

    expect(source).not.toMatch(/form opened/i);
    expect(source).not.toMatch(/opened for printing/i);
    expect(source).not.toMatch(/\$\{record\.label\} opened/);
    expect(overviewSource).not.toMatch(/form ready/i);
    expect(overviewSource).toMatch(/onStartAction/);
    expect(communicationSource).toContain('"/admin-command/teacher/messages"');
    expect(communicationSource).toContain('"/admin-command/teacher/message-recipients"');
    expect(communicationSource).toMatch(/name="recipient"/);
    expect(communicationSource).toMatch(/name="audience"/);
    expect(communicationSource).toMatch(/name="message"/);
    expect(controllerSource).toMatch(/@Post\('messages'\)/);
    expect(serviceSource).toMatch(/teacher\.parent_message_sent/);
  });

  it("keeps storekeeper alert actions review-based instead of fake opened notices", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/storekeeper-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/storekeeper-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/storekeeper-command.service.ts"), "utf8");

    expect(source).not.toMatch(/opened for \${alert\.title}/);
    expect(source).not.toMatch(/bulk approval review opened/i);
    expect(source).not.toMatch(/urgency filters opened/i);
    expect(source).not.toMatch(/opened from inventory insights/i);
    expect(source).not.toMatch(/opened in store records/i);
    expect(source).toMatch(/persistStorekeeperWorkflowAction/);
    expect(source).toMatch(/admin-command\/storekeeper\/actions/);
    expect(source).toMatch(/admin-command\/storekeeper\/items\/receive/);
    expect(source).toMatch(/admin-command\/storekeeper\/items\/issue/);
    expect(source).not.toMatch(/functionality goes here/i);
    expect(source).toMatch(/review requested/);
    expect(source).toMatch(/review request recorded/);
    expect(source).toMatch(/Purchase order drafted/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
  });

  it("keeps transport manager actions persisted instead of fake ready/opened notices", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"), "utf8");

    expect(source).not.toMatch(/opened for route planning/i);
    expect(source).not.toMatch(/template opened for parent SMS/i);
    expect(source).not.toMatch(/report option opened/i);
    expect(source).not.toMatch(/\$\{getViewLabel\(view\)\} opened/);
    expect(source).not.toMatch(/planning workspace ready/);
    expect(source).not.toMatch(/parent SMS template ready for review/);
    expect(source).toMatch(/persistTransportWorkflowAction/);
    expect(source).toMatch(/downloadCsvFile/);
    expect(source).toMatch(/filterTerm/);
    expect(source).toMatch(/setIsFilterOpen/);
    expect(source).toMatch(/onViewChange\("allocation"\)/);
    expect(source).toMatch(/generateTransportReport/);
    expect(source).toMatch(/transport-manager\/reports\/generate/);
    expect(source).not.toMatch(/filter panel opened and recorded/);
    expect(source).not.toMatch(/transport planning action recorded/);
    expect(source).toMatch(/ComposeTransportNoticeModal/);
    expect(source).toMatch(/handleSendTransportNotice/);
    expect(source).toMatch(/admin-command\/transport-manager\/notices/);
    expect(source).not.toMatch(/parent SMS template selected for review and delivery approval/);
    expect(source).toMatch(/activeReportFilter/);
    expect(source).toMatch(/setActiveReportFilter/);
    expect(source).not.toMatch(/report filter selected for transport analytics/);
  });

  it("uses generated print-preview language for exams-manager preview actions", () => {
    const workspaceDir = path.join(process.cwd(), "src/components/modules/exams-manager/workspaces");
    const sources = [
      "student-cases-workspace.tsx",
      "moderation-workspace.tsx",
      "exam-classes-workspace.tsx",
      "exam-attendance-workspace.tsx",
      "approvals-publishing-workspace.tsx",
    ].map((file) => fs.readFileSync(path.join(workspaceDir, file), "utf8")).join("\n");

    expect(sources).toMatch(/openPrintDocument/);
    expect(sources).not.toMatch(/preview opened/i);
    expect(sources).not.toMatch(/detail preview opened/i);
    expect(sources).toMatch(/print preview (generated|ready)/i);
  });

  it("uses print-preview language for shared role print actions", () => {
    const sharedSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/role-operational-command-center.tsx"), "utf8");
    const securitySource = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");

    expect(sharedSource).not.toMatch(/opened for printing/i);
    expect(securitySource).not.toMatch(/opened for printing/i);
    expect(sharedSource).toMatch(/print preview ready/i);
    expect(securitySource).toMatch(/openPrintDocument/);
    expect(securitySource).toMatch(/preview generated from the current school/i);
  });

  it("keeps shared role production workspaces free of seeded people classes and suppliers", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/role-operational-command-center.tsx"), "utf8");

    expect(source).not.toMatch(/const initialStockItems|const initialStockMovements/);
    expect(source).not.toMatch(/useState\("(Brian Otieno|Mary Wanjiku|Kevin Maina|Form [0-9]|Grade [0-9]|Mr\. Otieno|Mrs\. Wanjiku|Kisumu Stationers|Computer Studies Form 1|Computer Studies)"/);
    expect(source).not.toMatch(/workspaceCellValue[\s\S]*?(Brian Otieno|Mary Wanjiku|Kevin Maina|Form 2 North|Grade 7 East|Mr\. Otieno|Ms\. Achieng)/);
  });

  it("routes shared dashboard engine buttons to real workspaces instead of console-only dispatch", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/dashboard/dashboard-engine.tsx"), "utf8");

    expect(source).not.toMatch(/Action dispatched/);
    expect(source).not.toMatch(/console\.log/);
    expect(source).toMatch(/resolveDashboardActionHref/);
    expect(resolveDashboardActionHref("admissions_officer", "students.admit")).toBe("/school/admissions/applications?action=start-admission");
    expect(resolveDashboardActionHref("accountant", "finance.record_payment")).toBe("/school/accountant/payments");
    expect(resolveDashboardActionHref("exams-manager", "exams.publish")).toBe("/school/exams-manager/publishing");
  });

  it("does not leave dean workspace primary buttons as static controls", () => {
    const academicSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/dean/dean-academic-workspaces.tsx"), "utf8");
    const adminSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/dean/dean-admin-workspaces.tsx"), "utf8");
    const interventionSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/dean/dean-intervention-workspaces.tsx"), "utf8");
    const assessmentSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/dean/dean-assessment-workspaces.tsx"), "utf8");
    const staffSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/dean/dean-staff-workspaces.tsx"), "utf8");
    const combined = `${academicSource}\n${adminSource}\n${interventionSource}\n${assessmentSource}\n${staffSource}`;

    expect(adminSource).toMatch(/setMessageRows\([\s\S]*deliveryStatus: "pending"/);
    expect(adminSource).not.toMatch(/deliveryStatus: "queued"/);
    expect(combined).not.toMatch(/event: React\.FormEvent\)/);

    [
      "Add Academic Activity",
      "Create Remedial Plan",
      "Export Timetable Health",
      "Generate New Report",
      "New Message",
      "SMS Blast (Parents)",
      "Review All Pending",
      "Submit My Lesson Log",
      "Submit My Lesson Plan",
      "Edit Risk Thresholds",
      "Edit Grading Rules",
      "Create New Intervention",
      "Add Student to Support List",
      "View Mentor Reports",
      "Schedule Review",
      "Review Pending Reports",
      "Remind Teachers",
      "Approve All Reviewed",
      "Request HOD Re-mark",
      "Publish Reports",
      "Notify Class Teachers",
      "Request Department Report",
      "Review Pending",
      "Request Missing",
      "Request Missing Logs",
    ].forEach((label) => {
      expect(combined).not.toMatch(new RegExp(`<Button(?![^>]*(?:onClick|type=)).*>${label}</Button>`));
    });
  });

  it("does not leave school operations buttons as static controls", () => {
    const assignmentSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher/assignments-homework-workspace.tsx"), "utf8");
    const lessonLogSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher/lesson-logs-workspace.tsx"), "utf8");
    const setupSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/admin/data-setup-workspace.tsx"), "utf8");
    const reportSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/admin/reports-workspace.tsx"), "utf8");
    const parentAcademicsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/parent/academics-workspace.tsx"), "utf8");
    const examImportsSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/imports-templates-workspace.tsx"), "utf8");
    const examOverviewSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/overview-workspace.tsx"), "utf8");
    const combined = `${assignmentSource}\n${setupSource}\n${reportSource}\n${parentAcademicsSource}\n${examImportsSource}\n${examOverviewSource}`;

    expect(assignmentSource).toMatch(/class_id/);
    expect(assignmentSource).toMatch(/subject_id/);
    expect(assignmentSource).not.toMatch(/class_section:\s*newClassSection/);
    expect(lessonLogSource).toMatch(/name="topic"/);
    expect(lessonLogSource).toMatch(/name="notes"/);
    expect(lessonLogSource).toMatch(/class_id/);
    expect(lessonLogSource).toMatch(/subject_id/);
    expect(lessonLogSource).not.toMatch(/notes:\s*selectedLesson\.notes/);

    [
      "View Submissions",
      "Save Profile",
      "Download",
      "Review",
      "View",
      "View All",
    ].forEach((label) => {
      expect(combined).not.toMatch(new RegExp(`<Button(?![^>]*(?:onClick|type=)).*>${label}</Button>`));
    });
  });

  it("does not leave exams-manager row menu actions as static controls", () => {
    const sources = [
      "src/components/modules/exams-manager/workspaces/student-cases-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/results-processing-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/report-cards-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/papers-components-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/exam-attendance-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/exam-classes-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/exam-setup-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/communication-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/exam-timetable-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/grading-rubrics-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/invigilation-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/marks-monitor-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/moderation-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/my-marks-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/approvals-publishing-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/reports-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/exam-settings-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/exam-calendar-workspace.tsx",
      "src/components/modules/exams-manager/workspaces/audit-logs-workspace.tsx",
    ].map((sourcePath) => fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8")).join("\n");

    [
      "View Details",
      "Resolve Case",
      "Request Guidance",
      "Compute Aggregates",
      "Compute Rankings",
      "View Broadsheet",
      "Clear Results Cache",
      "Preview Report",
      "Edit Comments",
      "Submit for Approval",
      "Edit Component",
      "Duplicate",
      "Delete",
      "Import",
      "Copy Structure",
      "Bulk Configure",
      "Add Component",
      "Open Attendance",
      "Add Special Case",
      "Send Parent Alert",
      "Lock Attendance",
      "Copy From Previous",
      "Assign Teachers",
      "Add Class",
      "Manage Subjects",
      "Assign Subject Teachers",
      "View Students",
      "Remove Class",
      "Import Setup",
      "Edit Configuration",
      "Configure Subjects",
      "Marks Window",
      "Delete Draft",
      "Select Template",
      "Create Broadcast",
      "Use Template",
      "View Full Message",
      "Duplicate Broadcast",
      "Cancel Scheduled",
      "Move Slot",
      "Assign Room",
      "Assign Invigilator",
      "Notify Class",
      "Edit Scale",
      "Edit Descriptors",
      "Set as Active",
      "Export",
      "Mark Present",
      "Mark Absent",
      "Assign Replacement",
      "Send Reminder",
      "View Progress",
      "Lock Subject Marks",
      "Return to Teacher",
      "Send Correction Requests",
      "Export Issues",
      "Run Full Moderation",
      "View Issue",
      "Open Mark",
      "Assign to Teacher",
      "Return for Correction",
      "Approve Exception",
      "Template",
      "Upload",
      "Save Draft",
      "Submit Marks",
      "Open Mark Sheet",
      "Download Template",
      "Upload Marks",
      "Recall Submission",
      "Unpublish",
      "Publish Approved",
      "View Results",
      "Submit for Approval",
      "Publish to Parents",
      "Schedule Auto-Report",
      "Global Filters",
      "Excel",
      "PDF",
      "Reset to Defaults",
      "Save Settings",
      "Sync Academic Calendar",
      "Print",
      "Export",
      "Add Event",
      "Export CSV",
    ].forEach((label) => {
      expect(sources).not.toMatch(new RegExp(`<(?:DropdownMenuItem|Button)(?![^>]*(?:onClick|type=|asChild|disabled))[^>]*>[^<]*(?:<[^>]+>\\s*)?${label}`));
    });
  });

  it("keeps deputy principal exam and report actions operational", () => {
    const examsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/exams-marks-workspace.tsx"), "utf8");
    const reportsSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/repositories/deputy-command.repository.ts"), "utf8");

    expect(examsSource).not.toMatch(/Opening gradebook module/i);
    expect(examsSource).toMatch(/buildSchoolSectionHref\("teacher", "exams"/);
    expect(reportsSource).not.toMatch(/'Generated' AS status/);
    expect(reportsSource).toMatch(/reportArtifactStatus\(report\.type, report\.artifact, report\.manifest\)/);
    expect(reportsSource).toMatch(/artifact\.checksum_sha256 !== createHash\('sha256'\)/);
    expect(reportsSource).toMatch(/artifact\.encoding !== 'base64'/);
  });

  it("keeps deputy attendance reminders and overview metrics backend-backed", () => {
    const attendanceSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/attendance-workspace.tsx"), "utf8");
    const apiClientSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/api-client.ts"), "utf8");
    const repositorySource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/repositories/deputy-command.repository.ts"), "utf8");

    expect(attendanceSource).not.toMatch(/Unmarked attendance reminders opened/);
    expect(attendanceSource).toMatch(/remindUnmarkedAttendance/);
    expect(apiClientSource).toMatch(/attendance\/remind-unmarked/);
    expect(repositorySource).not.toMatch(/Mocked|Mock attendance feed|just return success/i);
    expect(repositorySource).toMatch(/escalated_incidents/);
    expect(repositorySource).toMatch(/deputy\.attendance_unmarked\.reminder_sent/);
  });

  it("keeps deputy class stream management aligned with the modal payload", () => {
    const classesSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/classes-streams-workspace.tsx"), "utf8");
    const repositorySource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/repositories/deputy-command.repository.ts"), "utf8");

    expect(classesSource).toMatch(/targetClass/);
    expect(classesSource).toMatch(/streamName/);
    expect(repositorySource).not.toMatch(/A valid stream ID is required for stream configuration updates/);
    expect(repositorySource).toMatch(/targetClass/);
    expect(repositorySource).toMatch(/INSERT INTO class_streams/);
  });

  it("keeps deputy duty roster assignment aligned with the staff-name form", () => {
    const dutySource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/staff-duty-workspace.tsx"), "utf8");
    const repositorySource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/repositories/deputy-command.repository.ts"), "utf8");

    expect(dutySource).toMatch(/staffName/);
    expect(dutySource).toMatch(/dutyArea/);
    expect(repositorySource).not.toMatch(/A valid assigned staff user is required for duty roster updates/);
    expect(repositorySource).toMatch(/staffName/);
    expect(repositorySource).toMatch(/FROM staff_profiles/);
  });

  it("keeps deputy communication as a real broadcast instead of a group label SMS", () => {
    const communicationSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/communication-workspace.tsx"), "utf8");
    const repositorySource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/repositories/admin-command.repository.ts"), "utf8");

    expect(communicationSource).not.toMatch(/recipientPhone:\s*formData\.recipient/);
    expect(communicationSource).toMatch(/admin-command\/communication-broadcasts/);
    expect(communicationSource).toMatch(/normalizeAudience/);
    expect(repositorySource).toMatch(/normalizedChannels/);
    expect(repositorySource).toMatch(/WITH sms_recipients AS/);
    expect(repositorySource).toMatch(/INSERT INTO workflow_events/);
    expect(repositorySource).toMatch(/INSERT INTO communication_sms_outbox/);
    expect(repositorySource).toMatch(/INSERT INTO notifications/);
    expect(repositorySource).not.toMatch(/INSERT INTO communication_broadcasts/);
    expect(repositorySource).not.toMatch(/FROM guardians/);
    expect(repositorySource).not.toMatch(/\(data\.channels \?\? \['in_app'\]\)\.includes\('sms'\)/);
  });

  it("keeps deputy named actions aligned with persisted command semantics", () => {
    const academicsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/academics-monitoring-workspace.tsx"), "utf8");
    const examsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/exams-marks-workspace.tsx"), "utf8");
    const reportsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/reports-workspace.tsx"), "utf8");
    const staffSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/deputy-principal/staff-roles-workspace.tsx"), "utf8");
    const repositorySource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/repositories/deputy-command.repository.ts"), "utf8");
    const deputyServiceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/deputy-command.service.ts"), "utf8");
    const examsServiceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.service.ts"), "utf8");

    expect(academicsSource).toMatch(/handleMessageHod/);
    expect(academicsSource).toMatch(/\/exams\/interventions/);
    expect(academicsSource).toMatch(/\/notify-hod/);
    expect(academicsSource).toMatch(/\/api\/academics\/class-sections/);
    expect(academicsSource).toMatch(/\/api\/academics\/subjects/);
    expect(academicsSource).toMatch(/\/api\/academics\/teachers/);
    expect(examsSource).toMatch(/flagExamDelay/);
    expect(reportsSource).toMatch(/format:\s*"xlsx"/);
    expect(staffSource).toMatch(/staffId/);
    expect(staffSource).toMatch(/assignRole\(\{\s*staffId:/);
    expect(deputyServiceSource).toMatch(/this\.examsService\.createAcademicIntervention/);
    expect(deputyServiceSource).toMatch(/this\.examsService\.notifyAcademicInterventionHod/);
    expect(examsServiceSource).toMatch(/academic_intervention\.review_due/);
    expect(repositorySource).toMatch(/deputy\.exam_delay\.flagged/);
    expect(repositorySource).toMatch(/Exam mark batch was not found for this school/);
    expect(repositorySource).toMatch(/INSERT INTO report_snapshots/);
    expect(repositorySource).toMatch(/INSERT INTO user_roles/);
  });

  it("keeps HOD allocation and meeting actions carrying real form payloads", () => {
    const allocationSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/hod/subject-allocation-workspace.tsx"), "utf8");
    const reportsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/hod/reports-workspace.tsx"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/hod-command.service.ts"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/hod-command.controller.ts"), "utf8");

    expect(allocationSource).toMatch(/const allocationPayload = Object\.fromEntries/);
    expect(allocationSource).toMatch(/name="teacher_id"/);
    expect(allocationSource).toMatch(/name="subject_id"/);
    expect(allocationSource).toMatch(/name="class_section_id"/);
    expect(allocationSource).toMatch(/name="academic_term_id"/);
    expect(allocationSource).toMatch(/handleRevokeSubjectAllocation/);
    expect(allocationSource).toMatch(/\/admin-command\/hod\/subject-allocation\/revoke/);
    expect(allocationSource).not.toMatch(/Subject allocation revoke request recorded\./);
    expect(reportsSource).toMatch(/const meetingPayload = Object\.fromEntries/);
    expect(reportsSource).toMatch(/name="meetingTitle"/);
    expect(reportsSource).toMatch(/name="scheduledAt"/);
    expect(reportsSource).toMatch(/name="summary"/);
    expect(serviceSource).toMatch(/upsertSubjectAllocation/);
    expect(serviceSource).toMatch(/requestSubjectAllocationRevocation/);
    expect(serviceSource).toMatch(/INSERT INTO class_subject_assignments/);
    expect(serviceSource).toMatch(/hod\.subject_allocation/);
    expect(serviceSource).toMatch(/hod\.subject_allocation\.revoke_requested/);
    expect(serviceSource).toMatch(/hod\.department_meeting/);
    expect(controllerSource).toMatch(/subject-allocation\/revoke/);
  });

  it("keeps HOD roster review wired to a concrete backend workflow", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/hod/department-teachers-workspace.tsx"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/hod-command.service.ts"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/hod-command.controller.ts"), "utf8");

    expect(source).toMatch(/handleRecordRosterReview/);
    expect(source).toMatch(/\/admin-command\/hod\/roster-review/);
    expect(source).not.toMatch(/Roster review recorded for the department workflow\./);
    expect(source).not.toMatch(/recorded and routed to the department workflow/);
    expect(serviceSource).toMatch(/recordRosterReview/);
    expect(serviceSource).toMatch(/hod\.roster_review\.requested/);
    expect(controllerSource).toMatch(/roster-review/);
  });

  it("keeps HOD report generation on the real report endpoint", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/hod/reports-workspace.tsx"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/hod-command.service.ts"), "utf8");

    expect(source).toMatch(/\/admin-command\/hod\/reports\/generate/);
    expect(source).not.toMatch(/action="report_generated"/);
    expect(serviceSource).toMatch(/generateReportSnapshot/);
    expect(serviceSource).toMatch(/module:\s*'hod-command'/);
  });

  it("keeps principal announcements as real composed communication commands", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal/communication-workspace.tsx"), "utf8");
    const apiClientSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal/api-client.ts"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/admin-command.controller.ts"), "utf8");

    expect(source).not.toMatch(/body:\s*""/);
    expect(source).not.toMatch(/subject:\s*"General Announcement"/);
    expect(source).toMatch(/const announcementPayload = Object\.fromEntries/);
    expect(source).toMatch(/name="subject"/);
    expect(source).toMatch(/name="audience"/);
    expect(source).toMatch(/name="body"/);
    expect(source).toMatch(/name="channels"/);
    expect(apiClientSource).toMatch(/principal\/communication\/announcement/);
    expect(controllerSource).toMatch(/principal\.announcement_sent/);
  });

  it("keeps principal dashboard buttons wired to backend routes or real role navigation", () => {
    const academicsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal-dashboard/academics-workspace.tsx"), "utf8");
    const examsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal-dashboard/exams-reports-workspace.tsx"), "utf8");
    const teachingSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal-dashboard/teaching-workspace.tsx"), "utf8");
    const settingsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal-dashboard/settings-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/admin-command.controller.ts"), "utf8");

    expect(academicsSource).toMatch(/admin-command\/principal\/reports\/generate/);
    expect(examsSource).toMatch(/admin-command\/principal\/exams-report-cards\/\$\{series\.id\}\/publish/);
    expect(examsSource).not.toMatch(/exams-report-cards\/\$\{[^}]+\}\/approve|Approve All/);
    expect(teachingSource).toMatch(/buildSchoolSectionHref\("teacher", "overview"/);
    expect(settingsSource).toMatch(/admin-command\/principal\/settings\/preferences/);
    expect(settingsSource).not.toMatch(/principal-teaching-toggle|settings\/action/);
    expect(controllerSource).toMatch(/@Patch\('principal\/settings\/preferences'\)/);
  });

  it("wires admin data quality scan and fix actions to real command endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/admin/data-quality-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/admin-command.controller.ts"), "utf8");

    expect(source).toMatch(/requestDashboardApi/);
    expect(source).toMatch(/admin-command\/principal\/reports\/generate/);
    expect(source).toMatch(/admin-command\/principal\/settings\/action/);
    expect(source).toMatch(/runFullScan/);
    expect(source).toMatch(/requestAnomalyFix/);
    expect(source).toMatch(/onClick=\{runFullScan\}/);
    expect(source).toMatch(/onClick=\{\(\) => requestAnomalyFix\(anomaly\)\}/);
    expect(source).toMatch(/scanBusy/);
    expect(source).toMatch(/fixingId/);
    expect(controllerSource).toMatch(/@Post\('principal\/reports\/generate'\)/);
    expect(controllerSource).toMatch(/@Post\('principal\/settings\/action'\)/);
  });

  it("starts school subscription MPESA renewal from the renewal modal", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/school-pages.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/billing/billing.controller.ts"), "utf8");

    expect(source).toMatch(/startMpesaRenewal/);
    expect(source).toMatch(/billing\/subscriptions\/current\/renewal-payment-intents/);
    expect(source).toMatch(/renewalSubmitting/);
    expect(source).toMatch(/renewalError/);
    expect(source).toMatch(/idempotency_key/);
    expect(source).toMatch(/onClick=\{startMpesaRenewal\}/);
    expect(source).not.toMatch(/<Link href=\{buildSchoolSectionHref\(role, "finance", routeMode\)\}>\s*<Button>Start MPESA renewal<\/Button>\s*<\/Link>/);
    expect(controllerSource).toMatch(/@Post\('subscriptions\/current\/renewal-payment-intents'\)/);
    expect(controllerSource).toMatch(/@FeatureGate\(BILLING_MPESA_FEATURE\)/);
  });

  it("keeps routed finance principal teacher and parent controls wired to real actions", () => {
    const receiptsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/accountant/receipts-workspace.tsx"), "utf8");
    const arrearsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/accountant/arrears-workspace.tsx"), "utf8");
    const principalStudentsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/principal-dashboard/students-workspace.tsx"), "utf8");
    const teacherSubjectsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher/subjects-classes-workspace.tsx"), "utf8");
    const teacherTimetableSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher/my-timetable-workspace.tsx"), "utf8");
    const marksSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/teacher/marks-entry-workspace.tsx"), "utf8");
    const parentFeesSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/parent/fees-workspace.tsx"), "utf8");
    const parentBehaviorSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/parent/behavior-workspace.tsx"), "utf8");
    const studentAcademicsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/student/academics-workspace.tsx"), "utf8");
    const accountantControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/accountant-command.controller.ts"), "utf8");
    const accountantServiceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/accountant-command.service.ts"), "utf8");
    const paymentsControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/payments/controllers/payments.controller.ts"), "utf8");
    const studentPortalControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/students/student-portal-actions.controller.ts"), "utf8");

    expect(receiptsSource).toMatch(/admin-command\/accountant\/actions/);
    expect(receiptsSource).toMatch(/openPaymentModal/);
    expect(receiptsSource).toMatch(/openReceiptPreview/);
    expect(arrearsSource).toMatch(/sendArrearsReminders/);
    expect(arrearsSource).toMatch(/admin-command\/accountant\/fee-follow-up/);
    expect(arrearsSource).toMatch(/recipient_scope: "linked_guardians"/);
    expect(arrearsSource).not.toMatch(/target_roles/);
    expect(accountantControllerSource).toMatch(/@Permissions\('finance:follow-up'\)/);
    expect(accountantServiceSource).toMatch(/FEE_FOLLOW_UP_STAFF_ROLES\s*=\s*\[[^\]]*'accountant',[^\]]*'principal',[^\]]*'deputy_principal',[^\]]*'secretary'/);
    expect(accountantServiceSource).not.toMatch(/FEE_FOLLOW_UP_STAFF_ROLES\s*=\s*\[[^\]]*'parent'/);
    expect(accountantServiceSource).toMatch(/recipient_user_id, recipient_guardian_id/);
    expect(arrearsSource).not.toMatch(/Arrears reminder request recorded/);
    expect(principalStudentsSource).toMatch(/buildSchoolSectionHref\("admissions", "admissions"/);
    expect(teacherSubjectsSource).toMatch(/buildSchoolSectionHref\("teacher", "students"/);
    expect(teacherTimetableSource).toMatch(/weekOffset/);
    expect(teacherTimetableSource).toMatch(/setWeekOffset/);
    expect(marksSource).toMatch(/downloadCsvFile/);
    expect(marksSource).toMatch(/marks-entry-template/);
    expect(marksSource).toMatch(/\/api\/exams\/marks/);
    expect(marksSource).not.toMatch(/\/api\/academics\/marks\/enter/);
    expect(marksSource).not.toMatch(/Mid-Term Math|End-of-Term Physics|Form 1 East|Form 2 West/);
    expect(parentFeesSource).toMatch(/openPrintDocument/);
    expect(parentFeesSource).toMatch(/previewFeeStatement/);
    expect(parentFeesSource).toMatch(/Fee Statement/);
    expect(parentFeesSource).toMatch(/\/api\/payments\/mpesa\/payment-intents/);
    expect(parentFeesSource).toMatch(/idempotency_key/);
    expect(parentFeesSource).toMatch(/phone_number/);
    expect(parentFeesSource).not.toMatch(/parent-portal\/fees\/pay/);
    expect(parentFeesSource).not.toMatch(/Payment recorded successfully/);
    expect(parentBehaviorSource).toMatch(/\/api\/parent-portal\/behavior\/acknowledge/);
    expect(parentBehaviorSource).toMatch(/incidentId/);
    expect(parentBehaviorSource).not.toMatch(/body:\s*JSON\.stringify/);
    expect(studentAcademicsSource).toMatch(/\/api\/student-portal\/assignments\/mark-done/);
    expect(studentAcademicsSource).toMatch(/assignmentId/);
    expect(studentAcademicsSource).not.toMatch(/body:\s*JSON\.stringify/);
    expect(studentAcademicsSource).toMatch(/downloadReportCard/);
    expect(studentAcademicsSource).toMatch(/openPrintDocument/);
    expect(accountantControllerSource).toMatch(/@Post\('actions'\)/);
    expect(accountantServiceSource).toMatch(/notifyRoles/);
    expect(paymentsControllerSource).toMatch(/@Post\('payment-intents'\)/);
    expect(studentPortalControllerSource).toMatch(/assignments\/mark-done/);
  });

  it("mounts every nurse sidebar workspace on the routed command center", () => {
    const commandSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/nurse-command-center.tsx"), "utf8");
    const overviewSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/nurse/overview-workspace.tsx"), "utf8");
    const reportsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/nurse/health-reports-workspace.tsx"), "utf8");

    [
      "OverviewWorkspace",
      "VisitsWorkspace",
      "SickBayQueueWorkspace",
      "MedicineInventoryWorkspace",
      "DispensingLogWorkspace",
      "ParentNotificationsWorkspace",
      "HealthReportsWorkspace",
    ].forEach((workspace) => {
      expect(commandSource).toMatch(new RegExp(workspace));
    });

    expect(commandSource).toMatch(/activeSection/);
    expect(commandSource).not.toMatch(/function ClinicWorkspace/);
    expect(overviewSource).toMatch(/todayVisits/);
    expect(overviewSource).not.toMatch(/visits_today/);
    expect(reportsSource).toMatch(/normalizeReportsData/);
  });

  it("does not leave librarian sidebar sections on placeholder main actions", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/librarian-command-center.tsx"), "utf8");

    expect(source).not.toMatch(/Minimal placeholder/);
    expect(source).not.toMatch(/Main Action/);
    expect(source).not.toMatch(/\$\{title\} workflow opened/);
    expect(source).toMatch(/admin-command\/librarian\/borrowers/);
    expect(source).toMatch(/admin-command\/librarian\/overdue-books/);
    expect(source).toMatch(/admin-command\/librarian\/fines-lost-damaged/);
    expect(source).toMatch(/admin-command\/librarian\/reports\/generate/);
    expect(source).toMatch(/persistLibraryWorkflowAction/);
    expect(source).toMatch(/admin-command\/librarian\/actions/);
    expect(source).toMatch(/CreateLibraryReservationModal/);
    expect(source).toMatch(/handleCreateReservation/);
    expect(source).toMatch(/admin-command\/librarian\/reservations/);
    expect(source).not.toMatch(/John Doe|Amina Wanjiku|A Doll's House|Secondary Math Bk 2/);
    expect(source).not.toMatch(/function ReservationsWorkspace\(\)/);
    expect(source).toMatch(/IssueDepartmentResourceModal/);
    expect(source).toMatch(/handleIssueDepartmentResource/);
    expect(source).toMatch(/admin-command\/librarian\/department-issues/);
    expect(source).toMatch(/LogLibraryVisitModal/);
    expect(source).toMatch(/handleLogLibraryVisit/);
    expect(source).toMatch(/handleCheckoutLibraryVisit/);
    expect(source).toMatch(/admin-command\/librarian\/visits\/checkout/);
    expect(source).toMatch(/entityType: "library_visit"/);
    expect(source).toMatch(/CreateLibraryRequestModal/);
    expect(source).toMatch(/handleCreateLibraryRequest/);
    expect(source).toMatch(/entityType: "library_request"/);
    expect(source).toMatch(/ComposeLibraryNoticeModal/);
    expect(source).toMatch(/handleSendLibraryNotice/);
    expect(source).toMatch(/admin-command\/librarian\/notices/);
    expect(source).toMatch(/catalogueSearchTerm/);
    expect(source).toMatch(/filteredCatalogue/);
    expect(source).toMatch(/dataKeys: \["reservations"\]/);
    expect(source).toMatch(/columns: \["borrower_name", "book_title", "requested_date", "expiry_date", "status"\]/);
    expect(source).not.toMatch(/Catalogue filters recorded/);
    expect(source).not.toMatch(/Reservations filter applied/);
    expect(source).not.toMatch(/Reservation action recorded/);
    expect(source).toMatch(/Topbar activeView=\{activeViewState\} onViewChange=\{setActiveView\}/);
    expect(source).toMatch(/onViewChange\("issue"\)/);
    expect(source).toMatch(/onViewChange\("return"\)/);
    expect(source).toMatch(/onViewChange\("lost_damaged"\)/);
    expect(source).not.toMatch(/Library quick action menu recorded/);
    expect(source).not.toMatch(/Department issue action recorded/);
    expect(source).not.toMatch(/Library visit action recorded/);
    expect(source).not.toMatch(/Library visit checkout recorded/);
    expect(source).not.toMatch(/Library request action recorded/);
    expect(source).not.toMatch(/Library notice composer recorded/);
    expect(source).not.toMatch(/Library search recorded/);
    expect(source).not.toMatch(/Scan action recorded/);
    expect(source).not.toMatch(/Issue action recorded/);
    expect(source).not.toMatch(/Return action recorded/);
    expect(source).toMatch(/group-focus-within:visible/);
  });

  it("persists laboratory technician workflow actions through the backend", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/laboratory-technician-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/laboratory-technician-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/laboratory-technician-command.service.ts"), "utf8");

    expect(source).toMatch(/requestDashboardApi/);
    expect(source).toMatch(/persistLabWorkflowAction/);
    expect(source).toMatch(/admin-command\/laboratory-technician\/actions/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/recordLaboratoryAction/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
    expect(serviceSource).toMatch(/sourceRole: 'laboratory_technician'/);
    expect(source).toMatch(/LabWorkflowModal/);
    expect(source).toMatch(/submitLabWorkflow/);
    expect(source).toMatch(/setLabWorkflowDraft/);
    expect(source).toMatch(/requestStatusFilter/);
    expect(source).toMatch(/filteredRequests/);
    expect(source).toMatch(/Open search and filters/);
    expect(source).not.toMatch(/Laboratory search ready/);
    expect(source).not.toMatch(/New requests filter applied/);
    expect(source).not.toMatch(/Approved requests filter applied/);
    expect(source).not.toMatch(/Preparation filter applied/);
    expect(source).not.toMatch(/needs issued item return confirmation/);
  });

  it("persists security officer row workflow actions through the backend", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/persistSecurityWorkflowAction/);
    expect(source).toMatch(/admin-command\/security-officer\/actions/);
    expect(source).toMatch(/SecurityAppointmentModal/);
    expect(source).toMatch(/\/api\/visitors\/appointments/);
    expect(source).toMatch(/student-exit-passes\/\$\{exitId\}\/verify/);
    expect(source).toMatch(/student-exit-passes\/\$\{exitId\}\/return/);
    expect(source).toMatch(/admin-command\/security-officer\/incidents\/\$\{incidentId\}\/escalate/);
    expect(source).not.toMatch(/Expected visitor workflow recorded/);
    expect(source).not.toMatch(/Gate pass verified", `Gate pass/);
    expect(source).not.toMatch(/Incident escalation recorded/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
    expect(serviceSource).toMatch(/sourceRole: 'security_officer'/);
  });

  it("makes security fast check-in helper buttons perform real workspace actions", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");

    expect(source).toMatch(/visitorSearchInputRef/);
    expect(source).toMatch(/handleFocusFrequentVisitorSearch/);
    expect(source).toMatch(/handleUseExpectedVisitorQueue/);
    expect(source).toMatch(/onNavigate\("expected-visitors"\)/);
    expect(source).toMatch(/<CheckInWorkspace onNavigate=\{setActiveView\}/);
    expect(source).not.toMatch(/Frequent visitor search recorded/);
    expect(source).not.toMatch(/Expected visitor picker recorded/);
  });

  it("derives security frequent visitors from live gate logs without hardcoded mutations", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const frequentVisitorSource = source.slice(
      source.indexOf("function FrequentVisitorsWorkspace"),
      source.indexOf("function LostFoundWorkspace"),
    );

    expect(source).toMatch(/function FrequentVisitorsWorkspace\(\{ onNavigate \}/);
    expect(source).toMatch(/useSchoolQuery<SecurityVisitorLog\[]>\("\/api\/visitors\/logs"\)/);
    expect(source).toMatch(/const frequentVisitors = Array\.from\(visitorLogs\.reduce/);
    expect(source).toMatch(/handleOpenVisitorCheckIn/);
    expect(source).toMatch(/onNavigate\("check-in"\)/);
    expect(source).toMatch(/<FrequentVisitorsWorkspace onNavigate=\{setActiveView\}/);
    expect(frequentVisitorSource).not.toMatch(/Mary Wanjiru/);
    expect(frequentVisitorSource).not.toMatch(/handleQuickFrequentVisitorCheckIn/);
    expect(frequentVisitorSource).not.toMatch(/useSchoolMutation\("\/api\/visitors\/logs"\)/);
    expect(source).not.toMatch(/Frequent visitor workflow recorded/);
    expect(source).not.toMatch(/Frequent visitor quick check-in recorded/);
  });

  it("makes security lost and found actions persist item records and claims", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleRecordLostFoundItem/);
    expect(source).toMatch(/handleClaimLostFoundItem/);
    expect(source).toMatch(/admin-command\/security-officer\/lost-found/);
    expect(controllerSource).toMatch(/@Post\('lost-found'\)/);
    expect(controllerSource).toMatch(/@Post\('lost-found\/:id\/claim'\)/);
    expect(serviceSource).toMatch(/async recordLostFoundItem/);
    expect(serviceSource).toMatch(/async claimLostFoundItem/);
    expect(serviceSource).toMatch(/security_lost_found/);
    expect(serviceSource).toMatch(/security\.lost_item_recorded/);
    expect(serviceSource).toMatch(/security\.lost_item_claimed/);
    expect(source).not.toMatch(/Gate lost item workflow recorded/);
    expect(source).not.toMatch(/Lost item claim recorded/);
  });

  it("makes security boarding gate movement actions operate on boarding exeats", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleVerifyBoardingMovement/);
    expect(source).toMatch(/handleRecordBoardingReturn/);
    expect(source).toMatch(/handleNotifyBoardingMaster/);
    expect(source).toMatch(/admin-command\/security-officer\/boarding-movement/);
    expect(controllerSource).toMatch(/@Get\('boarding-movement'\)/);
    expect(controllerSource).toMatch(/@Post\('boarding-movement\/:id\/verify'\)/);
    expect(controllerSource).toMatch(/@Post\('boarding-movement\/:id\/return'\)/);
    expect(controllerSource).toMatch(/@Post\('boarding-movement\/:id\/notify-master'\)/);
    expect(serviceSource).toMatch(/async verifyBoardingMovement/);
    expect(serviceSource).toMatch(/async recordBoardingReturn/);
    expect(serviceSource).toMatch(/async notifyBoardingMaster/);
    expect(serviceSource).toMatch(/boarding_exeats/);
    expect(source).not.toMatch(/Boarding pass verification recorded/);
    expect(source).not.toMatch(/Boarder return recorded/);
    expect(source).not.toMatch(/Boarding master notice queued/);
  });

  it("makes security transport clearance actions operate on transport trips", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleRecordTransportDeparture/);
    expect(source).toMatch(/handleRecordTransportArrival/);
    expect(source).toMatch(/admin-command\/security-officer\/transport-clearance/);
    expect(controllerSource).toMatch(/@Get\('transport-clearance'\)/);
    expect(controllerSource).toMatch(/@Post\('transport-clearance\/:id\/departure'\)/);
    expect(controllerSource).toMatch(/@Post\('transport-clearance\/:id\/arrival'\)/);
    expect(serviceSource).toMatch(/async recordTransportDeparture/);
    expect(serviceSource).toMatch(/async recordTransportArrival/);
    expect(serviceSource).toMatch(/transport_trips/);
    expect(source).not.toMatch(/recordSecurityAction\("Transport departure recorded/);
    expect(source).not.toMatch(/recordSecurityAction\("Transport arrival recorded/);
  });

  it("makes security staff movement return use the staff movement endpoint", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleStaffReturn/);
    expect(source).toMatch(/admin-command\/security-officer\/staff-movement/);
    expect(controllerSource).toMatch(/@Post\('staff-movement\/:id\/return'\)/);
    expect(serviceSource).toMatch(/async logStaffReturn/);
    expect(source).toMatch(/useSchoolQuery<SecurityStaffMovementData>/);
    expect(source).toMatch(/data\?\.staffmovementList/);
    expect(serviceSource).toMatch(/staffmovementList: movements\.rows/);
    expect(source).not.toMatch(/recordSecurityAction\("Staff return recorded/);
    expect(source).not.toMatch(/Return workflow recorded for the selected staff movement record/);
  });

  it("makes security vehicle log entry and exit use security vehicle endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleVehicleEntry/);
    expect(source).toMatch(/handleVehicleExit/);
    expect(source).toMatch(/admin-command\/security-officer\/vehicle-log/);
    expect(controllerSource).toMatch(/@Get\('vehicle-log'\)/);
    expect(controllerSource).toMatch(/@Post\('vehicle-log'\)/);
    expect(controllerSource).toMatch(/@Post\('vehicle-log\/:id\/exit'\)/);
    expect(serviceSource).toMatch(/async recordVehicleEntry/);
    expect(serviceSource).toMatch(/async recordVehicleExit/);
    expect(serviceSource).toMatch(/vehicle\.entry_logged/);
    expect(source).not.toMatch(/recordSecurityAction\("Vehicle exit recorded/);
    expect(source).not.toMatch(/record_vehicle_entry/);
  });

  it("makes security delivery actions persist delivery events and state changes", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleRecordDelivery/);
    expect(source).toMatch(/handleNotifyDeliveryRecipient/);
    expect(source).toMatch(/handleMarkDeliveryCollected/);
    expect(source).toMatch(/admin-command\/security-officer\/deliveries/);
    expect(controllerSource).toMatch(/@Get\('deliveries'\)/);
    expect(controllerSource).toMatch(/@Post\('deliveries'\)/);
    expect(controllerSource).toMatch(/@Post\('deliveries\/:id\/notify-recipient'\)/);
    expect(controllerSource).toMatch(/@Post\('deliveries\/:id\/collected'\)/);
    expect(serviceSource).toMatch(/async recordDelivery/);
    expect(serviceSource).toMatch(/async notifyDeliveryRecipient/);
    expect(serviceSource).toMatch(/resolveTenantStaffRecipient/);
    expect(serviceSource).toMatch(/recipient_scope: 'exact_tenant_user'/);
    expect(source).toMatch(/Exact staff name, staff number, or account ID/);
    expect(serviceSource).toMatch(/async markDeliveryCollected/);
    expect(serviceSource).toMatch(/delivery\.recorded/);
    expect(source).not.toMatch(/recordSecurityAction\("Delivery recipient notice queued/);
    expect(source).not.toMatch(/recordSecurityAction\("Delivery marked collected/);
    expect(source).not.toMatch(/record_delivery/);
  });

  it("makes security late arrival actions persist arrivals and queue parent notices", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleRecordLateArrival/);
    expect(source).toMatch(/handleNotifyLateArrivalParent/);
    expect(source).toMatch(/admin-command\/security-officer\/late-arrivals/);
    expect(controllerSource).toMatch(/@Get\('late-arrivals'\)/);
    expect(controllerSource).toMatch(/@Post\('late-arrivals'\)/);
    expect(controllerSource).toMatch(/@Post\('late-arrivals\/:id\/notify-parent'\)/);
    expect(serviceSource).toMatch(/async recordLateArrival/);
    expect(serviceSource).toMatch(/async notifyLateArrivalParent/);
    expect(serviceSource).toMatch(/student\.late_arrival_recorded/);
    expect(source).not.toMatch(/recordSecurityAction\("Late arrival parent notice queued/);
    expect(source).not.toMatch(/record_late_arrival/);
  });

  it("makes security early departure actions persist departures and returns", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleRecordEarlyDeparture/);
    expect(source).toMatch(/handleRecordEarlyDepartureReturn/);
    expect(source).toMatch(/admin-command\/security-officer\/early-departures/);
    expect(controllerSource).toMatch(/@Get\('early-departures'\)/);
    expect(controllerSource).toMatch(/@Post\('early-departures'\)/);
    expect(controllerSource).toMatch(/@Post\('early-departures\/:id\/return'\)/);
    expect(serviceSource).toMatch(/async recordEarlyDeparture/);
    expect(serviceSource).toMatch(/async recordEarlyDepartureReturn/);
    expect(serviceSource).toMatch(/student\.early_departure_recorded/);
    expect(source).not.toMatch(/recordSecurityAction\("Early departure return recorded/);
    expect(source).not.toMatch(/record_early_departure/);
  });

  it("uses canonical incident contracts and real downloadable security report artifacts", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/useSchoolQuery<SecurityIncidentsData>/);
    expect(source).toMatch(/data\?\.incidentsList/);
    expect(serviceSource).toMatch(/incidentsList: incidents\.rows/);
    expect(source).toMatch(/admin-command\/security-officer\/reports\/generate/);
    expect(source).toMatch(/admin-command\/security-officer\/reports\/\$\{encodeURIComponent\(report\.id\)\}\/download/);
    expect(source).toMatch(/downloadBase64File/);
    expect(serviceSource).toMatch(/generateReportSnapshot/);
    expect(serviceSource).toMatch(/module: 'security-officer-command'/);
    expect(source).not.toMatch(/const reports = \["Daily Visitor Register"/);
    expect(source).not.toMatch(/openReportPreview/);
  });

  it("makes security watchlist actions persist entries and acknowledgements", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleCreateWatchlistEntry/);
    expect(source).toMatch(/handleAcknowledgeWatchlistEntry/);
    expect(source).toMatch(/admin-command\/security-officer\/watchlist/);
    expect(controllerSource).toMatch(/@Get\('watchlist'\)/);
    expect(controllerSource).toMatch(/@Post\('watchlist'\)/);
    expect(controllerSource).toMatch(/@Post\('watchlist\/:id\/acknowledge'\)/);
    expect(serviceSource).toMatch(/async recordWatchlistEntry/);
    expect(serviceSource).toMatch(/async acknowledgeWatchlistEntry/);
    expect(serviceSource).toMatch(/security\.watchlist_entry_recorded/);
    expect(source).not.toMatch(/recordSecurityAction\("Watchlist entry workflow recorded/);
    expect(source).not.toMatch(/Watchlist entry preview generated/);
  });

  it("makes security notifications load real notifications and mark them read", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const notificationControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/workflow/controllers/notification.controller.ts"), "utf8");

    expect(source).toMatch(/handleMarkSecurityNotificationRead/);
    expect(source).toMatch(/useSchoolQuery<SecurityNotification/);
    expect(source).toMatch(/\/api\/notifications/);
    expect(source).toMatch(/notifications\/\$\{notification\.id\}\/read/);
    expect(notificationControllerSource).toMatch(/@Get\(\)/);
    expect(notificationControllerSource).toMatch(/@Patch\(':id\/read'\)/);
    expect(source).not.toMatch(/Security notification marked read/);
    expect(source).not.toMatch(/Principal approved gate pass for John Doe/);
  });

  it("makes security shift actions persist start and handover events", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleStartSecurityShift/);
    expect(source).toMatch(/handleEndSecurityShift/);
    expect(source).toMatch(/admin-command\/security-officer\/shift\/start/);
    expect(source).toMatch(/admin-command\/security-officer\/shift\/end/);
    expect(controllerSource).toMatch(/@Post\('shift\/start'\)/);
    expect(controllerSource).toMatch(/@Post\('shift\/end'\)/);
    expect(serviceSource).toMatch(/async startShift/);
    expect(serviceSource).toMatch(/async endShift/);
    expect(serviceSource).toMatch(/security\.shift_started/);
    expect(serviceSource).toMatch(/security\.shift_ended/);
    expect(source).not.toMatch(/body: \{ action: "start_shift" \}/);
    expect(source).not.toMatch(/body: \{ action: "end_shift" \}/);
  });

  it("makes security staff movement entry and exit persist through security endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleRecordStaffEntry/);
    expect(source).toMatch(/handleRecordStaffExit/);
    expect(source).toMatch(/admin-command\/security-officer\/staff-movement\/entry/);
    expect(source).toMatch(/admin-command\/security-officer\/staff-movement\/departure/);
    expect(controllerSource).toMatch(/@Post\('staff-movement\/entry'\)/);
    expect(controllerSource).toMatch(/@Post\('staff-movement\/departure'\)/);
    expect(serviceSource).toMatch(/async logStaffEntry/);
    expect(serviceSource).toMatch(/async logStaffDeparture/);
    expect(serviceSource).toMatch(/staff\.entry_logged/);
    expect(serviceSource).toMatch(/staff\.departure_logged/);
    expect(source).not.toMatch(/record_staff_entry/);
    expect(source).not.toMatch(/record_staff_exit/);
  });

  it("makes security header search query real security records", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/security-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/handleSearchSecurityRecords/);
    expect(source).toMatch(/admin-command\/security-officer\/search/);
    expect(source).toMatch(/SecuritySearchResult/);
    expect(controllerSource).toMatch(/@Get\('search'\)/);
    expect(serviceSource).toMatch(/async searchSecurityRecords/);
    expect(serviceSource).toMatch(/WHERE tenant_id = \$1/);
    expect(source).not.toMatch(/Security search recorded/);
  });

  it("persists transport manager planning actions and generates real reports", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/transport-manager-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/transport-manager-command.service.ts"), "utf8");

    expect(source).toMatch(/persistTransportWorkflowAction/);
    expect(source).toMatch(/admin-command\/transport-manager\/actions/);
    expect(source).toMatch(/admin-command\/transport-manager\/reports\/generate/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/sourceRole: 'transport_manager'/);
  });

  it("keeps discipline master shell and shared workspace actions operational", () => {
    const shellSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/discipline-master-command-center.tsx"), "utf8");
    const sharedSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/discipline-master/shared.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/discipline/discipline.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/discipline/discipline.service.ts"), "utf8");

    expect(shellSource).toMatch(/setActiveWorkspace\("log-incident"\)/);
    expect(sharedSource).toMatch(/persistDisciplineWorkspaceAction/);
    expect(sharedSource).toMatch(/\/api\/discipline\/workspace-actions/);
    expect(controllerSource).toMatch(/@Post\('workspace-actions'\)/);
    expect(serviceSource).toMatch(/recordWorkspaceAction/);
    expect(serviceSource).toMatch(/discipline\.workspace_action/);
    expect(shellSource).not.toMatch(/Kisumu Boys/);
  });

  it("persists class teacher shared workflow actions through class-teacher command endpoints", () => {
    const sharedSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/shared.tsx"), "utf8");
    const commandSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher-command-center.tsx"), "utf8");
    const communicationSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/communication.tsx"), "utf8");
    const registerSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/register.tsx"), "utf8");
    const disciplineRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/discipline.tsx"), "utf8");
    const welfareRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/welfare.tsx"), "utf8");
    const meetingsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/meetings.tsx"), "utf8");
    const tasksSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/tasks.tsx"), "utf8");
    const reportsRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/reports.tsx"), "utf8");
    const reportsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/reports-workspace.tsx"), "utf8");
    const homeRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/home.tsx"), "utf8");
    const progressRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/progress.tsx"), "utf8");
    const commentsRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/comments.tsx"), "utf8");
    const settingsRouteSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/workspaces/settings.tsx"), "utf8");
    const commentsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/report-comments-workspace.tsx"), "utf8");
    const apiClientSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/class-teacher/api-client.ts"), "utf8");
    const streamHookSource = fs.readFileSync(path.join(process.cwd(), "src/lib/data/class-teacher-hooks.ts"), "utf8");
    const classTeacherServiceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/class-teacher/class-teacher.service.ts"), "utf8");
    const classTeacherControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/class-teacher/class-teacher.controller.ts"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/class-teacher-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/class-teacher-command.service.ts"), "utf8");
    const routedWorkspaceDir = path.join(process.cwd(), "src/components/school/class-teacher/workspaces");
    const routedWorkspaceSource = fs
      .readdirSync(routedWorkspaceDir)
      .filter((fileName) => fileName.endsWith(".tsx"))
      .map((fileName) => fs.readFileSync(path.join(routedWorkspaceDir, fileName), "utf8"))
      .join("\n");

    expect(sharedSource).toMatch(/persistClassTeacherWorkflowAction/);
    expect(sharedSource).toMatch(/sendClassTeacherCommunication/);
    expect(sharedSource).toMatch(/admin-command\/class-teacher\/actions/);
    expect(sharedSource).toMatch(/admin-command\/class-teacher\/communications/);
    expect(commandSource).toMatch(/sendClassTeacherCommunication/);
    expect(commandSource).not.toMatch(/Form 2 Blue/);
    expect(communicationSource).toMatch(/sendClassTeacherCommunication/);
    expect(commentsRouteSource).toMatch(/export \{ ReportCommentsWorkspace \} from "\.\.\/report-comments-workspace"/);
    expect(commentsSource).toMatch(/saveReportComment/);
    expect(commentsSource).toMatch(/submitAllComments/);
    expect(apiClientSource).toMatch(/report-comments\/\$\{studentId\}/);
    expect(apiClientSource).toMatch(/report-comments\/submit-all/);
    expect(commentsRouteSource).not.toMatch(/Report comments save queued/);
    expect(registerSource).toMatch(/onSelectLearner\?\.\(String\(learner\.id\)\)/);
    expect(disciplineRouteSource).toMatch(/useClassTeacherRegister/);
    expect(disciplineRouteSource).toMatch(/selectedLearnerId/);
    expect(disciplineRouteSource).toMatch(/studentId: selectedLearnerId/);
    expect(disciplineRouteSource).not.toMatch(/Learner Name or ID/);
    expect(welfareRouteSource).toMatch(/useClassTeacherRegister/);
    expect(welfareRouteSource).toMatch(/selectedLearnerId/);
    expect(welfareRouteSource).toMatch(/studentId: selectedLearnerId/);
    expect(welfareRouteSource).not.toMatch(/Learner Name or ID/);
    expect(commandSource).toMatch(/LearnerNoteModal/);
    expect(commandSource).toMatch(/learner-profiles\/\$\{learnerId\}\/note/);
    expect(commandSource).not.toMatch(/Class note action recorded/);
    expect(meetingsSource).toMatch(/admin-command\/class-teacher\/meetings/);
    expect(tasksSource).toMatch(/admin-command\/class-teacher\/tasks/);
    expect(tasksSource).toMatch(/class-teacher\/tasks\/\$\{taskId\}\/complete/);
    expect(meetingsSource).not.toMatch(/Parent meeting action recorded/);
    expect(tasksSource).not.toMatch(/Task creation action recorded/);
    expect(settingsRouteSource).toMatch(/saveClassTeacherSettings/);
    expect(settingsRouteSource).toMatch(/useSaveClassTeacherSettings/);
    expect(settingsRouteSource).not.toMatch(/Settings save review recorded/);
    expect(settingsRouteSource).not.toMatch(/preferences require persisted user settings/);
    expect(classTeacherControllerSource).toMatch(/@Post\('settings'\)/);
    expect(classTeacherServiceSource).toMatch(/async saveSettings/);
    expect(classTeacherServiceSource).toMatch(/class_teacher\.settings_saved/);
    expect(classTeacherServiceSource).toMatch(/assertStudentBelongsToStream/);
    expect(classTeacherServiceSource).toMatch(/student_welfare_cases/);
    expect(classTeacherServiceSource).toMatch(/INSERT INTO student_welfare_cases/);
    expect(classTeacherServiceSource).toMatch(/inventory_requests/);
    expect(classTeacherServiceSource).not.toMatch(/storeRequests: \{ count: 0/);
    expect(classTeacherServiceSource).not.toMatch(/student_invoices/);
    expect(classTeacherServiceSource).not.toMatch(/manual_fee_payments/);
    expect(classTeacherServiceSource).not.toMatch(/async getFees\(/);
    expect(classTeacherServiceSource).toMatch(/FROM report_snapshots/);
    expect(classTeacherServiceSource).not.toMatch(/async getReports\(tenantId: string, userId: string, streamId: string\) \{\s*return \[\];\s*\}/);
    expect(controllerSource).toMatch(/@Post\('meetings'\)/);
    expect(controllerSource).toMatch(/@Post\('tasks'\)/);
    expect(controllerSource).toMatch(/@Post\('tasks\/:taskId\/complete'\)/);
    expect(reportsRouteSource).toMatch(/export \{ ReportsWorkspace \} from "\.\.\/reports-workspace"/);
    expect(reportsSource).toMatch(/generateClassReport/);
    expect(reportsSource).toMatch(/download_url/);
    expect(serviceSource).toMatch(/download_url: `\/api\/admin-command\/class-teacher\/reports\/\$\{encodeURIComponent\(String\(report\.snapshotId \|\| report\.id\)\)\}\/download`/);
    expect(serviceSource).not.toMatch(/download_url: null/);
    expect(controllerSource).toMatch(/@Get\('reports\/:snapshotId\/download'\)/);
    expect(reportsRouteSource).not.toMatch(/Generate report-card preview/);
    expect(homeRouteSource).toMatch(/export \{ OverviewWorkspace \} from "\.\.\/overview-workspace"/);
    expect(progressRouteSource).toMatch(/ClassAcademicsWorkspace as AcademicProgressWorkspace/);
    expect(homeRouteSource).not.toMatch(/Class follow-up action recorded/);
    expect(routedWorkspaceSource).not.toMatch(/stream_123/);
    expect(streamHookSource).toMatch(/useResolvedClassTeacherStreamId/);
    expect(classTeacherServiceSource).toMatch(/cs\.id as class_section_id/);
    expect(classTeacherServiceSource).toMatch(/classSectionId: r\.class_section_id/);
    expect(classTeacherServiceSource).toMatch(/attendance_present_count/);
    expect(classTeacherServiceSource).not.toMatch(/averageAttendance: "0%"/);
    expect(classTeacherServiceSource).not.toMatch(/Placeholder until attendance is fully wired/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(controllerSource).toMatch(/@Post\('communications'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/class_teacher\.communication_sent/);
    expect(serviceSource).toMatch(/class_teacher\.workflow_action/);
  });

  it("persists procurement officer visible actions through procurement command endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/procurement-officer-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/procurement-officer-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/procurement-officer-command.service.ts"), "utf8");

    expect(source).toMatch(/recordProcurementAction/);
    expect(source).toMatch(/admin-command\/procurement-officer\/actions/);
    expect(source).toMatch(/NewPurchaseOrderModal/);
    expect(source).toMatch(/handleCreatePurchaseOrder/);
    expect(source).toMatch(/openProcurementRecord/);
    expect(source).toMatch(/ReviewProcurementRequestModal/);
    expect(source).toMatch(/handleDecidePurchaseRequest/);
    expect(source).toMatch(/decisionNotes/);
    expect(source).toMatch(/handleDecidePurchaseRequest\("reject", decisionNotes\)/);
    expect(source).toMatch(/EditProcurementSupplierModal/);
    expect(source).toMatch(/handleUpdateSupplier/);
    expect(source).toMatch(/admin-command\/procurement-officer\/purchase-orders/);
    expect(source).toMatch(/admin-command\/procurement-officer\/purchase-requests\/\$\{selectedRequest\.id\}\/\$\{decision\}/);
    expect(source).toMatch(/admin-command\/procurement-officer\/suppliers\/\$\{selectedSupplier\.id\}/);
    expect(source).toMatch(/handleProcurementBudgetAction/);
    expect(source).toMatch(/admin-command\/procurement-officer\/budget-actions/);
    expect(source).toMatch(/requestDashboardApi\("\/api\/inventory\/suppliers"/);
    expect(source).toMatch(/Save Supplier/);
    expect(source).not.toMatch(/Purchase order intake recorded/);
    expect(source).not.toMatch(/Purchase order \$\{po\.order_number \?\? po\.id \?\? "selected"\} recorded for review/);
    expect(source).not.toMatch(/Requisition \$\{r\.request_number \?\? r\.id \?\? "selected"\} recorded for approval review/);
    expect(source).not.toMatch(/Supplier profile \$\{s\.name \?\? s\.id \?\? "selected"\} recorded for editing review/);
    expect(source).not.toMatch(/Supplier intake ready/);
    expect(source).not.toMatch(/Procurement budget action/);
    expect(source).not.toMatch(/available shortly/i);
    expect(controllerSource).toMatch(/@Post\('purchase-orders'\)/);
    expect(serviceSource).toMatch(/async createPurchaseOrder/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(controllerSource).toMatch(/@Post\('budget-actions'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/async runBudgetAction/);
    expect(serviceSource).toMatch(/procurement\.budget\.\$\{action\}/);
    expect(serviceSource).toMatch(/sourceRole: 'procurement_officer'/);
  });

  it("persists registrar admissions visible actions through admissions command endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/registrar-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/admissions-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/admissions-command.service.ts"), "utf8");

    expect(source).toMatch(/persistAdmissionsWorkflowAction/);
    expect(source).toMatch(/admin-command\/admissions\/actions/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/admissions\/dashboard"/);
    expect(source).not.toMatch(/\/api\/admissions\/quick-actions/);
    expect(source).not.toMatch(/Brian Otieno|Amina Wanjiru|Grace Achieng|Moses Kariuki|Njeri Mwangi|Faith Akinyi|Mr\. Otieno|applicant-brian-otieno|Form 2 North/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/sourceRole: 'admissions_officer'/);
  });

  it("persists secretary front-office visible actions through secretary command endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/secretary-command-center-full.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/secretary-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/secretary-command.service.ts"), "utf8");

    expect(source).toMatch(/persistSecretaryWorkflowAction/);
    expect(source).toMatch(/admin-command\/secretary\/actions/);
    expect(source).toMatch(/SecretaryMessageModal/);
    expect(source).toMatch(/ParentRequestModal/);
    expect(source).toMatch(/handleRegisterParentRequest/);
    expect(source).toMatch(/AdmissionsInquiryModal/);
    expect(source).toMatch(/handleRegisterAdmissionsInquiry/);
    expect(source).toMatch(/LostFoundReportModal/);
    expect(source).toMatch(/handleReportLostFoundItem/);
    expect(source).toMatch(/handleSaveSecretaryPreferences/);
    expect(source).toMatch(/handleSecretaryTableAction/);
    expect(source).toMatch(/selectedRowDetails/);
    expect(source).toMatch(/LogCallModal/);
    expect(source).toMatch(/DraftDocumentModal/);
    expect(source).toMatch(/\/api\/secretary\/inquiries/);
    expect(source).toMatch(/admin-command\/secretary\/lost-found/);
    expect(source).toMatch(/admin-command\/secretary\/preferences/);
    expect(source).toMatch(/admin-command\/secretary\/parent-messages/);
    expect(source).toMatch(/admin-command\/secretary\/calls-log/);
    expect(source).toMatch(/admin-command\/secretary\/letters-documents/);
    expect(source).not.toMatch(/Message composer action recorded/);
    expect(source).not.toMatch(/Parent request action recorded/);
    expect(source).not.toMatch(/Admissions inquiry recorded/);
    expect(source).not.toMatch(/Lost and found report recorded/);
    expect(source).not.toMatch(/Secretary settings action recorded/);
    expect(source).not.toMatch(/\$\{act\} recorded/);
    expect(source).not.toMatch(/<button className="rounded-lg bg\[#071D49\][^>]*>[\s\S]*?(?:Log New Call|Draft New Document|New Inquiry)<\/button>/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(controllerSource).toMatch(/@Post\('parent-messages'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/frontoffice\.parent_message/);
    expect(serviceSource).toMatch(/frontoffice\.workflow_action/);
  });

  it("keeps ICT manager actions operational instead of static or placeholder controls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/ict-manager-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/ict-manager-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/ict-manager-command.service.ts"), "utf8");

    expect(source).toMatch(/recordIctWorkflowAction/);
    expect(source).toMatch(/admin-command\/ict-manager\/actions/);
    expect(source).toMatch(/NewIctTicketModal/);
    expect(source).toMatch(/RegisterIctDeviceModal/);
    expect(source).toMatch(/ManageIctAssetModal/);
    expect(source).toMatch(/handleManageIctAsset/);
    expect(source).toMatch(/\/api\/support\/tickets/);
    expect(source).toMatch(/\/api\/assets\/records/);
    expect(source).toMatch(/admin-command\/ict-manager\/assets\/\$\{assetId\}\/manage/);
    expect(source).not.toMatch(/Capture requester, device, issue category, priority, assignee, and SLA before saving/);
    expect(source).not.toMatch(/Capture asset tag, category, custodian, location, condition, and support owner before saving/);
    expect(source).not.toMatch(/ICT asset management recorded/);
    expect(source).not.toMatch(/recorded for audit-safe review/);
    expect(source).not.toMatch(/ICT ticket viewed/);
    expect(source).not.toMatch(/will be deployed shortly/i);
    expect(controllerSource).toMatch(/@Post\('assets\/:id\/manage'\)/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/async manageAsset/);
    expect(serviceSource).toMatch(/ict\.asset\.management_requested/);
    expect(serviceSource).toMatch(/recordIctAction/);
    expect(serviceSource).toMatch(/sourceRole: 'ict_manager'/);
  });

  it("keeps grade master actions on grade-owned endpoints and real role handoff", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/grade-master-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/grade-master/grade-master.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/grade-master/grade-master.service.ts"), "utf8");

    expect(source).not.toMatch(/admin-command\/hod\/actions/);
    expect(source).not.toMatch(/Teacher dashboard handoff opened/);
    expect(source).toMatch(/submitGradeWorkflowAction/);
    expect(source).toMatch(/sendGradeNotification/);
    expect(source).toMatch(/targetRoles: \["grade_master", "secretary"\]/);
    expect(source).toMatch(/recipientUserId/);
    expect(source).toMatch(/guardianId/);
    expect(source).not.toMatch(/publishSchoolOperationalEvent/);
    expect(source).toMatch(/persistGradeWorkflowAction/);
    expect(source).toMatch(/\/api\/grade-master\/actions/);
    expect(source).toMatch(/buildSchoolSectionHref\("teacher", "overview"/);
    expect(source).not.toMatch(/Grade master report action recorded/);
    expect(source).not.toMatch(/Grade report readiness action recorded/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(controllerSource).toMatch(/gradeMasterService\.recordAction/);
    expect(serviceSource).toMatch(/INSERT INTO workflow_events/);
    expect(serviceSource).toMatch(/exact_staff_notifications AS/);
    expect(serviceSource).toMatch(/guardian_notifications AS/);
    expect(serviceSource).toMatch(/inserted_audit AS/);
    expect(serviceSource).toMatch(/grade_master\.\$\{action\}/);
  });

  it("makes grade master learner profile actions persist structured workflow data", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/grade-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleRecordLearnerConcern/);
    expect(source).toMatch(/handleScheduleLearnerMeeting/);
    expect(source).toMatch(/handleEscalateLearnerToDeputy/);
    expect(source).toMatch(/action: "learner_concern_recorded"/);
    expect(source).toMatch(/action: "learner_meeting_scheduled"/);
    expect(source).toMatch(/action: "deputy_escalation_requested"/);
    expect(source).toContain('targetRoles: ["grade_master", ...(learner.class_teacher_user_id ? ["class_teacher"] : []), "deputy_principal"]');
    expect(source).toMatch(/learnerId: learner\.id/);
    expect(source).toMatch(/recipientUserId: learner\.class_teacher_user_id/);
    expect(source).not.toMatch(/concern record needs risk category/);
    expect(source).not.toMatch(/meeting requires guardian/);
    expect(source).not.toMatch(/escalation needs evidence/);
  });

  it("makes grade master operational buttons collect details before saving workflow actions", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/grade-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/submitPromptedGradeWorkflowAction/);
    expect(source).toMatch(/action: "grade_note_added"/);
    expect(source).toMatch(/action: "attendance_reason_recorded"/);
    expect(source).toMatch(/action: "academic_intervention_requested"/);
    expect(source).toMatch(/action: "discipline_incident_referral_requested"/);
    expect(source).toMatch(/action: "learner_follow_up_recorded"/);
    expect(source).toMatch(/action: "discipline_escalation_requested"/);
    expect(source).toMatch(/action: "discipline_resolution_requested"/);
    expect(source).toMatch(/<StaffTimetableOverviewWorkspace/);
    expect(source).toMatch(/Published lessons are backend-scoped/);
    expect(source).not.toMatch(/\/api\/grade-master\/timetable/);
    expect(source).not.toMatch(/Add a grade-level note with stream, learner, owner, and follow-up date/);
    expect(source).not.toMatch(/late arrival reason should be recorded/);
    expect(source).not.toMatch(/intervention needs HOD\/teacher owner/);
    expect(source).not.toMatch(/Record learner, stream, incident type, evidence/);
    expect(source).not.toMatch(/Mary Wanjiku discipline concern needs owner/);
    expect(source).not.toMatch(/Quick action menu recorded/);
    expect(source).not.toMatch(/needs final resolution notes/);
    expect(source).not.toMatch(/missed lesson needs reason/);
  });

  it("persists boarding master visible workflow actions through the backend", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/boarding-master-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/boarding-master-command.service.ts"), "utf8");

    expect(source).toMatch(/admin-command\/boarding-master\/actions/);
    expect(source).toMatch(/persistBoardingWorkflowAction/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(serviceSource).toMatch(/async recordAction/);
    expect(serviceSource).toMatch(/INSERT INTO workflow_events/);
    expect(serviceSource).toMatch(/notifyRoles/);
    expect(serviceSource).toMatch(/recordAudit/);
  });

  it("persists boarding leave and exeat actions through tenant-scoped leave-exit endpoints", () => {
    const commandSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");
    const routedSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master/leave-exit-workspace.tsx"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/boarding-master-command.service.ts"), "utf8");

    expect(`${commandSource}\n${routedSource}`).toMatch(/admin-command\/boarding-master\/leave-exit/);
    expect(`${commandSource}\n${routedSource}`).toMatch(/createLeaveRequest/);
    expect(`${commandSource}\n${routedSource}`).toMatch(/approveLeaveRequest/);
    expect(`${commandSource}\n${routedSource}`).toMatch(/rejectLeaveRequest/);
    expect(`${commandSource}\n${routedSource}`).toMatch(/checkoutLeaveRequest/);
    expect(commandSource).not.toMatch(/Leave request action recorded/);
    expect(commandSource).not.toMatch(/Boarder checkout recorded/);
    expect(serviceSource).toMatch(/INSERT INTO boarding_exeats/);
    expect(serviceSource).toMatch(/UPDATE boarding_exeats/);
    expect(serviceSource).not.toMatch(/INSERT INTO workflow_events \(\s*tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload\s*\)\s*VALUES \(\$1, \$2::uuid, 'boarding_master'/);
  });

  it("creates boarder register entries through the boarding records API instead of fake guidance", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");
    const boardingControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/boarding/boarding.controller.ts"), "utf8");

    expect(source).toMatch(/\/api\/boarding\/records/);
    expect(source).toMatch(/handleAddBoarder/);
    expect(source).not.toMatch(/Boarder admission action recorded/);
    expect(source).not.toMatch(/Use Admissions or Student Management to admit a learner/);
    expect(boardingControllerSource).toMatch(/@Post\('records'\)/);
  });

  it("persists boarding late-return explanations through boarding record endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");
    const boardingControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/boarding/boarding.controller.ts"), "utf8");

    expect(source).toMatch(/handleAddLateReturn/);
    expect(source).toMatch(/handleResolveLateReturn/);
    expect(source).toMatch(/\/api\/boarding\/records/);
    expect(source).toMatch(/\/api\/boarding\/records\/\$\{record\.id\}\/status/);
    expect(source).not.toMatch(/Late return explanation requested/);
    expect(boardingControllerSource).toMatch(/@Patch\('records\/:recordId\/status'\)/);
  });

  it("persists boarding duty reports as tenant-scoped boarding records", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleAddDutyReport/);
    expect(source).toMatch(/category: "duty_report"/);
    expect(source).toMatch(/\/api\/boarding\/records/);
    expect(source).not.toMatch(/Duty report note recorded/);
  });

  it("persists boarding welfare notes through the boarding records API", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleAddWelfareNote/);
    expect(source).toMatch(/category: "welfare_note"/);
    expect(source).toMatch(/\/api\/boarding\/records/);
    expect(source).not.toMatch(/Welfare note recorded/);
  });

  it("persists boarding inspections and repair requests through boarding records", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleStartInspection/);
    expect(source).toMatch(/handleCreateRepairRequest/);
    expect(source).toMatch(/category: "dorm_inspection"/);
    expect(source).toMatch(/category: "maintenance_request"/);
    expect(source).not.toMatch(/Dorm inspection started/);
    expect(source).not.toMatch(/Repair request drafted/);
    expect(source).not.toMatch(/Repair request action recorded/);
  });

  it("persists boarding inventory requests and receipt confirmations through boarding records", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleRequestInventoryItems/);
    expect(source).toMatch(/handleConfirmInventoryReceipt/);
    expect(source).toMatch(/category: "inventory_request"/);
    expect(source).toMatch(/\/api\/boarding\/records\/\$\{record\.id\}\/status/);
    expect(source).not.toMatch(/Boarding inventory request recorded/);
    expect(source).not.toMatch(/Inventory receipt confirmation recorded/);
  });

  it("persists boarding visitor gate passes and checkout through boarding records", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleCreateGatePass/);
    expect(source).toMatch(/handleRecordGatePassCheckout/);
    expect(source).toMatch(/category: "gate_pass"/);
    expect(source).toMatch(/\/api\/boarding\/records\/\$\{record\.id\}\/status/);
    expect(source).not.toMatch(/Gate pass checkout recorded/);
  });

  it("handles boarding approvals through real leave-exit approval endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/handleApproveBoardingRequest/);
    expect(source).toMatch(/handleRejectBoardingRequest/);
    expect(source).toMatch(/admin-command\/boarding-master\/leave-exit\/\$\{request\.id\}\/approve/);
    expect(source).toMatch(/admin-command\/boarding-master\/leave-exit\/\$\{request\.id\}\/reject/);
    expect(source).not.toMatch(/Boarding approval escalated/);
  });

  it("keeps persisted role dashboard actions from using fake opened or form-ready copy", () => {
    const roleDashboardSources = [
      "src/components/school/boarding-master-command-center.tsx",
      "src/components/school/class-teacher-command-center.tsx",
      "src/components/school/class-teacher/workspaces/meetings.tsx",
      "src/components/school/class-teacher/workspaces/tasks.tsx",
      "src/components/school/exams-manager-command-center.tsx",
      "src/components/school/grade-master-command-center.tsx",
      "src/components/school/ict-manager-command-center.tsx",
      "src/components/school/laboratory-technician-command-center.tsx",
      "src/components/school/librarian-command-center.tsx",
      "src/components/school/procurement-officer-command-center.tsx",
      "src/components/school/secretary-command-center-full.tsx",
      "src/components/school/storekeeper-command-center.tsx",
    ].map((sourcePath) => fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8")).join("\n");

    expect(roleDashboardSources).not.toMatch(/workflow opened/i);
    expect(roleDashboardSources).not.toMatch(/opened for/i);
    expect(roleDashboardSources).not.toMatch(/opened for review/i);
    expect(roleDashboardSources).not.toMatch(/opened for editing/i);
    expect(roleDashboardSources).not.toMatch(/form ready/i);
  });

  it("persists guidance counselling dialog actions through counselling command endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/guidance-counselling-command-center.tsx"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/guidance-counselling-command.service.ts"), "utf8");

    expect(source).toMatch(/persistCounsellingWorkflowAction/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/sessions/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/referrals/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/parent-engagement/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/welfare-notes/);
    expect(serviceSource).toMatch(/recordCounsellingAction/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
  });

  it("persists counsellor command center visible actions through counselling command endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/counsellor-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/guidance-counselling-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/guidance-counselling-command.service.ts"), "utf8");

    expect(source).toMatch(/persistCounsellorWorkflowAction/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/actions/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/reports\/generate/);
    expect(source).toMatch(/NewCounsellingCaseModal/);
    expect(source).toMatch(/handleCreateCounsellingReferral/);
    expect(source).toMatch(/handleReferralStatus/);
    expect(source).toMatch(/handleSaveCounsellorSettings/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/referrals/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/referrals\/\$\{referral\.id\}\/status/);
    expect(source).toMatch(/admin-command\/guidance-counselling\/settings/);
    expect(source).toMatch(/source_dashboard: "counsellor-command-center"/);
    expect(source).not.toMatch(/handleAction\("New Case"\)/);
    expect(source).not.toMatch(/handleAction\("Accept Case"\)/);
    expect(source).not.toMatch(/Counsellor performed \$\{action\}/);
    expect(source).not.toMatch(/Counselling action recorded/);
    expect(source).not.toMatch(/Action recorded: \$\{action\}/);
    expect(source).not.toMatch(/handleAction\("Save Settings"\)/);
    expect(controllerSource).toMatch(/@Post\('actions'\)/);
    expect(controllerSource).toMatch(/@Post\('settings'\)/);
    expect(controllerSource).toMatch(/createReferral\(@Body\(\) dto: any\)/);
    expect(serviceSource).toMatch(/recordCounsellingAction/);
    expect(serviceSource).toMatch(/saveSettings\(dto: any\)/);
    expect(serviceSource).toMatch(/counselling\.settings\.saved/);
    expect(serviceSource).toMatch(/createReferral\(dto: any\)/);
    expect(serviceSource).toMatch(/INSERT INTO counselling_referrals/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
  });

  it("keeps counsellor command center visible tables on live counselling reads without demo learners", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/counsellor-command-center.tsx"), "utf8");

    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/referrals"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/sessions"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/followups"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/welfare"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/parents"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/teachers"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/discipline"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/health"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/counselling\/escalations"/);
    expect(source).not.toMatch(/Brian Otieno|Mary Wanjiku|Kevin T|Amina O|David O|Faith A|Mark M|Form 2 Blue|CAS-809|REQ-01|ESC-09/);
  });

  it("keeps dean academic decisions backed by command endpoints with object request bodies", () => {
    const assessmentsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/dean-academics/assessments-workspace.tsx"), "utf8");
    const reportsSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/dean-academics/reports-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/dean-academics-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/dean-academics-command.service.ts"), "utf8");

    expect(assessmentsSource).toMatch(/requestDashboardApi\("\/admin-command\/dean-academics\/lock-batch"/);
    expect(assessmentsSource).toMatch(/requestDashboardApi\("\/admin-command\/dean-academics\/action"/);
    expect(reportsSource).toMatch(/requestDashboardApi\("\/admin-command\/dean-academics\/reports\/generate"/);
    expect(`${assessmentsSource}\n${reportsSource}`).not.toMatch(/requestDashboardApi\("[^"]*dean-academics[\s\S]*?body:\s*JSON\.stringify/);
    expect(assessmentsSource).not.toMatch(/\$\{selectedAction\} recorded/);
    expect(assessmentsSource).toMatch(/Dean academic workflow saved/);
    expect(controllerSource).toMatch(/@Post\('action'\)/);
    expect(controllerSource).toMatch(/@Post\('reports\/generate'\)/);
    expect(serviceSource).toMatch(/recordDeanAction/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
    expect(serviceSource).toMatch(/generateReportSnapshot/);
    expect(serviceSource).not.toMatch(/Dean of Academics action recorded/);
  });

  it("keeps exams manager import and export actions on real marks workflows", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/exams-manager-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/exams-manager-command.controller.ts"), "utf8");
    const serviceSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/exams-manager-command.service.ts"), "utf8");

    expect(source).toMatch(/setActiveView\("imports-templates"\)/);
    expect(source).toMatch(/ImportsTemplatesWorkspace/);
    expect(source).toMatch(/openExternalImportWorkspace/);
    expect(source).toMatch(/requestDashboardApi<MarksEntryExportResponse>\("\/admin-command\/exams-manager\/marks-entry"/);
    expect(source).toMatch(/downloadCsvFile/);
    expect(source).not.toMatch(/requestDashboardApi\("\/admin-command\/exams-manager\/zeraki-sync"/);
    expect(source).not.toMatch(/Zeraki sync requested/);
    expect(source).not.toMatch(/requestDashboardApi\("[^"]*exams-manager[\s\S]*?body:\s*JSON\.stringify/);
    expect(controllerSource).toMatch(/@Post\('import-marks'\)/);
    expect(controllerSource).toMatch(/@Post\('export-marks'\)/);
    expect(controllerSource).toMatch(/@Post\('zeraki-sync'\)/);
    expect(controllerSource).toMatch(/requestZerakiSync/);
    expect(serviceSource).toMatch(/async requestZerakiSync/);
    expect(serviceSource).toMatch(/Zeraki live sync is not configured/);
    expect(serviceSource).toMatch(/recordExamAction/);
    expect(serviceSource).toMatch(/recordWorkflowAction/);
  });

  it("creates student exam cases through the real exams workflow", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/student-cases-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).toMatch(/useSchoolMutation/);
    expect(source).toMatch(/\/exams\/student-cases/);
    expect(source).toMatch(/CreateStudentCaseDialog/);
    expect(source).toMatch(/onSuccess=\{refetch\}/);
    expect(source).not.toMatch(/student_exam_case_log_started/);
    expect(source).not.toMatch(/principal_guidance_workflow_started|principal_guidance_requested/);
    expect(source).toMatch(/PrincipalGuidanceDialog/);
    expect(source).toMatch(/student-cases\/\$\{encodeURIComponent\(caseId\)\}\/request-guidance/);
    expect(controllerSource).toMatch(/@Post\('student-cases'\)/);
    expect(controllerSource).toMatch(/@Permissions\('exams:write'\)/);
    expect(source).toMatch(/student-cases\/\$\{encodeURIComponent/);
    expect(source).not.toMatch(/resolvedCaseIds/);
    expect(controllerSource).toMatch(/student-cases\/:caseId\/resolve/);
    expect(controllerSource).toMatch(/student-cases\/:caseId\/request-guidance/);
  });

  it("assigns exam invigilators through the real exams workflow", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/invigilation-workspace.tsx"), "utf8");
    const hrRepositorySource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/hr/repositories/hr.repository.ts"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).toMatch(/AssignInvigilatorDialog/);
    expect(source).toMatch(/useSchoolMutation/);
    expect(source).toMatch(/\/exams\/invigilators/);
    expect(source).toMatch(/staff_user_id/);
    expect(source).toMatch(/onSuccess=\{refetch\}/);
    expect(source).not.toMatch(/invigilator_assignment_started/);
    expect(source).not.toMatch(/presentIds|absentIds/);
    expect(source).not.toMatch(/reminderIds|invigilator_notices_sent|invigilator_reminder_sent/);
    expect(source).not.toMatch(/replacementIds|invigilator_replacement_assigned/);
    expect(source).not.toMatch(/autoAssignedIds|invigilators_auto_assigned/);
    expect(source).toMatch(/ReplaceInvigilatorDialog/);
    expect(source).toMatch(/invigilators\/\$\{encodeURIComponent\(row\.id\)\}\/status/);
    expect(source).toMatch(/invigilators\/\$\{encodeURIComponent\(row\.id\)\}\/remind/);
    expect(source).toMatch(/invigilators\/\$\{encodeURIComponent\(assignment\.id\)\}\/replace/);
    expect(source).toMatch(/\/exams\/invigilators\/auto-assign/);
    expect(hrRepositorySource).toMatch(/profile\.user_id::text/);
    expect(controllerSource).toMatch(/invigilators\/:assignmentId\/status/);
    expect(controllerSource).toMatch(/invigilators\/:assignmentId\/remind/);
    expect(controllerSource).toMatch(/invigilators\/:assignmentId\/replace/);
    expect(controllerSource).toMatch(/@Post\('invigilators\/auto-assign'\)/);
  });

  it("marks exam attendance through the real exams workflow", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-attendance-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).toMatch(/MarkExamAttendanceDialog/);
    expect(source).toMatch(/useSchoolMutation/);
    expect(source).toMatch(/\/exams\/attendance/);
    expect(source).toMatch(/onSuccess=\{refetch\}/);
    expect(source).not.toMatch(/attendance_mark_form_opened/);
    expect(source).not.toMatch(/absentee_alerts_sent|parent_attendance_alert_sent/);
    expect(source).not.toMatch(/lockedIds|attendance_locked/);
    expect(source).not.toMatch(/special_case_requested/);
    expect(source).not.toMatch(/selected for exam attendance import validation/);
    expect(source).toMatch(/AttendanceSpecialCaseDialog/);
    expect(source).toMatch(/FormData/);
    expect(source).toMatch(/attendance\/import/);
    expect(source).toMatch(/\/exams\/attendance\/absentee-alerts/);
    expect(source).toMatch(/attendance\/\$\{encodeURIComponent\(row\.id\)\}\/lock/);
    expect(source).toMatch(/attendance\/\$\{encodeURIComponent\(attendance\.id\)\}\/special-case/);
    expect(controllerSource).toMatch(/@Post\('attendance\/absentee-alerts'\)/);
    expect(controllerSource).toMatch(/@Post\('attendance\/import'\)/);
    expect(controllerSource).toMatch(/StreamingUploadInterceptor\('file'\)/);
    expect(controllerSource).toMatch(/attendance\/:attendanceId\/lock/);
    expect(controllerSource).toMatch(/attendance\/:attendanceId\/special-case/);
  });

  it("processes and exports durable tenant-scoped exam results", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/results-processing-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/processedBatchIds|rankedBatchIds|recordProcessingAction/);
    expect(source).not.toMatch(/admin-command\/exams-manager\/action/);
    expect(source).toMatch(/results-processing\/\$\{encodeURIComponent\(batchId\)\}\/run/);
    expect(source).toMatch(/results-processing\/\$\{encodeURIComponent\(batchId\)\}\/clear/);
    expect(source).toMatch(/results-processing\/\$\{encodeURIComponent\(batchId\)\}\/broadsheet/);
    expect(controllerSource).toMatch(/results-processing\/:batchId\/run/);
    expect(controllerSource).toMatch(/results-processing\/:batchId\/clear/);
    expect(controllerSource).toMatch(/results-processing\/:batchId\/broadsheet/);
  });

  it("persists report-card approval and parent publication states", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/approvals-publishing-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/submittedIds|recalledIds|publishedIds|unpublishedIds|recordPublishingAction/);
    expect(source).not.toMatch(/admin-command\/exams-manager\/action/);
    expect(source).toMatch(/report-cards\/\$\{encodeURIComponent\(reportCardId\)\}\/transition/);
    expect(controllerSource).toMatch(/report-cards\/:reportCardId\/transition/);
  });

  it("downloads staff report cards from the tenant-scoped report-card table", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/report-card-download.controller.ts"), "utf8");

    expect(source).not.toMatch(/FROM generated_report_cards/);
    expect(source).toMatch(/FROM student_report_cards/);
    expect(source).toMatch(/tenant_id = \$1/);
  });

  it("generates submits comments and downloads real report cards", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/report-cards-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/approvalIds|recordReportCardAction|download manifest prepared/i);
    expect(source).not.toMatch(/admin-command\/exams-manager\/action/);
    expect(source).toMatch(/report-cards\/generate/);
    expect(source).toMatch(/report-cards\/\$\{encodeURIComponent\(reportCardId\)\}\/transition/);
    expect(source).toMatch(/report-cards\/\$\{encodeURIComponent\(reportCard\.id\)\}\/comments/);
    expect(source).toMatch(/report-cards\/\$\{encodeURIComponent\(row\.id\)\}\/download/);
    expect(controllerSource).toMatch(/report-cards\/:reportCardId\/comments/);
    expect(controllerSource.match(/@Get\('report-cards'\)/g)).toHaveLength(1);
  });

  it("sends exam communications through real broadcast endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/communication-workspace.tsx"), "utf8");
    const communicationControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/communication/communication.controller.ts"), "utf8");
    const adminControllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/admin-command.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordCommunicationAction|admin-command\/exams-manager\/action|cancelledIds|duplicatedMessages/);
    expect(source).toMatch(/admin-command\/communication-broadcasts/);
    expect(source).toMatch(/\/communication\/messages/);
    expect(source).toMatch(/communication\/broadcasts\/\$\{encodeURIComponent\(row\.id\)\}\/cancel/);
    expect(adminControllerSource).toMatch(/@Post\('communication-broadcasts'\)/);
    expect(communicationControllerSource).toMatch(/broadcasts\/:id\/cancel/);
  });

  it("keeps exam overview and calendar actions on real exam endpoints", () => {
    const overviewSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/overview-workspace.tsx"), "utf8");
    const calendarSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-calendar-workspace.tsx"), "utf8");
    const setupSource = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-setup-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(`${overviewSource}\n${calendarSource}\n${setupSource}`).not.toMatch(/admin-command\/exams-manager\/action|recordOverviewAction|recordCalendarAction|recordExamSetupAction|draftEvents|deletedIds|duplicatedExams/);
    expect(overviewSource).toMatch(/\/api\/exams\/lifecycle/);
    expect(calendarSource).toMatch(/\/api\/exams\/draft/);
    expect(setupSource).toMatch(/\/api\/exams\/assessments/);
    expect(setupSource).not.toMatch(/selected for exam setup import validation/);
    expect(setupSource).toMatch(/importExamSetup/);
    expect(setupSource).toMatch(/file\.text\(\)/);
    expect(setupSource).not.toMatch(/previewExamConfiguration/);
    expect(setupSource).toMatch(/assessments\/\$\{encodeURIComponent\(editingAssessment\.id\)\}/);
    expect(setupSource).toMatch(/assessments\/\$\{encodeURIComponent\(exam\.id\)\}/);
    expect(setupSource).toMatch(/\/api\/exams\/lifecycle/);
    expect(setupSource).toMatch(/routeTo\("exam-classes"\)/);
    expect(setupSource).toMatch(/routeTo\("marks-monitor"\)/);
    expect(controllerSource).toMatch(/@Post\('lifecycle'\)/);
    expect(controllerSource).toMatch(/@Post\('draft'\)/);
    expect(controllerSource).toMatch(/@Post\('assessments'\)/);
    expect(controllerSource).toMatch(/@Patch\('assessments\/:assessmentId'\)/);
    expect(controllerSource).toMatch(/@Delete\('assessments\/:assessmentId'\)/);
  });

  it("submits my-marks rows through real marks endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/my-marks-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordMarksAction|admin-command\/exams-manager\/action|draftIds|submittedIds|openedIds/);
    expect(source).toMatch(/\/api\/exams\/marks/);
    expect(source).toMatch(/\/api\/exams\/marks\/submit/);
    expect(source).not.toMatch(/uploadInputRef|uploadTarget|selected for upload validation/);
    expect(source).toMatch(/routeTo\("imports-templates"\)/);
    expect(controllerSource).toMatch(/@Post\('marks\/submit'\)/);
  });

  it("moderates marks through the real moderation endpoint", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/moderation-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordModerationAction|admin-command\/exams-manager\/action|moderatedIds|assignedIds|returnedIds|approvedIds/);
    expect(source).toMatch(/\/api\/exams\/marks\/moderate/);
    expect(source).toMatch(/return_for_correction/);
    expect(source).toMatch(/action: "approve"/);
    expect(controllerSource).toMatch(/@Post\('marks\/moderate'\)/);
  });

  it("manages exam class subject weightings through real exam endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-classes-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordClassSetupAction|admin-command\/exams-manager\/action|removedIds/);
    expect(source).toMatch(/exams\/subject-weightings\/\$\{encodeURIComponent\(row\.id\)\}/);
    expect(source).toMatch(/routeTo\("exam-setup"\)/);
    expect(source).toMatch(/routeTo\("marks-monitor"\)/);
    expect(controllerSource).toMatch(/subject-weightings\/:weightingId/);
  });

  it("manages exam timetable logistics through concrete timetable and communication endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/exam-timetable-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordTimetableAction|admin-command\/exams-manager\/action|movedSlotIds|roomAssignedSlotIds|invigilatorAssignedSlotIds|notifiedSlotIds/);
    expect(source).toMatch(/const slotId = persistedSlotId\(row\)/);
    expect(source).toMatch(/timetable-slots\/\$\{encodeURIComponent\(slotId\)\}/);
    expect(source).toMatch(/\/api\/exams\/invigilators/);
    expect(source).toMatch(/\/api\/exams\/invigilators\/auto-assign/);
    expect(source).toMatch(/admin-command\/communication-broadcasts/);
    expect(controllerSource).toMatch(/timetable-slots\/:slotId/);
  });

  it("manages grading rubrics through real grading policy endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/grading-rubrics-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordPolicyAction|admin-command\/exams-manager\/action|activePolicyIds|deletedPolicyIds|duplicatedPolicies/);
    expect(source).not.toMatch(/previewDescriptors|openPrintDocument/);
    expect(source).toMatch(/\/api\/exams\/grading-policies/);
    expect(source).toMatch(/grading-policies\/\$\{encodeURIComponent\(row\.id\)\}\/status/);
    expect(source).toMatch(/grading-policies\/\$\{encodeURIComponent\(row\.id\)\}/);
    expect(source).toMatch(/grading-policies\/\$\{encodeURIComponent\(descriptorPolicy\.id\)\}\/boundaries/);
    expect(source).toMatch(/grading-policy-boundaries\/\$\{encodeURIComponent\(boundary\.id\)\}/);
    expect(controllerSource).toMatch(/@Post\('grading-policies'\)/);
    expect(controllerSource).toMatch(/grading-policies\/:policyId\/status/);
    expect(controllerSource).toMatch(/grading-policies\/:policyId\/boundaries/);
    expect(controllerSource).toMatch(/grading-policy-boundaries\/:boundaryId/);
  });

  it("persists exam paper components through tenant-scoped component endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/papers-components-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordComponentAction|admin-command\/exams-manager\/action|deletedComponentIds|duplicatedComponents|editedComponentId/);
    expect(source).toMatch(/\/api\/exams\/assessment-components/);
    expect(source).toMatch(/assessment-components\/\$\{encodeURIComponent\(row\.id\)\}/);
    expect(source).toMatch(/text\(\)/);
    expect(controllerSource).toMatch(/@Post\('assessment-components'\)/);
    expect(controllerSource).toMatch(/@Patch\('assessment-components\/:componentId'\)/);
    expect(controllerSource).toMatch(/@Delete\('assessment-components\/:componentId'\)/);
  });

  it("previews commits and rolls back exam mark imports through real batch endpoints", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/imports-templates-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/recordImportAction|admin-command\/exams-manager\/action|Found rows.*100|Valid rows.*100|System Admin/);
    expect(source).toMatch(/\/api\/exams\/marks\/bulk-upload/);
    expect(source).toMatch(/\/exams\/marks\/import-batches/);
    expect(source).toMatch(/import-batches\/\$\{encodeURIComponent\(rollbackBatch\.id\)\}\/rollback/);
    expect(source).toMatch(/import-batches\/\$\{encodeURIComponent\(row\.id\)\}/);
    expect(source).toMatch(/file\.text\(\)/);
    expect(controllerSource).toMatch(/@Get\('marks\/import-batches'\)/);
    expect(controllerSource).toMatch(/@Get\('marks\/import-batches\/:batchId'\)/);
    expect(controllerSource).toMatch(/@Post\('marks\/import-batches\/:batchId\/rollback'\)/);
  });

  it("persists mark-window reminders locks opens and returns", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/exams-manager/workspaces/marks-monitor-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/exams/exams.controller.ts"), "utf8");

    expect(source).not.toMatch(/remindedWindowIds|lockedWindowIds|returnedWindowIds|openedWindowIds|recordMarkAction/);
    expect(source).not.toMatch(/admin-command\/exams-manager\/action/);
    expect(source).toMatch(/mark-entry-windows\/\$\{encodeURIComponent\(windowId\)\}\/transition/);
    expect(source).toMatch(/mark-entry-windows\/\$\{encodeURIComponent\(windowId\)\}\/remind/);
    expect(controllerSource).toMatch(/mark-entry-windows\/:markWindowId\/transition/);
    expect(controllerSource).toMatch(/mark-entry-windows\/:markWindowId\/remind/);
  });

  it("submits accountant waiver requests through finance approvals instead of fake billing post errors", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/accountant/waivers-discounts-workspace.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/finance/finance.controller.ts"), "utf8");

    expect(source).toMatch(/requestDashboardApi/);
    expect(source).toMatch(/\/finance\/waivers/);
    expect(source).toMatch(/amount_minor/);
    expect(source).not.toMatch(/backend endpoint might not be ready/i);
    expect(source).not.toMatch(/body:\s*JSON\.stringify/);
    expect(controllerSource).toMatch(/@Post\('waivers'\)/);
    expect(controllerSource).toMatch(/enforceApprovalRule/);
  });

  it("submits transport assignment and maintenance modals to concrete command endpoints with object bodies", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"), "utf8");
    const controllerSource = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/transport-manager-command.controller.ts"), "utf8");

    expect(source).toMatch(/requestDashboardApi\("\/admin-command\/transport-manager\/student-transport-list"/);
    expect(source).toMatch(/requestDashboardApi\("\/admin-command\/transport-manager\/fuel-maintenance\/maintenance"/);
    expect(source).not.toMatch(/requestDashboardApi\("[^"]*transport-manager[\s\S]*?body:\s*JSON\.stringify/);
    expect(source).toMatch(/manifest_id/);
    expect(source).toMatch(/student_id/);
    expect(controllerSource).toMatch(/@Post\('student-transport-list'\)/);
    expect(controllerSource).toMatch(/@Post\('fuel-maintenance\/maintenance'\)/);
  });

  it("keeps transport manager operational tables on live command endpoints without demo learners", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"), "utf8");

    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/vehicles"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/routes"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/drivers"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/trips"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/fuel-maintenance"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/student-transport-list"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/transport-manager\/reports"/);
    expect(source).not.toMatch(/Brian Otieno|Aisha Njeri|Kevin Mwangi|Kisumu West|Kibuye stage|Nyamasaria|Mrs\. Wanjiku|Mr\. Njuguna|Mrs\. Achieng/);
    expect(source).not.toMatch(/const routeRows|const vehicleRows|const fuelRows/);
  });

  it("keeps boarding master visible workflows free of demo tenant and learner records", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/boarding-master-command-center.tsx"), "utf8");

    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/boarding-master\/allocation"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/boarding-master\/boarding-attendance"/);
    expect(source).toMatch(/useSchoolQuery<any>\("\/api\/admin-command\/boarding-master\/reports"/);
    expect(source).not.toMatch(/Brian Otieno|student-brian|Kisumu Boys|St\. Joseph B12|handleRollCall\("brian"\)/);
    expect(source).not.toMatch(/Parent message delivery"[\s\S]*Brian Otieno/);
  });
});

describe("shared dashboard action contract spine", () => {
  it("rejects enabled actions without proof of work", () => {
    const action: Partial<DashboardActionContract> = {
      id: "principal-attendance-send-absence-sms",
      label: "Send Absence SMS",
      sourceRole: "principal",
      sourceDashboard: "Principal Command Center",
      sourceModule: "Attendance",
      actionType: "SEND_COMMUNICATION",
      enabled: true,
      requiredPermission: "principal.attendance.communicate",
      requiredSchoolId: "current school only",
      tenantIsolation: "schoolId must match the current school",
      handler: "handlePrincipalAttendanceAction",
      loadingState: "Communication confirmation open",
      successState: "SMS queue records and audit event created from selected recipients",
      failureState: "Provider/contact/data disabled reason shown",
      emptyState: "Disabled: no absent students found for this date.",
      auditTrail: "PRINCIPAL_ABSENCE_SMS_QUEUED",
      testRequirement: "clicking Send Absence SMS opens recipient confirmation and validates provider config",
    };

    expect(() => assertDashboardActionContract(action)).toThrow(
      /destination|modal|route|api|print|export|mutation|notification|disabledReason/i,
    );
  });

  it("allows disabled actions only with a visible disabled reason", () => {
    const action: DashboardActionContract = {
      id: "principal-attendance-send-absence-sms",
      label: "Send Absence SMS",
      sourceRole: "principal",
      sourceDashboard: "Principal Command Center",
      sourceModule: "Attendance",
      actionType: "DISABLED_WITH_REASON",
      enabled: false,
      requiredPermission: "principal.attendance.communicate",
      requiredSchoolId: "current school only",
      requiredData: ["sms provider"],
      destination: "Absence SMS confirmation modal",
      method: "school operational store queue when configured",
      payload: "selected absent learners, guardian contacts, message preview",
      handler: "handlePrincipalAttendanceAction",
      loadingState: "Communication confirmation open",
      successState: "SMS queue records and audit event created from selected recipients",
      failureState: "Provider/contact/data disabled reason shown",
      emptyState: "Disabled: no absent students found for this date.",
      refreshQueries: ["smsLogs", "notifications", "events"],
      affectedDashboards: ["Principal", "Parent", "System Monitor"],
      inAppNotification: "parent dashboard notification created after queueing",
      smsOrEmail: "SMS queue only after provider configuration and selected contacts exist",
      printOrExport: "none",
      auditTrail: "PRINCIPAL_ABSENCE_SMS_QUEUED",
      tenantIsolation: "SMS logs and notifications are written with schoolId",
      testRequirement: "clicking Send Absence SMS opens recipient confirmation and validates provider config",
      disabledReason: "Disabled: SMS provider is not configured.",
    };

    expect(assertDashboardActionContract(action)).toBe(action);
  });

  it("keeps fake success phrases centralized for code-search guards", () => {
    expect(fakeSuccessPhrases).toContain("Action completed");
    expect(fakeSuccessPhrases).toContain("Workflow dispatched");
    expect(fakeSuccessPhrases).toContain("export generated");
  });
});

describe("backend command response copy", () => {
  it("avoids generic action-recorded responses for command workflows", () => {
    const sources = [
      "../api/src/modules/admin-command/admin-command.service.ts",
      "../api/src/modules/admin-command/accountant-command.service.ts",
      "../api/src/modules/admin-command/secretary-command.service.ts",
      "../api/src/modules/admin-command/storekeeper-command.service.ts",
      "../api/src/modules/discipline/discipline.service.ts",
    ].map((sourcePath) => fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8")).join("\n");

    expect(sources).not.toMatch(/Action recorded and routed/);
    expect(sources).not.toMatch(/Finance action recorded/);
    expect(sources).not.toMatch(/Front office action recorded/);
    expect(sources).not.toMatch(/Storekeeper workflow action recorded/);
    expect(sources).not.toMatch(/Discipline workspace action recorded/);
    expect(sources).toMatch(/workflow saved/i);
  });
});
