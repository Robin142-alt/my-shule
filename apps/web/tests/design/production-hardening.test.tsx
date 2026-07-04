import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { openPrintDocument } from "@/lib/dashboard/export";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import {
  publishSchoolOperationalEvent,
  readSchoolData,
  type SchoolNotification,
} from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

const schoolRoles: SchoolExperienceRole[] = [
  "principal",
  "deputy-principal",
  "secretary",
  "accountant",
  "teacher",
  "dean-academics",
  "exams-manager",
  "hod",
  "class-teacher",
  "grade-master",
  "nurse",
  "guidance-counselling",
  "discipline-master",
  "librarian",
  "storekeeper",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
  "admissions",
];

describe("production ERP hardening", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.querySelector("[data-myshule-print-preview]")?.remove();
    jest.restoreAllMocks();
  });

  it("keeps support ticket creation only on Principal and Deputy dashboards", () => {
    const supportRoles = schoolRoles.filter((role) =>
      getSchoolWorkspace(role, "kisumu-boys").navItems.some((item) => item.id === "support-new-ticket"),
    );

    expect(supportRoles).toEqual(["principal", "deputy-principal"]);
  });

  it("opens a printable preview before the user prints", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    openPrintDocument({
      eyebrow: "Receipt preview",
      title: "Fee Receipt",
      subtitle: "Kisumu Boys High School",
      rows: [{ label: "Student", value: "Brian Otieno" }],
      footer: "Confirm before printing.",
    });

    expect(screen.getByRole("dialog", { name: /fee receipt print preview/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^print$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeVisible();
    expect(screen.getByText("Fee Receipt")).toBeVisible();
    expect(printMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^print$/i }));
    expect(printMock).toHaveBeenCalled();
  });

  it("stores notifications with tenant scope and related record routing metadata", () => {
    publishSchoolOperationalEvent({
      schoolId: "school-a",
      type: "FINANCE_APPROVAL_REQUESTED",
      module: "finance",
      actorRole: "accountant",
      title: "Fee reversal approval requested",
      body: "Receipt KBI-RCPT-501 needs principal review.",
      entityId: "approval-501",
      notifications: [
        {
          audienceRoles: ["principal"],
          title: "Fee reversal approval requested",
          body: "Open approval-501 from finance.",
        },
      ],
    });

    const schoolANotifications = readSchoolData<SchoolNotification>("notifications", "school-a");

    expect(schoolANotifications[0]).toEqual(
      expect.objectContaining({
        schoolId: "school-a",
        relatedModule: "finance",
        relatedRecordId: "approval-501",
        actionUrl: "/finance?record=approval-501",
        read: false,
      }),
    );
    expect(readSchoolData<SchoolNotification>("notifications", "school-b")).toEqual([]);
  });

  it("keeps the principal invitation workspace wired for saved-but-undelivered invites", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/school/user-management-workspace.tsx"),
      "utf8",
    );

    expect(source).toMatch(/apiInvite\.invitation_sent !== false/);
    expect(source).toMatch(/status:\s*apiInvite\.status \?\? "invited"/);
    expect(source).toMatch(/setActiveTab\("invitations"\)/);
    expect(source).toMatch(/Invitation email failed/);
    expect(source).toMatch(/Email Failed/);
  });

  it("keeps school dashboard action labels free from phone-call and combined save actions", () => {
    const root = process.cwd();
    const files = [
      "src/components/school/principal-practical-dashboard.tsx",
      "src/components/school/deputy-principal-command-center.tsx",
      "src/components/school/discipline-master-command-center.tsx",
      "src/components/school/guidance-counselling-command-center.tsx",
      "src/components/school/boarding-master-command-center.tsx",
      "src/components/school/security-command-center.tsx",
      "src/components/school/role-operational-command-center.tsx",
      "src/components/portal/parent-command-center.tsx",
      "src/components/operational/operational-form-shell.tsx",
      "src/lib/operational/myshule-extreme-operating-system.ts",
      "src/lib/operational/extreme-erp-blueprints.ts",
      "src/lib/demo/kisumu-boys-high-demo.ts",
    ];
    const source = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");

    expect(source).not.toMatch(/\bCall (Parent|Teacher|Staff|Nurse|Driver|Accountant|Student|Security|Admin|guardian|emergency contacts)\b/i);
    expect(source).not.toMatch(/\bcall logs?\b/i);
    expect(source).not.toMatch(/\bEmergency hotline\b/i);
    expect(source).not.toMatch(/\bContact guardian\b/i);
    expect(source).not.toMatch(/\b(Call teacher and submit register|Save and Send SMS|Save and Print|Save and Continue|Save and Notify Parent|Print and SMS parent)\b/i);
  });

  it("routes dashboard print actions through print preview instead of direct browser printing", () => {
    const root = process.cwd();
    const files = [
      "src/components/modules/assets/asset-tracking-module-screen.tsx",
      "src/components/school/teacher-command-center.tsx",
      "src/components/school/security-command-center.tsx",
      "src/components/school/role-operational-command-center.tsx",
    ];
    const source = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");

    expect(source).not.toMatch(/window\.print\(\)/);
  });
});
