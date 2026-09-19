import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AcademicFoundationWorkspace } from "@/components/school/academic-foundation-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/lib/dashboard/api-client", () => ({
  requestDashboardApi: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

const foundation = {
  years: [{ id: "year-1", name: "2026 Academic Year", status: "active", is_current: true }],
  terms: [{ id: "term-1", academic_year_id: "year-1", name: "Term 1", status: "draft" }],
  calendarPeriods: [],
  classes: [{ id: "class-1", academic_year_id: "year-1", name: "Form 1", status: "active" }],
  streams: [{ id: "stream-1", class_section_id: "class-1", name: "East", status: "active" }],
  departments: [{ id: "department-1", name: "Sciences", status: "active" }],
  subjects: [{
    id: "subject-1",
    code: "MAT",
    name: "Mathematics",
    department_id: "department-1",
    status: "active",
  }],
  classSubjectAssignments: [],
  teachers: [],
  classTeachers: [],
  teacherAssignments: [],
  gradingSystems: [],
  attendanceSettings: [],
  reportCardSettings: [],
  roleAppointments: [],
  curriculumConfigurations: [],
};

describe("academic foundation saved-record visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: foundation,
      error: null,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: foundation, error: null }),
    });
  });

  it.each([
    { preset: "CBC", count: 8, label: "EE1", min: 90, points: 8 },
    { preset: "8-4-4", count: 12, label: "A", min: 80, points: 12 },
  ])("saves editable $preset defaults through the school-scoped grading API", async ({ preset, count, label, min, points }) => {
    const user = userEvent.setup();
    const refetch = jest.fn().mockResolvedValue({ data: foundation, error: null });
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: foundation, error: null, isLoading: false, refetch,
    });
    (requestDashboardApi as jest.Mock).mockResolvedValue({ id: "grading-1" });
    render(
      <AcademicFoundationWorkspace
        actorRole="Deputy Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="policies"
      />,
    );

    await user.click(screen.getByRole("button", { name: preset }));
    await user.type(screen.getByLabelText("Policy name"), preset);
    const remark = screen.getAllByLabelText("Report remark")[0];
    await user.clear(remark);
    await user.type(remark, "School remark");
    await user.click(screen.getByRole("button", { name: "Save grading system" }));

    await waitFor(() => expect(requestDashboardApi).toHaveBeenCalledWith("/academics/grading-systems", {
      method: "POST",
      tenantId: "maranda-high",
      body: expect.objectContaining({ name: preset, rules: expect.any(Array) }),
    }));
    const savedRules = (requestDashboardApi as jest.Mock).mock.calls[0][1].body.rules;
    expect(savedRules).toHaveLength(count);
    expect(savedRules[0]).toMatchObject({ label, min, max: 100, points, remark: "School remark" });
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it("loads the complete foundation under the authenticated tenant and shows saved terms", () => {
    render(
      <AcademicFoundationWorkspace
        actorRole="Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="calendar"
      />,
    );

    expect(useSchoolQuery).toHaveBeenCalledWith("/academics/foundation", expect.objectContaining({
      tenantId: "maranda-high",
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    }));
    expect(screen.getAllByText("Term 1").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No matching terms/i)).not.toBeInTheDocument();
  });

  it("shows saved classes and their streams instead of a false empty state", () => {
    render(
      <AcademicFoundationWorkspace
        actorRole="Deputy Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="classes"
      />,
    );

    expect(screen.getAllByText("Form 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/East/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No matching classes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No streams yet/i)).not.toBeInTheDocument();
  });

  it("shows saved departments and subjects with their management actions", () => {
    render(
      <AcademicFoundationWorkspace
        actorRole="Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="subjects"
      />,
    );

    expect(screen.getAllByText("Sciences").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No matching departments/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No matching subjects/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Manage/i })).toHaveLength(2);
  });

  it("disambiguates duplicate staff names with roles and teaching subjects in every person selector", () => {
    const foundationWithStaff = {
      ...foundation,
      teachers: [
        { user_id: "staff-user-1", label: "Robinson Ondu", role_code: "teacher" },
        {
          user_id: "staff-user-1",
          label: "Robinson Ondu",
          role_code: "hod",
          teaching_subjects: ["Mathematics"],
          hod_departments: ["Sciences"],
        },
        { user_id: "staff-user-2", label: "Robinson Ondu", role_code: "deputy_principal" },
      ],
    };
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: foundationWithStaff,
      error: null,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: foundationWithStaff, error: null }),
    });

    render(
      <AcademicFoundationWorkspace
        actorRole="Deputy Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="subjects"
      />,
    );

    expect(screen.getAllByRole("option", {
      name: "Robinson Ondu — Teacher, Head of Department (Sciences) · Teaches Mathematics",
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", {
      name: "Robinson Ondu — Deputy Principal",
    }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("option", { name: "Robinson Ondu" })).not.toBeInTheDocument();
  });

  it("assigns several selected subjects to a continuing cohort in a single bulk request", async () => {
    const user = userEvent.setup();
    const foundationWithSubjects = {
      ...foundation,
      subjects: [
        foundation.subjects[0],
        { id: "subject-2", code: "ENG", name: "English", status: "active" },
        { id: "subject-3", code: "SCI", name: "Integrated Science", status: "active" },
      ],
    };
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: foundationWithSubjects,
      error: null,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: foundationWithSubjects, error: null }),
    });
    (requestDashboardApi as jest.Mock).mockResolvedValue({
      assignments: [{ id: "offering-1" }, { id: "offering-2" }],
      requested_count: 2,
    });

    render(
      <AcademicFoundationWorkspace
        actorRole="Deputy Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="subjects"
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Academic term" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Class/form/grade" }), "class-1");
    const subjectSelector = within(screen.getByRole("group", { name: "Subjects / learning areas" }));
    await user.click(subjectSelector.getByRole("checkbox", { name: /Mathematics/ }));
    await user.click(subjectSelector.getByRole("checkbox", { name: /English/ }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Assign 2 Subjects to Class" }));

    await waitFor(() => expect(requestDashboardApi).toHaveBeenCalledWith(
      "/academics/class-subjects/bulk",
      expect.objectContaining({
        method: "POST",
        tenantId: "maranda-high",
        body: expect.objectContaining({
          class_section_id: "class-1",
          subject_ids: ["subject-1", "subject-2"],
          is_compulsory: true,
          is_examinable: true,
        }),
      }),
    ));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Subjects to Assign" })).toBeDisabled();
  });

  it("keeps the selected subjects available for correction when bulk assignment fails", async () => {
    const user = userEvent.setup();
    const foundationWithSubjects = {
      ...foundation,
      subjects: [
        foundation.subjects[0],
        { id: "subject-2", code: "ENG", name: "English", status: "active" },
      ],
    };
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: foundationWithSubjects,
      error: null,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: foundationWithSubjects, error: null }),
    });
    (requestDashboardApi as jest.Mock).mockRejectedValue(new Error("The subjects could not be assigned."));

    render(
      <AcademicFoundationWorkspace
        actorRole="Principal"
        schoolName="Maranda High"
        tenantId="maranda-high"
        initialTab="subjects"
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Academic term" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Class/form/grade" }), "class-1");
    await user.click(screen.getByRole("button", { name: "Select all" }));
    await user.click(screen.getByRole("button", { name: "Assign 2 Subjects to Class" }));

    expect(await screen.findByText("The subjects could not be assigned.")).toBeInTheDocument();
    const subjectSelector = within(screen.getByRole("group", { name: "Subjects / learning areas" }));
    expect(subjectSelector.getByRole("checkbox", { name: /Mathematics/ })).toBeChecked();
    expect(subjectSelector.getByRole("checkbox", { name: /English/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Assign 2 Subjects to Class" })).toBeEnabled();
  });

  it("assigns an ongoing subject teacher with no term setup and refreshes the saved record", async () => {
    const user = userEvent.setup();
    const data = {
      ...foundation,
      terms: [],
      teachers: [{ user_id: "teacher-1", label: "Alex Teacher", role_code: "teacher" }],
      teacherAssignments: [{
        id: "assignment-1",
        academic_term_id: null,
        class_section_id: "class-1",
        subject_id: "subject-1",
        teacher_user_id: "teacher-1",
        teacher_name: "Alex Teacher",
        effective_from: "2026-09-06",
        effective_to: null,
        status: "active",
      }],
    };
    const refetch = jest.fn().mockResolvedValue({ data, error: null });
    (useSchoolQuery as jest.Mock).mockReturnValue({ data, error: null, isLoading: false, refetch });
    (requestDashboardApi as jest.Mock).mockResolvedValue({ id: "assignment-1" });

    render(<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="Maranda High" tenantId="maranda-high" initialTab="allocations" />);
    const form = within(screen.getByRole("form", { name: "Assign subject teacher" }));
    expect(form.queryByRole("combobox", { name: /term/i })).not.toBeInTheDocument();
    expect(form.getByRole("button", { name: "Assign Subject Teacher" })).toBeEnabled();
    expect(screen.getByText(/Across terms/)).toBeInTheDocument();
    expect(screen.getByText(/until reassigned or ended/i)).toBeInTheDocument();

    await user.selectOptions(form.getByRole("combobox", { name: "Class/form/grade" }), "class-1");
    await user.selectOptions(form.getByRole("combobox", { name: "Subject / learning area" }), "subject-1");
    await user.selectOptions(form.getByRole("combobox", { name: "Teacher" }), "teacher-1");
    await user.click(form.getByRole("button", { name: "Assign Subject Teacher" }));

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    const [path, request] = (requestDashboardApi as jest.Mock).mock.calls[0];
    expect(path).toBe("/academics/teacher-assignments");
    expect(request).toMatchObject({
      method: "POST",
      tenantId: "maranda-high",
      body: {
        class_section_id: "class-1", subject_id: "subject-1", teacher_user_id: "teacher-1",
        assignment_type: "primary", is_primary: true,
        mark_entry_allowed: true, lesson_record_allowed: true, report_comment_allowed: true,
      },
    });
    expect(request.body).not.toHaveProperty("academic_term_id");
    expect(request.body.effective_to).toBeUndefined();
  });

  it("preserves a temporary allocation and selections when subject teacher assignment fails", async () => {
    const user = userEvent.setup();
    const data = {
      ...foundation,
      terms: [],
      teachers: [{ user_id: "teacher-1", label: "Alex Teacher", role_code: "teacher" }],
    };
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data, error: null, isLoading: false, refetch: jest.fn(),
    });
    (requestDashboardApi as jest.Mock).mockRejectedValue(new Error("Choose a stream belonging to the selected class."));
    render(<AcademicFoundationWorkspace actorRole="Principal" schoolName="Maranda High" tenantId="maranda-high" initialTab="allocations" />);
    const formElement = screen.getByRole("form", { name: "Assign subject teacher" });
    const form = within(formElement);
    await user.selectOptions(form.getByRole("combobox", { name: "Class/form/grade" }), "class-1");
    await user.selectOptions(form.getByRole("combobox", { name: "Subject / learning area" }), "subject-1");
    await user.selectOptions(form.getByRole("combobox", { name: "Teacher" }), "teacher-1");
    await user.selectOptions(form.getByRole("combobox", { name: "Type" }), "temporary");
    expect(form.queryByLabelText(/Effective/)).not.toBeInTheDocument();
    await user.click(form.getByRole("button", { name: "Assign Subject Teacher" }));

    expect(await screen.findByText("Choose a stream belonging to the selected class.")).toBeInTheDocument();
    expect(form.getByRole("combobox", { name: "Teacher" })).toHaveValue("teacher-1");
    expect(form.getByRole("combobox", { name: "Type" })).toHaveValue("temporary");
    expect(form.getByRole("button", { name: "Assign Subject Teacher" })).toBeEnabled();
    expect((requestDashboardApi as jest.Mock).mock.calls[0][1].body).toMatchObject({
      assignment_type: "temporary",
    });
    expect((requestDashboardApi as jest.Mock).mock.calls[0][1].body).not.toHaveProperty("effective_to");
  });
});
