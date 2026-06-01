import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS,
  MYSHULE_OPERATIONAL_ROLE_IDS,
  getOperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";
import { SchoolPages } from "@/components/school/school-pages";
import { addSchoolRecord } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

describe("role dashboard operational structure", () => {
  it("gives every role a complete first-viewport, sidebar, queue, action, form, table, state, mobile, and recovery contract", () => {
    expect(MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS).toHaveLength(MYSHULE_OPERATIONAL_ROLE_IDS.length);

    for (const roleId of MYSHULE_OPERATIONAL_ROLE_IDS) {
      const blueprint = getOperationalRoleBlueprint(roleId);

      expect(blueprint).toBeDefined();
      expect(blueprint?.searchMode).toMatch(/GLOBAL|SCOPED|SELF|PLATFORM/);
      expect(blueprint?.searchEntities.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.forbiddenEntities).toBeDefined();
      expect(blueprint?.sidebar.length).toBeGreaterThanOrEqual(6);
      expect(blueprint?.firstViewport.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.queues.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.primaryActions.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.forms.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.tables.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.printOutputs.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.states).toEqual(expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]));
      expect(blueprint?.mobileBehavior).toEqual(
        expect.arrayContaining(["collapse sidebar into drawer", "keep urgent actions first"]),
      );
      expect(blueprint?.lowBandwidthBehavior).toEqual(
        expect.arrayContaining(["show cached queue", "allow offline draft", "retry sync visibly"]),
      );

      for (const queue of blueprint?.queues ?? []) {
        expect(queue.title).toMatch(/\S/);
        expect(queue.workflow).toMatch(/->/);
        expect(queue.actions.length).toBeGreaterThanOrEqual(3);
        expect(queue.auditEvent).toMatch(/[A-Z_]+/);
        expect(queue.sla).toMatch(/\S/);
      }
    }
  });

  it("limits full global search to principal, deputy, secretary, and accountant while keeping other users scoped", () => {
    expect(getOperationalRoleBlueprint("principal")?.searchMode).toBe("GLOBAL_EXECUTIVE");
    expect(getOperationalRoleBlueprint("deputy-principal")?.searchMode).toBe("GLOBAL_OPERATIONS");
    expect(getOperationalRoleBlueprint("secretary")?.searchMode).toBe("GLOBAL_FRONT_OFFICE");
    expect(getOperationalRoleBlueprint("accountant")?.searchMode).toBe("GLOBAL_FINANCE");

    for (const role of MYSHULE_OPERATIONAL_ROLE_IDS.filter(
      (roleId) => !["principal", "deputy-principal", "secretary", "accountant", "superadmin", "system-monitor"].includes(roleId),
    )) {
      expect(getOperationalRoleBlueprint(role)?.searchMode).not.toMatch(/^GLOBAL/);
    }
  });

  it("keeps first-viewpoint language action-first instead of metric-only", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      expect(blueprint.firstViewport.join(" ")).toMatch(
        /pending|urgent|missing|failed|unresolved|alerts|approvals|follow|exceptions|queue|action|review|requests|overdue|risk/i,
      );
      expect(blueprint.queues[0]?.actions).toEqual(
        expect.arrayContaining(["View Details"]),
      );
    }
  });

  it("renders the operational role blueprint on actual school dashboard routes", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="class-teacher" tenantSlug="kisumu-boys" />);

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByTestId("role-operational-command-center").textContent ?? "").not.toMatch(
      /tenant-wide|event-backed|workspace isolated|state machine|capability governed|workflow dispatch|execution timeline|generated audit extract|repair triggered|demo fabric|operational fabric|synthetic workflow|command surface|observability layer|workflow state machines|widget count|state machine bound|governed capability|audit extract|trigger repair|tenant protected|tenant isolated|tenant aware/i,
    );
    expect(screen.getByRole("heading", { name: /class teacher desk/i })).toBeVisible();
    expect(screen.getByText(/What requires action right now/i)).toBeVisible();
    expect(screen.getByText(/Kisumu Boys High live updates/i)).toBeVisible();
    expect(screen.getAllByText(/Attendance absence synced/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Today['’]s Work/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/View Action History/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Ready/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Visible recovery states/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Attendance/i })[0]);
    expect(screen.queryByRole("button", { name: /^Action History$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Action history/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Visible recovery states/i)).not.toBeInTheDocument();
  }, 30000);

  it("keeps executive role sidebar routes inside one operational workspace instead of mixing old dashboards", async () => {
    const principalFinance = renderWithProviders(<SchoolPages role="principal" section="finance" tenantSlug="kisumu-boys" />);

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByTestId("principal-practical-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /^Fees$/i })).toBeVisible();
    expect(screen.getAllByText(/KSh 248,500 collected today/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /fees \/ payments/i })).not.toBeInTheDocument();
    principalFinance.unmount();

    const principalAttendance = renderWithProviders(<SchoolPages role="principal" section="attendance" tenantSlug="kisumu-boys" />);

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /^Attendance$/i })).toBeVisible();
    expect(screen.getByText(/18 students absent, 12 late/i)).toBeVisible();
    principalAttendance.unmount();

    const deputyDiscipline = renderWithProviders(<SchoolPages role="deputy-principal" section="discipline" tenantSlug="kisumu-boys" />);

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /deputy principal operations/i })).toBeVisible();
    expect(screen.getAllByText(/Discipline/i).length).toBeGreaterThan(0);
    deputyDiscipline.unmount();
  }, 30000);

  it("shows practical Kisumu Boys school data on hosted principal dashboards even when no tenant slug is present", async () => {
    renderWithProviders(<SchoolPages role="principal" />);

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByTestId("principal-practical-command-center")).toBeVisible();
    expect(screen.getAllByText(/Kisumu Boys High School/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Students Present/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fees Collected Today/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Visitors Inside/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sick Bay Cases/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KSh 248,500/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/From: Accountant dashboard and M-Pesa confirmations/i)).toBeVisible();
    expect(screen.getByText(/From: Teacher and Class Teacher dashboards/i)).toBeVisible();
  }, 30000);

  it("shows accountant payment records inside the principal fees workspace", async () => {
    const schoolId = "kisumu-boys";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "finance-payments",
      {
        id: "principal-payment-brian",
        student: "Brian Otieno",
        admissionNo: "KBI/2026/044",
        amount: 5000,
        method: "Cash",
        voteHead: "Tuition",
        term: "Term 2 2026",
        reference: "CASH-5000",
        receiptNo: "KBI-RCPT-5001",
        parentSmsSent: true,
        status: "Recorded",
      },
      schoolId,
    );
    addSchoolRecord(
      "fee-balances",
      {
        id: "fee-brian",
        student: "Brian Otieno",
        admissionNo: "KBI/2026/044",
        className: "Form 2 East",
        balance: 7400,
        parentPhone: "0712 345 678",
        lastPayment: 5000,
        lastMethod: "Cash",
        status: "Balance",
      },
      schoolId,
    );

    renderWithProviders(<SchoolPages role="principal" section="finance" tenantSlug={schoolId} />);

    const commandCenter = screen.getByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByText(/KSh 5,000 collected today/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Brian Otieno payment KBI-RCPT-5001/i)).toBeVisible();
    expect(within(commandCenter).getAllByText(/Current balance KSh 7,400/i).length).toBeGreaterThan(0);
  });

  it("shows secretary visitor and parent inquiry records inside the principal visitors workspace", async () => {
    const schoolId = "principal-front-office-sync";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "visitors",
      {
        id: "visitor-peter-ouma",
        visitor: "Peter Ouma",
        phoneOrId: "0710 111 222",
        visiting: "Accounts Office",
        reason: "Fee balance follow-up",
        vehicle: "KDE 245P",
        status: "Inside",
        checkInTime: "8:20 AM",
        slipPrinted: true,
      },
      schoolId,
    );
    addSchoolRecord(
      "front-office-inquiries",
      {
        id: "inquiry-wanjiku-transfer",
        parent: "Mrs. Wanjiku",
        student: "Brian Otieno",
        className: "Form 2 East",
        phone: "0712 345 678",
        issue: "Transfer letter request",
        department: "Principal",
        status: "Waiting",
        smsSent: false,
      },
      schoolId,
    );

    renderWithProviders(<SchoolPages role="principal" section="visitors" tenantSlug={schoolId} />);

    const commandCenter = screen.getByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByText(/1 visitor inside and 1 parent inquiry waiting/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Peter Ouma visiting Accounts Office/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Mrs\. Wanjiku waiting for Brian Otieno/i)).toBeVisible();
  });

  it("shows nurse sick bay and medicine stock records inside the principal sick bay workspace", async () => {
    const schoolId = "principal-sick-bay-sync";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "clinic-visits",
      {
        id: "clinic-visit-brian-referral",
        student: "Brian Otieno",
        className: "Form 2 East",
        symptoms: "High fever and dizziness",
        temperature: "39.1",
        medicine: "ORS sachets",
        quantity: 2,
        guardianPhone: "0712 345 678",
        status: "Referred",
        parentContacted: true,
        time: "10:15 AM",
      },
      schoolId,
    );
    addSchoolRecord(
      "medicine-stock",
      {
        id: "medicine-ors-low",
        medicine: "ORS sachets",
        batch: "ORS-2026-A",
        quantity: 3,
        expiry: "2026-07-15",
        reorderAt: 10,
      },
      schoolId,
    );

    renderWithProviders(<SchoolPages role="principal" section="clinic" tenantSlug={schoolId} />);

    const commandCenter = screen.getByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByText(/1 sick bay case recorded and 1 medicine stock alert/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Brian Otieno referred from sick bay/i)).toBeVisible();
    expect(within(commandCenter).getByText(/ORS sachets low stock/i)).toBeVisible();
  });

  it("shows librarian circulation and fine records inside the principal library workspace", async () => {
    const schoolId = "principal-library-sync";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "library-loans",
      {
        id: "library-loan-brian-overdue",
        bookTitle: "Kidagaa Kimemwozea",
        barcode: "KBH-LIB-9090",
        borrower: "Brian Otieno",
        admissionNo: "KBI/2026/044",
        dueDate: "2026-06-01",
        status: "Overdue",
        fine: 40,
        parentSmsSent: false,
      },
      schoolId,
    );
    addSchoolRecord(
      "library-loans",
      {
        id: "library-loan-faith-lost",
        bookTitle: "The River and the Source",
        barcode: "KBH-LIB-7001",
        borrower: "Faith Akinyi",
        admissionNo: "KBI/2025/118",
        dueDate: "2026-05-25",
        status: "Lost",
        fine: 850,
        parentSmsSent: true,
      },
      schoolId,
    );

    renderWithProviders(<SchoolPages role="principal" section="library" tenantSlug={schoolId} />);

    const commandCenter = screen.getByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByText(/2 active library records with 2 needing follow-up/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Kidagaa Kimemwozea borrowed by Brian Otieno/i)).toBeVisible();
    expect(within(commandCenter).getAllByText(/Fine KSh 40/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByText(/The River and the Source borrowed by Faith Akinyi/i)).toBeVisible();
  });

  it("keeps the command center short and makes sidebar workspaces render independent practical data", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" />);

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.queryByText(/Audit trail ready for this workflow item/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Workflow state machines/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kisumu Boys High live demo fabric/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Fees 1$/i }));

    expect(screen.getByRole("heading", { name: /^Fees$/i })).toBeVisible();
    expect(screen.getByText(/Fees items needing attention/i)).toBeVisible();
    expect(screen.getAllByText(/Print Defaulters List/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Two exeat requests pending/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Attendance 7$/i }));

    expect(screen.getByRole("heading", { name: /^Attendance$/i })).toBeVisible();
    expect(screen.getByText(/Attendance items needing attention/i)).toBeVisible();
    expect(screen.getAllByText(/Send Absence SMS/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1 failed M-Pesa callback/i)).not.toBeInTheDocument();
  }, 30000);

  it("renders principal first screen as a practical Kenyan school command center with working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getAllByText(/Students Present/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/Fees Collected Today/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/Visitors Inside/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/Sick Bay Cases/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/Pending Approvals/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/System Alerts/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Attendance$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Fees$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Discipline$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/Parents & Visitors/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/Sick Bay/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Boarding$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Academics$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Staff$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByText(/^Transport$/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByText(/From: Nurse dashboard and medicine stock records/i)).toBeVisible();
    expect(within(commandCenter).getByText(/From: Security and Secretary dashboards|From: Secretary and Security dashboards/i)).toBeVisible();

    for (const forbidden of [
      /tenant-wide/i,
      /demo fabric/i,
      /state machine/i,
      /event-backed/i,
      /workspace isolated/i,
      /capability governed/i,
      /workflow dispatch/i,
      /execution timeline/i,
      /generated audit extract/i,
      /repair triggered/i,
      /widget count/i,
    ]) {
      expect(within(commandCenter).queryByText(forbidden)).not.toBeInTheDocument();
    }

    await user.click(within(commandCenter).getByRole("button", { name: /Send Absence SMS/i }));

    expect(await within(commandCenter).findByText(/Send Absence SMS (is being sent|completed|could not complete) from Attendance/i)).toBeVisible();
  }, 30000);

  it("keeps principal overview wide by replacing the permanent approvals rail with a compact approvals card", async () => {
    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    const principalWorkspace = screen.getByTestId("principal-practical-command-center");
    const contentScrollArea = principalWorkspace.querySelector("main section");

    expect(commandCenter.className).toMatch(/min-h-dvh/);
    expect(commandCenter.className).not.toMatch(/h-screen/);
    expect(contentScrollArea?.className ?? "").toMatch(/overflow-y-auto/);
    expect(principalWorkspace.innerHTML).not.toContain("xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]");
    expect(within(commandCenter).queryByText(/Approvals, alerts, and reports/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Quiet areas/i)).not.toBeInTheDocument();
    expect(within(commandCenter).getAllByText(/^Pending approvals$/i).length).toBeGreaterThanOrEqual(1);
    expect(within(commandCenter).getAllByRole("button", { name: /Open Approval Queue/i }).length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it("opens principal navigation as a mobile drawer instead of a short inline sidebar", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    await screen.findByTestId("role-operational-command-center");
    const sidebar = document.querySelector("[aria-label='Principal dashboard sidebar']")?.closest("aside");

    expect(sidebar?.className ?? "").toMatch(/fixed/);
    expect(sidebar?.className ?? "").toMatch(/-translate-x-full/);
    expect(sidebar?.className ?? "").not.toMatch(/max-h-\[58vh\]/);

    await user.click(screen.getByRole("button", { name: /Open principal navigation/i }));

    expect(screen.getByRole("button", { name: /Close principal navigation overlay/i })).toBeInTheDocument();
    expect(sidebar?.className ?? "").toMatch(/translate-x-0/);

    await user.click(screen.getByRole("button", { name: /Close principal navigation overlay/i }));

    expect(screen.queryByRole("button", { name: /Close principal navigation overlay/i })).not.toBeInTheDocument();
    expect(sidebar?.className ?? "").toMatch(/-translate-x-full/);
  }, 30000);

  it("keeps non-principal role dashboards on one main scroll area with a mobile drawer sidebar", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="deputy-principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    const contentScrollArea = commandCenter.querySelector("main section");
    const sidebar = commandCenter.querySelector("aside");

    expect(commandCenter.className).toMatch(/min-h-dvh/);
    expect(commandCenter.className).not.toMatch(/h-screen/);
    expect(contentScrollArea?.className ?? "").toMatch(/overflow-y-auto/);
    expect(sidebar?.className ?? "").toMatch(/fixed/);
    expect(sidebar?.className ?? "").toMatch(/-translate-x-full/);
    expect(commandCenter.innerHTML).not.toContain("max-h-[calc(100vh");
    expect(commandCenter.innerHTML).not.toContain("grid h-full min-h-0");

    await user.click(within(commandCenter).getByRole("button", { name: /Open Deputy Principal menu/i }));

    expect(within(commandCenter).getByRole("button", { name: /Close Deputy Principal menu overlay/i })).toBeInTheDocument();
    expect(sidebar?.className ?? "").toMatch(/translate-x-0/);

    await user.click(within(commandCenter).getAllByRole("button", { name: /Attendance/i })[0]);

    expect(within(commandCenter).queryByRole("button", { name: /Close Deputy Principal menu overlay/i })).not.toBeInTheDocument();
    expect(sidebar?.className ?? "").toMatch(/-translate-x-full/);
  }, 30000);

  it("does not repeat the same specialized workspace for different role sidebar items", async () => {
    const user = userEvent.setup();

    const accountant = renderWithProviders(<SchoolPages role="accountant" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getByText(/Record payment and print receipt/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Fee Structures/i }));

    expect(within(commandCenter).getAllByText(/^Fee Structures$/i).length).toBeGreaterThanOrEqual(1);
    expect(within(commandCenter).getByText(/Fee Structures today's work/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/Record payment and print receipt/i)).not.toBeInTheDocument();
    accountant.unmount();

    renderWithProviders(<SchoolPages role="librarian" tenantSlug="kisumu-boys" />);

    const libraryCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(libraryCenter).getByText(/Issue or return books quickly/i)).toBeVisible();

    await user.click(within(libraryCenter).getByRole("button", { name: /^Returns/i }));

    expect(within(libraryCenter).getAllByText(/^Returns$/i).length).toBeGreaterThanOrEqual(1);
    expect(within(libraryCenter).getByText(/Returns today's work/i)).toBeVisible();
    expect(within(libraryCenter).queryByText(/Issue or return books quickly/i)).not.toBeInTheDocument();
  }, 30000);

  it("keeps operational queues page-scrolled and operational tables horizontally scrollable on mobile", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="class-teacher" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(commandCenter.innerHTML).not.toContain("max-h-[calc(100vh-330px)]");

    await user.click(within(commandCenter).getAllByRole("button", { name: /Attendance/i })[0]);
    await user.click(within(commandCenter).getByRole("button", { name: /^Records$/i }));

    const attendanceTable = within(commandCenter).getByText(/Student\/Class/i).closest("table");
    const tableWrapper = attendanceTable?.parentElement;

    expect(tableWrapper?.className ?? "").toMatch(/overflow-x-auto/);
    expect(tableWrapper?.className ?? "").not.toMatch(/overflow-hidden/);
  }, 30000);
});
