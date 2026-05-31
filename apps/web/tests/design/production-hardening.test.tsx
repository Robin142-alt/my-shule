import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
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

  it("marks invitation email failure truthfully instead of claiming the invite was sent", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return new Response(JSON.stringify({ token: "csrf-token" }), { status: 200 });
      }

      if (url === "/api/auth/invitations") {
        return new Response(JSON.stringify({ message: "Email provider rejected the invite." }), { status: 503 });
      }

      return new Response(JSON.stringify({ users: [] }), { status: 200 });
    });
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    jest.spyOn(global, "fetch").mockImplementation(fetchMock as typeof fetch);

    renderWithProviders(
      <UserManagementWorkspace
        schoolId="kisumu-boys"
        actorRole="Principal"
        actorName="Principal Wanjiku"
      />,
    );

    await user.click(screen.getByRole("button", { name: /invite new user/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Grace Njeri" } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0712 111 222" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "grace.njeri@kisumuboys.ac.ke" } });
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    expect(await screen.findByText(/email delivery failed/i)).toBeVisible();
    expect(screen.queryByText(/invitation sent/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /pending invitations/i }));
    expect(readSchoolData("user-invitations", "kisumu-boys")).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ invitedName: "Grace Njeri" })]),
    );
  });

  it("keeps school dashboard action labels free from phone-call and combined save actions", () => {
    const root = process.cwd();
    const files = [
      "src/components/school/principal-practical-dashboard.tsx",
      "src/components/school/deputy-principal-command-center.tsx",
      "src/components/school/discipline-master-command-center.tsx",
      "src/components/school/boarding-master-command-center.tsx",
      "src/components/school/security-command-center.tsx",
      "src/components/school/role-operational-command-center.tsx",
      "src/components/operational/operational-form-shell.tsx",
      "src/lib/operational/myshule-extreme-operating-system.ts",
      "src/lib/operational/extreme-erp-blueprints.ts",
      "src/lib/demo/kisumu-boys-high-demo.ts",
    ];
    const source = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");

    expect(source).not.toMatch(/\bCall (Parent|Teacher|Staff|Nurse|Driver|Accountant|Student|Security|Admin|guardian|emergency contacts)\b/i);
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
