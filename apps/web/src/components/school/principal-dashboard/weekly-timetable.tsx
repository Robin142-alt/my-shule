"use client";

import { useState } from "react";
import { CalendarDays, Download, Printer } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { Button } from "@/components/ui/button";
import {
  dayLabel,
  timeLabel,
  type TimetableSlot,
  type TimetableVersion,
} from "../deputy-principal/timetable-types";
import {
  PrincipalHeader,
  PrincipalPanel,
  principalStyles as styles,
} from "./workspace-ui";

type Period = {
  starts_at: string;
  ends_at: string;
  name: string;
  is_teaching: boolean;
};
type Day = {
  day_of_week: number;
  name: string;
  is_teaching_day: boolean;
  periods: Period[];
};
type Schedule = {
  version: TimetableVersion | null;
  items: TimetableSlot[];
  days: Day[];
};
const filters = [
  ["class_section_id", "Class", "class_name"],
  ["stream_id", "Stream", "stream_name"],
  ["teacher_id", "Teacher", "teacher_name"],
  ["resource_id", "Room", "resource_name"],
] as const;
type Filter = (typeof filters)[number][0];

const interval = (period: Pick<Period, "starts_at" | "ends_at">) =>
  timeLabel(period.starts_at) + "–" + timeLabel(period.ends_at);
const covers = (slot: TimetableSlot, period: Period) =>
  timeLabel(slot.starts_at) <= timeLabel(period.starts_at) &&
  timeLabel(slot.ends_at) >= timeLabel(period.ends_at);

export function weeklyTimetable(
  schedule: Schedule,
  selection: Partial<Record<Filter, string>>,
) {
  const slots = schedule.items.filter((slot) =>
    filters.every(
      ([key]) =>
        !selection[key] ||
        (key === "resource_id"
          ? slot.resource_id || slot.room_id
          : slot[key]) === selection[key],
    ),
  );
  const days = new Map<number, Period[]>();
  for (const day of schedule.days ?? []) {
    if (day.is_teaching_day) days.set(day.day_of_week, [...day.periods]);
  }
  // Historical published schedules can outlive their original bell configuration.
  for (const slot of schedule.items) {
    const periods = days.get(slot.day_of_week) ?? [];
    if (!periods.some((period) => covers(slot, period)))
      periods.push({ ...slot, name: "Lesson", is_teaching: true });
    days.set(slot.day_of_week, periods);
  }
  const times = new Map<string, Period>();
  for (const periods of days.values())
    for (const period of periods) times.set(interval(period), period);
  const columns = [...times.values()].sort(
    (a, b) =>
      timeLabel(a.starts_at).localeCompare(timeLabel(b.starts_at)) ||
      timeLabel(a.ends_at).localeCompare(timeLabel(b.ends_at)),
  );
  const rows = [...days]
    .sort(([a], [b]) => a - b)
    .map(([day, periods]) => ({
      day: dayLabel(day),
      cells: columns.map((column) => {
        const period = periods.find(
          (item) => interval(item) === interval(column),
        );
        if (!period) return { kind: "off", text: "—" };
        const lessons = slots.filter(
          (slot) => slot.day_of_week === day && covers(slot, period),
        );
        const lines = lessons.map((slot) =>
          [
            slot.subject_name,
            slot.teacher_name,
            [slot.class_name, slot.stream_name].filter(Boolean).join(" "),
            slot.resource_name || slot.room_id,
          ]
            .filter(Boolean)
            .join(" · "),
        );
        if (!period.is_teaching) lines.unshift(period.name);
        return {
          kind: period.is_teaching ? "lesson" : "break",
          text: lines.length ? lines.join("\n") : "—",
        };
      }),
    }));
  return { columns, rows, slots };
}

