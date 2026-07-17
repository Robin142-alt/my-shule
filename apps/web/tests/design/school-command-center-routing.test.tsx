import { screen } from "@testing-library/react";
import { createElement } from "react";

import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolRoleAlias } from "@/lib/auth/school-role-normalization";

import { renderWithProviders } from "./test-utils";

jest.mock("@/components/school/role-operational-command-center", () => ({
  RoleOperationalCommandCenter: ({ role }: { role: string }) => (
    <div data-testid="role-operational-command-center">Generic {role}</div>
  ),
}));

jest.mock("@/components/school/deputy-principal-command-center", () => ({
  DeputyPrincipalCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="deputy-principal-command-center">Deputy {activeSection}</div>
  ),
}));

jest.mock("@/components/school/secretary-command-center-full", () => ({
  SecretaryCommandCenterFull: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="secretary-command-center">Secretary {activeSection}</div>
  ),
}));

jest.mock("@/components/school/accountant-command-center", () => ({
  AccountantCommandCenter: ({ role, activeSection }: { role: string; activeSection?: string }) => (
    <div data-testid="accountant-command-center">{role} {activeSection}</div>
  ),
}));

jest.mock("@/components/school/dean-academics-command-center", () => ({
  DeanAcademicsCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="dean-academics-command-center">Dean {activeSection}</div>
  ),
}));

jest.mock("@/components/school/exams-manager-command-center", () => ({
  ExamsManagerCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="exams-manager-command-center">Exams {activeSection}</div>
  ),
}));

jest.mock("@/components/school/hod-command-center", () => ({
  HodCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="hod-command-center">HOD {activeSection}</div>
  ),
}));

jest.mock("@/components/school/grade-master-command-center", () => ({
  GradeMasterCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="grade-master-command-center">Grade {activeSection}</div>
  ),
}));

jest.mock("@/components/school/class-teacher-command-center", () => ({
  ClassTeacherCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="class-teacher-command-center">Class Teacher {activeSection}</div>
  ),
}));

jest.mock("@/components/school/storekeeper-command-center", () => ({
  StorekeeperCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="storekeeper-command-center">Store {activeSection}</div>
  ),
}));

jest.mock("@/components/school/librarian-command-center", () => ({
  LibrarianCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="librarian-command-center">Library {activeSection}</div>
  ),
}));

jest.mock("@/components/school/nurse-command-center", () => ({
  NurseCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="nurse-command-center">Nurse {activeSection}</div>
  ),
}));

jest.mock("@/components/school/boarding-master-command-center", () => ({
  BoardingMasterCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="boarding-master-command-center">Boarding {activeSection}</div>
  ),
}));

jest.mock("@/components/school/security-command-center", () => ({
  SecurityCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="security-command-center">Security {activeSection}</div>
  ),
}));

jest.mock("@/components/school/transport-manager-command-center", () => ({
  TransportManagerCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="transport-manager-command-center">Transport {activeSection}</div>
  ),
}));

jest.mock("@/components/school/laboratory-technician-command-center", () => ({
  LaboratoryTechnicianCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="laboratory-technician-command-center">Lab {activeSection}</div>
  ),
}));

jest.mock("@/components/school/counsellor-command-center", () => ({
  CounsellorCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="counsellor-command-center">Counselling {activeSection}</div>
  ),
}));

jest.mock("@/components/school/discipline-master-command-center", () => ({
  DisciplineMasterCommandCenter: ({ activeSection }: { activeSection?: string }) => (
    <div data-testid="discipline-master-command-center">Discipline {activeSection}</div>
  ),
}));

const dedicatedRoleCases = [
  ["deputy-principal", "deputy-principal-command-center"],
  ["dean-academics", "dean-academics-command-center"],
  ["exams-manager", "exams-manager-command-center"],
  ["hod", "hod-command-center"],
  ["grade-master", "grade-master-command-center"],
] as const;

const sharedFallbackRoleCases = [
  "secretary",
  "accountant",
  "bursar",
  "class-teacher",
  "admin",
  "storekeeper",
  "librarian",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
  "guidance-counselling",
  "discipline-master",
] as const;

describe("school command center routing", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;
  });

  it.each(dedicatedRoleCases)(
    "routes %s dashboard to the new dedicated command center",
    async (role, testId) => {
      renderWithProviders(
        createElement(SchoolPages, {
          role,
          section: "dashboard",
          tenantSlug: "homabay-high",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      expect(await screen.findByTestId(testId)).toBeVisible();
      expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
    },
  );

  it.each(sharedFallbackRoleCases)(
    "routes %s through the tenant-clean shared fallback center",
    async (role) => {
      renderWithProviders(
        createElement(SchoolPages, {
          role,
          section: "dashboard",
          tenantSlug: "homabay-high",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      expect(await screen.findByTestId("role-operational-command-center")).toHaveTextContent(`Generic ${role}`);
    },
  );

  it("routes academic leadership exam links to their moderation workspaces", async () => {
    const cases = [
      {
        role: "hod",
        testId: "hod-command-center",
        expected: "HOD exams",
      },
      {
        role: "dean-academics",
        testId: "dean-academics-command-center",
        expected: "Dean exams",
      },
    ] as const;

    for (const routeCase of cases) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role: routeCase.role,
          section: "exams",
          tenantSlug: "homabay-high",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      expect(await screen.findByTestId(routeCase.testId)).toHaveTextContent(routeCase.expected);
      expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();

      view.unmount();
    }
  });

  it("routes legacy academic leadership sidebar aliases to the new command centers", async () => {
    const cases = [
      {
        role: "dean-academics",
        section: "academic-analytics",
        testId: "dean-academics-command-center",
        expected: "Dean academic-analytics",
      },
      {
        role: "dean-academics",
        section: "teachers",
        testId: "dean-academics-command-center",
        expected: "Dean teachers",
      },
      {
        role: "hod",
        section: "department-settings",
        testId: "hod-command-center",
        expected: "HOD department-settings",
      },
      {
        role: "hod",
        section: "schemes-of-work",
        testId: "hod-command-center",
        expected: "HOD schemes-of-work",
      },
      {
        role: "hod",
        section: "performance-analytics",
        testId: "hod-command-center",
        expected: "HOD performance-analytics",
      },
      {
        role: "hod",
        section: "timetable-builder",
        testId: "hod-command-center",
        expected: "HOD timetable-builder",
      },
      {
        role: "dean-academics",
        section: "approvals",
        testId: "dean-academics-command-center",
        expected: "Dean approvals",
      },
    ] as const;

    for (const routeCase of cases) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role: routeCase.role,
          section: routeCase.section,
          tenantSlug: "homabay-high",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      expect(await screen.findByTestId(routeCase.testId)).toHaveTextContent(routeCase.expected);
      expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();

      view.unmount();
    }
  });

  it("normalizes legacy academic role slugs before public school route rendering", () => {
    expect(getSchoolRoleAlias("dean")).toBe("dean-academics");
    expect(getSchoolRoleAlias("dean-of-academics")).toBe("dean-academics");
    expect(getSchoolRoleAlias("exam-manager")).toBe("exams-manager");
  });
});
