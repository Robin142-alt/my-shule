import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { DeputyTimetableManagementWorkspace } from "@/components/school/deputy-principal/timetable-management-workspace";

const mockGenerate = jest.fn();
const mockRefetch = jest.fn();
let mockSaved = false;
const version = { id: "draft", status: "draft", immutable: false, row_version: 2 };
const slots = Array.from({ length: 3 }, (_, i) => ({ id: `slot-${i}`, class_section_id: "class", subject_id: "math", teacher_id: "teacher", day_of_week: i + 1, starts_at: "08:00", ends_at: "08:40", duration_periods: 1 }));
const completed = { status: "COMPLETED", version, run: { id: "run", status: "completed", required_lessons: 3, scheduled_lessons: 3, unscheduled_lessons: 0, warnings: [] }, placements: slots, gaps: [] };

function mockData(path: string | null) {
  if (path === "/api/academics/academic-years") return [{ id: "year", name: "2026", status: "active" }];
  if (path === "/api/academics/academic-terms") return [{ id: "term", academic_year_id: "year", name: "Term 3", status: "active" }];
  if (path?.startsWith("/api/academics/class-sections?")) return [{ id: "empty-class", name: "Form 3", academic_year_id: "year", is_active: true, status: "active" }, { id: "class", name: "Form 4", academic_year_id: "year", is_active: true, status: "active" }];
  if (path === "/api/academics/subjects") return [{ id: "math", name: "Mathematics" }];
  if (path === "/api/academics/teachers") return [{ user_id: "teacher", display_name: "Allocated Teacher" }];
  if (path?.startsWith("/api/academics/teacher-assignments")) return [];
  if (path?.startsWith("/api/timetable/readiness?")) return { status: "READY", blockers: [], warnings: [], metrics: {} };
  if (path?.startsWith("/api/timetable/configuration?")) return { days: [], common_blocks: [] };
  if (path?.startsWith("/api/timetable/planner?")) return { version: mockSaved ? version : null, slots: mockSaved ? slots : [], metrics: {} };
  if (path?.startsWith("/api/timetable/views?")) return { version: mockSaved ? version : null, items: mockSaved && new URLSearchParams(path.split("?")[1]).get("class_section_id") === "class" ? slots : [], metrics: {} };
  return { items: [] };
}

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (path: string | null) => ({ data: mockData(path), isLoading: false, error: null, refetch: () => mockRefetch(path) }),
  useSchoolMutation: (path: string) => {
    const [isPending, setPending] = jest.requireActual("react").useState(false);
    return { isPending, mutateAsync: async (payload: unknown) => {
      setPending(true);
      try { return await mockGenerate(path, payload); } finally { setPending(false); }
    } };
  },
}));
jest.mock("@/lib/data/school-tenant-scope", () => ({ useOptionalSchoolTenantId: () => "school" }));
jest.mock("@/lib/school/school-operational-store", () => ({ getCurrentSchoolId: () => "school" }));
jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/lib/dashboard/export", () => ({ openPrintDocument: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() } }));
jest.mock("@/components/ui/modal", () => ({ Modal: () => null }));
jest.mock("@/components/school/deputy-principal/timetable-schedule-view", () => ({
  TimetableScheduleView: ({ rows }: { rows: unknown[] }) => <div>{rows.length} saved lessons</div>,
}));

beforeEach(() => {
  jest.clearAllMocks(); mockSaved = false;
  mockRefetch.mockResolvedValue(undefined);
  mockGenerate.mockImplementation(async () => { mockSaved = true; return completed; });
});

it("disables Generate while pending, opens the saved draft and refreshes its views, gaps and history", async () => {
  let finish!: (value: typeof completed) => void;
  mockGenerate.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<DeputyTimetableManagementWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  expect(screen.getByRole("button", { name: "Generating...", exact: true })).toBeDisabled();
  expect(mockGenerate).toHaveBeenCalledWith("/api/timetable/generate", expect.objectContaining({ academic_year: "2026", term_name: "Term 3", scope: "whole_school", preserve_locked: true, allow_partial: true }));
  await act(async () => { mockSaved = true; finish(completed); });
  expect(await screen.findByText("3 saved lessons")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Class", exact: true })).toHaveValue("class");
  expect(screen.getByRole("region", { name: "Generation summary" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
  expect(toast.success).toHaveBeenCalledWith("Draft saved: 3 periods scheduled.");
  for (const endpoint of ["readiness", "planner", "views", "unscheduled", "versions/history"]) {
    expect(mockRefetch).toHaveBeenCalledWith(expect.stringContaining(`/api/timetable/${endpoint}?`));
  }
});

it("keeps a failed request retryable and does not show a saved draft", async () => {
  mockGenerate.mockRejectedValueOnce(new Error("Generation could not be saved"));
  render(<DeputyTimetableManagementWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Generation could not be saved"));
  expect(screen.queryByRole("region", { name: "Generation summary" })).not.toBeInTheDocument();
  expect(toast.success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  expect(await screen.findByText("3 saved lessons")).toBeVisible();
});

it("reports partial generation and shows the remaining period count on draft review", async () => {
  mockGenerate.mockImplementation(async () => { mockSaved = true; return { ...completed, status: "PARTIAL", run: { ...completed.run, status: "completed_with_gaps", scheduled_lessons: 2, unscheduled_lessons: 1 } }; });
  render(<DeputyTimetableManagementWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  const summary = await screen.findByRole("region", { name: "Generation summary" });
  expect(within(summary).getByText("Unscheduled").parentElement).toHaveTextContent("1");
  expect(toast.warning).toHaveBeenCalledWith("Draft saved: 2 periods scheduled; 1 still need placement.");
});

it("retains confirmation of a saved draft if refreshing a view fails", async () => {
  mockRefetch.mockRejectedValue(new Error("View temporarily unavailable"));
  render(<DeputyTimetableManagementWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("The timetable was saved")));
  expect(screen.getByRole("region", { name: "Generation summary" })).toBeVisible();
  expect(toast.error).not.toHaveBeenCalled();
});

it("does not claim generation succeeded for an offline queue or an unconfirmed response", async () => {
  mockGenerate.mockResolvedValueOnce({ _offline: true }).mockResolvedValueOnce({});
  render(<DeputyTimetableManagementWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("not yet confirmed")));
  expect(screen.queryByRole("region", { name: "Generation summary" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Generate Timetable", exact: true }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("did not confirm")));
  expect(toast.success).not.toHaveBeenCalled();
});
