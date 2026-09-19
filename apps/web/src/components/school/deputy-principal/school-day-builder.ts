import type { ConfigurationDay, ConfigurationPeriod, PeriodType, TimetableConfiguration } from "./timetable-types";

export const DEFAULT_PERIOD_TYPES: PeriodType[] = [
  { id: "lesson", name: "Lesson", default_duration_minutes: 40, is_teaching: true },
  { id: "break", name: "Break", default_duration_minutes: 20, is_teaching: false },
  { id: "lunch", name: "Lunch", default_duration_minutes: 60, is_teaching: false },
  { id: "assembly", name: "Assembly", default_duration_minutes: 30, is_teaching: false },
  { id: "games", name: "Games", default_duration_minutes: 40, is_teaching: false },
  { id: "clubs", name: "Clubs", default_duration_minutes: 40, is_teaching: false },
  { id: "guidance", name: "Guidance/Counselling", default_duration_minutes: 40, is_teaching: false },
  { id: "class_meeting", name: "Class Meeting", default_duration_minutes: 40, is_teaching: false },
  { id: "religious", name: "Religious Activity", default_duration_minutes: 40, is_teaching: false },
  { id: "prep", name: "Prep", default_duration_minutes: 40, is_teaching: true },
  { id: "remedial", name: "Remedial", default_duration_minutes: 40, is_teaching: true },
  { id: "activity", name: "School Activity", default_duration_minutes: 40, is_teaching: false },
];

export function minutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Enter a valid time.");
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function clock(value: number): string {
  if (value < 0 || value >= 1440) throw new Error("The school day must finish before midnight. Shorten a period or start earlier.");
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function duration(period: ConfigurationPeriod): number {
  const value = minutes(period.ends_at) - minutes(period.starts_at);
  if (value <= 0) throw new Error("End time must be after start time.");
  return value;
}

export function numberPeriods(periods: ConfigurationPeriod[], types: PeriodType[]): ConfigurationPeriod[] {
  let lesson = 0;
  return periods.map((period, order_index) => {
    const type = types.find((item) => item.id === period.period_type);
    if (!type) throw new Error("Choose a period type for every row.");
    const name = ["lesson", "teaching"].includes(type.id) ? `Period ${++lesson}` : type.name;
    return { ...period, name, is_teaching: type.is_teaching, order_index };
  });
}

/** Keep each occurrence's duration, including manual exceptions, as following rows move. */
function shiftFrom(periods: ConfigurationPeriod[], index: number, start: string): ConfigurationPeriod[] {
  let next = minutes(start);
  return periods.map((period, row) => {
    if (row < index) return period;
    const length = duration(period);
    const shifted = { ...period, starts_at: clock(next), ends_at: clock(next + length) };
    next += length;
    return shifted;
  });
}

export function insertPeriod(day: ConfigurationDay, index: number, type: PeriodType, start: string, types: PeriodType[]): ConfigurationDay {
  if (day.periods.length >= 40) throw new Error("A school day supports up to 40 periods.");
  const anchor = index > 0 ? day.periods[index - 1].ends_at : day.periods[0]?.starts_at ?? start;
  const period: ConfigurationPeriod = {
    id: crypto.randomUUID(), name: type.name, period_type: type.id, is_teaching: type.is_teaching,
    starts_at: anchor, ends_at: clock(minutes(anchor) + type.default_duration_minutes), order_index: index,
  };
  const periods = [...day.periods.slice(0, index), period, ...day.periods.slice(index)];
  return { ...day, periods: numberPeriods(shiftFrom(periods, index, anchor), types) };
}

export function editPeriodTime(day: ConfigurationDay, index: number, field: "starts_at" | "ends_at", value: string, types: PeriodType[]): ConfigurationDay {
  minutes(value);
  const periods = day.periods.map((period) => ({ ...period }));
  const period = periods[index];
  if (field === "starts_at") {
    if (index > 0 && value < periods[index - 1].ends_at) throw new Error("Start time cannot overlap the previous period. Change its end time first.");
    period.ends_at = clock(minutes(value) + duration(period));
    period.starts_at = value;
  } else {
    period.ends_at = value;
    duration(period);
  }
  return { ...day, periods: numberPeriods(shiftFrom(periods, index + 1, period.ends_at), types) };
}

export function changePeriodType(day: ConfigurationDay, index: number, type: PeriodType, types: PeriodType[]): ConfigurationDay {
  const periods = day.periods.map((period, row) => row === index ? {
    ...period, period_type: type.id, is_teaching: type.is_teaching,
    ends_at: clock(minutes(period.starts_at) + type.default_duration_minutes),
  } : period);
  return { ...day, periods: numberPeriods(shiftFrom(periods, index + 1, periods[index].ends_at), types) };
}

export function removePeriod(day: ConfigurationDay, index: number, types: PeriodType[]): ConfigurationDay {
  const anchor = index > 0 ? day.periods[index - 1].ends_at : day.periods[0].starts_at;
  const periods = day.periods.filter((_, row) => row !== index);
  return { ...day, periods: numberPeriods(shiftFrom(periods, index, anchor), types) };
}

export function movePeriod(day: ConfigurationDay, index: number, to: number, types: PeriodType[]): ConfigurationDay {
  if (to < 0 || to >= day.periods.length) return day;
  const periods = [...day.periods];
  periods.splice(to, 0, periods.splice(index, 1)[0]);
  return { ...day, periods: numberPeriods(shiftFrom(periods, 0, day.periods[0].starts_at), types) };
}

export function startDayAt(day: ConfigurationDay, start: string): ConfigurationDay {
  minutes(start);
  return { ...day, periods: shiftFrom(day.periods, 0, start) };
}

export function copyDay(configuration: TimetableConfiguration, source: number, targets: number[]): TimetableConfiguration {
  const original = configuration.days.find((day) => day.day_of_week === source);
  if (!original || !original.periods.length) throw new Error("Add periods before copying this day.");
  const days = [...configuration.days];
  const selectedTargets = new Set(targets.filter((target) => target !== source));
  const common_blocks = configuration.common_blocks.filter((block) => !selectedTargets.has(block.day_of_week));
  for (const target of new Set(targets)) {
    if (target === source) continue;
    const index = days.findIndex((day) => day.day_of_week === target);
    const previous = days[index];
    const ids = new Map<string, string>();
    const periods = original.periods.map((period, row) => {
      // Retain an existing destination occurrence when its type matches, keeping availability attached.
      const id = previous?.periods[row]?.period_type === period.period_type ? previous.periods[row].id : crypto.randomUUID();
      ids.set(period.id, id);
      return { ...structuredClone(period), id };
    });
    const day = { day_of_week: target, name: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][target], is_teaching_day: original.is_teaching_day, periods };
    if (index < 0) days.push(day); else days[index] = { ...previous, ...day };
    common_blocks.push(...configuration.common_blocks.filter((block) => block.day_of_week === source).map((block) => ({ ...structuredClone(block), id: undefined, day_of_week: target, period_id: ids.get(block.period_id)! })));
  }
  return { ...configuration, days: days.sort((a, b) => a.day_of_week - b.day_of_week), common_blocks };
}

