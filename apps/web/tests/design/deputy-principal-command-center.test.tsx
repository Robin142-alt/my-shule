import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeputyPrincipalCommandCenter } from "@/components/school/deputy-principal-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("DeputyPrincipalCommandCenter", () => {
  it("makes deputy search and urgent controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DeputyPrincipalCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/global search students, teachers, incidents, classes, parents, or reports/i), "Bullying");
    await user.click(screen.getByRole("button", { name: /bullying incident/i }));

    expect(screen.getByText(/bullying incident opened for deputy follow-up/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^emergency$/i }));
    const emergencyDialog = screen.getByRole("dialog", { name: /deputy emergency response/i });
    expect(emergencyDialog).toBeVisible();
    await user.click(within(emergencyDialog).getByRole("button", { name: /record emergency response/i }));
    expect(screen.getByText(/emergency response recorded for deputy follow-up/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "DEPUTY_EMERGENCY_RESPONSE_RECORDED",
          module: "operations",
        }),
      ]),
    );

    await user.click(screen.getByRole("button", { name: /notify parent/i }));
    const alertDialog = screen.getByRole("dialog", { name: /deputy alert action/i });
    expect(alertDialog).toBeVisible();
    expect(within(alertDialog).getByText(/bullying incident reported/i)).toBeVisible();
    await user.click(within(alertDialog).getByRole("button", { name: /save deputy action/i }));
    expect(screen.getByText(/notify parent saved for bullying incident reported/i)).toBeVisible();
  });
});
