import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GradeMasterCommandCenter } from "@/components/school/grade-master-command-center";
import { HodCommandCenter } from "@/components/school/hod-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("academic command center interactions", () => {
  it("makes HOD search and table tools visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<HodCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search teachers, subjects, lesson plans, assessments, or students/i), "CAT 2");
    await user.click(screen.getByRole("button", { name: /cat 2 moderation/i }));

    expect(screen.getByRole("heading", { name: /exams & performance workspace/i })).toBeVisible();
    expect(screen.getByText(/cat 2 moderation opened in exams & performance/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /export/i })[0]);
    expect(screen.getByText(/exam overview exported for department records/i)).toBeVisible();
  });

  it("makes grade master search and report controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<GradeMasterCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search students, streams, class teachers, parent cases, or reports/i), "Wanjiku");
    await user.click(screen.getByRole("button", { name: /mrs\. wanjiku/i }));

    expect(screen.getByRole("heading", { name: /parent escalations/i })).toBeVisible();
    expect(screen.getByText(/mrs\. wanjiku opened in parent escalations/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByText(/escalation tickets exported for grade records/i)).toBeVisible();
  });
});