export function prepareConfiguration(configuration: TimetableConfiguration): TimetableConfiguration {
  const draft = structuredClone(configuration);
  const types = draft.period_types?.length ? draft.period_types : structuredClone(DEFAULT_PERIOD_TYPES);
  const seen = new Set<string>();
  const uniqueName = (name: string) => {
    let candidate = name;
    let suffix = 2;
    while (types.some((type) => type.name.toLowerCase() === candidate.toLowerCase())) candidate = `${name} ${suffix++}`;
    return candidate;
  };
  for (const period of draft.days.flatMap((day) => day.periods)) {
    period.starts_at = period.starts_at.slice(0, 5);
    period.ends_at = period.ends_at.slice(0, 5);
    // Legacy schools retain their custom types and teaching semantics on first upgrade.
    if (!seen.has(period.period_type) && !draft.period_types?.length) {
      const existing = types.find((type) => type.id === period.period_type);
      if (existing) {
        existing.is_teaching = period.is_teaching;
        existing.default_duration_minutes = Math.min(360, Math.max(1, duration(period)));
      }
      seen.add(period.period_type);
    }
    const existing = types.find((type) => type.id === period.period_type);
    if (existing && !draft.period_types?.length && existing.is_teaching !== period.is_teaching) {
      const variantId = `${period.period_type.slice(0, 65)}-${period.is_teaching ? "teaching" : "non-teaching"}`;
      if (!types.some((type) => type.id === variantId)) types.push({ ...existing, id: variantId, name: uniqueName(`${existing.name} (${period.is_teaching ? "teaching" : "non-teaching"})`), is_teaching: period.is_teaching });
      period.period_type = variantId;
    }
    if (!types.some((type) => type.id === period.period_type)) types.push({ id: period.period_type, name: uniqueName(period.period_type === "teaching" ? "Teaching lesson" : period.name), default_duration_minutes: Math.min(360, Math.max(1, duration(period))), is_teaching: period.is_teaching });
  }
  return { ...draft, school_starts_at: draft.school_starts_at?.slice(0, 5) ?? draft.days[0]?.periods[0]?.starts_at ?? "08:00", period_types: types };
}

export function validateSchoolDays(configuration: TimetableConfiguration): void {
  if (!configuration.days.length) throw new Error("Add at least one school day before saving.");
  minutes(configuration.school_starts_at ?? "08:00");
  const days = new Set<number>();
  for (const day of configuration.days) {
    if (days.has(day.day_of_week)) throw new Error("Each school day can only appear once.");
    days.add(day.day_of_week);
    for (let index = 0; index < day.periods.length; index++) {
      duration(day.periods[index]);
      if (index && day.periods[index].starts_at < day.periods[index - 1].ends_at) throw new Error(`${day.name} has overlapping periods. Adjust their times before saving.`);
    }
  }
}
