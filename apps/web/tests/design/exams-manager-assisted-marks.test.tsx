import { fireEvent, screen } from "@testing-library/react";
import { MarksEntryWorkspace } from "@/components/school/exams-manager/marks-entry-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { ExamsMarksWorkspace } from "@/components/school/teacher-dashboard/exams-marks-workspace";
import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: jest.fn() }));
jest.mock("@/lib/data/school-tenant-scope", () => ({ useOptionalSchoolTenantId: jest.fn() }));
jest.mock("@/components/school/exams-manager/teacher-marks-progress", () => ({ TeacherMarksProgress: () => <p>Teacher progress</p> }));
jest.mock("@/components/school/teacher-dashboard/exams-marks-workspace", () => ({ ExamsMarksWorkspace: jest.fn(() => <p>Shared marks interface</p>) }));

const assignment = { exam_id: "exam-a", exam_name: "Term 1", class_section_id: "class-a", class_name: "Grade 7",
  subject_id: "maths", subject_name: "Mathematics", teacher_user_id: "teacher-a", teacher_name: "Ms Achieng" };

describe("Exams Manager assisted mark selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOptionalSchoolTenantId).mockReturnValue("school-a");
    jest.mocked(useSchoolQuery).mockReturnValue({ data: { assignments: [assignment,
      { ...assignment, subject_id: "science", subject_name: "Science", teacher_user_id: "teacher-b", teacher_name: "Mr Otieno" },
    ] }, isLoading: false, isFetching: false, error: null, refetch: jest.fn() } as never);
  });

  it("filters assigned teachers by exam, class and subject and opens the existing interface", () => {
    renderWithProviders(<MarksEntryWorkspace onOpenSetup={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Open markbooks" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Exam"), { target: { value: "exam-a" } });
    fireEvent.change(screen.getByLabelText("Class / grade"), { target: { value: "class-a" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "maths" } });
    expect(screen.queryByRole("option", { name: "Mr Otieno" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Assigned teacher"), { target: { value: "teacher-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Open markbooks" }));
    expect(screen.getByText("Shared marks interface")).toBeVisible();
    expect(ExamsMarksWorkspace).toHaveBeenCalledWith(expect.objectContaining({ assistance: expect.objectContaining({
      teacherUserId: "teacher-a", examSeriesId: "exam-a", classSectionId: "class-a", subjectId: "maths",
    }) }), undefined);
  });

  it("resets the selected teacher when the subject changes", () => {
    renderWithProviders(<MarksEntryWorkspace onOpenSetup={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Exam"), { target: { value: "exam-a" } });
    fireEvent.change(screen.getByLabelText("Class / grade"), { target: { value: "class-a" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "maths" } });
    fireEvent.change(screen.getByLabelText("Assigned teacher"), { target: { value: "teacher-a" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "science" } });
    expect(screen.getByLabelText("Assigned teacher")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Open markbooks" })).toBeDisabled();
  });

  it("clears the assisted editor when the school changes", () => {
    const view = renderWithProviders(<MarksEntryWorkspace onOpenSetup={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Exam"), { target: { value: "exam-a" } });
    fireEvent.change(screen.getByLabelText("Class / grade"), { target: { value: "class-a" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "maths" } });
    fireEvent.change(screen.getByLabelText("Assigned teacher"), { target: { value: "teacher-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Open markbooks" }));
    jest.mocked(useOptionalSchoolTenantId).mockReturnValue("school-b");
    view.rerender(<MarksEntryWorkspace onOpenSetup={jest.fn()} />);
    expect(screen.queryByText("Shared marks interface")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Exam")).toHaveValue("");
  });

  it("provides retry and setup recovery states", () => {
    const refetch = jest.fn();
    jest.mocked(useSchoolQuery).mockReturnValue({ error: new Error("Unavailable"), refetch } as never);
    const view = renderWithProviders(<MarksEntryWorkspace onOpenSetup={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry assignments" }));
    expect(refetch).toHaveBeenCalled();
    const onOpenSetup = jest.fn();
    jest.mocked(useSchoolQuery).mockReturnValue({ data: { assignments: [] }, refetch } as never);
    view.rerender(<MarksEntryWorkspace onOpenSetup={onOpenSetup} />);
    fireEvent.click(screen.getByRole("button", { name: "Open exam setup" }));
    expect(onOpenSetup).toHaveBeenCalled();
  });
});
