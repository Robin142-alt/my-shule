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

  it("assigns several selected subjects to one class and term in a single bulk request", async () => {
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

    await user.selectOptions(screen.getByRole("combobox", { name: "Academic term" }), "term-1");
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
          academic_term_id: "term-1",
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

    await user.selectOptions(screen.getByRole("combobox", { name: "Academic term" }), "term-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Class/form/grade" }), "class-1");
    await user.click(screen.getByRole("button", { name: "Select all" }));
    await user.click(screen.getByRole("button", { name: "Assign 2 Subjects to Class" }));

    expect(await screen.findByText("The subjects could not be assigned.")).toBeInTheDocument();
    const subjectSelector = within(screen.getByRole("group", { name: "Subjects / learning areas" }));
    expect(subjectSelector.getByRole("checkbox", { name: /Mathematics/ })).toBeChecked();
    expect(subjectSelector.getByRole("checkbox", { name: /English/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Assign 2 Subjects to Class" })).toBeEnabled();
  });
});
