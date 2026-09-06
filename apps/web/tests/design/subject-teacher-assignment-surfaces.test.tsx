import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { PrincipalStaffRolesWorkspace } from "@/components/school/principal-dashboard/staff-roles-workspace";
import { SubjectsWorkspace } from "@/components/school/admin/subjects-workspace";
import { promoteStudent } from "@/lib/students/student-lifecycle.api";

const mockRequest = jest.fn();
const mockRefetch = jest.fn().mockResolvedValue({});
const mockUseSchoolQuery = jest.fn();

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (path: string) => mockUseSchoolQuery(path),
  useSchoolMutation: () => ({ isPending: false, mutateAsync: mockRequest }),
}));
jest.mock("@/components/school/principal-dashboard/verified-tenant-api", () => ({
  useVerifiedPrincipalDashboardApi: () => mockRequest,
}));
jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
jest.mock("@/components/school/user-management-panel", () => ({ UserManagementPanel: () => null }));
jest.mock("@/components/ui/modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe("continuing subject teacher assignment surfaces", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ id: "assignment-1" });
    mockUseSchoolQuery.mockImplementation((path: string) => {
      const data = path.endsWith("/teachers")
        ? [{ id: "staff-profile-1", user_id: "teacher-user-1", label: "Alex Teacher", role_code: "teacher" }]
        : path.endsWith("/class-sections")
          ? [{ id: "class-1", name: "Form 1" }]
          : path.endsWith("/subjects")
            ? [{ id: "subject-1", name: "English", code: "ENG" }]
            : path.endsWith("/principal/staff")
              ? { status: "active", totalStaff: 1, teachingStaff: 1, supportStaff: 0, onLeave: 0, staffDistribution: [] }
              : [];
      return { data, isLoading: false, error: null, refetch: mockRefetch };
    });
  });

  it("lets the Principal assign a teacher without academic terms", async () => {
    render(<PrincipalStaffRolesWorkspace />);
    const openButton = screen.getByRole("button", { name: "Assign Teacher" });
    expect(openButton).toBeEnabled();
    fireEvent.click(openButton);
    const form = screen.getByRole("form", { name: "Assign subject teacher" });
    const controls = within(form).getAllByRole("combobox");
    expect(controls).toHaveLength(3);
    fireEvent.change(controls[0], { target: { value: "teacher-user-1" } });
    fireEvent.change(controls[1], { target: { value: "class-1" } });
    fireEvent.change(controls[2], { target: { value: "subject-1" } });
    fireEvent.submit(form);

    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith("/academics/teacher-assignments", {
      method: "POST",
      body: { class_section_id: "class-1", subject_id: "subject-1", teacher_user_id: "teacher-user-1" },
    }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Assign subject teacher" })).not.toBeInTheDocument());
  });

  it("uses the staff user identity and no term in Admin Subjects", async () => {
    render(<SubjectsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Teacher Assignments" }));
    const controls = screen.getAllByRole("combobox");
    expect(controls).toHaveLength(3);
    fireEvent.change(controls[0], { target: { value: "class-1" } });
    fireEvent.change(controls[1], { target: { value: "subject-1" } });
    fireEvent.change(controls[2], { target: { value: "teacher-user-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Teacher" }));

    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith({
      class_section_id: "class-1", subject_id: "subject-1", teacher_user_id: "teacher-user-1",
    }));
    expect(mockUseSchoolQuery).toHaveBeenCalledWith("/api/academics/teachers");
  });

  it("retains the actionable promotion conflict message for the caller", async () => {
    const originalFetch = global.fetch;
    const message = "Promoted streams have different continuing subject teachers. Assign the intended subject teacher to the destination class/stream, then retry promotion.";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ statusCode: 409, message }) });
    try {
      await expect(promoteStudent("student-1", {
        newClassId: "class-2", academicYearId: "year-2", academicLevelId: "level-2",
      })).rejects.toThrow(message);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
