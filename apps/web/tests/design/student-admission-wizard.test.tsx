import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StudentAdmissionWizard } from "@/components/school/admissions-dashboard/student-admission-wizard";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(30_000);

const mockUseSchoolQuery = jest.fn();
const mockUseSchoolMutation = jest.fn();

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (...args: unknown[]) => mockUseSchoolQuery(...args),
  useSchoolMutation: (...args: unknown[]) => mockUseSchoolMutation(...args),
}));

const foundation = {
  academic_years: [{ id: "year-2026", name: "2026", status: "active", is_current: true }],
  classes: [{
    id: "class-grade-7",
    academic_year_id: "year-2026",
    academic_level_id: "level-grade-7",
    name: "Grade 7",
    grade_level: "Grade 7",
    curriculum: "CBC",
    capacity: 45,
    enrolment_open: true,
    student_count: 12,
  }],
  streams: [{
    id: "stream-north",
    class_section_id: "class-grade-7",
    name: "North",
    capacity: 25,
    student_count: 7,
  }],
  subjects: [
    { id: "subject-mat", code: "MAT", name: "Mathematics", curriculum: "CBC", subject_type: "core", is_compulsory: true, is_examinable: true },
    { id: "subject-sci", code: "SCI", name: "Integrated Science", curriculum: "CBC", subject_type: "optional", is_compulsory: false, is_examinable: true },
  ],
  class_subject_assignments: [
    { academic_year_id: "year-2026", class_section_id: "class-grade-7", subject_id: "subject-mat", is_compulsory: true, is_examinable: true },
    { academic_year_id: "year-2026", class_section_id: "class-grade-7", subject_id: "subject-sci", is_compulsory: false, is_examinable: true },
  ],
  admission_settings: {
    admission_number_mode: "suggested",
    admission_number_prefix: "MS",
    admission_number_separator: "-",
    admission_number_padding: 4,
    include_academic_year: true,
    strict_capacity: true,
    strict_age_rules: false,
    minimum_age: null,
    maximum_age: null,
    minimum_subjects: 1,
    maximum_subjects: 12,
    suggested_admission_number: "MS-2026-0001",
  },
};

