import { screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassTeacherCommandCenter } from "@/components/school/class-teacher-command-center";
import { DeanAcademicsCommandCenter } from "@/components/school/dean-academics-command-center";
import { GradeMasterCommandCenter } from "@/components/school/grade-master-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("class teacher and dean command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("myshule.currentSchoolId", "kb-high");
  });

  it("makes class teacher search, roster search, and learner actions visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClassTeacherCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search student, guardian, note, or assignment/i), "Brian");
    await user.click(screen.getByRole("button", { name: /brian otieno/i }));

    expect(screen.getByRole("heading", { name: /class roster/i })).toBeVisible();
    expect(screen.getByText(/brian otieno opened in my class/i)).toBeVisible();

    await user.type(screen.getByPlaceholderText(/search roster or admission number/i), "ADM-2077");
    expect(screen.getByText(/Aisha Njeri/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /message parent/i }));
    expect(screen.getByRole("dialog", { name: /send parent message/i })).toBeVisible();
    await user.clear(screen.getByLabelText(/message to guardian/i));
    await user.type(screen.getByLabelText(/message to guardian/i), "Please review the homework diary today.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText(/parent sms queued for aisha njeri/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /^reports$/i })[0]);
    await user.click(screen.getByRole("button", { name: /attendance pdf/i }));
    const preview = screen.getByRole("dialog", { name: /class report preview/i });
    expect(preview).toBeVisible();
    expect(within(preview).getByText(/attendance pdf/i)).toBeVisible();
  });

  it("makes dean search and approval actions visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DeanAcademicsCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search exams, reports, teachers/i), "CAT 1");
    await user.click(screen.getByRole("button", { name: /term 2 cat 1/i }));

    expect(screen.getByText(/pending exam reviews/i)).toBeVisible();
    expect(screen.getByText(/term 2 cat 1 opened in pending reviews/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /approve batch/i }));
    const approvalDialog = screen.getByRole("dialog", { name: /dean academic action/i });
    expect(approvalDialog).toBeVisible();
    expect(within(approvalDialog).getByText(/approve batch/i)).toBeVisible();

    await user.click(within(approvalDialog).getByRole("button", { name: /save academic action/i }));
    expect(screen.getByText(/approve batch saved for dean follow-up/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "ACADEMIC_DEAN_ACTION_RECORDED",
          module: "academics",
        }),
      ]),
    );
  });

  it("makes grade master report actions save tenant-scoped report events", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GradeMasterCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /^reports$/i }));
    await user.click(screen.getByRole("button", { name: /grade report/i }));

    const reportDialog = screen.getByRole("dialog", { name: /grade report action/i });
    expect(reportDialog).toBeVisible();
    expect(within(reportDialog).getByRole("heading", { name: /^grade report$/i })).toBeVisible();

    await user.click(within(reportDialog).getByRole("button", { name: /save report request/i }));

    expect(screen.getByText(/grade report saved for review and export/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "GRADE_MASTER_REPORT_REQUESTED",
          module: "reports",
        }),
      ]),
    );
  });
});
