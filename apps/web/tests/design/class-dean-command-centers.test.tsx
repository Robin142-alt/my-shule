import { screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassTeacherCommandCenter } from "@/components/school/class-teacher-command-center";
import { DeanAcademicsCommandCenter } from "@/components/school/dean-academics-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("class teacher and dean command center interactions", () => {
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
    expect(screen.getByText(/approve batch started/i)).toBeVisible();
  });
});
