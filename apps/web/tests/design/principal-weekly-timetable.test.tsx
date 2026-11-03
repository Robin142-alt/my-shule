import { weeklyTimetable } from "@/components/school/principal-dashboard/weekly-timetable";

const period = (
  starts_at: string,
  ends_at: string,
  name: string,
  is_teaching = true,
) => ({ starts_at, ends_at, name, is_teaching });
const lesson = {
  id: "lesson",
  day_of_week: 1,
  starts_at: "08:00",
  ends_at: "09:20",
  class_section_id: "class-a",
  subject_name: "Mathematics",
  teacher_name: "Teacher A",
  class_name: "Grade 7",
  teacher_id: "teacher-a",
};

it("places actual periods across school days and preserves double lessons and named breaks", () => {
  const grid = weeklyTimetable(
    {
      version: null,
      items: [lesson as never],
      days: [
        {
          day_of_week: 1,
          name: "Monday",
          is_teaching_day: true,
          periods: [
            period("08:00", "08:40", "First"),
            period("08:40", "09:20", "Second"),
            period("09:20", "09:40", "Morning break", false),
          ],
        },
        {
          day_of_week: 2,
          name: "Tuesday",
          is_teaching_day: true,
          periods: [
            period("08:00", "08:40", "First"),
            period("08:40", "09:20", "Second"),
            period("09:20", "09:40", "Morning break", false),
          ],
        },
      ],
    },
    {},
  );
  expect(grid.rows.map((row) => row.day)).toEqual(["Monday", "Tuesday"]);
  expect(grid.columns).toHaveLength(3);
  expect(
    grid.rows[0].cells
      .slice(0, 2)
      .every((cell) => cell.text.includes("Mathematics")),
  ).toBe(true);
  expect(grid.rows[0].cells[2]).toEqual({
    kind: "break",
    text: "Morning break",
  });
  expect(grid.rows[1].cells[0].text).toBe("—");
});

it("filters a class without dropping configured days or adding invented teaching periods", () => {
  const grid = weeklyTimetable(
    { version: null, items: [lesson as never], days: [] },
    { class_section_id: "class-b" },
  );
  expect(grid.columns).toHaveLength(1);
  expect(grid.slots).toHaveLength(0);
  expect(grid.rows[0].cells[0].text).toBe("—");
});
