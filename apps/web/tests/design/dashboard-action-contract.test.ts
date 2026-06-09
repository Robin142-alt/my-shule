import fs from "node:fs";
import path from "node:path";

import { principalAttendanceActionContracts } from "@/components/school/principal-practical-dashboard";
import {
  assertDashboardActionContract,
  fakeSuccessPhrases,
  type DashboardActionContract,
} from "@/lib/dashboard/dashboard-action-contract";

describe("dashboard action contract safety", () => {
  it("defines proof-based contracts for principal attendance actions", () => {
    expect(principalAttendanceActionContracts).toHaveLength(3);

    for (const contract of principalAttendanceActionContracts) {
      expect(contract.id).toBeTruthy();
      expect(contract.label).toBeTruthy();
      expect(contract.sourceRole).toBe("principal");
      expect(contract.sourceDashboard).toBeTruthy();
      expect(contract.sourceModule).toBe("Attendance");
      expect(contract.actionType).toMatch(/OPEN_WORKSPACE|SEND_COMMUNICATION|PRINT_PREVIEW/);
      expect(contract.requiredPermission).toBeTruthy();
      expect(contract.requiredSchoolId).toMatch(/current school/i);
      expect(contract.requiredData.length).toBeGreaterThan(0);
      expect(contract.destination).toBeTruthy();
      expect(contract.handler).toBeTruthy();
      expect(contract.loadingState).toBeTruthy();
      expect(contract.successState).toBeTruthy();
      expect(contract.failureState).toBeTruthy();
      expect(contract.emptyState).toBeTruthy();
      expect(contract.auditTrail).toBeTruthy();
      expect(contract.tenantIsolation).toMatch(/schoolId|school-scoped|current school/i);
      expect(contract.testRequirement).toBeTruthy();
    }
  });

  it("does not leave principal attendance actions on fake-only success phrases", () => {
    const sourcePath = path.join(process.cwd(), "src/components/school/principal-practical-dashboard.tsx");
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/is being sent from \${section\.label}/);
    expect(source).not.toMatch(/completed from \${section\.label}/);
    expect(source).not.toMatch(/Opened Attendance/);
    expect(source).not.toMatch(/Print Attendance Report completed from Attendance/);
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

    expect(source).not.toMatch(/form opened/i);
    expect(source).not.toMatch(/opened for printing/i);
    expect(source).not.toMatch(/\$\{record\.label\} opened/);
    expect(source).toMatch(/form ready/);
    expect(source).toMatch(/print preview ready/);
  });

  it("keeps storekeeper alert actions review-based instead of fake opened notices", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/storekeeper-command-center.tsx"), "utf8");

    expect(source).not.toMatch(/opened for \${alert\.title}/);
    expect(source).not.toMatch(/bulk approval review opened/i);
    expect(source).not.toMatch(/urgency filters opened/i);
    expect(source).not.toMatch(/opened from inventory insights/i);
    expect(source).not.toMatch(/opened in store records/i);
    expect(source).toMatch(/review ready/);
    expect(source).toMatch(/Purchase order drafted/);
  });

  it("keeps transport manager actions planning-based instead of fake opened notices", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"), "utf8");

    expect(source).not.toMatch(/opened for route planning/i);
    expect(source).not.toMatch(/template opened for parent SMS/i);
    expect(source).not.toMatch(/report option opened/i);
    expect(source).not.toMatch(/\$\{getViewLabel\(view\)\} opened/);
    expect(source).toMatch(/planning workspace ready/);
    expect(source).toMatch(/parent SMS template ready for review/);
  });

  it("uses print-preview language for shared role print actions", () => {
    const sharedSource = fs.readFileSync(path.join(process.cwd(), "src/components/school/role-operational-command-center.tsx"), "utf8");
    const securitySource = fs.readFileSync(path.join(process.cwd(), "src/components/school/security-command-center.tsx"), "utf8");

    expect(sharedSource).not.toMatch(/opened for printing/i);
    expect(securitySource).not.toMatch(/opened for printing/i);
    expect(sharedSource).toMatch(/print preview ready/i);
    expect(securitySource).toMatch(/print preview ready/i);
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
