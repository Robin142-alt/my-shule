import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BoardingMasterCommandCenter } from "@/components/school/boarding-master-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("BoardingMasterCommandCenter", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("myshule.currentSchoolId", "kb-high");
  });

  it("makes boarding search and hostel controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<BoardingMasterCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search boarding students, dormitories, roll call, clinic, visitors, or incidents/i), "Kevin");
    await user.click(screen.getByRole("button", { name: /kevin otieno/i }));

    expect(screen.getByText(/kevin otieno opened in boarding records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /quick response/i }));
    const responseDialog = screen.getByRole("dialog", { name: /boarding quick response/i });
    expect(responseDialog).toBeVisible();
    await user.click(within(responseDialog).getByRole("button", { name: /save boarding response/i }));

    expect(screen.getByText(/quick boarding response saved/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "BOARDING_QUICK_RESPONSE_RECORDED",
          module: "boarding",
        }),
      ]),
    );

    await user.click(screen.getByRole("button", { name: /start roll call/i }));
    const deskActionDialog = screen.getByRole("dialog", { name: /boarding desk action/i });
    expect(deskActionDialog).toBeVisible();
    await user.click(within(deskActionDialog).getByRole("button", { name: /save boarding desk action/i }));

    expect(screen.getByText(/start roll call saved for boarding desk action/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "BOARDING_DESK_ACTION_RECORDED",
          module: "boarding",
        }),
      ]),
    );
  });
});
