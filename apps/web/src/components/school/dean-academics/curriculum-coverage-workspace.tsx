"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { CoverageRecord } from "./overview-workspace";
import { deanButtonClass, Panel, QueryNotice, StatusChip } from "./shared";
import styles from "./dean-workspace.module.css";

export function CurriculumCoverageWorkspace({
  onOpenPlans,
  onOpenLogs,
}: {
  onOpenPlans?: () => void;
  onOpenLogs?: () => void;
}) {
  const { data, isLoading, error, refetch } = useSchoolQuery<CoverageRecord[]>(
    "/admin-command/dean-academics/curriculum-coverage",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = Array.isArray(data) ? data : [];
  const filtered = rows.filter(
    (row) =>
      `${row.subject} ${row.class_name}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (filter === "all" ||
        (filter === "no-plans"
          ? !row.planned_topics
          : row.planned_topics > row.covered_topics)),
  );
  return (
    <div className={styles.workspace}>
      <Panel
        title="Curriculum Coverage"
        description="Lesson delivery recorded against class-subject plans. Coverage reflects logged plans, not a syllabus target."
        icon={BookOpen}
        actions={
          <div className="flex flex-wrap gap-2">
            {onOpenPlans ? (
              <button className={deanButtonClass} onClick={onOpenPlans}>
                Lesson plans
              </button>
            ) : null}
            {onOpenLogs ? (
              <button className={deanButtonClass} onClick={onOpenLogs}>
                Lesson logs
              </button>
            ) : null}
            <button
              className={deanButtonClass}
              disabled={isLoading}
              onClick={() => void refetch()}
            >
              Refresh
            </button>
          </div>
        }
      >
        <QueryNotice error={error} onRetry={() => void refetch()} />
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="min-w-0 flex-1 text-xs text-slate-500">
            Search subject or class
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Subject or class…"
              className="mt-1 block min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Show
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="mt-1 block min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All coverage</option>
              <option value="no-plans">No lesson plans</option>
              <option value="unlogged">Plans still to log</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className={`w-full text-left text-sm ${styles.table}`}>
            <thead className="bg-slate-50">
              <tr>
                {["Subject", "Class", "Plans", "Logged", "Coverage"].map(
                  (label) => (
                    <th key={label} className="px-4 py-3">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">
                    Coverage is unavailable. Retry above.
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">
                    Loading coverage…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => (
                  <tr
                    key={`${row.id}-${row.class_name}`}
                    className="border-t border-slate-200"
                  >
                    <td
                      data-label="Subject"
                      className="px-4 py-3 font-medium text-slate-800"
                    >
                      {row.subject}
                    </td>
                    <td data-label="Class" className="px-4 py-3">
                      {row.class_name}
                    </td>
                    <td data-label="Plans" className="px-4 py-3 tabular-nums">
                      {row.planned_topics}
                    </td>
                    <td data-label="Logged" className="px-4 py-3 tabular-nums">
                      {row.covered_topics}
                    </td>
                    <td data-label="Coverage" className="px-4 py-3">
                      {row.coverage === null ? (
                        <StatusChip label="No lesson plans" tone="warning" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <progress
                            aria-label={`${row.subject} ${row.class_name} coverage`}
                            max={100}
                            value={Number(row.coverage)}
                            className="h-2 w-24 accent-[#426B9E]"
                          />
                          <span className="text-xs tabular-nums">
                            {Number(row.coverage)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-slate-500">
                    {rows.length
                      ? "No records match these filters."
                      : "No class-subject coverage records yet. Class-subject assignments and teacher lesson plans are needed to track delivery."}
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
            {filtered.length} of {rows.length} class-subject records
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
