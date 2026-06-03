import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SuperAdminShell } from "@/components/layouts/superadmin-shell";
import { ParentCommandCenter } from "@/components/portal/parent-command-center";
import { PortalPages } from "@/components/portal/portal-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";
import { ExamsManagerCommandCenter } from "@/components/school/exams-manager-command-center";
import { addSchoolRecord } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("portal and platform command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("makes exams manager search and draft actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExamsManagerCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search exams, classes, subjects, marks, or report cards/i), "Form 4");
    await user.click(screen.getByRole("button", { name: /form 4 mock series/i }));

    expect(screen.getByText(/form 4 mock series opened in exams records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /enter marks/i }));
    expect(screen.getByText(/marks entry sheet opened for selected class and subject/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /exam builder/i }));
    await user.click(screen.getByRole("button", { name: /save configuration/i }));
    expect(screen.getByText(/exam configuration saved for dean review/i)).toBeVisible();
    expect(screen.getByText(/Form 4 Mock Series configuration/i)).toBeVisible();
  });

  it("makes parent topbar and emergency controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ParentCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText(/parent notifications opened/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /emergency contacts/i })[0]);
    expect(screen.getByText(/emergency contacts opened/i)).toBeVisible();
  });

  it("makes student dashboard quick actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /view assignment/i }));
    expect(screen.getByText(/view assignment opened for the student account/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /message teacher/i }));
    expect(screen.getByText(/message teacher opened for the student account/i)).toBeVisible();
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

    expect(screen.getByText(/support opened from platform search/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /platform notifications/i }));
    expect(screen.getByText(/platform items needing review/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /failed sms deliveries/i }));
    expect(screen.getByText(/failed sms deliveries opened for platform follow-up/i)).toBeVisible();
  });

  it("makes the system monitor infrastructure queue practical with retry, notify, resolve, and report actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SuperadminPages section="infrastructure" routeMode="public" />);

    expect(screen.getByRole("heading", { name: /failed jobs and recovery queue/i })).toBeVisible();
    expect(screen.getAllByText(/Kisumu Boys High School/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /retry failed sms/i }));
    expect(screen.getByText(/failed sms retry started for kisumu boys high school/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /notify admin/i })[0]);
    expect(screen.getByText(/admin notified/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /mark issue solved/i })[0]);
    expect(screen.getByText(/marked solved/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /download system report/i }));
    expect(screen.getByText(/system health report prepared/i)).toBeVisible();
  });
});
