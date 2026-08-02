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

describe("accountant command center contract", () => {
  it("routes accountant and bursar through the dedicated command center", () => {
    const schoolPages = readWeb("src/components/school/school-pages.tsx");
    const commandCenter = readWeb("src/components/school/accountant-command-center.tsx");

    expect(schoolPages).toContain("<AccountantCommandCenter");
    expect(schoolPages).toContain('role === "accountant" || role === "bursar"');
    expect(commandCenter).toContain('data-testid="accountant-command-center"');
    expect(commandCenter).toContain("IntegratedSchoolCommandHeader");
    expect(commandCenter).toContain("AccountantOverviewWorkspace");
  });

  it("uses a live tenant-scoped overview without legacy demo metrics", () => {
    const overview = readWeb("src/components/school/accountant/overview-workspace.tsx");
    const practicalProfiles = readWeb("src/lib/school/role-practical-ui.ts");
    const accountantProfile = practicalProfiles.slice(
      practicalProfiles.indexOf("const accountantProfile"),
      practicalProfiles.indexOf("const teacherProfile"),
    );

    expect(overview).toContain('/admin-command/accountant/overview');
    expect(overview).toContain("No school finance records yet");
    expect(accountantProfile).toContain("summaryCards: []");
    expect(accountantProfile).toContain("urgentAlerts: []");
    expect(`${overview}\n${accountantProfile}`).not.toMatch(
      /248,500|M-Pesa Confirmed|Balances Above KSh 10k|Receipts Printed/i,
    );
  });

  it("binds the overview backend to the authenticated tenant", () => {
    const controller = readRepo(
      "apps/api/src/modules/admin-command/accountant-command.controller.ts",
    );
    const service = readRepo(
      "apps/api/src/modules/admin-command/accountant-command.service.ts",
    );

    expect(controller).toContain("@Get('overview')");
    expect(controller).toContain("return this.service.getOverview();");
    expect(service).toContain("async getOverview()");
    expect(service).toContain("this.prisma.executeWithTenant");
    expect(service).toContain("WHERE tenant_id = $1");
    expect(service).toMatch(/,\s*tenantId,\s*\);/);
  });

  it("provides a tenant-scoped expense register with validated approval submission", () => {
    const workspace = readWeb("src/components/school/accountant/expenses-workspace.tsx");
    const controller = readRepo("apps/api/src/modules/admin-command/accountant-command.controller.ts");
    const service = readRepo("apps/api/src/modules/admin-command/accountant-command.service.ts");
    const dto = readRepo("apps/api/src/modules/admin-command/dto/create-accountant-expense.dto.ts");

    expect(workspace).toContain('"/admin-command/accountant/expenses"');
    expect(workspace).toContain("Submit for approval");
    expect(workspace).toContain("Expense register");
    expect(controller).toContain("@Post('expenses')");
    expect(controller).toContain("@Permissions('finance:write')");
    expect(service).toContain("INSERT INTO school_expenses");
    expect(service).toContain("WHERE tenant_id = $1");
    expect(service).toContain("expense_submitted");
    expect(service).not.toContain("finance_expenses");
    expect(dto).toContain("@Matches(/^[1-9][0-9]*$/");
  });

  it("turns arrears into a searchable statement and guardian follow-up worklist", () => {
    const workspace = readWeb("src/components/school/accountant/arrears-workspace.tsx");

    expect(workspace).toContain("Collection worklist");
    expect(workspace).toContain("student_arrears_reminder_requested");
    expect(workspace).toContain("/statement/export");
    expect(workspace).toContain("openPrintDocument");
    expect(workspace).toContain("total_balance_minor: addMinor");
  });

  it("generates truthful previewable finance report artifacts", () => {
    const workspace = readWeb("src/components/school/accountant/reports-workspace.tsx");
    const billingController = readRepo("apps/api/src/modules/billing/billing.controller.ts");
    const billingService = readRepo("apps/api/src/modules/billing/billing.service.ts");

    expect(workspace).toContain("Preview & print");
    expect(workspace).toContain("Download CSV");
    expect(workspace).toContain("openPrintDocument");
    expect(workspace).toContain("checksum_sha256");
    expect(billingController).toContain("return this.billingService.exportStudentBalancesCsv()");
    expect(billingService).toContain("async exportStudentBalancesCsv");
    expect(billingService).toContain("createCsvReportArtifact");
    expect(billingController).not.toContain("For now return raw JSON from listStudentBalances");
  });

  it("selects fee waiver learners from live school accounts", () => {
    const workspace = readWeb("src/components/school/accountant/waivers-discounts-workspace.tsx");
    const controller = readRepo("apps/api/src/modules/finance/finance.controller.ts");

    expect(workspace).toContain("Learner fee account");
    expect(workspace).toContain('/api/finance/waivers');
    expect(workspace).toContain('/api/billing/student-balances?limit=50');
    expect(workspace).not.toContain("Student ID / Name");
    expect(controller).toContain("async listWaivers()");
    expect(controller).toContain("FROM tenant_pending_waivers");
  });
});
