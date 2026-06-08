import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SuperAdminShell } from "@/components/layouts/superadmin-shell";
import { ParentCommandCenter } from "@/components/portal/parent-command-center";
import { PortalPages } from "@/components/portal/portal-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";
import { ExamsManagerCommandCenter } from "@/components/school/exams-manager-command-center";
import { addSchoolRecord, readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

const fakeOnlyPhrases =
  /Action completed|Workflow dispatched|completed successfully|is being sent|print started|export generated|profile selected\.|one-time admin reset bundle is ready|Navigating to .* route\.|selected in exams records|Marks entry sheet ready for selected class and subject/i;

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    ok: init?.status ? init.status >= 200 && init.status < 300 : true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response;
}

function expectNoFakeOnlyFeedback() {
  expect(document.body.textContent).not.toMatch(fakeOnlyPhrases);
}

describe("portal and platform command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("makes exams manager search and draft actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExamsManagerCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search exams, classes, subjects, marks, or report cards/i), "Form 4");
    await user.click(screen.getByRole("button", { name: /form 4 mock series/i }));

    expect(screen.getByText(/form 4 mock series exams search loaded marks workspace: marks entry open for mathematics and english/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /enter marks/i }));
    expect(screen.getByText(/mathematics form 4 north marks entry opened for mathematics form 4 north with 12 pending learners; teacher and dean notifications created/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /exam builder/i }));
    await user.click(screen.getByRole("button", { name: /save configuration/i }));
    expect(screen.getByText(/exam configuration saved for dean review/i)).toBeVisible();
    expect(screen.getByText(/Form 4 Mock Series configuration/i)).toBeVisible();
  });

  it("exposes the exams manager command, setup, entry, validation, report, analytics, and audit workspaces", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExamsManagerCommandCenter routeMode="hosted" />);

    expect(screen.getByRole("button", { name: /exam command center/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /exam setup/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /entry windows/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /mark entry monitor/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /missing marks/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^moderation$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /report cards/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /report templates/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /academic analytics/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /exam audit log/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /missing marks/i }));
    expect(screen.getAllByRole("heading", { name: /missing marks/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/teacher follow-up required/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /exam audit log/i }));
    expect(screen.getByRole("heading", { name: /exam audit log/i })).toBeVisible();
    expect(screen.getByText(/tenant-scoped exam events/i)).toBeVisible();
  });

  it("lets the exams manager select records and execute lifecycle actions with truthful same-school results", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("myshule.currentSchoolId", "kisumu-boys");

    renderWithProviders(<ExamsManagerCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /entry windows/i }));
    expect(screen.getByRole("heading", { name: /entry windows work queue/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /open entry for selected/i })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /select form 3 science block/i }));
    await user.click(screen.getByRole("button", { name: /open entry for selected/i }));
    expect(screen.getByText(/Open Entry queued for 1 selected entry window/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /missing marks/i }));
    expect(screen.getByRole("heading", { name: /missing marks work queue/i })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /select class 7b science/i }));
    await user.click(screen.getByRole("button", { name: /notify teacher for selected/i }));
    expect(screen.getByText(/Notify Teacher queued for 1 selected missing mark record/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^moderation$/i }));
    expect(screen.getByRole("heading", { name: /moderation work queue/i })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /select term 2 cat 1 moderation/i }));
    await user.click(screen.getByRole("button", { name: /approve selected to dean review/i }));
    expect(screen.getByText(/Approve selected to Dean review status updated for 1 selected moderation record/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /report cards/i }));
    expect(screen.getByRole("heading", { name: /report cards work queue/i })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /select term 2 cat 1 report card draft batch/i }));
    await user.click(screen.getByRole("button", { name: /generate selected/i }));
    expect(screen.getByText(/Generate Selected queued for 1 selected report card batch/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /report templates/i }));
    expect(screen.getByRole("heading", { name: /report templates work queue/i })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /select cbc\/cbe competency report/i }));
    await user.click(screen.getByRole("button", { name: /save template draft for selected/i }));
    expect(screen.getByText(/Save Template Draft status updated for 1 selected report template/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /export center/i }));
    expect(screen.getByRole("heading", { name: /export center work queue/i })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /select excel marksheets/i }));
    await user.click(screen.getByRole("button", { name: /prepare export for selected/i }));
    expect(screen.getByText(/Prepare Export queued for 1 selected export package/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /exam audit log/i }));
    expect(screen.getAllByText(/EXAMS_MANAGER_LIFECYCLE_ACTION_EXECUTED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/kisumu-boys/i).length).toBeGreaterThan(0);

    expect(readSchoolData<Record<string, unknown>>("events", "kisumu-boys")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kisumu-boys",
          type: "EXAMS_MANAGER_LIFECYCLE_ACTION_EXECUTED",
          module: "exams",
        }),
      ]),
    );
    expect(readSchoolData<Record<string, unknown>>("events", "other-school")).toEqual([]);
  }, 30000);

  it("makes parent topbar and emergency controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ParentCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /aisha wanjiku/i }));
    expect(screen.getByText(/Aisha Wanjiku profile selected: Grade 5 Hope, 4 verified feed items loaded/i)).toBeVisible();
    expect(screen.getByText(/Verified school data for Aisha Wanjiku/i)).toBeVisible();
    expect(screen.getByText(/Here's everything happening with Aisha today/i)).toBeVisible();
    expect(screen.getByText(/Reading check published/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Aisha Wanjiku profile selected\./i);

    await user.click(screen.getByRole("button", { name: /brian otieno/i }));
    expect(screen.getByText(/Brian Otieno profile selected: Form 2 Blue, 6 verified feed items loaded/i)).toBeVisible();
    expect(screen.getByText(/Verified school data for Brian Otieno/i)).toBeVisible();
    expect(screen.getByText(/Here's everything happening with Brian today/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Brian Otieno profile selected\./i);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText(/parent notifications panel visible/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getAllByRole("button", { name: /emergency contacts/i })[0]);
    expect(screen.getByText(/emergency contacts visible/i)).toBeVisible();
    expectNoFakeOnlyFeedback();
  });

  it("routes parent quick actions with active learner and feed evidence", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ParentCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /aisha wanjiku/i }));
    await user.click(screen.getAllByRole("link", { name: /pay with m-pesa/i })[0]);

    expect(screen.getByText(/pay with m-pesa route ready for aisha wanjiku at .*linked-child feed items loaded/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /brian otieno/i }));
    await user.click(screen.getByRole("link", { name: /message teacher/i }));

    expect(screen.getByText(/message teacher route ready for brian otieno at .*linked-child feed items loaded/i)).toBeVisible();
    expectNoFakeOnlyFeedback();
  });

  it("makes student dashboard quick actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);

    await user.click(screen.getByRole("link", { name: /view assignment/i }));
    expect(screen.getByText(/view assignment route ready for brian otieno at .*learner-safe updates loaded/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("link", { name: /message teacher/i }));
    expect(screen.getByText(/message teacher route ready for brian otieno at .*learner-safe updates loaded/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /submit work/i })).toBeDisabled();
    expect(screen.getByText(/disabled: submit-work form is not connected to an assignment yet/i)).toBeVisible();
    expectNoFakeOnlyFeedback();
  });

  it("shows parent and student safe updates from school operations without exposing confidential notes", () => {
    const schoolId = "kisumu-boys";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "counselling-sessions",
      {
        id: "portal-counselling-brian",
        student: "Brian Otieno",
        className: "Form 2 Blue",
        referralSource: "Discipline Master",
        riskLevel: "High",
        sessionType: "Welfare Check",
        guardianPhone: "0712 345 678",
        notes: "PRIVATE counselling note about bullying stress and family context.",
        followUpDate: "2026-06-03",
        status: "Follow-up Scheduled",
        guardianSmsSent: true,
        time: "09:20",
      },
      schoolId,
    );
    addSchoolRecord(
      "clinic-visits",
      {
        id: "portal-clinic-brian",
        student: "Brian Otieno",
        className: "Form 2 Blue",
        symptoms: "Headache",
        temperature: "37.8",
        medicine: "Paracetamol",
        quantity: 2,
        guardianPhone: "0712 345 678",
        status: "Released",
        parentContacted: true,
        time: "11:45",
      },
      schoolId,
    );
    addSchoolRecord(
      "library-loans",
      {
        id: "portal-library-brian",
        bookTitle: "Kidagaa Kimemwozea",
        barcode: "KBH-LIB-9090",
        borrower: "Brian Otieno",
        admissionNo: "KBH-2044",
        dueDate: "2026-06-01",
        status: "Overdue",
        fine: 40,
        parentSmsSent: false,
      },
      schoolId,
    );

    const parentView = renderWithProviders(<ParentCommandCenter routeMode="hosted" />);
    expect(screen.getByText(/Brian Otieno counselling follow-up scheduled/i)).toBeVisible();
    expect(screen.getByText(/Paracetamol issued and learner released/i)).toBeVisible();
    expect(screen.getByText(/Kidagaa Kimemwozea overdue/i)).toBeVisible();
    expect(screen.queryByText(/PRIVATE counselling note/i)).not.toBeInTheDocument();
    parentView.unmount();

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);
    expect(screen.getByText(/Kidagaa Kimemwozea due on 2026-06-01/i)).toBeVisible();
    expect(screen.getByText(/Counselling follow-up scheduled with the school counsellor/i)).toBeVisible();
    expect(screen.queryByText(/PRIVATE counselling note/i)).not.toBeInTheDocument();
  });

  it("shows parent and student attendance follow-up from submitted class registers", () => {
    const schoolId = "kisumu-boys";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "attendance-registers",
      {
        id: "portal-attendance-brian",
        classId: "form-2-blue",
        className: "Form 2 Blue",
        subject: "Mathematics",
        teacher: "Mr. Otieno",
        totalLearners: 48,
        present: 45,
        absent: 3,
        status: "Submitted",
        markedAt: "2026-05-30T06:45:00.000Z",
        absentLearners: ["Brian Otieno", "Kevin Maina", "Faith Akinyi"],
      },
      schoolId,
    );

    const parentView = renderWithProviders(<ParentCommandCenter routeMode="hosted" />);
    expect(screen.getByText(/Brian Otieno attendance follow-up recorded/i)).toBeVisible();
    expect(screen.getByText(/Form 2 Blue register submitted by Mr\. Otieno/i)).toBeVisible();
    parentView.unmount();

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);
    expect(screen.getByText(/Attendance follow-up recorded for Form 2 Blue/i)).toBeVisible();
    expect(screen.getByText(/3 absent learners/i)).toBeVisible();
  });

  it("shows parent and student fee updates from accountant payment records", () => {
    const schoolId = "kisumu-boys";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "finance-payments",
      {
        id: "portal-payment-brian",
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

    const parentView = renderWithProviders(<ParentCommandCenter routeMode="hosted" />);
    expect(screen.getByText(/Brian Otieno payment of KSh 5,000 recorded/i)).toBeVisible();
    expect(screen.getByText(/Receipt KBI-RCPT-5001 posted by Cash/i)).toBeVisible();
    parentView.unmount();

    const studentView = renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);
    expect(screen.getByText(/Fee payment recorded: KSh 5,000/i)).toBeVisible();
    expect(screen.getByText(/Balance KSh 7,400/i)).toBeVisible();
    studentView.unmount();

    renderWithProviders(<PortalPages viewer="parent" section="fees" routeMode="hosted" />);
    expect(screen.getAllByText(/KBI-RCPT-5001/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KSh 5,000/i).length).toBeGreaterThan(0);
  });

  it("shows nurse sick bay updates on the student portal", () => {
    const schoolId = "kisumu-boys";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "clinic-visits",
      {
        id: "student-clinic-brian",
        student: "Brian Otieno",
        className: "Form 2 East",
        symptoms: "High fever",
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

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);

    expect(screen.getByText(/Sick bay visit recorded: ORS sachets/i)).toBeVisible();
    expect(screen.getByText(/Referred at 10:15 AM/i)).toBeVisible();
  });

  it("shows library fines on the student portal", () => {
    const schoolId = "kisumu-boys";
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);

    addSchoolRecord(
      "library-loans",
      {
        id: "student-library-brian-fine",
        bookTitle: "Blossoms of the Savannah",
        barcode: "KBH-LIB-9191",
        borrower: "Brian Otieno",
        admissionNo: "KBI/2026/044",
        dueDate: "2026-06-07",
        status: "Overdue",
        fine: 120,
        parentSmsSent: false,
      },
      schoolId,
    );

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);

    expect(screen.getByText(/Blossoms of the Savannah due on 2026-06-07/i)).toBeVisible();
    expect(screen.getByText(/Fine KSh 120/i)).toBeVisible();
  });

  it("makes super admin shell search and notification controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SuperAdminShell userName="Robin Mwangi">
        <div>Platform owner content</div>
      </SuperAdminShell>,
    );

    await user.type(screen.getByLabelText(/search schools, tickets, logs/i), "Support");
    await user.click(screen.getByRole("button", { name: /support/i }));

    expect(screen.getByText(/navigating to support from platform search/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /platform notifications/i }));
    expect(screen.getByText(/platform items needing review/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /failed sms deliveries/i }));
    expect(screen.getByText(/navigating to failed sms deliveries platform follow-up/i)).toBeVisible();
    expectNoFakeOnlyFeedback();
  });

  it("makes the system monitor infrastructure queue practical with retry, notify, resolve, and report actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SuperadminPages section="infrastructure" routeMode="public" />);

    expect(screen.getByRole("heading", { name: /failed jobs and recovery queue/i })).toBeVisible();
    expect(screen.getAllByText(/Kisumu Boys High School/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /retry failed sms/i }));
    expect(screen.getByText(/failed sms retry started for kisumu boys high school/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getAllByRole("button", { name: /notify admin/i })[0]);
    expect(screen.getByText(/admin notified/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getAllByRole("button", { name: /mark issue solved/i })[0]);
    expect(screen.getByText(/marked solved/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /download system report/i }));
    expect(screen.getByText(/system health csv downloaded/i)).toBeVisible();
    expectNoFakeOnlyFeedback();
  });

  it("downloads super admin reset bundles with tenant and expiry evidence", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/platform/schools") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              tenant_id: "kisumu-boys",
              school_name: "Kisumu Boys High School",
              subdomain: "kisumu-boys",
              status: "active",
              invitation_sent: true,
              invitation_status: "sent",
              invitation_message: "Invite delivered to principal@kisumu.example",
              can_resend_invite: true,
              invite_expires_at: "2026-06-08T09:00:00.000Z",
              admin_email: "principal@kisumu.example",
              created_at: "2026-06-08T06:00:00.000Z",
              enabled_modules: ["students", "finance", "exams"],
              billing: {
                state: "active",
                label: "Active",
                access_mode: "full",
                plan_code: "school-pro",
              },
            },
          ],
        }));
      }

      if (url === "/api/platform/modules") {
        return Promise.resolve(jsonResponse({ data: [] }));
      }

      return Promise.resolve(jsonResponse({ data: [] }));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(<SuperadminPages section="schools" routeMode="public" />);

      const resetButtons = await screen.findAllByRole("button", { name: /reset admin/i });
      await user.click(resetButtons[0]);

      expect(screen.getByText(/admin reset bundle downloaded for kisumu boys high school/i)).toBeVisible();
      expect(screen.getByText(/kisumu-boys-high-school-admin-reset\.csv/i)).toBeVisible();
      expect(screen.getByText(/expires in 15 minutes/i)).toBeVisible();
      expect(screen.getByText(/tenant kisumu-boys/i)).toBeVisible();
      expectNoFakeOnlyFeedback();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
