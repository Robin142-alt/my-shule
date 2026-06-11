import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DisciplineMasterCommandCenter } from "@/components/school/discipline-master-command-center";
import { GuidanceCounsellingCommandCenter } from "@/components/school/guidance-counselling-command-center";
import { LaboratoryTechnicianCommandCenter } from "@/components/school/laboratory-technician-command-center";
import { RegistrarCommandCenter } from "@/components/school/registrar-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

const fakeOnlyPhrases =
  /selected for discipline follow-up|selected in counselling records|selected in lab records|selected in admissions records|application preview recorded\.|Quick admissions action saved\.|Quick-add counselling session saved\.|applicant filter applied\./i;

function expectNoFakeOnlyFeedback() {
  expect(document.body.textContent).not.toMatch(fakeOnlyPhrases);
}

describe("student support and admissions command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("myshule.currentSchoolId", "kb-high");
  });

  it("makes discipline search and case actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DisciplineMasterCommandCenter />);

    await user.type(screen.getByLabelText(/search student, case, dorm, teacher report, parent meeting/i), "Kevin");
    await user.click(screen.getByRole("button", { name: /kevin otieno/i }));

    expect(screen.getByText(/kevin otieno discipline search loaded risk students workspace: repeat corridor incident risk/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /assign follow-up/i }));
    const actionDialog = screen.getByRole("dialog", { name: /discipline case action/i });
    expect(actionDialog).toBeVisible();
    expect(within(actionDialog).getByText(/kevin o/i)).toBeVisible();

    await user.click(within(actionDialog).getByRole("button", { name: /save discipline action/i }));

    expect(screen.getByText(/assign follow-up saved for kevin o/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^case$/i }));
    await user.click(screen.getByRole("button", { name: /record new case/i }));
    const quickDisciplineDialog = screen.getByRole("dialog", { name: /discipline quick action/i });
    expect(quickDisciplineDialog).toBeVisible();
    await user.click(within(quickDisciplineDialog).getByRole("button", { name: /save quick discipline action/i }));

    expect(screen.getByText(/record new case saved for discipline office/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "DISCIPLINE_CASE_ACTION_RECORDED",
          module: "discipline",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "DISCIPLINE_QUICK_ACTION_RECORDED",
          module: "discipline",
        }),
      ]),
    );
  });

  it("makes counselling search and session actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GuidanceCounsellingCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search student cases, appointments, referrals, parent meetings, wellness alerts, or reports/i), "Faith");
    await user.click(screen.getByRole("button", { name: /faith akinyi referral/i }));

    expect(screen.getByText(/faith akinyi referral counselling search loaded risk-table section: high-risk welfare follow-up due today/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /quick-add session/i }));
    const sessionDialog = screen.getByRole("dialog", { name: /counselling session action/i });
    expect(sessionDialog).toBeVisible();
    await user.click(within(sessionDialog).getByRole("button", { name: /save counselling session/i }));

    expect(
      screen.getByText(
        /kb-high quick-add counselling session saved: counselling-session-quick-add, deputy\/class teacher\/principal notified for welfare follow-up/i,
      ),
    ).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /notify principal/i })[1]);
    const interventionDialog = screen.getByRole("dialog", { name: /counselling intervention action/i });
    expect(interventionDialog).toBeVisible();
    await user.click(within(interventionDialog).getByRole("button", { name: /save intervention action/i }));

    expect(screen.getByText(/notify principal saved for counselling intervention/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /start session/i })[0]);
    const timelineDialog = screen.getByRole("dialog", { name: /counselling timeline action/i });
    expect(timelineDialog).toBeVisible();
    await user.click(within(timelineDialog).getByRole("button", { name: /save timeline action/i }));

    expect(screen.getByText(/start session saved for/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "COUNSELLING_SESSION_RECORDED",
          module: "counselling",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "COUNSELLING_INTERVENTION_ACTION_RECORDED",
          module: "counselling",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "COUNSELLING_TIMELINE_ACTION_RECORDED",
          module: "counselling",
        }),
      ]),
    );
  });

  it("makes laboratory search and practical setup actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<LaboratoryTechnicianCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search chemicals, equipment, sessions, teachers, requests, incidents, or suppliers/i), "Ethanol");
    await user.click(screen.getByRole("button", { name: /ethanol stock/i }));

    expect(screen.getByText(/ethanol stock lab search loaded chemicals section: restricted chemical \| usage audit required/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getAllByRole("button", { name: /mark lab ready/i })[0]);
    const labDialog = screen.getByRole("dialog", { name: /laboratory session action/i });
    expect(labDialog).toBeVisible();
    await user.click(within(labDialog).getByRole("button", { name: /save lab session update/i }));

    expect(screen.getByText(/mark lab ready saved for/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /attach evidence/i }));
    const labTimelineDialog = screen.getByRole("dialog", { name: /laboratory timeline action/i });
    expect(labTimelineDialog).toBeVisible();
    await user.click(within(labTimelineDialog).getByRole("button", { name: /save timeline action/i }));

    expect(screen.getByText(/attach evidence saved for burette cracked during titration/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /add chemical/i })[1]);
    const labQuickDialog = screen.getByRole("dialog", { name: /laboratory quick action/i });
    expect(labQuickDialog).toBeVisible();
    await user.click(within(labQuickDialog).getByRole("button", { name: /save lab quick action/i }));

    expect(screen.getByText(/add chemical saved for laboratory desk/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "LAB_SESSION_ACTION_RECORDED",
          module: "laboratory",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "LAB_TIMELINE_ACTION_RECORDED",
          module: "laboratory",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "LAB_QUICK_ACTION_RECORDED",
          module: "laboratory",
        }),
      ]),
    );
  });

  it("makes admissions search and application actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RegistrarCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/global search applicants, admission numbers, parents, documents, transfers, or reports/i), "Faith");
    await user.click(screen.getByRole("button", { name: /faith akinyi/i }));

    expect(screen.getByText(/faith akinyi admissions search loaded applications section: grade 8 east applicant \| documents pending/i)).toBeVisible();
    expectNoFakeOnlyFeedback();

    await user.click(screen.getByRole("button", { name: /pending/i }));
    const filterDialog = screen.getByRole("dialog", { name: /admissions applicant filter/i });
    expect(filterDialog).toBeVisible();
    await user.click(within(filterDialog).getByRole("button", { name: /apply applicant filter/i }));

    expect(
      screen.getByText(
        /pending applicant filter applied for kb-high: admissions-filter-pending, \d+ visible records, secretary\/principal notified/i,
      ),
    ).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /preview/i })[0]);
    const previewDialog = screen.getByRole("dialog", { name: /admission application preview/i });
    expect(previewDialog).toBeVisible();
    await user.click(within(previewDialog).getByRole("button", { name: /record preview review/i }));

    expect(
      screen.getByText(
        /amina wanjiru application preview recorded for kb-high: admissions-preview-adm-2026-1184, verified status, office\/fee\/class\/leadership notifications created/i,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /quick actions/i }));
    const admissionsDialog = screen.getByRole("dialog", { name: /admissions quick action/i });
    expect(admissionsDialog).toBeVisible();
    await user.click(within(admissionsDialog).getByRole("button", { name: /save admissions action/i }));

    expect(
      screen.getByText(
        /kb-high admissions quick action saved: admissions-quick-action, next step verify documents and notify parent, secretary\/accountant\/class teacher\/principal notified/i,
      ),
    ).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "ADMISSIONS_QUICK_ACTION_RECORDED",
          module: "admissions",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "ADMISSIONS_APPLICANT_FILTER_APPLIED",
          module: "admissions",
        }),
        expect.objectContaining({
          schoolId: "kb-high",
          type: "ADMISSIONS_APPLICATION_PREVIEW_RECORDED",
          module: "admissions",
        }),
      ]),
    );
  });
});
