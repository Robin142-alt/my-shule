import { fireEvent, render, screen, within } from "@testing-library/react";
import { TimetableScheduleView } from "@/components/school/deputy-principal/timetable-schedule-view";
import type { TimetableConfiguration, TimetableSlot } from "@/components/school/deputy-principal/timetable-types";

const configuration: TimetableConfiguration = { academic_year: "2026", term_name: "Term 3", common_blocks: [], days: [1, 2].map((day) => ({ day_of_week: day, name: day === 1 ? "Monday" : "Tuesday", is_teaching_day: true, periods: [
  { id: `p${day}a`, name: "Period 1", starts_at: "08:00", ends_at: "08:40", is_teaching: true, period_type: "lesson", order_index: 0 },
  { id: `p${day}b`, name: "Period 2", starts_at: "08:40", ends_at: "09:20", is_teaching: true, period_type: "lesson", order_index: 1 },
  { id: `p${day}c`, name: "Tea break", starts_at: "09:20", ends_at: "09:40", is_teaching: false, period_type: "break", order_index: 2 },
] })) };
const slot: TimetableSlot = { id: "slot", version_id: "draft", academic_year: "2026", term_name: "Term 3", class_section_id: "class", class_name: "Form 4", subject_id: "cre", subject_name: "CHRISTIAN RELIGIOUS EDUCATION", teacher_id: "teacher", teacher_name: "Allocated Teacher", day_of_week: 1, period_id: "p1a", starts_at: "08:00", ends_at: "09:20", duration_periods: 2, status: "draft" };
const handlers = { onSelectedDayChange: jest.fn(), onMove: jest.fn(), onMoveTo: jest.fn(), onEdit: jest.fn(), onLock: jest.fn(), onRemove: jest.fn() };
const props = { rows: [slot], view: "class" as const, configuration, selectedDay: 1, editable: true, ...handlers };
beforeEach(() => jest.clearAllMocks());

it("shows full subject names, teacher, double duration and breaks in the phone timeline", () => {
  render(<TimetableScheduleView {...props} />);
  const day = within(screen.getByRole("list", { name: "Monday lesson timeline" }));
  expect(day.getByText("CHRISTIAN RELIGIOUS EDUCATION")).not.toHaveClass("truncate");
  expect(day.getByText("Allocated Teacher")).toBeVisible();
  expect(day.getByText(/08:00-09:20 - 2 periods/)).toBeVisible();
  expect(day.getAllByRole("article")).toHaveLength(1);
  expect(day.queryByText(/Needs a lesson/)).not.toBeInTheDocument();
  expect(day.getAllByText("Tea break").length).toBeGreaterThan(0);
  expect(screen.getByText(/CHRISTIAN RELIGIOUS EDUCATION · continues until 09:20/)).toBeInTheDocument();
});

it("offers labelled move, edit, lock and remove controls and protects locked lessons", () => {
  const { rerender } = render(<TimetableScheduleView {...props} />);
  const day = within(screen.getByRole("list", { name: "Monday lesson timeline" }));
  fireEvent.click(day.getByLabelText("Lesson actions for CHRISTIAN RELIGIOUS EDUCATION"));
  const details = day.getByRole("article").querySelector("details")!;
  details.open = true;
  for (const action of ["Move", "Edit", "Lock", "Remove"] as const) {
    fireEvent.click(day.getByRole("button", { name: `${action} CHRISTIAN RELIGIOUS EDUCATION` }));
    expect(handlers[`on${action}`]).toHaveBeenCalledWith(slot);
  }
  rerender(<TimetableScheduleView {...props} rows={[{ ...slot, locked: true }]} />);
  expect(day.getByRole("button", { name: "Move CHRISTIAN RELIGIOUS EDUCATION" })).toBeDisabled();
  expect(day.getByRole("button", { name: "Edit CHRISTIAN RELIGIOUS EDUCATION" })).toBeDisabled();
  expect(day.getByRole("button", { name: "Remove CHRISTIAN RELIGIOUS EDUCATION" })).toBeDisabled();
  expect(day.getByRole("button", { name: "Unlock CHRISTIAN RELIGIOUS EDUCATION" })).toBeEnabled();
});

it("switches days by touch and exposes unfilled teaching periods without treating breaks as gaps", () => {
  const { rerender } = render(<TimetableScheduleView {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Tue" }));
  expect(handlers.onSelectedDayChange).toHaveBeenCalledWith(2);
  rerender(<TimetableScheduleView {...props} selectedDay={2} />);
  const day = within(screen.getByRole("list", { name: "Tuesday lesson timeline" }));
  expect(day.getAllByText(/Needs a lesson/)).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Next day" }));
  expect(handlers.onSelectedDayChange).toHaveBeenLastCalledWith(1);
});

it("shows reserved school activities and keeps published lessons read-only", () => {
  const withAssembly = { ...configuration, common_blocks: [{ name: "Assembly", activity_type: "assembly", target_scope: "school" as const, target_ids: [], day_of_week: 2, period_id: "p2a", duration_periods: 1, is_locked: true }] };
  render(<TimetableScheduleView {...props} configuration={withAssembly} editable={false} selectedDay={2} />);
  const day = within(screen.getByRole("list", { name: "Tuesday lesson timeline" }));
  expect(day.getByText("Assembly")).toBeVisible();
  expect(day.getAllByText(/Needs a lesson/)).toHaveLength(1);
  expect(screen.queryByLabelText(/Lesson actions/)).not.toBeInTheDocument();
});
