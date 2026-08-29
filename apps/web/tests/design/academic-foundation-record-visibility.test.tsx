import { render, screen } from "@testing-library/react";

import { AcademicFoundationWorkspace } from "@/components/school/academic-foundation-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";

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
});
