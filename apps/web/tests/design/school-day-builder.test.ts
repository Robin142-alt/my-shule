import { changePeriodType, copyDay, DEFAULT_PERIOD_TYPES, editPeriodTime, insertPeriod, movePeriod, prepareConfiguration, removePeriod, startDayAt, validateSchoolDays } from "@/components/school/deputy-principal/school-day-builder";
import type { ConfigurationDay, TimetableConfiguration } from "@/components/school/deputy-principal/timetable-types";
import { deserialize, serialize } from "node:v8";

// jsdom does not yet expose the browser structuredClone API.
global.structuredClone = (value) => deserialize(serialize(value));

const types = DEFAULT_PERIOD_TYPES;
const type = (id: string) => types.find((item) => item.id === id)!;
const empty = (): ConfigurationDay => ({ day_of_week: 1, name: "Monday", is_teaching_day: true, periods: [] });
function build(sequence: string[]) { return sequence.reduce((day, id) => insertPeriod(day, day.periods.length, type(id), "08:00", types), empty()); }
const times = (day: ConfigurationDay) => day.periods.map((period) => [period.name, period.starts_at, period.ends_at]);

describe("School day timing", () => {
  it("builds the requested seven-click day without manual times or names", () => {
    expect(times(build(["lesson", "lesson", "break", "lesson", "lesson", "lunch", "lesson"]))).toEqual([
      ["Period 1", "08:00", "08:40"], ["Period 2", "08:40", "09:20"], ["Break", "09:20", "09:40"],
      ["Period 3", "09:40", "10:20"], ["Period 4", "10:20", "11:00"], ["Lunch", "11:00", "12:00"], ["Period 5", "12:00", "12:40"],
    ]);
  });
  it("uses manual times as anchors while preserving following custom durations", () => {
    let day = build(["lesson", "lesson", "break", "lesson"]);
    day = editPeriodTime(day, 2, "ends_at", "09:45", types);
    day = editPeriodTime(day, 1, "ends_at", "09:30", types);
    expect(times(day)).toEqual([["Period 1", "08:00", "08:40"], ["Period 2", "08:40", "09:30"], ["Break", "09:30", "09:55"], ["Period 3", "09:55", "10:35"]]);
    day = editPeriodTime(day, 1, "starts_at", "08:50", types);
    expect(day.periods[1].ends_at).toBe("09:40");
    expect(day.periods[2].starts_at).toBe("09:40");
  });
  it("changes type duration, derives teaching status and allows an end override", () => {
    let day = changePeriodType(build(["lesson", "lesson", "lesson", "lesson"]), 2, type("break"), types);
    expect(times(day).slice(2)).toEqual([["Break", "09:20", "09:40"], ["Period 3", "09:40", "10:20"]]);
    expect(day.periods[2].is_teaching).toBe(false);
    day = editPeriodTime(day, 2, "ends_at", "09:50", types);
    expect(day.periods[3].starts_at).toBe("09:50");
    const prep = changePeriodType(day, 2, type("prep"), types);
    expect(prep.periods[2].is_teaching).toBe(true);
    expect(prep.periods[2].name).toBe("Prep");
  });
  it("inserts, deletes, and reorders while closing gaps and renumbering", () => {
    const original = build(["lesson", "lesson"]);
    const inserted = insertPeriod(original, 1, type("break"), "08:00", types);
    expect(times(inserted)).toEqual([["Period 1", "08:00", "08:40"], ["Break", "08:40", "09:00"], ["Period 2", "09:00", "09:40"]]);
    expect(times(removePeriod(inserted, 1, types))).toEqual(times(original));
    const moved = movePeriod(inserted, 2, 0, types);
    expect(moved.periods[0].id).toBe(original.periods[1].id);
    expect(times(moved)).toEqual([["Period 1", "08:00", "08:40"], ["Period 2", "08:40", "09:20"], ["Break", "09:20", "09:40"]]);
    expect(times(removePeriod(original, 0, types))).toEqual([["Period 1", "08:00", "08:40"]]);
  });
  it("copies custom times and blocks with independent IDs and no shared data", () => {
    const monday = editPeriodTime(build(["lesson", "break"]), 0, "ends_at", "08:50", types);
    const configuration: TimetableConfiguration = { academic_year: "2026", term_name: "Term 1", days: [monday], common_blocks: [{ name: "Assembly", activity_type: "assembly", period_id: monday.periods[1].id, day_of_week: 1, target_scope: "school", target_ids: [], duration_periods: 1, is_locked: true }] };
    const copied = copyDay(configuration, 1, [2, 3, 4, 5]);
    expect(copied.days).toHaveLength(5);
    expect(copied.days.map(times)).toEqual(Array(5).fill(times(monday)));
    expect(new Set(copied.days.flatMap((day) => day.periods.map((period) => period.id))).size).toBe(10);
    expect(copied.common_blocks[1].period_id).toBe(copied.days[1].periods[1].id);
    copied.days[1].periods[0].ends_at = "08:55";
    expect(monday.periods[0].ends_at).toBe("08:50");
    expect(copied.days[2].periods[0].ends_at).toBe("08:50");
    const recopied = copyDay(copied, 1, [2]);
    expect(recopied.common_blocks.filter((block) => block.day_of_week === 2)).toHaveLength(1);
    expect(times(recopied.days[1])).toEqual(times(monday));
  });
  it("rejects invalid times, overlaps and overflow without changing the original day", () => {
    const original = build(["lesson", "lesson"]);
    expect(() => editPeriodTime(original, 0, "ends_at", "07:50", types)).toThrow("End time");
    expect(() => editPeriodTime(original, 1, "starts_at", "08:30", types)).toThrow("overlap");
    expect(() => startDayAt(original, "23:00")).toThrow("midnight");
    expect(() => startDayAt(original, "")).toThrow("valid time");
    expect(times(original)[0]).toEqual(["Period 1", "08:00", "08:40"]);
    expect(() => validateSchoolDays({ academic_year: "2026", term_name: "T1", days: [original, original], common_blocks: [] })).toThrow("once");
  });
  it("retains legacy custom types, row IDs and manual times on load", () => {
    const day = build(["lesson"]);
    day.periods[0] = { ...day.periods[0], period_type: "tea", name: "Tea Break", is_teaching: false, ends_at: "08:15" };
    const configuration = prepareConfiguration({ academic_year: "2026", term_name: "T1", days: [day], common_blocks: [] });
    expect(configuration.period_types).toContainEqual({ id: "tea", name: "Tea Break", default_duration_minutes: 15, is_teaching: false });
    expect(configuration.days[0]).toEqual(day);
  });

  it("preserves mixed legacy teaching flags using separate reusable definitions", () => {
    const day = build(["lesson", "lesson"]);
    day.periods[1].is_teaching = false;
    const configuration = prepareConfiguration({ academic_year: "2026", term_name: "T1", days: [day], common_blocks: [] });
    const periods = configuration.days[0].periods;
    expect(periods[0].period_type).not.toBe(periods[1].period_type);
    expect(configuration.period_types?.find((type) => type.id === periods[1].period_type)?.is_teaching).toBe(false);
    expect(periods.map((period) => period.id)).toEqual(day.periods.map((period) => period.id));
  });
});
