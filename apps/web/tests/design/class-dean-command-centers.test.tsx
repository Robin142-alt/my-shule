import { screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassTeacherCommandCenter } from "@/components/school/class-teacher-command-center";
import { DeanAcademicsCommandCenter } from "@/components/school/dean-academics-command-center";
import { GradeMasterCommandCenter } from "@/components/school/grade-master-command-center";
import { HodCommandCenter } from "@/components/school/hod-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

const fakeOnlyPhrases =
  /selected in my class|selected in pending reviews|saved for Dean follow-up|saved for review and export|stream attendance ranking filters applied|stream attendance ranking export saved|teacher performance table search saved|teacher performance table filters applied|teacher announcement communication draft saved|parent template saved\.|stream detail review saved\./i;

function expectNoFakeOnlyFeedback() {
  expect(document.body.textContent).not.toMatch(fakeOnlyPhrases);
}

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
    expect(screen.getByText(/brian otieno class teacher search loaded my class workspace: adm-2041 \| absent today \| parent follow-up/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.type(screen.getByPlaceholderText(/search roster or admission number/i), "ADM-2077");
    expect(screen.getByText(/Aisha Njeri/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /stream selector/i }));
    const rosterDialog = screen.getByRole("dialog", { name: /class roster control/i });
    expect(rosterDialog).toBeVisible();
    await user.click(within(rosterDialog).getByRole("button", { name: /save roster control/i }));

    expect(screen.getByText(/stream selector saved for form 2 blue/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /message parent/i }));
    expect(screen.getByRole("dialog", { name: /send parent message/i })).toBeVisible();
    await user.clear(screen.getByLabelText(/message to guardian/i));
    await user.type(screen.getByLabelText(/message to guardian/i), "Please review the homework diary today.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText(/parent sms queued for aisha njeri/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "CLASS_PARENT_MESSAGE_QUEUED",
          module: "communications",
        }),
      ]),
    );
    expect(readSchoolData<Record<string, unknown>>("notifications", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Class follow-up queued for Aisha Njeri",
        }),
      ]),
    );

    await user.click(screen.getByRole("button", { name: /quick actions/i }));
    await user.click(screen.getByRole("button", { name: /absenteeism notice/i }));
    const templateDialog = screen.getByRole("dialog", { name: /parent communication template/i });
    expect(templateDialog).toBeVisible();
    await user.click(within(templateDialog).getByRole("button", { name: /save parent template/i }));

    expect(
      screen.getByText(
        /absenteeism notice parent template saved for kb-high: parent-template-absenteeism-notice, form 2 blue sms workflow, deputy\/grade master notified/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "CLASS_ROSTER_CONTROL_RECORDED",
          module: "class-teacher",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "CLASS_PARENT_TEMPLATE_PREPARED",
          module: "communications",
        }),
      ]),
    );

    await user.click(screen.getAllByRole("button", { name: /^attendance$/i })[0]);
    await user.click(screen.getByRole("button", { name: /bulk present/i }));
    expect(screen.getByText(/bulk present saved for form 2 blue/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /quick save/i }));
    expect(screen.getByText(/attendance register saved for form 2 blue/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "CLASS_ATTENDANCE_ACTION_RECORDED",
          module: "attendance",
        }),
      ]),
    );

    await user.click(screen.getAllByRole("button", { name: /^reports$/i })[0]);
    await user.click(screen.getByRole("button", { name: /attendance pdf/i }));
    expect(screen.getByText(/attendance pdf class report ready for form 2 blue with \d+ learner records/i)).toBeVisible();
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
    expect(screen.getByText(/term 2 cat 1 dean search loaded pending reviews workspace: class 7b \| 3 missing subject marks/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /approve batch/i }));
    const approvalDialog = screen.getByRole("dialog", { name: /dean academic action/i });
    expect(approvalDialog).toBeVisible();
    expect(within(approvalDialog).getByText(/approve batch/i)).toBeVisible();

    await user.click(within(approvalDialog).getByRole("button", { name: /save academic action/i }));
    expect(
      screen.getByText(
        /approve batch academic action saved for kb-high: dean-action-approve-batch, term 2 cat 1 class 7b, exams manager\/principal\/class teacher notified/i,
      ),
    ).toBeVisible();
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

    expect(
      screen.getByText(
        /grade report report request saved for kb-high: grade-master-report-grade-report, principal\/deputy\/dean notified for form 2 review/i,
      ),
    ).toBeVisible();
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

  it("exposes grade master exam result, readiness, progress, intervention, and comment workspaces", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GradeMasterCommandCenter routeMode="hosted" />);

    expect(screen.getByRole("button", { name: /grade\/form results/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /stream comparison/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /report readiness/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /learner progress/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /academic interventions/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /grade\/form comments/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /report readiness/i }));
    expect(screen.getByRole("heading", { name: /report readiness/i })).toBeVisible();
    expect(screen.getByText(/CBC reports ready/i)).toBeVisible();
    expect(screen.getByText(/legacy reports ready/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /grade\/form comments/i }));
    expect(screen.getByRole("heading", { name: /grade\/form comments/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /submit grade comments/i }));

    expect(screen.getByText(/grade\/form comments submitted for dean review/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "GRADE_MASTER_COMMENTS_SUBMITTED",
          module: "reports",
        }),
      ]),
    );
  });

  it("makes grade master table filters and exports executable", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GradeMasterCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /attendance oversight/i }));
    await user.click(screen.getByRole("button", { name: /^filters$/i }));

    const filterDialog = screen.getByRole("dialog", { name: /grade table filters/i });
    expect(filterDialog).toBeVisible();
    expect(within(filterDialog).getByText(/stream attendance ranking/i)).toBeVisible();

    await user.click(within(filterDialog).getByRole("button", { name: /apply filters/i }));
    expect(
      screen.getByText(
        /stream attendance ranking filter set saved for kb-high: grade-master-filter-stream-attendance-ranking, deputy\/principal\/class teacher notified for form 2 oversight/i,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^export$/i }));
    const exportDialog = screen.getByRole("dialog", { name: /grade table export/i });
    expect(exportDialog).toBeVisible();

    await user.click(within(exportDialog).getByRole("button", { name: /save export request/i }));
    expect(
      screen.getByText(
        /stream attendance ranking export request saved for kb-high: grade-master-export-stream-attendance-ranking, deputy\/principal\/class teacher notified for form 2 oversight/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "GRADE_MASTER_TABLE_FILTERS_APPLIED",
          module: "academics",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "GRADE_MASTER_TABLE_EXPORT_REQUESTED",
          module: "reports",
        }),
      ]),
    );

    await user.click(screen.getByRole("button", { name: /streams & classes/i }));
    await user.click(screen.getByRole("button", { name: /open stream detail/i }));

    const streamDialog = screen.getByRole("dialog", { name: /grade stream detail/i });
    expect(streamDialog).toBeVisible();
    expect(within(streamDialog).getByText(/form 2 stream detail/i)).toBeVisible();

    await user.click(within(streamDialog).getByRole("button", { name: /save stream detail review/i }));

    expect(
      screen.getByText(
        /form 2 stream detail review saved for kb-high: grade-master-stream-form-2-stream-detail, form 2 streams north\/east\/west\/south, deputy\/principal\/class teacher notified/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "GRADE_MASTER_STREAM_DETAIL_REVIEWED",
          module: "grade-master",
        }),
      ]),
    );
  });

  it("makes HOD table search and filter controls executable", async () => {
    const user = userEvent.setup();

    renderWithProviders(<HodCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /^teachers$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    const searchDialog = screen.getByRole("dialog", { name: /hod table search/i });
    expect(searchDialog).toBeVisible();
    expect(within(searchDialog).getByText(/teacher performance table/i)).toBeVisible();

    await user.click(within(searchDialog).getByRole("button", { name: /save search request/i }));
    expect(
      screen.getByText(
        /teacher performance table search request saved for kb-high: hod-search-teacher-performance-table, dean\/principal notified for mathematics review/i,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^filters$/i }));
    const filterDialog = screen.getByRole("dialog", { name: /hod table filters/i });
    expect(filterDialog).toBeVisible();
    expect(within(filterDialog).getByText(/department table filters/i)).toBeVisible();

    await user.click(within(filterDialog).getByRole("button", { name: /apply filters/i }));
    expect(
      screen.getByText(
        /teacher performance table filter set saved for kb-high: hod-filter-teacher-performance-table, dean\/principal notified for mathematics review/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "HOD_TABLE_SEARCH_SAVED",
          module: "academics",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "HOD_TABLE_FILTERS_APPLIED",
          module: "academics",
        }),
      ]),
    );

    await user.click(screen.getByRole("button", { name: /meetings & reports/i }));
    await user.click(screen.getByRole("button", { name: /departmental performance report/i }));
    const reportDialog = screen.getByRole("dialog", { name: /hod report review/i });
    expect(reportDialog).toBeVisible();
    await user.click(within(reportDialog).getByRole("button", { name: /save report review/i }));

    expect(
      screen.getByText(
        /departmental performance report review request saved for kb-high: hod-report-departmental-performance-report, dean\/exams manager\/principal notified for mathematics department export/i,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^communication$/i }));
    await user.click(screen.getByRole("button", { name: /teacher announcement/i }));
    const composerDialog = screen.getByRole("dialog", { name: /hod communication composer/i });
    expect(composerDialog).toBeVisible();
    await user.click(within(composerDialog).getByRole("button", { name: /save communication draft/i }));

    expect(
      screen.getByText(
        /teacher announcement communication draft saved for kb-high: hod-communication-teacher-announcement, dean\/principal\/teacher notified for mathematics department follow-up/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "HOD_REPORT_REVIEW_RECORDED",
          module: "reports",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "HOD_COMMUNICATION_DRAFT_RECORDED",
          module: "communications",
        }),
      ]),
    );
  });

  it("exposes dean academic exam overview, moderation, analytics, and intervention workspaces", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DeanAcademicsCommandCenter routeMode="hosted" />);

    expect(screen.getByRole("button", { name: /academic exam overview/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /results moderation/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /academic analytics/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^interventions$/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^interventions$/i }));
    expect(screen.getByRole("heading", { name: /academic interventions/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /assign intervention/i }));
    const actionDialog = screen.getByRole("dialog", { name: /dean academic action/i });
    expect(actionDialog).toBeVisible();
    expect(within(actionDialog).getByText(/assign intervention/i)).toBeVisible();
  });
});
