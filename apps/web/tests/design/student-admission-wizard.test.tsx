import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

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
  let currentFoundation = foundation;
  const refetchFoundation = jest.fn(async () => ({ data: foundation }));
  const admitStudent = jest.fn();
  const preflightAdmission = jest.fn();
  const saveDraft = jest.fn(async ({ payload }) => ({ payload, updated_at: "2026-07-22T10:00:00.000Z" }));
  const discardDraft = jest.fn(async () => ({ discarded: true }));
  const updateSettings = jest.fn(async () => foundation.admission_settings);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(toast, "error").mockReturnValue("admission-error");
    jest.spyOn(toast, "success").mockReturnValue("admission-success");
    jest.spyOn(toast, "warning").mockReturnValue("admission-warning");
    jest.spyOn(toast, "dismiss").mockReturnValue("dismissed");
    currentFoundation = foundation;
    refetchFoundation.mockResolvedValue({ data: foundation });
    mockUseSchoolQuery.mockImplementation((path: string) => {
      if (path === "/admissions/foundation") {
        return { data: currentFoundation, isLoading: false, isError: false, isFetching: false, refetch: refetchFoundation };
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

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function reachSubjects(user: ReturnType<typeof userEvent.setup>) {
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
  }

  it("shows subject limits and repeated validation beside Continue and in persistent viewport feedback", async () => {
    currentFoundation = {
      ...foundation,
      admission_settings: { ...foundation.admission_settings, maximum_subjects: 1 },
    };
    const user = userEvent.setup();
    renderWithProviders(<StudentAdmissionWizard onCancel={jest.fn()} onAdmitted={jest.fn()} />);
    await reachSubjects(user);
    await user.click(screen.getByRole("checkbox", { name: /Integrated Science/i }));
    const actions = screen.getByRole("group", { name: "Admission actions" });
    expect(within(actions).getByText(/2 subjects selected. Minimum: 1. Maximum: 1. Remove 1 optional subject to continue./)).toBeVisible();
    const proceed = within(actions).getByRole("button", { name: /continue/i });
    await user.click(proceed);
    const error = within(actions).getByRole("alert");
    expect(error).toHaveTextContent("Select no more than 1 subjects for this learner.");
    expect(proceed).toHaveAttribute("aria-describedby", error.id);
    expect(toast.error).toHaveBeenLastCalledWith(error.textContent, { id: error.id, duration: Infinity });
    await user.click(proceed);
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(preflightAdmission).not.toHaveBeenCalled();
    expect(admitStudent).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: /Integrated Science/i }));
    expect(within(actions).queryByRole("alert")).not.toBeInTheDocument();
    expect(toast.dismiss).toHaveBeenCalledWith(error.id);
    await user.click(proceed);
    expect(screen.getByRole("group", { name: "Guardian" })).toHaveFocus();
  });

  it("keeps a blocking server preflight visible at the action and permits retry without admitting", async () => {
    const user = userEvent.setup();
    preflightAdmission.mockResolvedValue({ valid: false, warnings: [{ code: "capacity", message: "This stream is full. Choose another stream.", blocking: true }], possible_duplicates: [], guardian: null, age_at_admission: null });
    renderWithProviders(<StudentAdmissionWizard onCancel={jest.fn()} onAdmitted={jest.fn()} />);
    await reachSubjects(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/^Primary guardian name/i), "Grace Njeri");
    await user.type(screen.getByLabelText(/^Relationship/i), "Mother");
    await user.type(screen.getByLabelText(/^Kenyan mobile number/i), "0712345678");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(within(screen.getByRole("group", { name: "Admission actions" })).getByRole("alert")).toHaveTextContent("This stream is full. Choose another stream.");
    expect(toast.error).toHaveBeenLastCalledWith("This stream is full. Choose another stream.", expect.objectContaining({ duration: Infinity }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(preflightAdmission).toHaveBeenCalledTimes(2);
    expect(admitStudent).not.toHaveBeenCalled();
  });

  it("reports failed preflight requests beside the action and allows another attempt", async () => {
    const user = userEvent.setup();
    preflightAdmission.mockRejectedValueOnce(new Error("Connection lost. Retry the check."));
    renderWithProviders(<StudentAdmissionWizard onCancel={jest.fn()} onAdmitted={jest.fn()} />);
    await reachSubjects(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/^Primary guardian name/i), "Grace Njeri");
    await user.type(screen.getByLabelText(/^Relationship/i), "Mother");
    await user.type(screen.getByLabelText(/^Kenyan mobile number/i), "0712345678");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(within(screen.getByRole("group", { name: "Admission actions" })).getByRole("alert")).toHaveTextContent("Connection lost. Retry the check.");
    expect(toast.error).toHaveBeenLastCalledWith("Connection lost. Retry the check.", expect.objectContaining({ duration: Infinity }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("group", { name: "Review & Admit" })).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("saves the latest entered draft before closing and shows pending feedback", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    let finishSave!: (value: { payload: unknown; updated_at: string }) => void;
    saveDraft.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    renderWithProviders(<StudentAdmissionWizard onCancel={onCancel} onAdmitted={jest.fn()} />);
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await user.click(screen.getByRole("button", { name: "Close and keep draft" }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledWith({ payload: expect.objectContaining({ first_name: "Amina", step: 0 }) }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Saving draft..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByLabelText(/^First name/i)).toBeDisabled();
    await user.type(screen.getByLabelText(/^First name/i), " edited during save");
    expect(screen.getByLabelText(/^First name/i)).toHaveValue("Amina");
    await act(async () => finishSave({ payload: {}, updated_at: "2026-09-05T12:00:00Z" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Admission draft saved. You can resume it later.");
  });

  it("keeps entered data visible if saving before close fails", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    saveDraft.mockRejectedValueOnce(new Error("Draft storage unavailable"));
    renderWithProviders(<StudentAdmissionWizard onCancel={onCancel} onAdmitted={jest.fn()} />);
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await user.click(screen.getByRole("button", { name: "Close and keep draft" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^First name/i)).toHaveValue("Amina");
    expect(within(screen.getByRole("group", { name: "Admission actions" })).getByRole("alert")).toHaveTextContent("The draft could not be saved, so this screen remains open. Draft storage unavailable");
    expect(screen.getByRole("button", { name: "Close and keep draft" })).toBeEnabled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Draft storage unavailable"), expect.objectContaining({ duration: Infinity }));
    expect(screen.getByLabelText(/^First name/i)).toBeEnabled();
  });

  it("serializes slow autosaves before saving the latest draft for close", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancel = jest.fn();
    let finishFirst!: (value: { payload: unknown; updated_at: string }) => void;
    let finishSecond!: (value: { payload: unknown; updated_at: string }) => void;
    saveDraft.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    saveDraft.mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; }));
    renderWithProviders(<StudentAdmissionWizard onCancel={onCancel} onAdmitted={jest.fn()} />);
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await act(async () => jest.advanceTimersByTimeAsync(701));
    expect(saveDraft).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText(/^Last name/i), "Njeri");
    await act(async () => jest.advanceTimersByTimeAsync(701));
    expect(saveDraft).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText(/^Middle name/i), "Grace");
    await user.click(screen.getByRole("button", { name: "Close and keep draft" }));
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => finishFirst({ payload: {}, updated_at: "2026-09-05T12:00:00Z" }));
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenLastCalledWith({ payload: expect.objectContaining({ first_name: "Amina", last_name: "Njeri", middle_name: "" }) });
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => finishSecond({ payload: {}, updated_at: "2026-09-05T12:00:01Z" }));
    expect(saveDraft).toHaveBeenCalledTimes(3);
    expect(saveDraft).toHaveBeenLastCalledWith({ payload: expect.objectContaining({ first_name: "Amina", last_name: "Njeri", middle_name: "Grace" }) });
    expect(onCancel).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTimeAsync(1000));
    expect(saveDraft).toHaveBeenCalledTimes(3);
  });

  it("waits for an in-flight autosave and cancels the scheduled save before discarding", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancel = jest.fn();
    let finishSave!: (value: { payload: unknown; updated_at: string }) => void;
    saveDraft.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    renderWithProviders(<StudentAdmissionWizard onCancel={onCancel} onAdmitted={jest.fn()} />);
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await act(async () => jest.advanceTimersByTimeAsync(701));
    await user.type(screen.getByLabelText(/^Last name/i), "Njeri");
    await user.click(screen.getByRole("button", { name: "Discard draft" }));
    expect(discardDraft).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Discarding draft..." })).toBeDisabled();
    expect(screen.getByLabelText(/^First name/i)).toBeDisabled();
    await act(async () => finishSave({ payload: {}, updated_at: "2026-09-05T12:00:00Z" }));
    expect(discardDraft).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTimeAsync(1000));
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("always reloads Deputy setup and lets a class offering override a compulsory catalogue default", async () => {
    const user = userEvent.setup();
    const refreshedFoundation = {
      ...foundation,
      classes: [
        ...foundation.classes,
        {
          ...foundation.classes[0],
          id: "class-grade-8",
          academic_level_id: "level-grade-8",
          name: "Grade 8",
          grade_level: "Grade 8",
          student_count: 0,
        },
      ],
      streams: [
        ...foundation.streams,
        {
          ...foundation.streams[0],
          id: "stream-east",
          class_section_id: "class-grade-8",
          name: "East",
          student_count: 0,
        },
      ],
      class_subject_assignments: foundation.class_subject_assignments.map((assignment) => ({
        ...assignment,
        class_section_id: "class-grade-8",
        is_compulsory: false,
      })),
    };
    refetchFoundation.mockImplementationOnce(async () => {
      currentFoundation = refreshedFoundation;
      return { data: refreshedFoundation };
    });
    const onCancel = jest.fn();
    const onAdmitted = jest.fn();

    const view = renderWithProviders(<StudentAdmissionWizard onCancel={onCancel} onAdmitted={onAdmitted} />);

    expect(mockUseSchoolQuery).toHaveBeenCalledWith(
      "/admissions/foundation",
      expect.objectContaining({
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchInterval: 15_000,
      }),
    );
    await waitFor(() => expect(screen.getByLabelText(/^Admission number(?! mode)/i)).toHaveValue("MS-2026-0001"));
    await user.type(screen.getByLabelText(/^First name/i), "Amina");
    await user.type(screen.getByLabelText(/^Last name/i), "Njeri");
    await user.selectOptions(screen.getByLabelText(/^Gender/i), "female");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.selectOptions(screen.getByLabelText(/^Academic year/i), "year-2026");
    await user.selectOptions(screen.getByLabelText(/^Curriculum/i), "CBC");

    expect(screen.queryByRole("option", { name: /Grade 8/i })).not.toBeInTheDocument();
    const refreshSetup = screen.getByRole("button", { name: /refresh classes, streams & subjects/i });
    await user.click(refreshSetup);
    expect(refetchFoundation).toHaveBeenCalledTimes(1);
    view.rerender(<StudentAdmissionWizard onCancel={onCancel} onAdmitted={onAdmitted} />);

    expect(screen.getByRole("option", { name: /Grade 8/i })).toBeVisible();
    await user.selectOptions(screen.getByLabelText(/^Class \/ form \/ grade/i), "class-grade-8");
    expect(screen.getByRole("option", { name: /East/i })).toBeVisible();
    await user.selectOptions(screen.getByLabelText(/^Stream/i), "stream-east");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const mathematics = screen.getByRole("checkbox", { name: /Mathematics/i });
    expect(mathematics).toBeEnabled();
    expect(mathematics).not.toBeChecked();
    expect(screen.getByText("MAT - Optional")).toBeVisible();
    await user.click(mathematics);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/^Primary guardian name/i), "Grace Njeri");
    await user.type(screen.getByLabelText(/^Relationship/i), "Mother");
    await user.type(screen.getByLabelText(/^Kenyan mobile number/i), "0712345678");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /admit student/i }));

    await waitFor(() => expect(admitStudent).toHaveBeenCalledWith(expect.objectContaining({
      class_section_id: "class-grade-8",
      stream_id: "stream-east",
      subject_ids: ["subject-mat"],
    })));
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
