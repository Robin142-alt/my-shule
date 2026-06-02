import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DisciplineMasterCommandCenter } from "@/components/school/discipline-master-command-center";
import { GuidanceCounsellingCommandCenter } from "@/components/school/guidance-counselling-command-center";
import { LaboratoryTechnicianCommandCenter } from "@/components/school/laboratory-technician-command-center";
import { RegistrarCommandCenter } from "@/components/school/registrar-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("student support and admissions command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("myshule.currentSchoolId", "kb-high");
  });

  it("makes discipline search and case actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DisciplineMasterCommandCenter routeMode="hosted" liveDataEnabled={false} />);

    await user.type(screen.getByLabelText(/search student, case, dorm, teacher report, parent meeting/i), "Kevin");
    await user.click(screen.getByRole("button", { name: /kevin otieno/i }));

    expect(screen.getByText(/kevin otieno opened for discipline follow-up/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /assign follow-up/i }));
    const actionDialog = screen.getByRole("dialog", { name: /discipline case action/i });
    expect(actionDialog).toBeVisible();
    expect(within(actionDialog).getByText(/kevin o/i)).toBeVisible();

    await user.click(within(actionDialog).getByRole("button", { name: /save discipline action/i }));

    expect(screen.getByText(/assign follow-up saved for kevin o/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "DISCIPLINE_CASE_ACTION_RECORDED",
          module: "discipline",
        }),
      ]),
    );
  });

  it("makes counselling search and session actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GuidanceCounsellingCommandCenter routeMode="hosted" liveDataEnabled={false} />);

    await user.type(screen.getByLabelText(/search student cases, appointments, referrals, parent meetings, wellness alerts, or reports/i), "Faith");
    await user.click(screen.getByRole("button", { name: /faith akinyi referral/i }));

    expect(screen.getByText(/faith akinyi referral opened in counselling records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /quick-add session/i }));
    expect(screen.getByText(/quick-add counselling session form opened/i)).toBeVisible();
  });

  it("makes laboratory search and practical setup actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<LaboratoryTechnicianCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search chemicals, equipment, sessions, teachers, requests, incidents, or suppliers/i), "Ethanol");
    await user.click(screen.getByRole("button", { name: /ethanol stock/i }));

    expect(screen.getByText(/ethanol stock opened in lab records/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /mark lab ready/i })[0]);
    expect(screen.getByText(/mark lab ready opened for/i)).toBeVisible();
  });

  it("makes admissions search and application actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RegistrarCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/global search applicants, admission numbers, parents, documents, transfers, or reports/i), "Faith");
    await user.click(screen.getByRole("button", { name: /faith akinyi/i }));

    expect(screen.getByText(/faith akinyi opened in admissions records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /quick actions/i }));
    expect(screen.getByText(/quick admissions actions opened/i)).toBeVisible();
  });
});