describe("guided student admission", () => {
  const refetchFoundation = jest.fn(async () => ({ data: foundation }));
  const admitStudent = jest.fn();
  const preflightAdmission = jest.fn();
  const saveDraft = jest.fn(async ({ payload }) => ({ payload, updated_at: "2026-07-22T10:00:00.000Z" }));
  const discardDraft = jest.fn(async () => ({ discarded: true }));
  const updateSettings = jest.fn(async () => foundation.admission_settings);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSchoolQuery.mockImplementation((path: string) => {
      if (path === "/admissions/foundation") {
        return { data: foundation, isLoading: false, isError: false, refetch: refetchFoundation };
      }
      if (path === "/admissions/drafts/current") {
        return { data: null, isLoading: false, isError: false, refetch: jest.fn() };
      }
      throw new Error(`Unexpected school query: ${path}`);
    });
    mockUseSchoolMutation.mockImplementation((path: string, method: string) => {
      const mutateAsync = path === "/admissions/manual"
        ? admitStudent
        : path === "/admissions/manual/preflight"
          ? preflightAdmission
          : path === "/admissions/settings"
            ? updateSettings
            : path === "/admissions/drafts/current" && method === "DELETE"
              ? discardDraft
              : saveDraft;
      return { mutateAsync, isPending: false };
    });
    preflightAdmission.mockResolvedValue({
      valid: true,
      warnings: [],
      possible_duplicates: [],
      guardian: null,
      age_at_admission: null,
    });
    admitStudent.mockResolvedValue({
      student: { id: "student-1", admission_number: "MS-2026-0001", first_name: "Amina", middle_name: "", last_name: "Njeri" },
      placement: { academic_year_name: "2026", class_name: "Grade 7", stream_name: "North", capacity_warning: false },
      subjects: [
        { id: "subject-mat", code: "MAT", name: "Mathematics" },
        { id: "subject-sci", code: "SCI", name: "Integrated Science" },
      ],
      guardian: { portal_access: "otp_ready", phone: "+254712345678", existing_sibling_guardian: false },
      student_portal: { username: "MS-2026-0001", status: "otp_ready" },
      fees: { status: "pending_fee_structure" },
    });
  });

  it("completes the five-step school-scoped flow without legacy identity or invitation fields", async () => {
    const user = userEvent.setup();
    const onAdmitted = jest.fn();
    renderWithProviders(<StudentAdmissionWizard onCancel={jest.fn()} onAdmitted={onAdmitted} />);

    expect(screen.getByText("Student Details")).toBeVisible();
    expect(screen.getByText("Class & Stream")).toBeVisible();
    expect(screen.getByText("Subjects")).toBeVisible();
    expect(screen.getByText("Guardian")).toBeVisible();
    expect(screen.getByText("Review & Admit")).toBeVisible();
    expect(screen.queryByText(/birth certificate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NEMIS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/passport photo|student invitation|parent invitation/i)).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByLabelText(/^Admission number(?! mode)/i)).toHaveValue("MS-2026-0001"));
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await user.type(screen.getByLabelText(/^Last name/i), "Njeri");
    await user.selectOptions(screen.getByLabelText(/^Gender/i), "female");
    expect(screen.getByLabelText(/^Date of birth \(optional\)/i)).toHaveValue("");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.selectOptions(screen.getByLabelText(/^Academic year/i), "year-2026");
    await user.selectOptions(screen.getByLabelText(/^Curriculum/i), "CBC");
    await user.selectOptions(screen.getByLabelText(/^Class \/ form \/ grade/i), "class-grade-7");
    await user.selectOptions(screen.getByLabelText(/^Stream/i), "stream-north");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("checkbox", { name: /Mathematics/i })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: /Integrated Science/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(screen.getByLabelText(/^Primary guardian name/i), "Grace Njeri");
    await user.type(screen.getByLabelText(/^Relationship/i), "Mother");
    await user.type(screen.getByLabelText(/^Kenyan mobile number/i), "0712345678");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("MS-2026-0001")).toBeVisible();
    expect(screen.getByText("Grace Njeri")).toBeVisible();
    expect(screen.getByText("Not provided")).toBeVisible();
    expect(screen.getByText("Not available")).toBeVisible();
    expect(screen.queryByText(/^Portal$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /admit student/i }));

    await waitFor(() => expect(admitStudent).toHaveBeenCalledWith(expect.objectContaining({
      admission_number: "MS-2026-0001",
      academic_year_id: "year-2026",
      class_section_id: "class-grade-7",
      stream_id: "stream-north",
      subject_ids: ["subject-mat", "subject-sci"],
      guardian_phone: "0712345678",
      date_of_birth: "",
    })));
    expect(await screen.findByRole("heading", { name: /student admitted/i })).toBeVisible();
    expect(screen.getByText(/OTP ready/i)).toBeVisible();
    await waitFor(() => expect(onAdmitted).toHaveBeenCalledTimes(1));
  });

  it("prepares a fresh numbered draft after admission without turning refresh trouble into a failed admission", async () => {
    const user = userEvent.setup();
    const onAdmitted = jest.fn(async () => {
      throw new Error("List refresh is temporarily unavailable");
    });
    const nextFoundation = {
      ...foundation,
      admission_settings: {
        ...foundation.admission_settings,
        suggested_admission_number: "MS-2026-0002",
      },
    };
    refetchFoundation.mockResolvedValueOnce({ data: nextFoundation });
    renderWithProviders(<StudentAdmissionWizard onCancel={jest.fn()} onAdmitted={onAdmitted} />);

    await waitFor(() => expect(screen.getByLabelText(/^Admission number(?! mode)/i)).toHaveValue("MS-2026-0001"));
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await user.type(screen.getByLabelText(/^Last name/i), "Njeri");
    await user.selectOptions(screen.getByLabelText(/^Gender/i), "female");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.selectOptions(screen.getByLabelText(/^Academic year/i), "year-2026");
    await user.selectOptions(screen.getByLabelText(/^Curriculum/i), "CBC");
    await user.selectOptions(screen.getByLabelText(/^Class \/ form \/ grade/i), "class-grade-7");
    await user.selectOptions(screen.getByLabelText(/^Stream/i), "stream-north");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/^Primary guardian name/i), "Grace Njeri");
    await user.type(screen.getByLabelText(/^Relationship/i), "Mother");
    await user.type(screen.getByLabelText(/^Kenyan mobile number/i), "0712345678");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /admit student/i }));

    expect(await screen.findByRole("heading", { name: /student admitted/i })).toBeVisible();
    await waitFor(() => expect(onAdmitted).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/list refresh is temporarily unavailable/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /admit another student/i }));
    await waitFor(() => expect(screen.getByLabelText(/^Admission number(?! mode)/i)).toHaveValue("MS-2026-0002"));
    expect(refetchFoundation).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText(/^First name/i), "Brian");
    await waitFor(() => expect(saveDraft).toHaveBeenLastCalledWith({
      payload: expect.objectContaining({
        admission_number: "MS-2026-0002",
        first_name: "Brian",
        step: 0,
      }),
    }), { timeout: 3_000 });
  });
});
