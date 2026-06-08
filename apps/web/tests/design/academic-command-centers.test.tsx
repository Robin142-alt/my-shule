import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GradeMasterCommandCenter } from "@/components/school/grade-master-command-center";
import { HodCommandCenter } from "@/components/school/hod-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

const fakeOnlyPhrases =
  /selected in exams & performance|selected in parent escalations|export saved for department records|escalation tickets export saved/i;

function expectNoFakeOnlyFeedback() {
  expect(document.body.textContent).not.toMatch(fakeOnlyPhrases);
}

describe("academic command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("myshule.currentSchoolId", "kb-high");
  });

  it("makes HOD search and table tools visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<HodCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search teachers, subjects, lesson plans, assessments, or students/i), "CAT 2");
    await user.click(screen.getByRole("button", { name: /cat 2 moderation/i }));

    expect(screen.getByRole("heading", { name: /exams & performance workspace/i })).toBeVisible();
    expect(screen.getByText(/cat 2 moderation hod search loaded exams & performance workspace: marks close friday \| 4 missing submissions/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getAllByRole("button", { name: /export/i })[0]);
    const exportDialog = screen.getByRole("dialog", { name: /hod department export/i });
    expect(exportDialog).toBeVisible();
    expect(within(exportDialog).getByText(/exam overview/i)).toBeVisible();

    await user.click(within(exportDialog).getByRole("button", { name: /save export request/i }));

    expect(
      screen.getByText(
        /exam overview export request saved for kb-high: kb-high-hod-exam-overview-\d{4}-\d{2}-\d{2}\.csv, dean\/exams manager\/principal notified/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "HOD_DEPARTMENT_EXPORT_REQUESTED",
          module: "academics",
        }),
      ]),
    );
  });

  it("makes grade master search and report controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GradeMasterCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search students, streams, class teachers, parent cases, or reports/i), "Wanjiku");
    await user.click(screen.getByRole("button", { name: /mrs\. wanjiku/i }));

    expect(screen.getByRole("heading", { name: /parent escalations/i })).toBeVisible();
    expect(screen.getByText(/mrs\. wanjiku grade master search loaded parent escalations workspace: parent escalation \| absenteeism follow-up today/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /export/i }));
    const exportDialog = screen.getByRole("dialog", { name: /grade table export/i });
    expect(exportDialog).toBeVisible();
    expect(within(exportDialog).getByText(/escalation tickets/i)).toBeVisible();

    await user.click(within(exportDialog).getByRole("button", { name: /save export request/i }));

    expect(
      screen.getByText(
        /escalation tickets export request saved for kb-high: grade-master-export-escalation-tickets, deputy\/principal\/class teacher notified for form 2 oversight/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "GRADE_MASTER_TABLE_EXPORT_REQUESTED",
          module: "reports",
        }),
      ]),
    );
  });
});
