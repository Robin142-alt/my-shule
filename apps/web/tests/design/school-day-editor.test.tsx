import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { PeriodConfigurationPanel } from "@/components/school/deputy-principal/timetable-setup-panels";
import type { TimetableConfiguration } from "@/components/school/deputy-principal/timetable-types";
import { deserialize, serialize } from "node:v8";

global.structuredClone = (value) => deserialize(serialize(value));

const mockSave = jest.fn();
let mockTenant = "school-a";
jest.mock("@/lib/data/school-tenant-scope", () => ({ useOptionalSchoolTenantId: () => mockTenant }));
jest.mock("@/lib/data/school-hooks", () => ({ useSchoolMutation: () => ({ isPending: false, mutateAsync: mockSave }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/ui/modal", () => ({ Modal: ({ open, title, children, footer }: { open: boolean; title: string; children: React.ReactNode; footer: React.ReactNode }) => open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null }));

const props = () => ({ academicYear: "2026", termName: "Term 1", classes: [], loading: false, onRetry: jest.fn(), onSaved: jest.fn(), onSaveState: jest.fn() });
function clickType(name: string) { fireEvent.click(screen.getAllByRole("button", { name })[0]); }
function changeTime(label: string, value: string) { const field = screen.getByLabelText(label); fireEvent.change(field, { target: { value } }); fireEvent.blur(field); }

beforeEach(() => { jest.clearAllMocks(); mockTenant = "school-a"; mockSave.mockImplementation(async (payload) => ({ ...payload, row_version: 2 })); });

it("builds, copies, saves and reloads the seven-click success example", async () => {
  const options = props();
  const { unmount } = render(<PeriodConfigurationPanel {...options} />);
  for (const name of ["Lesson", "Lesson", "Break", "Lesson", "Lesson", "Lunch", "Lesson"]) clickType(name);
  expect(screen.getByLabelText("Period 5 end")).toHaveValue("12:40");
  expect(screen.queryByRole("checkbox", { name: "Teaching" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Copy Monday to…" }));
  const dialog = screen.getByRole("dialog", { name: "Copy Monday to…" });
  for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday"]) expect(within(dialog).getByLabelText(day)).toBeChecked();
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy schedule" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Save periods" })[0]);
  await waitFor(() => expect(options.onSaveState).toHaveBeenLastCalledWith("saved"));
  const payload = mockSave.mock.calls[0][0] as TimetableConfiguration;
  expect(payload.school_starts_at).toBe("08:00");
  expect(payload.days).toHaveLength(5);
  expect(payload.days.every((day) => day.periods.length === 7)).toBe(true);
  expect(payload.period_types?.find((type) => type.id === "break")?.is_teaching).toBe(false);
  unmount();
  render(<PeriodConfigurationPanel {...props()} response={payload} />);
  fireEvent.click(screen.getByRole("button", { name: "Tuesday 7" }));
  expect(screen.getByLabelText("Period 5 end")).toHaveValue("12:40");
});

it("adjusts following times when editing, inserting, deleting and changing type", () => {
  render(<PeriodConfigurationPanel {...props()} />);
  clickType("Lesson"); clickType("Lesson"); clickType("Lesson");
  changeTime("Period 2 end", "09:30");
  expect(screen.getByLabelText("Period 3 start")).toHaveValue("09:30");
  fireEvent.change(screen.getByLabelText("Period 2 type"), { target: { value: "break" } });
  expect(screen.getByLabelText("Break end")).toHaveValue("09:00");
  expect(screen.getByLabelText("Period 2 start")).toHaveValue("09:00");
  // Disclosure controls remain discoverable by keyboard and do not clutter the main row.
  const breakRow = within(screen.getByLabelText("Break type").closest("li")!);
  fireEvent.click(breakRow.getByText("Edit", { selector: "summary" }));
  fireEvent.click(breakRow.getByRole("button", { name: "Insert before" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Lunch" }));
  expect(screen.getByLabelText("Lunch start")).toHaveValue("08:40");
  expect(screen.getByLabelText("Break start")).toHaveValue("09:40");
  fireEvent.click(within(screen.getByLabelText("Lunch type").closest("li")!).getByText("Edit", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove Lunch" }));
  expect(screen.getByLabelText("Break start")).toHaveValue("08:40");
});

it("adds a reusable school-defined type and preserves occurrence times when defaults change", async () => {
  render(<PeriodConfigurationPanel {...props()} />);
  clickType("Lesson");
  fireEvent.click(screen.getByRole("button", { name: "Manage period types" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit Lesson" }));
  fireEvent.change(screen.getByLabelText("Duration (minutes)"), { target: { value: "35" } });
  fireEvent.click(screen.getByRole("button", { name: "Save type" }));
  fireEvent.click(screen.getByRole("button", { name: "Add period type" }));
  fireEvent.change(screen.getByLabelText("Name", { exact: true }), { target: { value: "Tea Break" } });
  fireEvent.change(screen.getByLabelText("Duration (minutes)"), { target: { value: "15" } });
  fireEvent.click(screen.getByRole("button", { name: "Save type" }));
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByLabelText("Period 1 end")).toHaveValue("08:40");
  const more = screen.getAllByLabelText("Add another period type")[0];
  const tea = within(more).getByRole("option", { name: "Tea Break · 15 min" }) as HTMLOptionElement;
  fireEvent.change(more, { target: { value: tea.value } });
  expect(screen.getByLabelText("Tea Break end")).toHaveValue("08:55");
  clickType("Lesson");
  expect(screen.getByLabelText("Period 2 end")).toHaveValue("09:30");
  fireEvent.click(screen.getAllByRole("button", { name: "Save periods" })[0]);
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  expect(mockSave.mock.calls[0][0].period_types).toContainEqual(expect.objectContaining({ name: "Tea Break", default_duration_minutes: 15, is_teaching: false }));
});

it("keeps edits after a failed save and retries with concurrency metadata", async () => {
  const options = props();
  mockSave.mockRejectedValueOnce(new Error("Connection lost"));
  render(<PeriodConfigurationPanel {...options} response={{ academic_year: "2026", term_name: "Term 1", row_version: 3, days: [{ day_of_week: 1, name: "Monday", is_teaching_day: true, periods: [] }], common_blocks: [] }} />);
  clickType("Lesson");
  fireEvent.click(screen.getAllByRole("button", { name: "Save periods" })[0]);
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
  expect(screen.getByLabelText("Period 1 end")).toHaveValue("08:40");
  expect(toast.success).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Save periods" })[0]);
  await waitFor(() => expect(options.onSaveState).toHaveBeenLastCalledWith("saved"));
  expect(mockSave.mock.calls[1][0].expected_row_version).toBe(3);
});

it("reports offline queuing truthfully and does not refetch as though the server saved", async () => {
  const options = props(); mockSave.mockResolvedValue({ _offline: true });
  render(<PeriodConfigurationPanel {...options} />); clickType("Lesson");
  fireEvent.click(screen.getAllByRole("button", { name: "Save periods" })[0]);
  await waitFor(() => expect(options.onSaveState).toHaveBeenLastCalledWith("queued"));
  expect(options.onSaved).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});

it("does not discard unsaved edits on a background refetch", () => {
  const options = props(); const { rerender } = render(<PeriodConfigurationPanel {...options} />);
  clickType("Lesson");
  rerender(<PeriodConfigurationPanel {...options} response={{ academic_year: "2026", term_name: "Term 1", days: [], common_blocks: [] }} />);
  expect(screen.getByLabelText("Period 1 end")).toHaveValue("08:40");
});

it("clears a school's unsaved edits when the active school changes", () => {
  const options = props(); const { rerender } = render(<PeriodConfigurationPanel {...options} />);
  clickType("Lesson");
  mockTenant = "school-b";
  rerender(<PeriodConfigurationPanel {...options} />);
  expect(screen.queryByLabelText("Period 1 end")).not.toBeInTheDocument();
  expect(screen.getByText(/No periods yet/)).toBeInTheDocument();
});