export function PrincipalWeeklyTimetable({
  schoolName,
}: {
  schoolName: string;
}) {
  const query = useSchoolQuery<Schedule>(
    "/api/timetable/views?view=master&include_periods=true",
  );
  const [selection, setSelection] = useState<Partial<Record<Filter, string>>>(
    {},
  );
  const data = query.data;
  const grid = data ? weeklyTimetable(data, selection) : null;
  const headers = [
    "Day",
    ...(grid?.columns ?? []).map(
      (period, index) => "Period " + (index + 1) + "\n" + interval(period),
    ),
  ];
  const rows =
    grid?.rows.map((row) => [row.day, ...row.cells.map((cell) => cell.text)]) ??
    [];
  const subtitle = [
    schoolName,
    data?.version?.term_name,
    data?.version?.academic_year,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={styles.stack}>
      <PrincipalHeader
        icon={CalendarDays}
        title="School master timetable"
        description={
          subtitle || "Published lessons, school periods and breaks."
        }
        actions={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh
          </Button>
        }
      />
      <PrincipalPanel
        title="Weekly schedule"
        description="Read across each day. Filter to see a class, stream, teacher or room."
        tone="blue"
      >
        {query.error ? (
          <div role="alert" className={styles.error}>
            {query.error.message}{" "}
            <Button onClick={() => void query.refetch()}>Retry schedule</Button>
          </div>
        ) : query.isLoading ? (
          <p role="status" className={styles.empty}>
            Loading the school timetable…
          </p>
        ) : (
          <>
            <div className={styles.toolbar}>
              {filters.map(([key, label, name]) => {
                const options = new Map<string, string>();
                for (const slot of data?.items ?? []) {
                  if (
                    key === "stream_id" &&
                    selection.class_section_id &&
                    slot.class_section_id !== selection.class_section_id
                  )
                    continue;
                  const id =
                    key === "resource_id"
                      ? slot.resource_id || slot.room_id
                      : slot[key];
                  if (id) options.set(id, slot[name] || id);
                }
                return (
                  <label key={key} className={styles.field}>
                    {label}
                    <select
                      value={selection[key] ?? ""}
                      onChange={(event) =>
                        setSelection((current) => ({
                          ...current,
                          [key]: event.target.value,
                          ...(key === "class_section_id"
                            ? { stream_id: "" }
                            : {}),
                        }))
                      }
                    >
                      <option value="">
                        All {label.toLowerCase()}
                        {label === "Class" ? "es" : "s"}
                      </option>
                      {[...options]
                        .sort(([, a], [, b]) => a.localeCompare(b))
                        .map(([id, label]) => (
                          <option value={id} key={id}>
                            {label}
                          </option>
                        ))}
                    </select>
                  </label>
                );
              })}
            </div>
            {!data?.version ? (
              <p className={styles.empty}>
                No timetable has been published for this academic period.
              </p>
            ) : !grid?.columns.length ? (
              <p className={styles.empty}>
                No periods or lessons recorded for this published timetable.
              </p>
            ) : (
              <>
                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadCsvFile({
                        filename: "school-weekly-timetable.csv",
                        headers,
                        rows,
                      })
                    }
                  >
                    <Download size={16} />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() =>
                      openPrintDocument({
                        title: "Weekly school timetable",
                        eyebrow: "Published timetable",
                        subtitle,
                        rows: [],
                        table: { headers, rows },
                        landscape: true,
                        footer: "Published school timetable · MyShule ERP",
                      })
                    }
                  >
                    <Printer size={16} />
                    Print / Save PDF
                  </Button>
                </div>
                <p className="my-3 text-sm text-muted">
                  {grid.slots.length} published lessons in this view. A dash
                  indicates no scheduled lesson for the selection.
                </p>
                <div
                  className={styles.tableShell}
                  tabIndex={0}
                  aria-label="Weekly timetable, scroll horizontally for later periods"
                >
                  <table className={styles.weekGrid}>
                    <thead>
                      <tr>
                        {headers.map((header) => (
                          <th key={header} scope="col">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.rows.map((row) => (
                        <tr key={row.day}>
                          <th scope="row">{row.day}</th>
                          {row.cells.map((cell, index) => (
                            <td key={index} data-period={cell.kind}>
                              {cell.text}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </PrincipalPanel>
    </div>
  );
}
