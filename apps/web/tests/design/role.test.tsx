import { screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { getOperationalRoleBlueprint, type DocxRoleId } from "@/lib/operational/myshule-extreme-operating-system";
import {
  addSchoolRecord,
  readSchoolData,
  type SchoolNotification,
  type SchoolOperationalEvent,
  type SchoolSmsLog,
} from "@/lib/school/school-operational-store";

import { renderDashboardScreen, renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

async function printFromPreview(user: { click: (element: Element) => Promise<void> }, printMock: jest.Mock) {
  const preview = await screen.findByRole("dialog", { name: /print preview/i });
  expect(preview).toBeVisible();
  expect(printMock).not.toHaveBeenCalled();

  await user.click(within(preview).getByRole("button", { name: /^print$/i }));
  expect(printMock).toHaveBeenCalled();
  printMock.mockClear();

  await user.click(within(preview).getByRole("button", { name: /close|cancel/i }));
}

const schoolRoleBlueprints: Array<{ role: SchoolExperienceRole; blueprint: DocxRoleId }> = [
  { role: "principal", blueprint: "principal" },
  { role: "deputy-principal", blueprint: "deputy-principal" },
  { role: "secretary", blueprint: "secretary" },
  { role: "bursar", blueprint: "accountant" },
  { role: "accountant", blueprint: "accountant" },
  { role: "teacher", blueprint: "teacher" },
  { role: "dean-academics", blueprint: "dean-academics" },
  { role: "exams-manager", blueprint: "exams-manager" },
  { role: "hod", blueprint: "hod" },
  { role: "class-teacher", blueprint: "class-teacher" },
  { role: "grade-master", blueprint: "grade-master" },
  { role: "admin", blueprint: "secretary" },
  { role: "storekeeper", blueprint: "storekeeper" },
  { role: "librarian", blueprint: "librarian" },
  { role: "nurse", blueprint: "nurse" },
  { role: "boarding-master", blueprint: "boarding-master" },
  { role: "security-officer", blueprint: "security-officer" },
  { role: "transport-manager", blueprint: "transport-manager" },
  { role: "laboratory-technician", blueprint: "laboratory-technician" },
  { role: "guidance-counselling", blueprint: "guidance-counselling" },
  { role: "discipline-master", blueprint: "discipline-master" },
  { role: "admissions", blueprint: "admissions" },
];

describe("STEP 4: Role tests", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    document.querySelectorAll("[data-myshule-print-preview]").forEach((preview) => preview.remove());
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-operational-token" }));
      }

      if (url.includes("/api/operational-workflows/roles/")) {
        expect(init?.method).toBe("POST");

        return Promise.resolve(
          jsonResponse({
            status: "DISPATCHED",
            actionId: decodeURIComponent(url.split("/actions/")[1]?.split("/dispatch")[0] ?? "unknown-action"),
            workflowBinding: "Runtime workflow -> Dispatched -> Audited",
            executionHandler: "workflows.runtime.dispatch",
            eventId: "event-runtime-1",
            eventName: "workflow.action.dispatched",
            widgetRefresh: {
              dashboardId: "role-dashboard",
              nodeId: "runtime-node",
              events: ["WORKFLOW_ACTION_DISPATCHED"],
            },
            auditAction: "audit.runtime.action",
          }),
        );
      }

      return Promise.resolve(
        jsonResponse({
          data: [
            "students",
            "admissions",
            "academics",
            "exams",
            "discipline",
            "finance",
            "communication_sms",
            "reports",
            "staff",
            "inventory",
            "library",
            "transport",
            "principal_dashboard",
          ],
        }),
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("keeps legacy generic dashboards available for the historical role smoke renderer", () => {
    renderDashboardScreen({ role: "admin" });

    expect(screen.getByTestId("dashboard-view")).toBeVisible();
    expect(screen.getByTestId("quick-actions")).toBeVisible();
  });

  it("renders every school role root through exactly one operational command center", async () => {
    for (const { role } of schoolRoleBlueprints) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role,
          tenantSlug: "kisumu-boys",
        }),
      );

      if (role === "admissions") {
        expect(await screen.findByTestId("admissions-dashboard-command-center")).toBeVisible();
        expect(screen.getAllByTestId("admissions-dashboard-command-center")).toHaveLength(1);
        expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
      } else {
        expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
        expect(screen.getAllByTestId("role-operational-command-center")).toHaveLength(1);
      }
      expect(screen.queryByRole("heading", { name: /class teacher dashboard/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /transport operations center/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /school discipline intelligence center/i })).not.toBeInTheDocument();
      if (role === "principal") {
        expect(screen.getByTestId("principal-practical-command-center")).toBeVisible();
        expect(screen.getByText(/School activity today/i)).toBeVisible();
      } else if (role === "admissions") {
        expect(screen.getByText(/Enquiries, applications, verification, placement, enrolment, and parent handoff/i)).toBeVisible();
      } else {
        expect(screen.getByText(/Use the role menu to switch sections/i)).toBeVisible();
      }

      view.unmount();
    }
  }, 30000);

  it("does not wrap operational command centers in the legacy ERP shell", async () => {
    const routeCases: Array<{ role: SchoolExperienceRole; section?: string }> = [
      { role: "principal" },
      { role: "deputy-principal", section: "discipline" },
      { role: "secretary", section: "admissions" },
      { role: "hod", section: "syllabus" },
      { role: "grade-master", section: "attendance" },
      { role: "transport-manager", section: "transport" },
    ];

    for (const routeCase of routeCases) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role: routeCase.role,
          section: routeCase.section,
          tenantSlug: "kisumu-boys",
        }),
      );

      expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
      expect(view.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();

      view.unmount();
    }
  }, 30000);

  it("renders role workspaces as isolated panels instead of one long stacked page", async () => {
    const user = userEvent.setup();
    const blueprint = getOperationalRoleBlueprint("class-teacher");

    renderWithProviders(
      createElement(SchoolPages, {
        role: "class-teacher" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(commandCenter).toBeVisible();

    for (const sidebarItem of blueprint?.sidebar ?? []) {
      expect(within(commandCenter).getAllByRole("button", { name: new RegExp(sidebarItem, "i") }).length).toBeGreaterThan(0);
    }

    expect(within(commandCenter).getByText(/What requires action right now/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/Workflow state machines/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Visible recovery states/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getAllByRole("button", { name: /Attendance/i })[0]);
    expect((await screen.findAllByText(/^Attendance$/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /^Dashboard Home$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Today['’]s Work$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Attendance today['’]s work/i)).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Mark Absent Ready/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Record Reason Ready/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Attendance records/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/School form/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Records$/i }));
    expect(screen.getAllByText(/Attendance records/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Attendance today['’]s work/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Student\/Class/i)).toBeVisible();
    expect(screen.getByText(/Last Seen/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Form$/i }));
    expect(screen.getByText(/School form/i)).toBeVisible();
    expect(screen.queryByText(/Attendance records/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Attendance status/i)).toBeVisible();
    expect(screen.getByLabelText(/Parent notification/i)).toBeVisible();

    expect(screen.queryByRole("button", { name: /^Action History$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Action history/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Visible recovery states/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getAllByRole("button", { name: /Parent Communication/i })[0]);
    expect((await screen.findAllByText(/^Parent Communication$/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^Today['’]s Work$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Parent Communication today['’]s work/i)).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Send Message Ready/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Mark Absent Ready/i })).not.toBeInTheDocument();
  }, 30000);

  it("makes the nurse sick bay practical with visit entry, medicine stock deduction, and parent notification", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "nurse" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /record visit and dispense medicine/i })).toBeVisible();
    expect(within(commandCenter).getAllByText(/medicine inventory/i).length).toBeGreaterThan(0);

    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /student name/i }), "Brian Otieno");
    expect(within(commandCenter).getByLabelText(/class or form/i)).toHaveValue("Form 2 East");
    expect(within(commandCenter).getByLabelText(/guardian phone/i)).toHaveValue("0712 345 678");
    await user.clear(within(commandCenter).getByLabelText(/temperature/i));
    await user.type(within(commandCenter).getByLabelText(/temperature/i), "37.9");
    await user.clear(within(commandCenter).getByLabelText(/quantity dispensed/i));
    await user.type(within(commandCenter).getByLabelText(/quantity dispensed/i), "3");
    await user.type(within(commandCenter).getByLabelText(/symptoms and treatment notes/i), "Stomach pain after breakfast");
    await user.click(within(commandCenter).getByRole("button", { name: /save visit and deduct stock/i }));

    expect(within(commandCenter).getByText(/brian otieno visit saved/i)).toBeVisible();
    expect(within(commandCenter).getByText(/stomach pain after breakfast/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Paracetamol x3/i)).toBeVisible();

    await user.click(within(commandCenter).getAllByRole("button", { name: /notify parent/i })[0]);
    expect(within(commandCenter).getByText(/parent sms queued/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /print register/i }));
    expect(within(commandCenter).getByText(/sick bay register print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);

    await user.type(within(commandCenter).getByLabelText(/new medicine name/i), "Antiseptic Cream");
    await user.type(within(commandCenter).getByLabelText(/batch number/i), "ANT-220");
    await user.clear(within(commandCenter).getByLabelText(/stock quantity/i));
    await user.type(within(commandCenter).getByLabelText(/stock quantity/i), "14");
    await user.click(within(commandCenter).getByRole("button", { name: /add stock/i }));

    expect(within(commandCenter).getByText(/antiseptic cream stock loaded/i)).toBeVisible();
    expect(within(commandCenter).getAllByText(/Antiseptic Cream/i).length).toBeGreaterThan(0);
  }, 30000);

  it("renders the admissions officer dashboard with routed admissions workspaces", async () => {
    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
        routeMode: "public",
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(within(dashboard).getByRole("heading", { name: /^Admissions$/i })).toBeVisible();
    expect(within(dashboard).getByRole("link", { name: /Applications/i })).toHaveAttribute(
      "href",
      "/school/admissions/applications",
    );
    expect(within(dashboard).getByRole("link", { name: /Class Placement/i })).toHaveAttribute(
      "href",
      "/school/admissions/placement",
    );
    expect(within(dashboard).getByRole("link", { name: /Communication/i })).toHaveAttribute(
      "href",
      "/school/admissions/communication",
    );
    expect(within(dashboard).queryByText(/add inquiry or application/i)).not.toBeInTheDocument();
  }, 30000);

  it("makes the librarian desk practical with barcode add, issue, return, SMS, and slip printing", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "librarian" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /issue or return books quickly/i })).toBeVisible();
    expect(within(commandCenter).getByText(/book catalogue/i)).toBeVisible();

    await user.clear(within(commandCenter).getByLabelText(/book title/i));
    await user.type(within(commandCenter).getByLabelText(/book title/i), "Agriculture Form 3");
    await user.clear(within(commandCenter).getByLabelText(/new book barcode/i));
    await user.type(within(commandCenter).getByLabelText(/new book barcode/i), "KB-LIB-3300");
    await user.clear(within(commandCenter).getByLabelText(/^ISBN$/i));
    await user.type(within(commandCenter).getByLabelText(/^ISBN$/i), "9789966003300");
    await user.clear(within(commandCenter).getByLabelText(/author/i));
    await user.type(within(commandCenter).getByLabelText(/author/i), "Kenya Agriculture Press");
    await user.clear(within(commandCenter).getByLabelText(/category/i));
    await user.type(within(commandCenter).getByLabelText(/category/i), "Agriculture");
    await user.clear(within(commandCenter).getByLabelText(/shelf number/i));
    await user.type(within(commandCenter).getByLabelText(/shelf number/i), "AGR-A1");
    await user.click(within(commandCenter).getByRole("button", { name: /^Add Book$/i }));

    expect(within(commandCenter).getByText(/agriculture form 3 added/i)).toBeVisible();
    expect(within(commandCenter).getAllByText(/Agriculture Form 3/i).length).toBeGreaterThan(0);

    await user.clear(within(commandCenter).getByLabelText(/^Book barcode$/i));
    await user.type(within(commandCenter).getByLabelText(/^Book barcode$/i), "KB-LIB-3300");
    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /borrower name/i }), "Brian Otieno");
    expect(within(commandCenter).getByLabelText(/admission number/i)).toHaveValue("KBI/2026/044");
    await user.click(within(commandCenter).getByRole("button", { name: /^Issue Book$/i }));

    expect(within(commandCenter).getByText(/agriculture form 3 issued to brian otieno/i)).toBeVisible();

    let loanRow = within(commandCenter)
      .getAllByText("Agriculture Form 3")
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(loanRow).not.toBeNull();
    await user.click(within(loanRow as HTMLElement).getByRole("button", { name: /send overdue sms/i }));
    expect(within(commandCenter).getByText(/brian otieno parent\/guardian sms queued/i)).toBeVisible();

    loanRow = within(commandCenter)
      .getAllByText("Agriculture Form 3")
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(loanRow).not.toBeNull();
    await user.click(within(loanRow as HTMLElement).getByRole("button", { name: /print slip/i }));
    expect(within(commandCenter).getByText(/agriculture form 3 slip print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);

    loanRow = within(commandCenter)
      .getAllByText("Agriculture Form 3")
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(loanRow).not.toBeNull();
    await user.click(within(loanRow as HTMLElement).getByRole("button", { name: /return book/i }));
    expect(within(commandCenter).getByText(/agriculture form 3 returned and marked available/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /print library report/i }));
    expect(within(commandCenter).getByText(/library report print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
  }, 30000);

  it("makes the storekeeper desk practical with stock receiving, issuing, movement history, and slip printing", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "storekeeper" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /issue stock to a department/i })).toBeVisible();
    expect(within(commandCenter).getAllByText(/movement history/i).length).toBeGreaterThan(0);

    await user.clear(within(commandCenter).getByLabelText(/stock item name/i));
    await user.type(within(commandCenter).getByLabelText(/stock item name/i), "Printer Paper Reams");
    await user.selectOptions(within(commandCenter).getByLabelText(/stock category/i), "Office");
    await user.clear(within(commandCenter).getByLabelText(/^Stock quantity$/i));
    await user.type(within(commandCenter).getByLabelText(/^Stock quantity$/i), "40");
    await user.clear(within(commandCenter).getByLabelText(/stock unit/i));
    await user.type(within(commandCenter).getByLabelText(/stock unit/i), "reams");
    await user.clear(within(commandCenter).getByLabelText(/supplier/i));
    await user.type(within(commandCenter).getByLabelText(/supplier/i), "Kisumu Office Supplies");
    await user.clear(within(commandCenter).getByLabelText(/responsible department/i));
    await user.type(within(commandCenter).getByLabelText(/responsible department/i), "Administration");
    await user.clear(within(commandCenter).getByLabelText(/received by/i));
    await user.type(within(commandCenter).getByLabelText(/received by/i), "Mrs. Achieng");
    await user.clear(within(commandCenter).getByLabelText(/unit cost/i));
    await user.type(within(commandCenter).getByLabelText(/unit cost/i), "650");
    const receiveStockButton = within(commandCenter)
      .getAllByRole("button", { name: /^Receive Stock$/i })
      .find((button) => button.getAttribute("type") === "submit");
    expect(receiveStockButton).toBeDefined();
    await user.click(receiveStockButton as HTMLElement);

    expect(within(commandCenter).getByText(/printer paper reams received and movement history updated/i)).toBeVisible();
    expect(within(commandCenter).getAllByText(/Printer Paper Reams/i).length).toBeGreaterThan(0);

    await user.selectOptions(within(commandCenter).getByLabelText(/stock item to issue/i), "Printer Paper Reams");
    await user.clear(within(commandCenter).getByLabelText(/issue quantity/i));
    await user.type(within(commandCenter).getByLabelText(/issue quantity/i), "6");
    await user.clear(within(commandCenter).getByLabelText(/receiving department/i));
    await user.type(within(commandCenter).getByLabelText(/receiving department/i), "Exams Office");
    await user.clear(within(commandCenter).getByLabelText(/receiver name/i));
    await user.type(within(commandCenter).getByLabelText(/receiver name/i), "Mr. Mwangi");
    await user.clear(within(commandCenter).getByLabelText(/stock movement note/i));
    await user.type(within(commandCenter).getByLabelText(/stock movement note/i), "Paper for report card printing.");
    const issueStockButton = within(commandCenter)
      .getAllByRole("button", { name: /^Issue Stock$/i })
      .find((button) => button.getAttribute("type") === "submit");
    expect(issueStockButton).toBeDefined();
    await user.click(issueStockButton as HTMLElement);

    expect(within(commandCenter).getByText(/printer paper reams issued to exams office/i)).toBeVisible();

    let movementRow = within(commandCenter)
      .getAllByText(/Paper for report card printing/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(movementRow).not.toBeNull();
    await user.click(within(movementRow as HTMLElement).getByRole("button", { name: /print slip/i }));
    expect(within(commandCenter).getByText(/printer paper reams issue slip print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);

    movementRow = within(commandCenter)
      .getAllByText(/Paper for report card printing/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(movementRow).not.toBeNull();
    await user.click(within(movementRow as HTMLElement).getByRole("button", { name: /mark damaged/i }));
    expect(within(commandCenter).getByText(/printer paper reams marked damaged\/lost/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /export stock report/i }));
    expect(within(commandCenter).getByText(/stock csv downloaded/i)).toBeVisible();
  }, 30000);

  it("makes the boarding desk practical with roll call, missing alerts, nurse referral, exeats, and printing", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "boarding-master" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /mark boarder roll call/i })).toBeVisible();
    expect(within(commandCenter).getByText(/dormitory status and actions/i)).toBeVisible();

    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /boarder name/i }), "Brian Otieno");
    expect(within(commandCenter).getByLabelText(/boarder class/i)).toHaveValue("Form 2 East");
    expect(within(commandCenter).getByLabelText(/^Dormitory$/i)).toHaveValue("Lake House");
    await user.clear(within(commandCenter).getByLabelText(/bed number/i));
    await user.type(within(commandCenter).getByLabelText(/bed number/i), "L-25");
    await user.selectOptions(within(commandCenter).getByLabelText(/roll call status/i), "Missing");
    await user.click(within(commandCenter).getByRole("button", { name: /save roll call/i }));

    expect(within(commandCenter).getByText(/brian otieno marked missing/i)).toBeVisible();
    await waitFor(() => {
      const storedRollCalls = readSchoolData<{ student: string; status: string; schoolId: string }>("boarding-roll-calls", schoolId);
      expect(storedRollCalls.some((record) => record.student === "Brian Otieno" && record.status === "Missing" && record.schoolId === schoolId)).toBe(true);
    });
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some(
        (event) => event.type === "BOARDING_ROLL_CALL_RECORDED" && event.module === "boarding" && event.schoolId === schoolId,
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) =>
          notification.sourceModule === "boarding" &&
          notification.audienceRoles.includes("deputy-principal") &&
          notification.audienceRoles.includes("security-officer") &&
          /Brian Otieno/i.test(notification.body),
      ),
    ).toBe(true);

    let rollCallRow = within(commandCenter)
      .getAllByText(/L-25/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(rollCallRow).not.toBeNull();
    await user.click(within(rollCallRow as HTMLElement).getByRole("button", { name: /notify parent/i }));
    expect(within(commandCenter).getByText(/brian otieno parent sms queued/i)).toBeVisible();
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some(
        (sms) => sms.sourceModule === "boarding" && /Brian Otieno/i.test(sms.message),
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "BOARDING_PARENT_SMS_SENT"),
    ).toBe(true);

    rollCallRow = within(commandCenter)
      .getAllByText(/L-25/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(rollCallRow).not.toBeNull();
    await user.click(within(rollCallRow as HTMLElement).getByRole("button", { name: /refer to nurse/i }));
    expect(within(commandCenter).getByText(/brian otieno referred to nurse/i)).toBeVisible();
    expect(
      readSchoolData<{ student: string; source: string }>("boarding-nurse-referrals", schoolId).some(
        (referral) => referral.student === "Brian Otieno" && referral.source === "Boarding Master",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) => notification.sourceModule === "boarding" && notification.audienceRoles.includes("nurse") && /Brian Otieno/i.test(notification.body),
      ),
    ).toBe(true);

    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /exeat student/i }), "Brian Otieno");
    expect(within(commandCenter).getByLabelText(/exeat dormitory/i)).toHaveValue("Lake House");
    expect(within(commandCenter).getByLabelText(/exeat parent phone/i)).toHaveValue("0712 345 678");
    await user.clear(within(commandCenter).getByLabelText(/exeat reason/i));
    await user.type(within(commandCenter).getByLabelText(/exeat reason/i), "Clinic review appointment");
    await user.click(within(commandCenter).getByRole("button", { name: /add exeat request/i }));

    expect(within(commandCenter).getByText(/brian otieno exeat request saved/i)).toBeVisible();
    expect(
      readSchoolData<{ student: string; status: string }>("boarding-exeat-requests", schoolId).some(
        (request) => request.student === "Brian Otieno" && request.status === "Pending",
      ),
    ).toBe(true);
    await user.click(within(commandCenter).getAllByRole("button", { name: /approve exeat/i })[0]);
    expect(within(commandCenter).getByText(/brian otieno exeat approved/i)).toBeVisible();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "BOARDING_EXEAT_APPROVED" && /Brian Otieno/i.test(event.body)),
    ).toBe(true);

    await user.click(within(commandCenter).getByRole("button", { name: /print roll call/i }));
    expect(within(commandCenter).getByText(/hostel roll call sheet print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "BOARDING_ROLL_CALL_PRINTED"),
    ).toBe(true);
  }, 30000);

  it("makes the transport desk practical with trip attendance, parent alerts, fuel, maintenance, and route printing", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "transport-manager" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /record pickup or drop-off/i })).toBeVisible();
    expect(within(commandCenter).getByText(/vehicles and maintenance/i)).toBeVisible();

    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /transport student/i }), "Brian Otieno");
    expect(within(commandCenter).getByLabelText(/transport admission number/i)).toHaveValue("KBI/2026/044");
    await user.selectOptions(within(commandCenter).getByLabelText(/transport route/i), "Mamboleo Route");
    await user.clear(within(commandCenter).getByLabelText(/transport stop/i));
    await user.type(within(commandCenter).getByLabelText(/transport stop/i), "Kibuye Market");
    await user.click(within(commandCenter).getByRole("button", { name: /add trip record/i }));

    expect(within(commandCenter).getByText(/brian otieno added to mamboleo route/i)).toBeVisible();
    expect(
      readSchoolData<{ student: string; route: string; status: string }>("transport-trips", schoolId).some(
        (trip) => trip.student === "Brian Otieno" && trip.route === "Mamboleo Route" && trip.status === "Waiting",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "TRANSPORT_TRIP_RECORDED" && /Brian Otieno/i.test(event.body)),
    ).toBe(true);

    let tripRow = within(commandCenter)
      .getAllByText(/Kibuye Market/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(tripRow).not.toBeNull();
    await user.click(within(tripRow as HTMLElement).getByRole("button", { name: /mark picked/i }));
    expect(within(commandCenter).getByText(/brian otieno marked picked/i)).toBeVisible();
    expect(within(commandCenter).getByText(/parent pickup sms queued/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/parent alert sent/i)).not.toBeInTheDocument();
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some((sms) => sms.sourceModule === "transport" && /Brian Otieno/i.test(sms.message) && /picked/i.test(sms.message)),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "TRANSPORT_STUDENT_PICKED"),
    ).toBe(true);

    tripRow = within(commandCenter)
      .getAllByText(/Kibuye Market/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(tripRow).not.toBeNull();
    await user.click(within(tripRow as HTMLElement).getByRole("button", { name: /mark dropped/i }));
    expect(within(commandCenter).getByText(/brian otieno marked dropped/i)).toBeVisible();
    expect(within(commandCenter).getByText(/parent drop-off sms queued/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/parent alert sent/i)).not.toBeInTheDocument();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "TRANSPORT_STUDENT_DROPPED"),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /add fuel record/i })[0]);
    expect(within(commandCenter).getByText(/fuel record added/i)).toBeVisible();
    expect(
      readSchoolData<{ vehicle: string; action: string }>("transport-fuel-records", schoolId).some((record) => record.action === "Fuel Added"),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /schedule maintenance/i })[0]);
    expect(within(commandCenter).getByText(/workshop booking confirmed/i)).toBeVisible();
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) => notification.sourceModule === "transport" && notification.audienceRoles.includes("principal") && /maintenance/i.test(notification.body),
      ),
    ).toBe(true);

    await user.click(within(commandCenter).getByRole("button", { name: /print route list/i }));
    expect(within(commandCenter).getByText(/transport route list print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "TRANSPORT_ROUTE_LIST_PRINTED"),
    ).toBe(true);
  }, 30000);

  it("makes the laboratory desk practical with practical prep, stock, issue, returns, breakages, and checklists", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "laboratory-technician" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /add practical request/i })).toBeVisible();
    expect(within(commandCenter).getByText(/chemical and apparatus inventory/i)).toBeVisible();

    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /lab teacher/i }), "Mrs. Achieng");
    expect(within(commandCenter).getByLabelText(/lab class or form/i)).toHaveValue("Form 2 North");
    expect(within(commandCenter).getByLabelText(/lab subject/i)).toHaveValue("Biology");
    await user.clear(within(commandCenter).getByLabelText(/lab practical/i));
    await user.type(within(commandCenter).getByLabelText(/lab practical/i), "Food test practical");
    await user.clear(within(commandCenter).getByLabelText(/practical time/i));
    await user.type(within(commandCenter).getByLabelText(/practical time/i), "Today 11:20");
    await user.click(within(commandCenter).getByRole("button", { name: /add practical request/i }));

    expect(within(commandCenter).getByText(/food test practical request saved/i)).toBeVisible();
    expect(
      readSchoolData<{ practical: string; status: string }>("lab-practical-requests", schoolId).some(
        (request) => request.practical === "Food test practical" && request.status === "Requested",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "LAB_PRACTICAL_REQUESTED" && /Food test practical/i.test(event.body)),
    ).toBe(true);

    const practicalRow = within(commandCenter)
      .getAllByText(/Food test practical/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(practicalRow).not.toBeNull();
    await user.click(within(practicalRow as HTMLElement).getByRole("button", { name: /approve practical prep/i }));
    expect(within(commandCenter).getByText(/food test practical preparation approved/i)).toBeVisible();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "LAB_PRACTICAL_PREP_APPROVED"),
    ).toBe(true);

    await user.click(within(practicalRow as HTMLElement).getByRole("button", { name: /issue apparatus/i }));
    expect(within(commandCenter).getByText(/issued to mrs\. achieng/i)).toBeVisible();
    expect(
      readSchoolData<{ teacher: string; className: string; status: string }>("lab-apparatus-issues", schoolId).some(
        (issue) => issue.teacher === "Mrs. Achieng" && issue.className === "Form 2 North" && issue.status === "Issued",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) => notification.sourceModule === "laboratory" && notification.audienceRoles.includes("teacher") && /Food test practical/i.test(notification.body),
      ),
    ).toBe(true);

    await user.click(within(practicalRow as HTMLElement).getByRole("button", { name: /alert teacher/i }));
    expect(within(commandCenter).getByText(/mrs\. achieng alerted/i)).toBeVisible();
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some((sms) => sms.sourceModule === "laboratory" && /Food test practical/i.test(sms.message)),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /return apparatus/i })[0]);
    expect(within(commandCenter).getByText(/returned and stock restored/i)).toBeVisible();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "LAB_APPARATUS_RETURNED"),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /record breakage/i })[0]);
    expect(within(commandCenter).getByText(/breakage recorded for follow-up/i)).toBeVisible();
    expect(
      readSchoolData<{ item: string; status: string }>("lab-breakage-records", schoolId).some((record) => record.status === "Broken"),
    ).toBe(true);

    await user.clear(within(commandCenter).getByLabelText(/lab stock item/i));
    await user.type(within(commandCenter).getByLabelText(/lab stock item/i), "Benedict Solution");
    await user.selectOptions(within(commandCenter).getByLabelText(/lab stock category/i), "Chemical");
    await user.clear(within(commandCenter).getByLabelText(/lab stock quantity/i));
    await user.type(within(commandCenter).getByLabelText(/lab stock quantity/i), "8");
    await user.clear(within(commandCenter).getByLabelText(/lab stock unit/i));
    await user.type(within(commandCenter).getByLabelText(/lab stock unit/i), "bottles");
    await user.clear(within(commandCenter).getByLabelText(/lab stock location/i));
    await user.type(within(commandCenter).getByLabelText(/lab stock location/i), "Biology cabinet");
    await user.selectOptions(within(commandCenter).getByLabelText(/hazard level/i), "Low");
    await user.click(within(commandCenter).getByRole("button", { name: /add chemical stock/i }));
    expect(within(commandCenter).getByText(/benedict solution added to lab inventory/i)).toBeVisible();
    expect(
      readSchoolData<{ item: string; category: string }>("lab-inventory", schoolId).some(
        (item) => item.item === "Benedict Solution" && item.category === "Chemical",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "LAB_STOCK_ADDED" && /Benedict Solution/i.test(event.body)),
    ).toBe(true);

    await user.click(within(commandCenter).getByRole("button", { name: /print practical checklist/i }));
    expect(within(commandCenter).getByText(/practical checklist print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "LAB_PRACTICAL_CHECKLIST_PRINTED"),
    ).toBe(true);
  }, 30000);

  it("makes the accountant desk practical with payment entry, M-Pesa confirmation, receipts, SMS, and fee export", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "accountant" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /record payment and print receipt/i })).toBeVisible();

    await user.selectOptions(within(commandCenter).getByLabelText(/fee student/i), "fee-brian");
    await user.clear(within(commandCenter).getByLabelText(/payment amount/i));
    await user.type(within(commandCenter).getByLabelText(/payment amount/i), "5000");
    await user.selectOptions(within(commandCenter).getByLabelText(/payment method/i), "Cash");
    await user.clear(within(commandCenter).getByLabelText(/payment reference/i));
    await user.type(within(commandCenter).getByLabelText(/payment reference/i), "CASH-5000");
    await user.click(within(commandCenter).getByRole("button", { name: /^record payment$/i }));

    expect(within(commandCenter).getByText(/brian otieno payment recorded/i)).toBeVisible();
    expect(
      readSchoolData<{ student: string; amount: number; method: string }>("finance-payments", schoolId).some(
        (payment) => payment.student === "Brian Otieno" && payment.amount === 5000 && payment.method === "Cash",
      ),
    ).toBe(true);
    expect(
      readSchoolData<{ student: string; amount: number; receiptNo: string }>("receipts", schoolId).some(
        (receipt) => receipt.student === "Brian Otieno" && receipt.amount === 5000 && /^KBI-RCPT-/.test(receipt.receiptNo),
      ),
    ).toBe(true);
    expect(
      readSchoolData<{ student: string; balance: number }>("fee-balances", schoolId).some(
        (balance) => balance.student === "Brian Otieno" && balance.balance === 7400,
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) => notification.sourceModule === "finance" && notification.audienceRoles.includes("principal") && /fee payment/i.test(notification.title),
      ),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /print receipt/i })[0]);
    expect(within(commandCenter).getByText(/print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "FEE_RECEIPT_PRINTED"),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /send receipt sms/i })[0]);
    expect(within(commandCenter).getByText(/receipt sms queued/i)).toBeVisible();
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some((sms) => sms.sourceModule === "finance" && /Receipt KBI-RCPT-/i.test(sms.message)),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /confirm m-pesa/i })[0]);
    expect(within(commandCenter).getByText(/m-pesa confirmation reconciled/i)).toBeVisible();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "MPESA_PAYMENT_CONFIRMED"),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /send fee reminder/i })[0]);
    expect(within(commandCenter).getByText(/fee reminder queued/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/fee reminder sent/i)).not.toBeInTheDocument();
    expect(
      readSchoolData<{ student: string; status: string }>("fee-reminders", schoolId).some(
        (reminder) => reminder.student === "Brian Otieno" && reminder.status === "Queued",
      ),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /request reversal/i })[0]);
    expect(within(commandCenter).getByText(/reversal sent for approval/i)).toBeVisible();
    expect(
      readSchoolData<{ receiptNo: string; status: string }>("finance-reversal-requests", schoolId).some(
        (request) => /^KBI-RCPT-/.test(request.receiptNo) && request.status === "Pending Approval",
      ),
    ).toBe(true);

    await user.click(within(commandCenter).getByRole("button", { name: /export fee list csv/i }));
    expect(within(commandCenter).getByText(/fee list csv downloaded/i)).toBeVisible();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "FEE_LIST_EXPORTED"),
    ).toBe(true);
  }, 30000);

  it("makes the secretary desk practical with visitor check-in, parent inquiries, slips, SMS, and service status", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "secretary" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /register visitor and issue slip/i })).toBeVisible();

    await user.clear(within(commandCenter).getByLabelText(/visitor name/i));
    await user.type(within(commandCenter).getByLabelText(/visitor name/i), "Peter Ouma");
    await user.clear(within(commandCenter).getByLabelText(/visitor phone or id/i));
    await user.type(within(commandCenter).getByLabelText(/visitor phone or id/i), "0710 111 222");
    await user.clear(within(commandCenter).getByLabelText(/person being visited/i));
    await user.type(within(commandCenter).getByLabelText(/person being visited/i), "Accounts Office");
    await user.clear(within(commandCenter).getByLabelText(/visit reason/i));
    await user.type(within(commandCenter).getByLabelText(/visit reason/i), "Fee balance follow-up");
    await user.click(within(commandCenter).getByRole("button", { name: /check in visitor/i }));
    expect(within(commandCenter).getByText(/peter ouma checked in/i)).toBeVisible();
    expect(
      readSchoolData<{ visitor: string; status: string }>("visitors", schoolId).some(
        (visitor) => visitor.visitor === "Peter Ouma" && visitor.status === "Inside",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "VISITOR_CHECKED_IN" && /Peter Ouma/i.test(event.body)),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) => notification.sourceModule === "visitors" && notification.audienceRoles.includes("security-officer") && /Visitor checked in/i.test(notification.title),
      ),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /print visitor slip/i })[0]);
    expect(within(commandCenter).getByText(/visitor slip print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<{ documentType: string; visitor: string }>("printed-documents", schoolId).some(
        (document) => document.documentType === "Visitor Slip" && document.visitor === "Peter Ouma",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "VISITOR_SLIP_PRINTED" && /Peter Ouma/i.test(event.body)),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /check out visitor/i })[0]);
    expect(within(commandCenter).getByText(/peter ouma checked out/i)).toBeVisible();
    expect(
      readSchoolData<{ visitor: string; status: string }>("visitors", schoolId).some(
        (visitor) => visitor.visitor === "Peter Ouma" && visitor.status === "Exited",
      ),
    ).toBe(true);

    await user.selectOptions(within(commandCenter).getByRole("combobox", { name: /inquiry student/i }), "David Kiptoo");
    expect(within(commandCenter).getByLabelText(/inquiry class/i)).toHaveValue("Form 1 North");
    expect(within(commandCenter).getByLabelText(/parent phone/i)).toHaveValue("0700 555 222");
    await user.clear(within(commandCenter).getByLabelText(/inquiry issue/i));
    await user.type(within(commandCenter).getByLabelText(/inquiry issue/i), "Medical follow-up request");
    await user.selectOptions(within(commandCenter).getByLabelText(/inquiry department/i), "Medical");
    await user.click(within(commandCenter).getByRole("button", { name: /register complaint/i }));
    expect(within(commandCenter).getByText(/request registered for medical/i)).toBeVisible();
    expect(
      readSchoolData<{ issue: string; department: string; status: string }>("front-office-inquiries", schoolId).some(
        (inquiry) => inquiry.issue === "Medical follow-up request" && inquiry.department === "Medical" && inquiry.status === "Waiting",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) => notification.sourceModule === "front-office" && notification.audienceRoles.includes("medical") && /Parent inquiry registered/i.test(notification.title),
      ),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /^send sms$/i })[0]);
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/sms queued/i);
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some((sms) => sms.sourceModule === "front-office" && /Medical follow-up request/i.test(sms.message)),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /escalate issue/i })[0]);
    expect(within(commandCenter).getByText(/medical follow-up request escalated to medical/i)).toBeVisible();
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "PARENT_INQUIRY_ESCALATED" && /Medical/i.test(event.body)),
    ).toBe(true);

    await user.click(within(commandCenter).getAllByRole("button", { name: /mark parent served/i })[0]);
    expect(within(commandCenter).getByText(/marked served/i)).toBeVisible();
    expect(
      readSchoolData<{ issue: string; status: string }>("front-office-inquiries", schoolId).some(
        (inquiry) => inquiry.issue === "Medical follow-up request" && inquiry.status === "Resolved",
      ),
    ).toBe(true);
    expect(
      readSchoolData<{ parent: string; status: string }>("front-office-service-records", schoolId).some(
        (record) => record.parent === "Mrs. Wanjiku" && record.status === "Resolved",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "PARENT_INQUIRY_RESOLVED"),
    ).toBe(true);
  }, 30000);

  it("makes the discipline master desk practical with incident intake, parent SMS, counselling referral, escalation, printing, and resolution", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });
    addSchoolRecord(
      "discipline-cases",
      {
        id: "discipline-kevin-selector",
        student: "Kevin Maina",
        className: "Form 3 South",
        caseType: "Other",
        severity: "Minor",
        reportedBy: "Class Teacher",
        guardianPhone: "0712 111 222",
        notes: "Previous same-school selector context.",
        status: "Resolved",
        parentSmsSent: true,
        counsellorReferred: false,
        time: "07:40",
      },
      schoolId,
    );

    renderWithProviders(
      createElement(SchoolPages, {
        role: "discipline-master" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /record discipline incident/i })).toBeVisible();
    expect(within(commandCenter).getByText(/case queue and interventions/i)).toBeVisible();

    const disciplineStudent = within(commandCenter).getByRole("combobox", { name: /discipline student/i });
    await user.selectOptions(disciplineStudent, "Kevin Maina");
    expect(within(commandCenter).getByLabelText(/discipline class/i)).toHaveValue("Form 3 South");
    expect(within(commandCenter).getByLabelText(/guardian phone/i)).toHaveValue("0712 111 222");
    await user.selectOptions(within(commandCenter).getByLabelText(/case type/i), "Bullying");
    await user.selectOptions(within(commandCenter).getByLabelText(/case severity/i), "Serious");
    await user.clear(within(commandCenter).getByLabelText(/reported by/i));
    await user.type(within(commandCenter).getByLabelText(/reported by/i), "Mr. Otieno");
    await user.clear(within(commandCenter).getByLabelText(/incident notes/i));
    await user.type(within(commandCenter).getByLabelText(/incident notes/i), "Repeat bullying report near dormitory.");
    await user.click(within(commandCenter).getByRole("button", { name: /add incident/i }));

    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/kevin maina discipline case recorded/i);
    expect(
      readSchoolData<{ student: string; severity: string; status: string; schoolId: string }>("discipline-cases", schoolId).some(
        (record) => record.student === "Kevin Maina" && record.severity === "Serious" && record.status === "New" && record.schoolId === schoolId,
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some(
        (event) => event.type === "DISCIPLINE_CASE_RECORDED" && event.module === "discipline" && /Kevin Maina/i.test(event.body),
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) =>
          notification.sourceModule === "discipline" &&
          notification.audienceRoles.includes("deputy-principal") &&
          notification.audienceRoles.includes("class-teacher") &&
          /Kevin Maina/i.test(notification.body),
      ),
    ).toBe(true);

    let caseRow = within(commandCenter)
      .getAllByText(/Repeat bullying report near dormitory/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(caseRow).not.toBeNull();
    await user.click(within(caseRow as HTMLElement).getByRole("button", { name: /notify parent/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/kevin maina parent sms queued/i);
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some(
        (sms) => sms.sourceModule === "discipline" && /Kevin Maina/i.test(sms.message) && /discipline/i.test(sms.message),
      ),
    ).toBe(true);

    caseRow = within(commandCenter)
      .getAllByText(/Repeat bullying report near dormitory/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(caseRow).not.toBeNull();
    await user.click(within(caseRow as HTMLElement).getByRole("button", { name: /refer counsellor/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/kevin maina referred to counsellor/i);
    expect(
      readSchoolData<{ student: string; source: string; status: string }>("counselling-referrals", schoolId).some(
        (referral) => referral.student === "Kevin Maina" && referral.source === "Discipline Master" && referral.status === "Pending Session",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) =>
          notification.sourceModule === "discipline" &&
          notification.audienceRoles.includes("guidance-counselling") &&
          /Kevin Maina/i.test(notification.body),
      ),
    ).toBe(true);

    caseRow = within(commandCenter)
      .getAllByText(/Repeat bullying report near dormitory/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(caseRow).not.toBeNull();
    await user.click(within(caseRow as HTMLElement).getByRole("button", { name: /escalate deputy/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/kevin maina escalated to deputy/i);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "DISCIPLINE_CASE_ESCALATED" && /Kevin Maina/i.test(event.body)),
    ).toBe(true);

    caseRow = within(commandCenter)
      .getAllByText(/Repeat bullying report near dormitory/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(caseRow).not.toBeNull();
    await user.click(within(caseRow as HTMLElement).getByRole("button", { name: /print letter/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/kevin maina discipline letter preview ready/i);
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<{ documentType: string; student: string }>("printed-documents", schoolId).some(
        (document) => document.documentType === "Discipline Letter" && document.student === "Kevin Maina",
      ),
    ).toBe(true);

    caseRow = within(commandCenter)
      .getAllByText(/Repeat bullying report near dormitory/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(caseRow).not.toBeNull();
    await user.click(within(caseRow as HTMLElement).getByRole("button", { name: /mark resolved/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/kevin maina case resolved/i);
    expect(
      readSchoolData<{ student: string; status: string }>("discipline-cases", schoolId).some(
        (record) => record.student === "Kevin Maina" && record.status === "Resolved",
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "DISCIPLINE_CASE_RESOLVED" && /Kevin Maina/i.test(event.body)),
    ).toBe(true);
  }, 30000);

  it("makes the counselling desk practical with session intake, guardian SMS, follow-ups, escalation, printing, and closure", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    const schoolId = "kisumu-boys";
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "guidance-counselling" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /start counselling session/i })).toBeVisible();
    expect(within(commandCenter).getByText(/referral queue and follow-ups/i)).toBeVisible();

    const counsellingStudent = within(commandCenter).getByRole("combobox", { name: /counselling student/i });
    await user.selectOptions(counsellingStudent, "Faith Akinyi");
    expect(within(commandCenter).getByLabelText(/counselling class/i)).toHaveValue("Grade 8 West");
    expect(within(commandCenter).getByLabelText(/guardian phone/i)).toHaveValue("0798 111 222");
    await user.selectOptions(within(commandCenter).getByLabelText(/referral source/i), "Discipline Master");
    await user.selectOptions(within(commandCenter).getByLabelText(/risk level/i), "High");
    await user.selectOptions(within(commandCenter).getByLabelText(/session type/i), "Welfare Check");
    await user.clear(within(commandCenter).getByLabelText(/session notes/i));
    await user.type(within(commandCenter).getByLabelText(/session notes/i), "Bullying stress follow-up and parent meeting needed.");
    await user.clear(within(commandCenter).getByLabelText(/follow-up date/i));
    await user.type(within(commandCenter).getByLabelText(/follow-up date/i), "2026-06-02");
    await user.click(within(commandCenter).getByRole("button", { name: /save session/i }));

    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/faith akinyi counselling session recorded/i);
    expect(
      readSchoolData<{ student: string; riskLevel: string; status: string; schoolId: string }>("counselling-sessions", schoolId).some(
        (session) => session.student === "Faith Akinyi" && session.riskLevel === "High" && session.status === "Open" && session.schoolId === schoolId,
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some(
        (event) => event.type === "COUNSELLING_SESSION_RECORDED" && event.module === "counselling" && /Faith Akinyi/i.test(event.body),
      ),
    ).toBe(true);
    expect(
      readSchoolData<SchoolNotification>("notifications", schoolId).some(
        (notification) =>
          notification.sourceModule === "counselling" &&
          notification.audienceRoles.includes("deputy-principal") &&
          notification.audienceRoles.includes("discipline-master") &&
          /Faith Akinyi/i.test(notification.body),
      ),
    ).toBe(true);

    let sessionRow = within(commandCenter)
      .getAllByText(/Bullying stress follow-up and parent meeting needed/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(sessionRow).not.toBeNull();
    await user.click(within(sessionRow as HTMLElement).getByRole("button", { name: /notify guardian/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/faith akinyi guardian sms queued/i);
    expect(
      readSchoolData<SchoolSmsLog>("smsLogs", schoolId).some(
        (sms) => sms.sourceModule === "counselling" && /Faith Akinyi/i.test(sms.message) && /counselling/i.test(sms.message),
      ),
    ).toBe(true);

    sessionRow = within(commandCenter)
      .getAllByText(/Bullying stress follow-up and parent meeting needed/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(sessionRow).not.toBeNull();
    await user.click(within(sessionRow as HTMLElement).getByRole("button", { name: /schedule follow-up/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/faith akinyi follow-up scheduled/i);
    expect(
      readSchoolData<{ student: string; status: string }>("counselling-follow-ups", schoolId).some(
        (followUp) => followUp.student === "Faith Akinyi" && followUp.status === "Scheduled",
      ),
    ).toBe(true);

    sessionRow = within(commandCenter)
      .getAllByText(/Bullying stress follow-up and parent meeting needed/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(sessionRow).not.toBeNull();
    await user.click(within(sessionRow as HTMLElement).getByRole("button", { name: /escalate deputy/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/faith akinyi escalated to deputy/i);
    expect(
      readSchoolData<SchoolOperationalEvent>("events", schoolId).some((event) => event.type === "COUNSELLING_CASE_ESCALATED" && /Faith Akinyi/i.test(event.body)),
    ).toBe(true);

    sessionRow = within(commandCenter)
      .getAllByText(/Bullying stress follow-up and parent meeting needed/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(sessionRow).not.toBeNull();
    await user.click(within(sessionRow as HTMLElement).getByRole("button", { name: /print summary/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/faith akinyi counselling summary preview ready/i);
    await printFromPreview(user, printMock);
    expect(
      readSchoolData<{ documentType: string; student: string }>("printed-documents", schoolId).some(
        (document) => document.documentType === "Counselling Summary" && document.student === "Faith Akinyi",
      ),
    ).toBe(true);

    sessionRow = within(commandCenter)
      .getAllByText(/Bullying stress follow-up and parent meeting needed/i)
      .map((element) => element.closest("tr"))
      .find(Boolean);
    expect(sessionRow).not.toBeNull();
    await user.click(within(sessionRow as HTMLElement).getByRole("button", { name: /mark follow-up done/i }));
    expect(within(commandCenter).getByRole("status")).toHaveTextContent(/faith akinyi follow-up closed/i);
    expect(
      readSchoolData<{ student: string; status: string }>("counselling-sessions", schoolId).some(
        (session) => session.student === "Faith Akinyi" && session.status === "Closed",
      ),
    ).toBe(true);
  }, 30000);

  it("surfaces counselling outcomes on related school dashboards without exposing confidential notes", async () => {
    const schoolId = "kisumu-boys";

    addSchoolRecord(
      "counselling-sessions",
      {
        id: "counselling-cross-dashboard-faith",
        student: "Faith Akinyi",
        className: "Grade 8 West",
        referralSource: "Discipline Master",
        riskLevel: "High",
        sessionType: "Welfare Check",
        guardianPhone: "0798 111 222",
        notes: "PRIVATE counselling note about bullying stress and family context.",
        followUpDate: "2026-06-02",
        status: "Open",
        guardianSmsSent: false,
        time: "08:15",
      },
      schoolId,
    );

    const roleExpectations: Array<{ role: SchoolExperienceRole; expected: RegExp }> = [
      { role: "deputy-principal", expected: /faith akinyi high-risk counselling follow-up/i },
      { role: "class-teacher", expected: /faith akinyi counselling check-in needed/i },
      { role: "discipline-master", expected: /faith akinyi counselling support linked to discipline/i },
    ];

    for (const { role, expected } of roleExpectations) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role,
          tenantSlug: "kisumu-boys",
        }),
      );

      const commandCenter = await screen.findByTestId("role-operational-command-center");
      expect(within(commandCenter).getByText(expected)).toBeVisible();
      expect(within(commandCenter).queryByText(/PRIVATE counselling note/i)).not.toBeInTheDocument();
      view.unmount();
    }
  }, 30000);

  it("lets the secretary print a fee statement directly from student search", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "secretary" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.clear(within(commandCenter).getByLabelText(/secretary student search/i));
    await user.type(within(commandCenter).getByLabelText(/secretary student search/i), "Brian");
    await user.click(within(commandCenter).getAllByRole("button", { name: /print fee statement/i })[0]);

    expect(within(commandCenter).getByText(/fee statement print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);
  }, 30000);

  it("shows accountant payment status in the secretary student search", async () => {
    const user = userEvent.setup();
    const schoolId = "secretary-finance-sync";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "fee-balances",
      {
        id: "fee-mary-atieno",
        student: "Mary Atieno",
        admissionNo: "KBI/2026/501",
        className: "Form 1 North",
        balance: 7400,
        parentPhone: "0711 222 999",
        lastPayment: 5000,
        lastMethod: "Cash",
        status: "Balance",
      },
      schoolId,
    );
    addSchoolRecord(
      "finance-payments",
      {
        id: "secretary-payment-mary",
        student: "Mary Atieno",
        admissionNo: "KBI/2026/501",
        amount: 5000,
        method: "Cash",
        voteHead: "Tuition",
        term: "Term 2 2026",
        reference: "CASH-5000",
        receiptNo: "KBI-RCPT-5010",
        parentSmsSent: true,
        status: "Recorded",
      },
      schoolId,
    );

    renderWithProviders(
      createElement(SchoolPages, {
        role: "secretary" as SchoolExperienceRole,
        tenantSlug: schoolId,
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.clear(within(commandCenter).getByLabelText(/secretary student search/i));
    await user.type(within(commandCenter).getByLabelText(/secretary student search/i), "Mary");

    expect(within(commandCenter).getByText(/balance KSh 7,400/i)).toBeVisible();
    expect(within(commandCenter).getByText(/latest payment KSh 5,000 by Cash/i)).toBeVisible();
    expect(within(commandCenter).getByText(/receipt KBI-RCPT-5010/i)).toBeVisible();
  }, 30000);

  it("renders role-specific sidebar aliases as operational workspaces instead of falling through to legacy pages", async () => {
    const routeCases: Array<{
      role: SchoolExperienceRole;
      section: string;
      workspace: string;
    }> = [
      { role: "exams-manager", section: "marks", workspace: "Marks Entry Hub" },
      { role: "exams-manager", section: "grading", workspace: "Grade Processing" },
      { role: "exams-manager", section: "validation", workspace: "Data Validation" },
      { role: "hod", section: "syllabus", workspace: "Syllabus Coverage" },
      { role: "hod", section: "lesson-plans", workspace: "Lesson Plans" },
      { role: "hod", section: "attendance", workspace: "Attendance Analysis" },
      { role: "hod", section: "resources", workspace: "Department Resources" },
      { role: "hod", section: "student-analytics", workspace: "Student Analytics" },
      { role: "grade-master", section: "attendance", workspace: "Attendance Oversight" },
    ];

    for (const routeCase of routeCases) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role: routeCase.role,
          section: routeCase.section,
          tenantSlug: "kisumu-boys",
        }),
      );

      const commandCenter = await screen.findByTestId("role-operational-command-center");

      expect(commandCenter).toBeVisible();
      expect(screen.getAllByTestId("role-operational-command-center")).toHaveLength(1);
      expect(within(commandCenter).getByText(new RegExp(`${routeCase.workspace} today['’]s work`, "i"))).toBeVisible();
      expect(screen.queryByText(/module not enabled for your school/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /dashboard home/i })).not.toBeInTheDocument();

      view.unmount();
    }
  }, 30000);

  it("keeps self-healing diagnostics out of the normal principal first viewport", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      createElement(SchoolPages, {
        role: "principal" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).queryByText(/Visible recovery states/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Workflow state machines/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Kisumu Boys High live demo fabric/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/capability governed/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/event-backed/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /^Audit Logs$/i }));

    expect((await screen.findAllByText(/^Audit Logs$/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Accountability records|Audit Logs/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Visible recovery states/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Workflow state machines/i)).not.toBeInTheDocument();
  });

  it("dispatches role dashboard actions through the governed workflow proxy", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      createElement(SchoolPages, {
        role: "class-teacher" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    await user.click((await screen.findAllByRole("button", { name: /Mark Attendance Ready/i }))[0]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/operational-workflows/roles/class-teacher/actions/"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByText(/Task completed/i)).toBeVisible();
    expect(await screen.findByText(/Saved for reporting/i)).toBeVisible();
  });

  it("keeps failed role actions visible and triggers repair events instead of hiding controls", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-operational-token" }));
      }

      if (url.includes("/api/operational-workflows/roles/")) {
        return Promise.resolve(jsonResponse({ message: "dispatcher unavailable" }, { status: 503 }));
      }

      return Promise.resolve(jsonResponse({ data: ["principal_dashboard"] }));
    });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "discipline-master" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    await user.click((await screen.findAllByRole("button", { name: /Record Incident Ready/i }))[0]);

    expect(await screen.findByText(/Record Incident needs retry: dispatcher unavailable/i)).toBeVisible();
    expect(await screen.findByText(/Task could not send, Retry started, Backup action started/i)).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Record Incident Needs retry/i }).length).toBeGreaterThan(0);
  });

  it("submits real form values, sends them through workflow dispatch, and materializes the entry in workspace records", async () => {
    const user = userEvent.setup();
    const dispatchedBodies: Array<Record<string, unknown>> = [];

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-operational-token" }));
      }

      if (url.includes("/api/operational-workflows/roles/")) {
        dispatchedBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);

        return Promise.resolve(
          jsonResponse({
            status: "DISPATCHED",
            actionId: decodeURIComponent(url.split("/actions/")[1]?.split("/dispatch")[0] ?? "unknown-action"),
            workflowBinding: "Finance Command Center captured -> Reconciled -> Audited",
            executionHandler: "workflows.runtime.dispatch",
            eventId: "event-runtime-form",
            eventName: "workflow.action.dispatched",
            widgetRefresh: {
              dashboardId: "principal-dashboard",
              nodeId: "finance-oversight",
              events: ["WORKFLOW_ACTION_DISPATCHED", "FORM_ENTRY_RECORDED"],
            },
            auditAction: "audit.runtime.action",
          }),
        );
      }

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(
          jsonResponse({
            data: [
              "students",
              "admissions",
              "academics",
              "exams",
              "discipline",
              "finance",
              "communication_sms",
              "reports",
              "staff",
              "inventory",
              "library",
              "transport",
              "principal_dashboard",
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({ data: [] }));
    });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "accountant" as SchoolExperienceRole,
        tenantSlug: "kisumu-boys",
      }),
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getAllByRole("button", { name: /^Payments$/i })[0]);

    await user.clear(screen.getByLabelText(/Payment amount/i));
    await user.type(screen.getByLabelText(/Payment amount/i), "18500");
    await user.clear(screen.getByLabelText(/Payment reference/i));
    await user.type(screen.getByLabelText(/Payment reference/i), "QEX7ABC123");

    await user.click(screen.getByRole("button", { name: /^Record Payment$/i }));

    expect((await screen.findAllByText(/QEX7ABC123/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KSh 18,500/).length).toBeGreaterThan(0);
    expect(screen.getByText(/payment recorded/i)).toBeVisible();
  }, 30000);
});
