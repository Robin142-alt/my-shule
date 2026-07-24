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
});
