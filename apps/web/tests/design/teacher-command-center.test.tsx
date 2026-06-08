import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeacherCommandCenter } from "@/components/school/teacher-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

async function printFromPreview(user: { click: (element: Element) => Promise<void> }, printMock: jest.Mock) {
  const preview = await screen.findByRole("dialog", { name: /print preview/i });
  expect(preview).toBeVisible();
  expect(printMock).not.toHaveBeenCalled();

  await user.click(within(preview).getByRole("button", { name: /^print$/i }));
  expect(printMock).toHaveBeenCalled();
  await user.click(within(preview).getByRole("button", { name: /close/i }));
}

describe("TeacherCommandCenter", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.querySelectorAll("[data-myshule-print-preview]").forEach((preview) => preview.remove());
  });

  it("makes quick actions and teacher search open real workspaces with visible feedback", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(<TeacherCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /upload notes/i }));
    expect(screen.getByRole("heading", { name: /lms resources/i })).toBeVisible();
    expect(screen.getAllByText(/lesson notes upload form ready/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(/resource title/i), "Linear equations handout");
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    expect(screen.getAllByText(/linear equations handout uploaded as a draft/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/linear equations handout/i).length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText(/search class, exam, learner, or lms resource/i), "CAT");
    await user.click(screen.getByRole("button", { name: /cat 2 marks queue/i }));

    expect(screen.getByRole("heading", { name: /marks & exams/i })).toBeVisible();
    expect(screen.getByText(/cat 2 marks queue workspace ready/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^reports$/i }));
    await user.click(screen.getByRole("button", { name: /subject report/i }));
    expect(screen.getByText(/subject report workspace ready/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /print subject report/i }));
    expect(screen.getByText(/subject report print preview ready/i)).toBeVisible();
    await printFromPreview(user, printMock);

    const events = readSchoolData<Record<string, unknown>>("events", "kb-high");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "TEACHER_SUBJECT_REPORT_PRINTED",
          module: "academics",
        }),
      ]),
    );
  });

  it("submits class attendance into the school-scoped event store", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeacherCommandCenter routeMode="hosted" />);

    await user.click(screen.getAllByRole("button", { name: /mark attendance/i })[0]);
    expect(screen.getByRole("heading", { name: /mark class attendance/i })).toBeVisible();

    await user.clear(screen.getByLabelText(/absent learners/i));
    await user.type(screen.getByLabelText(/absent learners/i), "2");
    await user.click(screen.getByRole("button", { name: /submit register/i }));

    expect(screen.getAllByText(/attendance submitted with 2 absent learner/i).length).toBeGreaterThan(0);

    const attendanceRegisters = readSchoolData<Record<string, unknown>>("attendance-registers", "kb-high");
    expect(attendanceRegisters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          absent: 2,
          status: "Submitted",
        }),
      ]),
    );

    const events = readSchoolData<Record<string, unknown>>("events", "kb-high");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "ATTENDANCE_REGISTER_SUBMITTED",
          module: "attendance",
        }),
      ]),
    );

    const notifications = readSchoolData<{ audienceRoles: string[] }>("notifications", "kb-high");
    expect(notifications.some((notification) => notification.audienceRoles.includes("principal"))).toBe(true);
    expect(notifications.some((notification) => notification.audienceRoles.includes("deputy-principal"))).toBe(true);
    expect(notifications.some((notification) => notification.audienceRoles.includes("class-teacher"))).toBe(true);
  });

  it("stores named absent learners so parent and student dashboards can receive specific follow-up", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeacherCommandCenter routeMode="hosted" />);

    await user.click(screen.getAllByRole("button", { name: /mark attendance/i })[0]);
    await user.clear(screen.getByLabelText(/absent learners/i));
    await user.type(screen.getByLabelText(/absent learners/i), "2");
    await user.type(screen.getByLabelText(/absent learner names/i), "Brian Otieno, Faith Akinyi");
    await user.click(screen.getByRole("button", { name: /submit register/i }));

    const attendanceRegisters = readSchoolData<Record<string, unknown>>("attendance-registers", "kb-high");
    expect(attendanceRegisters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          absent: 2,
          absentLearners: ["Brian Otieno", "Faith Akinyi"],
        }),
      ]),
    );
  });

  it("queues class SMS without claiming provider delivery", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeacherCommandCenter routeMode="hosted" />);

    await user.click(screen.getAllByRole("button", { name: /send sms/i })[0]);
    expect(screen.getByRole("heading", { name: /send class message/i })).toBeVisible();

    await user.type(screen.getByLabelText(/sms message/i), "Revision materials are ready for pickup.");
    const sendButton = screen
      .getAllByRole("button", { name: /^send sms$/i })
      .find((button) => button.getAttribute("type") === "submit");
    expect(sendButton).toBeDefined();
    await user.click(sendButton as HTMLElement);

    expect(screen.getAllByText(/SMS queued for Form 2 Blue parents/i).length).toBeGreaterThan(0);
    expect(readSchoolData<Record<string, unknown>>("teacher-messages", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          audience: "Form 2 Blue parents",
          status: "Queued",
        }),
      ]),
    );
    expect(readSchoolData<Record<string, unknown>>("notifications", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Class message queued",
        }),
      ]),
    );
  });
});
