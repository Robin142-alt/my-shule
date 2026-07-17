import fs from "node:fs";
import path from "node:path";

const schoolComponent = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), "src/components/school", file), "utf8");

describe("school role command identity", () => {
  const integratedRoleCommandCenters = [
    "accountant-command-center.tsx",
    "admissions-dashboard/admissions-dashboard-command-center.tsx",
    "boarding-master-command-center.tsx",
    "class-teacher-command-center.tsx",
    "counsellor-command-center.tsx",
    "dean-academics-command-center.tsx",
    "discipline-master-command-center.tsx",
    "exams-manager-command-center.tsx",
    "grade-master-command-center.tsx",
    "hod-command-center.tsx",
    "ict-manager-command-center.tsx",
    "laboratory-technician-command-center.tsx",
    "librarian-command-center.tsx",
    "nurse-command-center.tsx",
    "procurement-officer-command-center.tsx",
    "role-operational-command-center.tsx",
    "secretary-command-center-full.tsx",
    "security-command-center.tsx",
    "storekeeper-command-center.tsx",
    "student-command-center.tsx",
    "teacher-command-center.tsx",
    "transport-manager-command-center.tsx",
  ];

  it.each(integratedRoleCommandCenters)("uses the integrated live-school header in %s", (file) => {
    expect(schoolComponent(file)).toMatch(/IntegratedSchoolCommandHeader/);
  });

  it("loads one tenant-scoped identity contract for all routed school roles", () => {
    const shellSource = schoolComponent("school-pages.tsx");
    const identitySource = schoolComponent("integrated-school-command-header.tsx");

    expect(shellSource).toMatch(/SchoolCommandIdentityProvider/);
    expect(shellSource).toMatch(/tenantSlug=\{tenantSlug\}/);
    expect(shellSource).toMatch(/userLabel=\{userLabel\}/);
    expect(identitySource).toMatch(/useSchoolQuery<SchoolIdentityResponse>\("\/school\/identity"/);
    expect(identitySource).toMatch(/DashboardGreeting/);
    expect(identitySource).toMatch(/logoUrl/);
    expect(identitySource).toMatch(/schoolName/);
  });

  it("keeps tenant identity visible in dedicated command sidebars", () => {
    const sidebarFiles = integratedRoleCommandCenters.filter((file) => ![
      "accountant-command-center.tsx",
      "role-operational-command-center.tsx",
      "student-command-center.tsx",
    ].includes(file));

    for (const file of sidebarFiles) {
      expect(schoolComponent(file)).toMatch(/SchoolCommandSidebarIdentity/);
    }
  });

  it("keeps principal and deputy greetings bound to their live school identity", () => {
    for (const file of ["principal-command-center.tsx", "deputy-principal-command-center.tsx"]) {
      const source = schoolComponent(file);
      expect(source).toMatch(/DashboardGreeting/);
      expect(source).toMatch(/schoolName/);
      expect(source).toMatch(/logoUrl/);
    }
  });

  it("does not restore hard-coded person greetings or demo school identity", () => {
    const combined = integratedRoleCommandCenters.map(schoolComponent).join("\n");

    expect(combined).not.toMatch(/Good (Morning|Afternoon|Evening), (Mr\. Otieno|Counsellor|Discipline Master)/i);
    expect(combined).not.toMatch(/Kisumu Boys command center/i);
  });
});
