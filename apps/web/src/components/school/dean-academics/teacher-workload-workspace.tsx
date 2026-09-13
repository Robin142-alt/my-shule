"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { deanButtonClass, Panel, QueryNotice, StatusChip } from "./shared";
import styles from "./dean-workspace.module.css";

type WorkloadRecord = {
  id: string;
  teacher_name: string;
  lessons_per_week: number;
  subjects: number;
  classes: number;
};

export function TeacherWorkloadWorkspace({
  onOpenTimetable,
}: {
  onOpenTimetable?: () => void;
}) {
  const { data, isLoading, error, refetch } = useSchoolQuery<WorkloadRecord[]>(
    "/admin-command/dean-academics/teacher-workload",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = Array.isArray(data) ? data : [];
  const filtered = rows.filter(
    (row) =>
      row.teacher_name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (filter === "all" ||
        (filter === "assigned" ? row.classes > 0 : row.classes === 0)),
  );
  return (
    <div className={styles.workspace}>
      <Panel
        title="Teacher Workload"
        description="Active staff and their recorded teaching assignments. Staff without assignments may hold non-teaching roles."
        icon={UsersRound}
        actions={
          <div className="flex flex-wrap gap-2">
            {onOpenTimetable ? (
              <button onClick={onOpenTimetable} className={deanButtonClass}>
                Open timetable
              </button>
            ) : null}
            <button
              onClick={() => void refetch()}
              disabled={isLoading}
              className={deanButtonClass}
            >
              Refresh
            </button>
          </div>
        }
      >
        <QueryNotice error={error} onRetry={() => void refetch()} />
        <div className="mb-4 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 bg-slate-50 py-3">
          {[
            ["Active staff", rows.length],
            ["Teaching assigned", rows.filter((row) => row.classes > 0).length],
            [
              "Weekly lessons",
              rows.reduce((sum, row) => sum + Number(row.lessons_per_week), 0),
            ],
          ].map(([label, value]) => (
            <div key={label} className="px-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {error || isLoading ? "—" : value}
              </p>
            </div>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="min-w-0 flex-1 text-xs text-slate-500">
            Search staff
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Staff name…"
              className="mt-1 block min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Assignments
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="mt-1 block min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All staff</option>
              <option value="assigned">With teaching assignments</option>
              <option value="unassigned">No teaching assignments</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className={`w-full text-left text-sm ${styles.table}`}>
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Staff member",
                  "Classes",
                  "Subjects",
                  "Lessons / week",
                  "Allocation",
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">
                    Workload records are unavailable. Retry above.
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">
                    Loading teaching assignments…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td
                      data-label="Staff member"
                      className="px-4 py-3 font-medium text-slate-800"
                    >
                      {row.teacher_name}
                    </td>
                    <td data-label="Classes" className="px-4 py-3 tabular-nums">
                      {row.classes}
                    </td>
                    <td
                      data-label="Subjects"
                      className="px-4 py-3 tabular-nums"
                    >
                      {row.subjects}
                    </td>
                    <td
                      data-label="Lessons / week"
                      className="px-4 py-3 tabular-nums"
                    >
                      {row.lessons_per_week}
                    </td>
                    <td data-label="Allocation" className="px-4 py-3">
                      <StatusChip
                        label={
                          row.classes
                            ? "Teaching assigned"
                            : "No teaching assignments"
                        }
                        tone={row.classes ? "info" : "neutral"}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">
                    {rows.length
                      ? "No staff match these filters."
                      : "No active staff records yet. Staff invitations and teaching allocations are managed through school administration."}
                    {rows.length ? (
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                        }}
                        className="ml-2 text-blue-700 underline"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!error && !isLoading ? (
          <p className="mt-3 text-xs text-slate-500">
            {filtered.length} of {rows.length} staff members
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
