import { fireEvent, render, screen, within } from "@testing-library/react";

import { DeputyTimetableManagementWorkspace } from "@/components/school/deputy-principal/timetable-management-workspace";

const mockUseSchoolQuery = jest.fn();
const mockClassRefetch = jest.fn().mockResolvedValue(undefined);
let mockClassError: Error | null = null;
let mockOngoingAssignments = false;

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (path: string | null) => mockUseSchoolQuery(path),
  useSchoolMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock("@/lib/data/school-tenant-scope", () => ({
  useOptionalSchoolTenantId: () => "tenant-a",
}));

jest.mock("@/lib/school/school-operational-store", () => ({
  getCurrentSchoolId: () => "tenant-a",
}));

jest.mock("@/lib/dashboard/api-client", () => ({
  requestDashboardApi: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/lib/dashboard/export", () => ({
  openPrintDocument: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/components/ui/modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
}));

jest.mock("@/components/school/deputy-principal/timetable-command-panels", () => ({
  GenerationSummaryPanel: () => null,
  TimetableHistoryPanel: () => null,
  TimetableReadinessPanel: () => null,
  UnscheduledLessonsPanel: () => null,
}));

jest.mock("@/components/school/deputy-principal/timetable-relief-workspace", () => ({
  DeputyTimetableReliefWorkspace: () => null,
}));

jest.mock("@/components/school/deputy-principal/timetable-schedule-view", () => ({
  TimetableScheduleView: () => null,
}));

jest.mock("@/components/school/deputy-principal/timetable-setup-panels", () => ({
  PeriodConfigurationPanel: () => null,
  SubjectRequirementsPanel: () => null,
  TeacherAvailabilityPanel: () => null,
  TimetableResourcesPanel: () => null,
}));

function queryResult(data?: unknown, options: { error?: Error | null; refetch?: jest.Mock } = {}) {
  return {
    data,
    error: options.error ?? null,
    isLoading: false,
    isFetching: false,
    refetch: options.refetch ?? jest.fn().mockResolvedValue(undefined),
  };
}

function installQueryFixtures() {
  mockUseSchoolQuery.mockImplementation((path: string | null) => {
    if (path === "/api/academics/academic-years") {
      return queryResult([
        { id: "year-2026", name: "2026", status: "active", archived_at: null },
        { id: "year-2025", name: "2025", status: "active", archived_at: null },
      ]);
    }
    if (path === "/api/academics/academic-terms") {
      return queryResult([
        { id: "term-2026", academic_year_id: "year-2026", name: "Term 2", status: "active", archived_at: null },
        { id: "term-2025", academic_year_id: "year-2025", name: "Term 3", status: "active", archived_at: null },
      ]);
    }
    if (path?.startsWith("/api/academics/class-sections?")) {
      const rows = path.includes("year-2025")
        ? [
            { id: "class-old", academic_year_id: "year-2025", name: "Grade 8", is_active: true, status: "active", archived_at: null },
          ]
        : [
            { id: "class-current-a", academic_year_id: "year-2026", name: "Grade 9", is_active: true, status: "active", archived_at: null },
            { id: "class-current-b", academic_year_id: "year-2026", name: "Grade 10", is_active: true, status: "active", archived_at: null },
            { id: "class-archived", academic_year_id: "year-2026", name: "Form 3 West", is_active: false, status: "archived", archived_at: "2026-07-01" },
            { id: "class-wrong-year", academic_year_id: "year-2025", name: "Form 4 Purple", is_active: true, status: "active", archived_at: null },
            { id: "class-null-year", academic_year_id: null, name: "Grade 9 Yellow", is_active: true, status: "active", archived_at: null },
          ];
      return queryResult(rows, { error: mockClassError, refetch: mockClassRefetch });
    }
    if (path === "/api/academics/subjects") {
      return queryResult(mockOngoingAssignments ? [{ id: "subject-1", name: "English" }, { id: "subject-2", name: "Mathematics" }] : []);
    }
    if (path === "/api/academics/teachers") {
      return queryResult(mockOngoingAssignments ? [{ user_id: "teacher-1", label: "Alex Teacher" }] : []);
    }
    if (path === "/api/academics/teacher-assignments?limit=300") {
      return queryResult(mockOngoingAssignments ? [
        { id: "assignment-1", academic_term_id: null, class_section_id: "class-current-a", subject_id: "subject-1", teacher_user_id: "teacher-1" },
        { id: "assignment-old", academic_term_id: "term-2025", class_section_id: "class-current-a", subject_id: "subject-2", teacher_user_id: "teacher-1" },
      ] : []);
    }
    if (path?.startsWith("/api/timetable/readiness?")) {
      return queryResult({ status: "READY", blockers: [], warnings: [], checks: {}, metrics: {} });
    }
    if (path?.startsWith("/api/timetable/planner?")) {
      return queryResult({ version: mockOngoingAssignments ? { id: "draft-1", status: "draft", immutable: false } : null, slots: [], metrics: {} });
    }
    if (path === "/api/timetable/resources") {
      return queryResult({ items: [] });
    }
    return queryResult(undefined);
  });
}

describe("Deputy timetable class lifecycle and year scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClassError = null;
    mockOngoingAssignments = false;
    installQueryFixtures();
  });

  it("requests the exact academic year, hides archived/null/other-year rows, and clears stale selection", () => {
    render(<DeputyTimetableManagementWorkspace />);

    expect(mockUseSchoolQuery).toHaveBeenCalledWith(
      "/api/academics/class-sections?academic_year_id=year-2026",
    );

    fireEvent.click(screen.getByRole("button", { name: "Draft review" }));
    const classSelect = screen.getByRole("combobox", { name: "Class" });
    expect(within(classSelect).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Grade 9",
      "Grade 10",
    ]);
    fireEvent.change(classSelect, { target: { value: "class-current-b" } });
    expect(classSelect).toHaveValue("class-current-b");

    fireEvent.change(screen.getByRole("combobox", { name: "Timetable academic year" }), {
      target: { value: "2025" },
    });

    expect(mockUseSchoolQuery).toHaveBeenCalledWith(
      "/api/academics/class-sections?academic_year_id=year-2025",
    );
    const nextClassSelect = screen.getByRole("combobox", { name: "Class" });
    expect(nextClassSelect).toHaveValue("class-old");
    expect(within(nextClassSelect).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Grade 8",
    ]);
  });

  it("shows a truthful source failure with a working retry", () => {
    mockClassError = new Error("class source unavailable");
    installQueryFixtures();

    render(<DeputyTimetableManagementWorkspace />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Academic timetable source data could not be loaded",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry academic sources" }));
    expect(mockClassRefetch).toHaveBeenCalledTimes(1);
  });

  it("offers ongoing subject teachers in the current term without including old term allocations", () => {
    mockOngoingAssignments = true;
    render(<DeputyTimetableManagementWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Draft review" }));
    fireEvent.click(screen.getByRole("button", { name: "Add lesson" }));
    const classSelects = screen.getAllByRole("combobox", { name: "Class" });
    fireEvent.change(classSelects[classSelects.length - 1], { target: { value: "class-current-a" } });
    const subjectSelect = screen.getByRole("combobox", { name: "Subject" });
    expect(within(subjectSelect).getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(within(subjectSelect).queryByRole("option", { name: "Mathematics" })).not.toBeInTheDocument();
    fireEvent.change(subjectSelect, { target: { value: "subject-1" } });
    expect(within(screen.getByRole("combobox", { name: "Teacher" })).getByRole("option", { name: "Alex Teacher" })).toBeInTheDocument();
  });
});
