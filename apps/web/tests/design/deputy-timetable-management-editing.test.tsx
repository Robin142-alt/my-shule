import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { DeputyTimetableManagementWorkspace } from "@/components/school/deputy-principal/timetable-management-workspace";

const mockSave = jest.fn();
const mockRefetch = jest.fn();
const version = { id: "draft", status: "draft", immutable: false };
const slot = { id: "english", version_id: "draft", academic_year: "2026", term_name: "Term 3", class_section_id: "class", class_name: "Form 4", stream_id: "yellow", stream_name: "Yellow", subject_id: "english", subject_name: "English", teacher_id: "teacher", teacher_name: "Allocated Teacher", day_of_week: 1, period_id: "p1a", starts_at: "08:00", ends_at: "09:20", duration_periods: 2, row_version: 3, status: "draft" };
const configuration = { days: [1, 2].map(day => ({ day_of_week: day, name: day === 1 ? "Monday" : "Tuesday", is_teaching_day: true, periods: [
  { id: `p${day}a`, name: "Period 1", starts_at: "08:00", ends_at: "08:40", is_teaching: true, order_index: 0 },
  { id: `p${day}b`, name: "Period 2", starts_at: "08:40", ends_at: "09:20", is_teaching: true, order_index: 1 },
  { id: `p${day}c`, name: "Break", starts_at: "09:20", ends_at: "09:40", is_teaching: false, order_index: 2 },
] })), common_blocks: [] };

function mockData(path: string | null) {
  if (path === "/api/academics/academic-years") return [{ id: "year", name: "2026", status: "active" }];
  if (path === "/api/academics/academic-terms") return [{ id: "term", academic_year_id: "year", name: "Term 3", status: "active" }];
  if (path?.startsWith("/api/academics/class-sections?")) return [{ id: "class", name: "Form 4", academic_year_id: "year", is_active: true, status: "active" }];
  if (path === "/api/academics/subjects") return [{ id: "english", name: "English" }];
  if (path === "/api/academics/teachers") return [{ user_id: "teacher", display_name: "Allocated Teacher" }];
  if (path?.startsWith("/api/academics/teacher-assignments")) return [{ class_section_id: "class", stream_id: "yellow", stream_name: "Yellow", subject_id: "english", teacher_user_id: "teacher" }];
  if (path?.startsWith("/api/timetable/configuration?")) return configuration;
  if (path?.startsWith("/api/timetable/readiness?")) return { status: "READY", blockers: [], warnings: [], metrics: {} };
  if (path?.startsWith("/api/timetable/planner?")) return { version, slots: [slot], metrics: {} };
  if (path?.startsWith("/api/timetable/views?")) return { version, items: [slot], metrics: {} };
  return { items: [] };
}

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (path: string | null) => ({ data: mockData(path), isLoading: false, error: null, refetch: mockRefetch }),
  useSchoolMutation: (path: string | (() => string), method: string) => {
    const [isPending, setPending] = jest.requireActual("react").useState(false);
    return { isPending, mutateAsync: async (payload: unknown) => {
      setPending(true);
      try { return await mockSave(typeof path === "function" ? path() : path, method, payload); } finally { setPending(false); }
    } };
  },
}));
jest.mock("@/lib/data/school-tenant-scope", () => ({ useOptionalSchoolTenantId: () => "school" }));
jest.mock("@/lib/school/school-operational-store", () => ({ getCurrentSchoolId: () => "school" }));
jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/lib/dashboard/export", () => ({ openPrintDocument: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() } }));

beforeEach(() => { jest.clearAllMocks(); mockSave.mockReset().mockResolvedValue(slot); mockRefetch.mockResolvedValue(undefined); });

function editEnglish() {
  render(<DeputyTimetableManagementWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Draft review" }));
  const cards = within(screen.getByRole("table")).getAllByRole("article");
  fireEvent.click(within(cards[cards.length - 1]).getByRole("button", { name: "Edit English" }));
  return within(screen.getByRole("dialog", { name: "Edit draft lesson" }));
}

it("edits from the second period, keeps the stream and recalculates the full duration when changing day", async () => {
  const editor = editEnglish();
  expect(editor.getByRole("combobox", { name: "Subject" })).toHaveValue("english");
  fireEvent.change(editor.getByRole("combobox", { name: "Day" }), { target: { value: "2" } });
  fireEvent.click(editor.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith("/api/timetable/slots/english", "PATCH", expect.objectContaining({ stream_id: "yellow", day_of_week: 2, period_id: "p2a", starts_at: "08:00", ends_at: "09:20", duration_periods: 2, expected_row_version: 3 })));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockRefetch).toHaveBeenCalled();
});

it("recalculates the end time when shortening a double lesson", async () => {
  const editor = editEnglish();
  fireEvent.change(editor.getByRole("spinbutton", { name: "Duration (periods)" }), { target: { value: "1" } });
  fireEvent.click(editor.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.any(String), "PATCH", expect.objectContaining({ starts_at: "08:00", ends_at: "08:40", duration_periods: 1 })));
});

it("explains when a double lesson would cross a break and prevents submission", () => {
  const editor = editEnglish();
  fireEvent.change(editor.getByRole("combobox", { name: "Teaching period" }), { target: { value: "p1b" } });
  expect(editor.getByRole("alert")).toHaveTextContent(/consecutive teaching periods/i);
  expect(editor.getByRole("button", { name: "Save changes" })).toBeDisabled();
  expect(mockSave).not.toHaveBeenCalled();
});

it("keeps edits available to retry after the server rejects a clash", async () => {
  mockSave.mockRejectedValueOnce(new Error("This teacher already has a lesson in that period."));
  const editor = editEnglish();
  fireEvent.click(editor.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This teacher already has a lesson in that period."));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(toast.success).not.toHaveBeenCalled();
  fireEvent.click(editor.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("disables duplicate saves until the server responds", async () => {
  let finish!: (value: unknown) => void;
  mockSave.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const editor = editEnglish();
  fireEvent.click(editor.getByRole("button", { name: "Save changes" }));
  expect(editor.getByRole("button", { name: "Validating & saving..." })).toBeDisabled();
  await act(async () => finish(slot));
  expect(mockSave).toHaveBeenCalledTimes(1);
});

it("keeps offline edits open without claiming a confirmed save", async () => {
  mockSave.mockResolvedValueOnce({ _offline: true });
  const editor = editEnglish();
  fireEvent.click(editor.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("not yet confirmed")));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(toast.success).not.toHaveBeenCalled();
});
