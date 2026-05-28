import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeacherCommandCenter } from "@/components/school/teacher-command-center";

import { renderWithProviders } from "./test-utils";

describe("TeacherCommandCenter", () => {
  it("makes quick actions and teacher search open real workspaces with visible feedback", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeacherCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /upload notes/i }));
    expect(screen.getByRole("heading", { name: /lms resources/i })).toBeVisible();
    expect(screen.getAllByText(/lesson notes upload form opened/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(/resource title/i), "Linear equations handout");
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    expect(screen.getAllByText(/linear equations handout uploaded as a draft/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/linear equations handout/i).length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText(/search class, exam, learner, or lms resource/i), "CAT");
    await user.click(screen.getByRole("button", { name: /cat 2 marks queue/i }));

    expect(screen.getByRole("heading", { name: /marks & exams/i })).toBeVisible();
    expect(screen.getByText(/cat 2 marks queue opened/i)).toBeVisible();
  });
});
